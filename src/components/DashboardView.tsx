/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  MessageSquare, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  UserCheck, 
  Bell, 
  Clock,
  Send,
  Copy
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType } from '../types';
import { AREAS_METADATA, getDayNameSpanish } from '../data';
import { getWhatsAppMessageText } from '../utils/scheduler';

interface DashboardViewProps {
  members: Member[];
  periods: SchedulePeriod[];
  setPeriods: React.Dispatch<React.SetStateAction<SchedulePeriod[]>>;
  setActiveTab: (tab: string) => void;
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
  onSimulateMessage: (assignment: Assignment, member: Member) => void;
}

export default function DashboardView({
  members,
  periods,
  setPeriods,
  setActiveTab,
  triggerNotification,
  onSimulateMessage
}: DashboardViewProps) {
  const [isSimulatingToday, setIsSimulatingToday] = useState(false);

  // Get current date or simulate current date as July 16, 2026 (the context local time)
  const systemDateStr = '2026-07-16';
  const systemDayName = getDayNameSpanish(systemDateStr);

  // Compute stats
  const activeMembersCount = members.filter(m => m.active).length;
  
  // Find current/latest period
  const latestPeriod = periods.length > 0 
    ? [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : null;

  const totalAssignments = periods.reduce((sum, p) => sum + p.assignments.length, 0);
  
  // Calculate attendance rate
  let confirmedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  
  periods.forEach(p => {
    p.assignments.forEach(a => {
      if (a.status === 'confirmado') confirmedCount++;
      else if (a.status === 'rechazado') rejectedCount++;
      else pendingCount++;
    });
  });

  const totalResponded = confirmedCount + rejectedCount;
  const attendanceRate = totalResponded > 0 
    ? Math.round((confirmedCount / totalResponded) * 100) 
    : 100;

  // Find assignments for today (simulating 2026-07-16, which is a Thursday)
  const todayAssignments = latestPeriod 
    ? latestPeriod.assignments.filter(a => a.date === systemDateStr)
    : [];

  // Find upcoming assignments (next 5 days)
  const upcomingAssignments = latestPeriod
    ? latestPeriod.assignments
        .filter(a => a.date >= systemDateStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
    : [];

  const handleSimulateDailyCron = () => {
    setIsSimulatingToday(true);
    
    if (!latestPeriod) {
      triggerNotification('No hay cronogramas creados. Genera uno en la pestaña de Cronogramas.', 'warning');
      setIsSimulatingToday(false);
      return;
    }

    if (todayAssignments.length === 0) {
      triggerNotification(`Hoy (${systemDayName} 16 Jul) no hay culto programado en la configuración.`, 'info');
      setIsSimulatingToday(false);
      return;
    }

    // Send reminders to all assigned people for today
    let sentCount = 0;
    const updatedAssignments = latestPeriod.assignments.map(a => {
      if (a.date === systemDateStr && !a.notified) {
        sentCount++;
        const m = members.find(mem => mem.id === a.primaryMemberId);
        if (m) {
          onSimulateMessage(a, m);
        }
        return { ...a, notified: true, notifiedAt: new Date().toLocaleTimeString() };
      }
      return a;
    });

    if (sentCount > 0) {
      setPeriods(periods.map(p => p.id === latestPeriod.id ? { ...p, assignments: updatedAssignments } : p));
      triggerNotification(`¡Se enviaron ${sentCount} recordatorios de WhatsApp de forma automática!`, 'success');
    } else {
      triggerNotification('Los recordatorios para el culto de hoy ya habían sido enviados.', 'info');
    }

    setIsSimulatingToday(false);
  };

  const handleNotifyAssignment = (assignmentId: string) => {
    if (!latestPeriod) return;
    const updatedAssignments = latestPeriod.assignments.map(a => {
      if (a.id === assignmentId) {
        const m = members.find(mem => mem.id === a.primaryMemberId);
        if (m) {
          onSimulateMessage(a, m);
        }
        return { ...a, notified: true, notifiedAt: new Date().toLocaleTimeString() };
      }
      return a;
    });
    setPeriods(periods.map(p => p.id === latestPeriod.id ? { ...p, assignments: updatedAssignments } : p));
  };

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-root">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-950 to-gray-900 text-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-800" id="dash-welcome">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Sistema Activo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Bienvenido al DECOM Manager
          </h1>
          <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
            Administración del Departamento de Comunicaciones. Controla la asistencia, asignaciones automatizadas, y notificaciones de WhatsApp desde un solo lugar.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setActiveTab('cronogramas')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-gray-950 font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
            id="btn-dash-gen"
          >
            <Sparkles className="w-4 h-4" />
            Generar Cronograma
          </button>
          <button 
            onClick={handleSimulateDailyCron}
            disabled={isSimulatingToday}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white border border-gray-700 font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="btn-dash-sim"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            Ejecutar Cron Diario
          </button>
        </div>
      </div>

      {/* Date & Quick Config Simulator Banner */}
      <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4" id="sim-banner">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium uppercase tracking-wider">Fecha de Simulación del Sistema</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold">
              Hoy es <span className="underline font-bold text-amber-700 dark:text-amber-400">Jueves 16 de Julio, 2026</span> (Contexto Actual)
            </p>
          </div>
        </div>
        <div className="text-xs text-amber-800 dark:text-amber-400 max-w-md bg-white/60 dark:bg-black/20 p-2 rounded border border-amber-200/50">
          <strong>Lógica del Cron:</strong> Cada día a primera hora, el sistema evalúa si hoy hay culto. Si sí, envía de forma automatizada y personalizada las asignaciones del día por WhatsApp.
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-grid">
        {/* Stat 1 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between" id="stat-members">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Integrantes Activos</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{activeMembersCount}</p>
            <p className="text-xs text-gray-500">De un total de {members.length} registrados</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between" id="stat-attendance">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Asistencia Promedio</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{attendanceRate}%</p>
            <p className="text-xs text-gray-500">
              <span className="text-emerald-500 font-medium">✓ {confirmedCount}</span> confirmados de {totalResponded || 0} respuestas
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between" id="stat-pending">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Confirmaciones Pendientes</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{pendingCount}</p>
            <p className="text-xs text-gray-500">Respuestas de asistencia en espera</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between" id="stat-total">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Servicios Asignados</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{totalAssignments}</p>
            <p className="text-xs text-gray-500">Acumulado total de turnos generados</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Culto & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="dash-main-content">
        {/* Today's Culto Box */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-6 shadow-sm flex flex-col justify-between" id="dash-today-box">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Servicio de Hoy</h3>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                16 Jul, 2026
              </span>
            </div>

            {todayAssignments.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
                  <p className="text-xs text-gray-400 font-medium">Culto de Hoy (Jueves)</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">Culto de Discipulado</p>
                  <p className="text-xs text-gray-500 mt-1">⏰ 7:00 PM (Llegada 6:30 PM)</p>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 pt-2">Equipo Asignado</p>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {todayAssignments.map(a => {
                    const primary = members.find(m => m.id === a.primaryMemberId);
                    const support = a.supportMemberId ? members.find(m => m.id === a.supportMemberId) : null;
                    const meta = AREAS_METADATA.find(am => am.name === a.area);

                    return (
                      <div 
                        key={a.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-50 dark:border-gray-800/40 bg-white dark:bg-gray-900 shadow-xs hover:border-gray-200 dark:hover:border-gray-700/80 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">{meta?.emoji}</span>
                          <div>
                            <p className="text-xs text-gray-400 font-medium">{a.area}</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {primary?.name || 'Sin asignar'}
                              {support && (
                                <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded ml-2">
                                  + Apoyo: {support.name}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status chip */}
                        <div className="flex items-center gap-2">
                          {a.status === 'confirmado' || a.status === 'rechazado' ? (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                              a.status === 'confirmado' 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                            }`}>
                              {a.status === 'confirmado' ? '✓ Confirmado' : '✗ Rechazado'}
                            </span>
                          ) : !a.notified ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 px-2 py-0.5 rounded-md font-medium">
                                Pendiente
                              </span>
                              <button
                                onClick={() => {
                                  if (!primary) return;
                                  const msg = getWhatsAppMessageText(
                                    primary.name,
                                    meta?.emoji || '',
                                    a.area,
                                    a.date,
                                    systemDayName,
                                    window.location.origin,
                                    a.id
                                  );
                                  navigator.clipboard.writeText(msg)
                                    .then(() => {
                                      triggerNotification(`¡Mensaje para ${primary.name} copiado!`, 'success');
                                      handleNotifyAssignment(a.id);
                                    })
                                    .catch(() => {
                                      triggerNotification('No se pudo copiar el mensaje.', 'warning');
                                    });
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all border border-gray-200 dark:border-gray-700"
                                title="Copiar mensaje al portapapeles (100% libre de errores de emoji)"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                Copiar
                              </button>
                              <a
                                href={`https://wa.me/${primary?.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  getWhatsAppMessageText(
                                    primary?.name || '',
                                    meta?.emoji || '',
                                    a.area,
                                    a.date,
                                    systemDayName,
                                    window.location.origin,
                                    a.id
                                  )
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => handleNotifyAssignment(a.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                title="Enviar por WhatsApp Real"
                              >
                                <Send className="w-2.5 h-2.5" />
                                WhatsApp
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <div className="text-4xl text-gray-300">🎉</div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Día libre para el ministerio</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Hoy no hay servicios religiosos programados que requieran soporte del departamento de comunicaciones.
                </p>
              </div>
            )}
          </div>

          {todayAssignments.length > 0 && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={handleSimulateDailyCron}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-gray-950 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                id="btn-trigger-whatsapp-group"
              >
                <Send className="w-4 h-4" />
                Enviar Recordatorios por WhatsApp
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Simula el envío automatizado de mensajes de texto correspondientes al día de hoy.
              </p>
            </div>
          )}
        </div>

        {/* Upcoming Assignments / Agenda */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between" id="dash-agenda-box">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-500" />
                Próximas Asignaciones
              </h3>
              <button 
                onClick={() => setActiveTab('calendario')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                id="btn-go-calendar"
              >
                Ver calendario completo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {upcomingAssignments.map((a, idx) => {
                  const primary = members.find(m => m.id === a.primaryMemberId);
                  const support = a.supportMemberId ? members.find(m => m.id === a.supportMemberId) : null;
                  const meta = AREAS_METADATA.find(am => am.name === a.area);
                  const dSpanish = getDayNameSpanish(a.date);
                  
                  // Beautiful date display
                  const dateObj = new Date(a.date + 'T00:00:00');
                  const dayNum = dateObj.getDate();
                  const monthName = dateObj.toLocaleDateString('es-ES', { month: 'short' });

                  return (
                    <div 
                      key={a.id + '-' + idx}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-gray-50 dark:border-gray-800/40 bg-white dark:bg-gray-900 shadow-2xs hover:shadow-xs hover:border-gray-200 dark:hover:border-gray-700/80 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Date badge */}
                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700/30 group-hover:bg-indigo-50 group-hover:border-indigo-100 dark:group-hover:bg-indigo-950/20 dark:group-hover:border-indigo-900/50 transition-colors">
                          <span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 leading-none">{dSpanish.slice(0,3)}</span>
                          <span className="text-lg font-bold leading-none mt-0.5">{dayNum}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{primary?.name || 'Sin asignar'}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium font-mono bg-gray-100 dark:bg-gray-800 text-gray-500">
                              {a.date === systemDateStr ? 'Hoy' : monthName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <span className="text-base leading-none">{meta?.emoji}</span>
                            <span className="font-medium text-gray-600 dark:text-gray-400">{a.area}</span>
                            {support && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/10 px-1 py-0.2 rounded font-mono">
                                con apoyo de {support.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status indicator */}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          a.status === 'confirmado' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            : a.status === 'rechazado'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30'
                        }`}>
                          {a.status === 'confirmado' ? '✓ Confirmado' : a.status === 'rechazado' ? '✗ Rechazado' : '⚡ Pendiente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4">
                <div className="h-12 w-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">No hay asignaciones programadas</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Ve a la sección de Cronogramas para generar un nuevo período de asignaciones automáticas del 16 al 16.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('cronogramas')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
                  id="btn-go-cron"
                >
                  Ir a Cronogramas
                </button>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center justify-between">
            <span>Último cronograma activo: {latestPeriod ? latestPeriod.name : 'Ninguno'}</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Total: {upcomingAssignments.length} próximas asignaciones</span>
          </div>
        </div>
      </div>
    </div>
  );
}
