/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  CheckCheck, 
  Phone, 
  User, 
  Clock, 
  AlertCircle, 
  HelpCircle,
  Smartphone,
  ThumbsUp,
  Inbox,
  MoreVertical,
  Copy
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType } from '../types';
import { AREAS_METADATA, getDayNameSpanish } from '../data';
import { getWhatsAppMessageText } from '../utils/scheduler';

interface ConfirmationsViewProps {
  periods: SchedulePeriod[];
  setPeriods: React.Dispatch<React.SetStateAction<SchedulePeriod[]>>;
  members: Member[];
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
}

export default function ConfirmationsView({
  periods,
  setPeriods,
  members,
  triggerNotification
}: ConfirmationsViewProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const handleManualUpdateStatus = (
    assignmentId: string, 
    status: 'pendiente' | 'confirmado' | 'rechazado' | 'enviado' | 'entregado', 
    notified: boolean
  ) => {
    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          return { 
            ...a, 
            status, 
            notified, 
            notifiedAt: notified ? (a.notifiedAt || new Date().toLocaleTimeString()) : undefined 
          };
        }
        return a;
      });
      return { ...p, assignments };
    });
    setPeriods(updatedPeriods);
    setActiveDropdownId(null);
    triggerNotification('Se actualizó el estado del turno correctamente.', 'success');
  };

  // Compile all assignments that have been "notified" (or all assignments in general so they can be simulated)
  const allAssignments: Assignment[] = periods.flatMap(p => p.assignments);

  // Filter assignments for the latest generated period to keep it clean, or all
  const latestPeriod = periods.length > 0 
    ? [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : null;

  const currentAssignments = latestPeriod ? latestPeriod.assignments : [];

  const handleSimulateSend = (assignmentId: string) => {
    // Force set as notified
    let memberName = '';
    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          const m = members.find(mem => mem.id === a.primaryMemberId);
          if (m) memberName = m.name;
          return { ...a, notified: true, notifiedAt: new Date().toLocaleTimeString() };
        }
        return a;
      });
      return { ...p, assignments };
    });

    setPeriods(updatedPeriods);
    setSelectedAssignmentId(assignmentId);
    triggerNotification(`Recordatorio de WhatsApp enviado simuladamente a ${memberName}.`, 'success');
  };

  const handleMobileReply = (assignmentId: string, status: 'confirmado' | 'rechazado') => {
    let memberName = '';
    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          const m = members.find(mem => mem.id === a.primaryMemberId);
          if (m) memberName = m.name;
          return { ...a, status };
        }
        return a;
      });
      return { ...p, assignments };
    });

    setPeriods(updatedPeriods);
    triggerNotification(`¡${memberName} respondió al WhatsApp marcando su estado como ${status.toUpperCase()}!`, 'success');
  };

  // Get all assignments in the current period that have not been notified yet (Bulk queue)
  const pendingNotified = currentAssignments.filter(a => !a.notified);
  const nextPending = pendingNotified[0];
  const nextMember = nextPending ? members.find(m => m.id === nextPending.primaryMemberId) : null;
  const nextAreaMeta = nextPending ? AREAS_METADATA.find(am => am.name === nextPending.area) : null;
  const nextDaySp = nextPending ? getDayNameSpanish(nextPending.date) : '';

  const handleSendNextInQueue = () => {
    if (!nextPending || !nextMember) return;
    
    // 1. Mark as notified
    handleSimulateSend(nextPending.id);
    
    // 2. Open WhatsApp link in new tab with the corrected, encoded text
    const urlText = getWhatsAppMessageText(
      nextMember.name, 
      nextAreaMeta?.emoji || String.fromCodePoint(0x1F4CB), 
      nextPending.area, 
      nextPending.date, 
      nextDaySp, 
      window.location.origin, 
      nextPending.id
    );
    
    const cleanPhone = nextMember.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(urlText)}`, '_blank');
  };

  const handleCopyNextInQueue = () => {
    if (!nextPending || !nextMember) return;
    
    const urlText = getWhatsAppMessageText(
      nextMember.name, 
      nextAreaMeta?.emoji || String.fromCodePoint(0x1F4CB), 
      nextPending.area, 
      nextPending.date, 
      nextDaySp, 
      window.location.origin, 
      nextPending.id
    );
    
    navigator.clipboard.writeText(urlText)
      .then(() => {
        triggerNotification(`¡Mensaje para ${nextMember.name} copiado!`, 'success');
        handleSimulateSend(nextPending.id); // mark as simulated/sent in UI
      })
      .catch(() => {
        triggerNotification('No se pudo copiar el mensaje.', 'warning');
      });
  };

  const handleMarkAllAsNotified = () => {
    const updatedPeriods = periods.map(p => {
      if (latestPeriod && p.id === latestPeriod.id) {
        return {
          ...p,
          assignments: p.assignments.map(a => ({
            ...a,
            notified: true,
            notifiedAt: a.notifiedAt || new Date().toLocaleTimeString()
          }))
        };
      }
      return p;
    });
    setPeriods(updatedPeriods);
    triggerNotification('Todos los recordatorios de hoy se marcaron como enviados.', 'success');
  };

  // Find active assignment for simulated mobile phone
  const activeAssignment = allAssignments.find(a => a.id === selectedAssignmentId) || allAssignments.find(a => a.notified) || allAssignments[0];
  const activeMember = activeAssignment ? members.find(m => m.id === activeAssignment.primaryMemberId) : null;
  const activeAreaMeta = activeAssignment ? AREAS_METADATA.find(am => am.name === activeAssignment.area) : null;

  // Compile beautiful WhatsApp text
  const waText = (activeMember && activeAssignment && activeAreaMeta) 
    ? getWhatsAppMessageText(
        activeMember.name, 
        activeAreaMeta.emoji, 
        activeAssignment.area, 
        activeAssignment.date, 
        getDayNameSpanish(activeAssignment.date), 
        window.location.origin, 
        activeAssignment.id
      )
    : '';

  return (
    <div className="space-y-8 animate-fade-in" id="confirmations-root">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="confirmations-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Confirmaciones en Tiempo Real
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa el estado de entrega y respuestas de WhatsApp. Interactúa con el simulador de móvil de los integrantes.
          </p>
        </div>
      </div>

      {/* Main Grid: Messages List vs Phone Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="confirmations-main">
        
        {/* Left Side: Sent Logs & Queue */}
        <div className="lg:col-span-7 space-y-5" id="confirmations-logs">
          
          {/* WhatsApp Bot Automator Card */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl border border-indigo-500/20 p-6 shadow-xl relative overflow-hidden" id="wa-bot-card">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-8xl select-none">
              🤖
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-indigo-500/20 text-indigo-300 rounded-2xl flex items-center justify-center text-xl font-bold border border-indigo-500/30">
                🤖
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">Robot de Envío y Confirmaciones</h3>
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Asistente Automador Inteligente</span>
              </div>
            </div>

            {currentAssignments.length === 0 ? (
              <p className="text-xs text-indigo-200">Genera un cronograma activo para habilitar la cola de envíos automáticos.</p>
            ) : pendingNotified.length === 0 ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h4 className="font-bold text-xs text-emerald-300">¡Todo al día y enviado!</h4>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-relaxed">
                    Has enviado todos los recordatorios para este ciclo de servicios. En cuanto los chicos abran el enlace, el bot registrará sus respuestas al instante aquí.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Siguiente en Cola de Envío</span>
                    <h4 className="font-extrabold text-sm text-white mt-1 flex items-center gap-2">
                      <span>{nextMember?.name}</span>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/20 font-mono">
                        {nextMember?.phone}
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Asignado(a) a: <strong className="text-white">{nextPending.area}</strong> ({nextDaySp} {new Date(nextPending.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-indigo-300">{currentAssignments.length - pendingNotified.length} / {currentAssignments.length}</span>
                    <span className="text-[9px] text-gray-400 block mt-0.5 uppercase tracking-wide font-bold">Enviados Hoy</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSendNextInQueue}
                    className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>⚡ Enviar WhatsApp</span>
                  </button>

                  <button
                    onClick={handleCopyNextInQueue}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-gray-200 dark:border-gray-700 text-center"
                    title="Copiar mensaje al portapapeles (evita errores de emoji)"
                  >
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>Copiar Texto</span>
                  </button>

                  <button
                    onClick={handleMarkAllAsNotified}
                    className="py-3 px-4 bg-white/10 hover:bg-white/15 active:scale-98 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer text-center"
                    title="Marcar todos los recordatorios como enviados sin abrir chats"
                  >
                    Marcar todos como enviados
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Inbox className="w-5 h-5 text-indigo-500" />
                Bitácora de Notificaciones (WhatsApp)
              </h3>
              <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full font-mono font-bold">
                Ciclo Actual
              </span>
            </div>

            {currentAssignments.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                <p className="text-sm text-gray-400">No hay turnos activos para simular notificaciones. Genera un cronograma primero.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {currentAssignments.map(a => {
                  const m = members.find(mem => mem.id === a.primaryMemberId);
                  const isSelected = activeAssignment && activeAssignment.id === a.id;
                  const daySp = getDayNameSpanish(a.date);
                  const meta = AREAS_METADATA.find(am => am.name === a.area);

                  // Formatting date
                  const dObj = new Date(a.date + 'T00:00:00');
                  const readableDate = dObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                  return (
                    <div 
                      key={a.id}
                      onClick={() => setSelectedAssignmentId(a.id)}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-xs' 
                          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl p-2 bg-gray-50 dark:bg-gray-850 rounded-xl">
                          {m?.photoUrl || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-gray-900 dark:text-white text-sm">{m?.name || 'Steven (Soporte)'}</h4>
                            <span className="text-[10px] font-mono text-gray-400">{m?.phone}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <span>{meta?.emoji}</span>
                            <span className="font-medium text-gray-600 dark:text-gray-300">{a.area}</span>
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.2 rounded">
                              {daySp} {readableDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notified Status or Action */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {a.notified ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Enviado</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">Enviado: {a.notifiedAt || '9:00 AM'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSimulateSend(a.id); }}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-all cursor-pointer"
                              title="Simular en el teléfono de la derecha"
                              id={`btn-send-sim-${a.id}`}
                            >
                              Simular
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = getWhatsAppMessageText(
                                  m?.name || '',
                                  meta?.emoji || '',
                                  a.area,
                                  a.date,
                                  daySp,
                                  window.location.origin,
                                  a.id
                                );
                                navigator.clipboard.writeText(msg)
                                  .then(() => {
                                    triggerNotification(`¡Mensaje para ${m?.name} copiado!`, 'success');
                                    handleSimulateSend(a.id);
                                  })
                                  .catch(() => {
                                    triggerNotification('No se pudo copiar el mensaje.', 'warning');
                                  });
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all border border-gray-200 dark:border-gray-700"
                              title="Copiar mensaje listo (evita errores de emojis)"
                              id={`btn-copy-${a.id}`}
                            >
                              <Copy className="w-3 h-3" />
                              Copiar
                            </button>
                            <a 
                              href={`https://wa.me/${m?.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(getWhatsAppMessageText(m?.name || '', meta?.emoji || '', a.area, a.date, daySp, window.location.origin, a.id))}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => { e.stopPropagation(); handleSimulateSend(a.id); }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                              title="Abrir WhatsApp con mensaje pre-redactado"
                              id={`btn-send-real-${a.id}`}
                            >
                              <Send className="w-3 h-3" />
                              WhatsApp
                            </a>
                          </div>
                        )}

                        {/* Attendance state chip */}
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${
                          a.status === 'confirmado' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                            : a.status === 'rechazado' 
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900/30' 
                            : a.status === 'enviado'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                            : a.status === 'entregado'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                        }`}>
                          {a.status}
                        </span>

                        {/* Three Dots Manual Selection Dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === a.id ? null : a.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            title="Cambiar estado manualmente"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === a.id && (
                            <>
                              {/* Overlay/Backdrop to dismiss dropdown */}
                              <div 
                                className="fixed inset-0 z-10 cursor-default" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                }}
                              />
                              <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl py-1.5 z-20 animate-scale-up text-left">
                                <span className="block px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1.5 mb-1">
                                  Cambiar Estado
                                </span>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualUpdateStatus(a.id, 'pendiente', false);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>🔄</span> Desmarcar / Pendiente
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualUpdateStatus(a.id, 'enviado', true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-1.5 cursor-pointer font-medium"
                                >
                                  <span>📤</span> Marcar como Enviado
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualUpdateStatus(a.id, 'entregado', true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center gap-1.5 cursor-pointer font-medium"
                                >
                                  <span>📩</span> Marcar como Entregado
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualUpdateStatus(a.id, 'confirmado', true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-1.5 cursor-pointer font-bold"
                                >
                                  <span>✅</span> Marcar como Confirmado
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualUpdateStatus(a.id, 'rechazado', true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-1.5 cursor-pointer font-bold"
                                >
                                  <span>❌</span> Marcar como Rechazado
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Simulated Phone Render */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start" id="confirmations-simulator">
          {activeAssignment && activeMember ? (
            <div className="w-full max-w-[340px] border-[10px] border-gray-950 dark:border-gray-800 rounded-[40px] shadow-2xl bg-slate-900 overflow-hidden relative font-sans" id="phone-mockup">
              {/* Speaker / Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-32 bg-gray-950 rounded-b-xl z-20 flex items-center justify-center">
                <span className="h-1 w-8 bg-gray-800 rounded-full"></span>
              </div>

              {/* Status bar */}
              <div className="h-10 bg-emerald-700 dark:bg-emerald-900 text-white text-[10px] flex items-end justify-between px-6 pb-1.5 z-10 relative font-mono font-semibold">
                <span>12:00 PM</span>
                <div className="flex items-center gap-1.5">
                  <span>📶</span>
                  <span>🔋 98%</span>
                </div>
              </div>

              {/* WhatsApp Header */}
              <div className="bg-emerald-600 dark:bg-emerald-800 text-white p-3 pt-1 flex items-center gap-2 shadow-md relative z-10">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-extrabold text-sm border border-white/20">
                  {activeMember.photoUrl}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight flex items-center gap-1">
                    <span>{activeMember.name}</span>
                    <span className="text-[8px] bg-white/25 px-1 py-0.2 rounded font-mono">Online</span>
                  </h4>
                  <p className="text-[9px] text-emerald-100 leading-none">Últ. vez hoy 11:58 AM</p>
                </div>
              </div>

              {/* Chat Canvas (WhatsApp Background style) */}
              <div className="h-[430px] bg-[#efeae2] dark:bg-[#0b141a] p-3 overflow-y-auto space-y-4 flex flex-col justify-between scrollbar-none relative">
                {/* Simulated message bubbles */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                  <div className="text-center">
                    <span className="text-[9px] bg-white/85 dark:bg-gray-800 text-gray-500 font-bold px-2 py-0.5 rounded shadow-2xs uppercase">
                      Hoy
                    </span>
                  </div>

                  {/* Incoming WhatsApp Template */}
                  <div className="bg-white dark:bg-[#1f2c34] text-gray-800 dark:text-gray-100 p-3 rounded-2xl rounded-tl-none shadow-xs text-xs max-w-[90%] space-y-2 relative border border-gray-100/10">
                    <p className="whitespace-pre-line leading-relaxed font-sans">{waText}</p>
                    
                    {/* Interactive Links in Chat bubble */}
                    <div className="pt-2 border-t border-gray-150 dark:border-gray-700/60 flex flex-col gap-1.5">
                      <button 
                        onClick={() => handleMobileReply(activeAssignment.id, 'confirmado')}
                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          activeAssignment.status === 'confirmado' 
                            ? 'bg-emerald-600 border-emerald-600 text-white font-extrabold' 
                            : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                        }`}
                        id="btn-phone-confirm"
                      >
                        ✅ Confirmar asistencia
                      </button>
                      
                      <button 
                        onClick={() => handleMobileReply(activeAssignment.id, 'rechazado')}
                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          activeAssignment.status === 'rechazado' 
                            ? 'bg-rose-600 border-rose-600 text-white font-extrabold' 
                            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                        }`}
                        id="btn-phone-reject"
                      >
                        ❌ No podré asistir
                      </button>
                    </div>

                    <span className="text-[8px] text-gray-400 font-mono absolute bottom-1 right-2">
                      12:00 PM ✓✓
                    </span>
                  </div>

                  {/* Member's Reply Bubble */}
                  {activeAssignment.status !== 'pendiente' && (
                    <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-white p-2.5 rounded-2xl rounded-tr-none shadow-xs text-xs max-w-[85%] self-end ml-auto relative border border-emerald-100/10">
                      <p className="font-semibold leading-tight pr-4">
                        {activeAssignment.status === 'confirmado' 
                          ? '¡Confirmado! Llegaré puntual 30 minutos antes para alistar los equipos. Gracias.' 
                          : 'Hola, mil disculpas, se me presenta un imprevisto y esta vez no podré asistir al servicio.'}
                      </p>
                      <span className="text-[8px] text-gray-500 dark:text-emerald-200 font-mono block text-right mt-1">
                        12:01 PM ✓✓
                      </span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 rounded-xl flex items-center gap-1.5">
                  <span className="text-sm">😊</span>
                  <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-2.5 py-1 text-[10px] text-gray-400">
                    Mensaje...
                  </div>
                  <span className="text-xs bg-emerald-600 text-white h-5 w-5 rounded-full flex items-center justify-center">🎤</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[500px] w-[340px] bg-gray-50 dark:bg-gray-800/20 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-gray-800/80 flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-4 shadow-inner">
              <Smartphone className="w-12 h-12 text-gray-300" />
              <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Simulador de WhatsApp</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                  Selecciona cualquier notificación de la bitácora de la izquierda para verla en el teléfono y simular las respuestas.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
