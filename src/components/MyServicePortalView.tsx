/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Calendar, 
  Check, 
  X, 
  AlertCircle, 
  ArrowRight, 
  User, 
  Sparkles, 
  Clock, 
  Send, 
  MessageSquare, 
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType } from '../types';
import { AREAS_METADATA, getDayNameSpanish } from '../data';

interface MyServicePortalViewProps {
  periods: SchedulePeriod[];
  setPeriods: React.Dispatch<React.SetStateAction<SchedulePeriod[]>>;
  members: Member[];
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
}

export default function MyServicePortalView({
  periods,
  setPeriods,
  members,
  triggerNotification,
  selectedMemberId,
  setSelectedMemberId
}: MyServicePortalViewProps) {
  // Active tab inside the portal
  const [portalTab, setPortalTab] = useState<'upcoming' | 'history'>('upcoming');

  // Declinación sub-panels open state (stores assignment.id)
  const [decliningAssignmentId, setDecliningAssignmentId] = useState<string>('');

  // Declination form states
  const [rejectReasonCategory, setRejectReasonCategory] = useState<string>('Salud');
  const [customReason, setCustomReason] = useState<string>('');
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');
  const [replacementSearch, setReplacementSearch] = useState<string>('');

  // Persist the simulated "login"
  useEffect(() => {
    localStorage.setItem('portal_logged_member_id', selectedMemberId);
    // Reset declination states on member change
    setDecliningAssignmentId('');
    setSelectedReplacementId('');
    setCustomReason('');
  }, [selectedMemberId]);

  // Selected member details
  const currentMember = members.find(m => m.id === selectedMemberId);

  // Real today date string YYYY-MM-DD
  const TODAY = new Date().toISOString().split('T')[0];

  // Find all assignments of the selected member across all periods
  const myAssignments: { assignment: Assignment; periodId: string }[] = [];
  periods.forEach(p => {
    p.assignments.forEach(a => {
      if (a.primaryMemberId === selectedMemberId || a.supportMemberId === selectedMemberId) {
        myAssignments.push({ assignment: a, periodId: p.id });
      }
    });
  });

  // Separate into upcoming and past relative to TODAY
  let upcomingAssignments = myAssignments
    .filter(item => item.assignment.date >= TODAY)
    .sort((a, b) => a.assignment.date.localeCompare(b.assignment.date));

  let pastAssignments = myAssignments
    .filter(item => item.assignment.date < TODAY)
    .sort((a, b) => b.assignment.date.localeCompare(a.assignment.date));

  // Fallback: if all generated assignments are earlier than today (e.g., from July 16),
  // show all assignments in upcoming sorted ascendingly so the user is never left with an empty view
  if (upcomingAssignments.length === 0 && myAssignments.length > 0) {
    upcomingAssignments = [...myAssignments].sort((a, b) => a.assignment.date.localeCompare(b.assignment.date));
    pastAssignments = [];
  }


  // Handle Confirm Assignment
  const handleConfirm = (assignmentId: string) => {
    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          return {
            ...a,
            status: 'confirmado' as const,
            notified: true,
            rejectReason: undefined // Clear if previously rejected
          };
        }
        return a;
      });
      return { ...p, assignments };
    });

    setPeriods(updatedPeriods);
    triggerNotification('¡Servicio confirmado exitosamente! ¡Muchas gracias por tu apoyo! ⛪', 'success');
  };

  // Handle Decline (Simple - no reassignment)
  const handleSimpleDecline = (assignmentId: string) => {
    const finalReason = rejectReasonCategory === 'Otro' ? customReason.trim() : rejectReasonCategory;
    if (!finalReason) {
      triggerNotification('Por favor, indica la razón de tu inasistencia.', 'warning');
      return;
    }

    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          return {
            ...a,
            status: 'rechazado' as const,
            rejectReason: finalReason
          };
        }
        return a;
      });
      return { ...p, assignments };
    });

    setPeriods(updatedPeriods);
    setDecliningAssignmentId('');
    triggerNotification('Se registró tu inasistencia. Se le notificará al coordinador.', 'warning');
  };

  // Handle Reassign and Decline
  const handleReassignAndDecline = (assignmentId: string) => {
    if (!selectedReplacementId) {
      triggerNotification('Por favor, selecciona un compañero para reasignarle el servicio.', 'warning');
      return;
    }

    const replacementMember = members.find(m => m.id === selectedReplacementId);
    if (!replacementMember) return;

    const finalReason = rejectReasonCategory === 'Otro' ? customReason.trim() : rejectReasonCategory;
    if (!finalReason) {
      triggerNotification('Por favor, indica la razón de tu inasistencia.', 'warning');
      return;
    }

    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          const isPrimary = a.primaryMemberId === selectedMemberId;
          
          return {
            ...a,
            // Reassign the role
            primaryMemberId: isPrimary ? selectedReplacementId : a.primaryMemberId,
            supportMemberId: !isPrimary ? selectedReplacementId : a.supportMemberId,
            // Reset status to pending so the replacement confirms
            status: 'pendiente' as const,
            notified: false, // Need to notify the new guy!
            notifiedAt: undefined,
            // Store the audit info
            rejectReason: `Reasignado por ${currentMember?.name} (${finalReason})`,
            reassignedFromId: selectedMemberId
          };
        }
        return a;
      });
      return { ...p, assignments };
    });

    setPeriods(updatedPeriods);
    setDecliningAssignmentId('');
    setSelectedReplacementId('');
    triggerNotification(`¡Servicio reasignado con éxito a ${replacementMember.name}! El servicio ha quedado en estado pendiente para su confirmación.`, 'success');
  };

  // Calculate available members for a specific date
  const getAvailableMembersForDate = (date: string, area: AreaType) => {
    // 1. Get all assignments on this date across all periods
    const busyMemberIds = new Set<string>();
    periods.forEach(p => {
      p.assignments.forEach(a => {
        if (a.date === date) {
          busyMemberIds.add(a.primaryMemberId);
          if (a.supportMemberId) busyMemberIds.add(a.supportMemberId);
        }
      });
    });

    // 2. Filter active members who are not busy, not the current member, and who are eligible
    const list = members.filter(m => {
      if (!m.active) return false;
      if (m.id === selectedMemberId) return false;
      if (busyMemberIds.has(m.id)) return false;
      return true;
    });

    // 3. Sort so that members who actually have this Area in their roles come first (highly recommended!)
    const sorted = [...list].sort((a, b) => {
      const aTrained = a.roles.includes(area) ? 1 : 0;
      const bTrained = b.roles.includes(area) ? 1 : 0;
      return bTrained - aTrained; // Trained comes first
    });

    return sorted;
  };

  // Common pre-defined reasons
  const REASON_CATEGORIES = [
    'Salud / Enfermedad',
    'Trabajo / Turno laboral',
    'Estudios / Exámenes',
    'Viaje / Fuera de la ciudad',
    'Compromiso Familiar',
    'Otro'
  ];

  return (
    <div className="space-y-8 animate-fade-in" id="portal-root">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="portal-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="text-indigo-600 w-8 h-8" />
            Portal de Servidores DECOM
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Simula el acceso de los chicos del equipo para confirmar sus servicios, reportar inasistencias y delegar reemplazos directamente.
          </p>
        </div>
        
        {/* Sim Session Picker */}
        <div className="flex items-center gap-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-4 py-3 rounded-2xl" id="sim-session-picker">
          <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Acceder como:</span>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">-- Selecciona Integrante --</option>
            {members.filter(m => m.active).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* State A: No server selected */}
      {!selectedMemberId && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-center shadow-xs" id="empty-portal">
          <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
            ⛪
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Ingresa al Portal de Servicios</h2>
          <p className="text-xs text-gray-500 max-w-sm mb-6">
            Selecciona un integrante en el menú desplegable superior para ver su cronograma individual, realizar confirmaciones rápidas o reasignar fechas en caso de inasistencia.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {members.filter(m => m.active).slice(0, 4).map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className="w-full text-left px-4 py-2.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-xs font-bold text-gray-700 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{m.photoUrl || '🧑'}</span>
                  <span>{m.name}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* State B: Member is Selected */}
      {selectedMemberId && currentMember && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="active-portal">
          
          {/* Left Column: Member Card & Stats */}
          <div className="lg:col-span-4 space-y-6" id="member-profile-col">
            
            {/* Main Profile Info */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-indigo-500 to-indigo-700" />
              
              <div className="relative mt-6">
                <div className="h-24 w-24 rounded-3xl bg-white dark:bg-gray-800 shadow-lg border-4 border-white dark:border-gray-900 flex items-center justify-center text-5xl">
                  {currentMember.photoUrl || '🧑'}
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" title="Activo" />
              </div>

              <h2 className="text-xl font-black text-gray-900 dark:text-white mt-4">{currentMember.name}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{currentMember.phone}</p>
              
              {/* Areas list */}
              <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                {currentMember.roles.map(r => {
                  const meta = AREAS_METADATA.find(am => am.name === r);
                  return (
                    <span 
                      key={r}
                      className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${meta?.bg || 'bg-gray-50'} ${meta?.color || 'text-gray-500'} ${meta?.border || 'border-gray-100'}`}
                    >
                      {meta?.emoji} {r}
                    </span>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 w-full mt-6 pt-5 text-left space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Disponibilidad semanal:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {Object.values(currentMember.availability).filter(v => v).length} días
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(currentMember.availability).map(([day, available]) => (
                    <span 
                      key={day}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        available 
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' 
                          : 'bg-gray-50 text-gray-300 dark:bg-gray-800/50 dark:text-gray-600 line-through'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Attendance Score/Stats Card */}
            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl border border-indigo-500/20 p-6 shadow-lg">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Resumen de mi Servicio
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
                  <span className="text-[10px] font-bold text-indigo-200 uppercase block mb-1">Total</span>
                  <span className="text-2xl font-black">{myAssignments.length}</span>
                </div>
                <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase block mb-1">Listos</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {myAssignments.filter(a => a.assignment.status === 'confirmado').length}
                  </span>
                </div>
                <div className="bg-rose-500/10 rounded-2xl p-3 border border-rose-500/20 text-center">
                  <span className="text-[10px] font-bold text-rose-300 uppercase block mb-1">Declino</span>
                  <span className="text-2xl font-black text-rose-400">
                    {myAssignments.filter(a => a.assignment.status === 'rechazado').length}
                  </span>
                </div>
              </div>

              {/* Attendance percentage indicator */}
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-indigo-200">Asistencia confirmada</span>
                  <span className="text-emerald-400">
                    {myAssignments.length > 0 
                      ? Math.round((myAssignments.filter(a => a.assignment.status === 'confirmado').length / myAssignments.length) * 100)
                      : 100}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ 
                      width: `${
                        myAssignments.length > 0 
                          ? (myAssignments.filter(a => a.assignment.status === 'confirmado').length / myAssignments.length) * 100
                          : 100
                      }%` 
                    }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Active Assignment List & Logic */}
          <div className="lg:col-span-8 space-y-6" id="member-services-col">
            
            {/* List Navigation Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full sm:w-fit" id="portal-tab-nav">
              <button
                onClick={() => setPortalTab('upcoming')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  portalTab === 'upcoming'
                    ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-sm font-extrabold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mis Próximos Servicios ({upcomingAssignments.length})</span>
              </button>
              <button
                onClick={() => setPortalTab('history')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  portalTab === 'history'
                    ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-sm font-extrabold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Historial de Servicios ({pastAssignments.length})</span>
              </button>
            </div>

            {/* List Content */}
            {portalTab === 'upcoming' ? (
              <div className="space-y-4" id="upcoming-list">
                {upcomingAssignments.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-xs">
                    <span className="text-4xl block mb-3">🎉</span>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">¡No tienes servicios pendientes!</h4>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                      Estás libre por ahora. Los nuevos cronogramas serán publicados por los directores en la cola principal.
                    </p>
                  </div>
                ) : (
                  upcomingAssignments.map(({ assignment: a }) => {
                    const meta = AREAS_METADATA.find(am => am.name === a.area);
                    const dayName = getDayNameSpanish(a.date);
                    const isDeclining = decliningAssignmentId === a.id;
                    const dateObj = new Date(a.date + 'T00:00:00');
                    const formattedDate = dateObj.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });

                    // List of potential replacements
                    const availableReplacements = isDeclining ? getAvailableMembersForDate(a.date, a.area) : [];
                    const filteredReplacements = availableReplacements.filter(r => 
                      r.name.toLowerCase().includes(replacementSearch.toLowerCase())
                    );

                    return (
                      <div 
                        key={a.id}
                        className={`bg-white dark:bg-gray-900 border rounded-3xl p-5 shadow-xs transition-all relative overflow-hidden ${
                          a.status === 'confirmado'
                            ? 'border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/5'
                            : a.status === 'rechazado'
                            ? 'border-rose-100 dark:border-rose-950/30 bg-rose-50/5'
                            : 'border-amber-100 dark:border-amber-950/30 bg-amber-50/5'
                        }`}
                      >
                        {/* Upper card header: date and role */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 dark:border-gray-800/50 pb-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-xl font-bold ${meta?.bg || 'bg-gray-50'} ${meta?.color || 'text-gray-500'} ${meta?.border || 'border-gray-100'}`}>
                              {meta?.emoji || '📋'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{a.area}</h4>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase ${
                                  a.primaryMemberId === selectedMemberId
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                }`}>
                                  {a.primaryMemberId === selectedMemberId ? 'Titular' : 'Soporte / Apoyo'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 capitalize font-medium">{formattedDate}</p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {a.status === 'confirmado' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1.5 rounded-full uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Confirmado
                              </span>
                            )}
                            {a.status === 'rechazado' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 px-3 py-1.5 rounded-full uppercase" title={a.rejectReason}>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                No Asistiré
                              </span>
                            )}
                            {a.status === 'pendiente' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 px-3 py-1.5 rounded-full uppercase animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle panel: Instructions or rejectReason audits */}
                        {a.rejectReason && (
                          <div className="bg-slate-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-3.5 rounded-2xl mb-4 text-xs text-gray-600 dark:text-gray-300">
                            <span className="font-extrabold text-gray-800 dark:text-white block mb-0.5">Nota de Inasistencia / Auditoría:</span>
                            "{a.rejectReason}"
                          </div>
                        )}

                        {/* Lower panel: Quick Actions (when not expanding Decline section) */}
                        {!isDeclining && (
                          <div className="flex flex-wrap items-center gap-2.5 justify-end">
                            {a.status === 'pendiente' && (
                              <button
                                onClick={() => handleConfirm(a.id)}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow-md hover:shadow-emerald-500/15 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                Confirmar Asistencia
                              </button>
                            )}
                            
                            {a.status !== 'rechazado' && (
                              <button
                                onClick={() => {
                                  setDecliningAssignmentId(a.id);
                                  setSelectedReplacementId('');
                                }}
                                className="px-4 py-2 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                No podré asistir
                              </button>
                            )}
                          </div>
                        )}

                        {/* Interactive Declinación Form Panel */}
                        {isDeclining && (
                          <div className="mt-4 border-t border-dashed border-gray-200 dark:border-gray-800 pt-5 space-y-4 animate-slide-in">
                            <div className="flex items-center justify-between">
                              <h5 className="font-extrabold text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                                <AlertTriangle className="w-4 h-4 text-rose-500" />
                                Formulario de Declinación de Servicio
                              </h5>
                              <button 
                                onClick={() => setDecliningAssignmentId('')}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg"
                              >
                                Cancelar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Reason picker */}
                              <div className="space-y-2">
                                <label className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">1. ¿Por qué no puedes asistir?</label>
                                <select
                                  value={rejectReasonCategory}
                                  onChange={(e) => setRejectReasonCategory(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                                >
                                  {REASON_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                                
                                {rejectReasonCategory === 'Otro' && (
                                  <input
                                    type="text"
                                    placeholder="Indica la razón brevemente..."
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 mt-2"
                                  />
                                )}
                              </div>

                              {/* Reassignment / Delegar Picker */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">2. Reasignar a un compañero disponible</label>
                                  <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-md uppercase">Libres hoy</span>
                                </div>

                                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
                                  {/* Quick search */}
                                  <div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-2" />
                                    <input
                                      type="text"
                                      placeholder="Buscar compañero..."
                                      value={replacementSearch}
                                      onChange={(e) => setReplacementSearch(e.target.value)}
                                      className="bg-transparent border-none text-[11px] font-bold text-gray-800 dark:text-gray-200 w-full focus:outline-none focus:ring-0 p-0"
                                    />
                                  </div>

                                  {/* List of replacements scroll block */}
                                  <div className="max-h-40 overflow-y-auto p-1.5 divide-y divide-gray-100/50 dark:divide-gray-800/50 space-y-1">
                                    {filteredReplacements.length === 0 ? (
                                      <p className="text-[10px] text-gray-400 text-center py-4 font-medium">No hay reemplazos disponibles o activos hoy.</p>
                                    ) : (
                                      filteredReplacements.map(r => {
                                        const isTrained = r.roles.includes(a.area);
                                        const isSelected = selectedReplacementId === r.id;
                                        return (
                                          <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setSelectedReplacementId(r.id)}
                                            className={`w-full text-left p-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                                              isSelected
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span>{r.photoUrl || '🧑'}</span>
                                              <span className="truncate max-w-[120px]">{r.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {isTrained && (
                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                                  isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                }`}>
                                                  ⭐ Recomendado
                                                </span>
                                              )}
                                              {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Panel Submit Button row */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col sm:flex-row justify-end gap-2">
                              {/* Submit simple decline without delegation */}
                              <button
                                type="button"
                                onClick={() => handleSimpleDecline(a.id)}
                                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                              >
                                Solo reportar inasistencia
                              </button>

                              {/* Submit with re-assignment */}
                              <button
                                type="button"
                                onClick={() => handleReassignAndDecline(a.id)}
                                disabled={!selectedReplacementId}
                                className={`px-5 py-2.5 font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all text-center ${
                                  selectedReplacementId
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-indigo-500/10 hover:shadow-md'
                                    : 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                                }`}
                              >
                                <Send className="w-3.5 h-3.5" />
                                Confirmar y Reasignar a {selectedReplacementId ? (members.find(m => m.id === selectedReplacementId)?.name || 'compañero') : 'compañero'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Past history list
              <div className="space-y-4" id="history-list">
                {pastAssignments.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-xs">
                    <span className="text-4xl block mb-3">📭</span>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Aún no hay historial de servicios</h4>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                      Tu historial de asistencia confirmada o declinada se acumulará aquí conforme avancen los cultos.
                    </p>
                  </div>
                ) : (
                  pastAssignments.map(({ assignment: a }) => {
                    const meta = AREAS_METADATA.find(am => am.name === a.area);
                    const dateObj = new Date(a.date + 'T00:00:00');
                    const formattedDate = dateObj.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });

                    return (
                      <div 
                        key={a.id}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs opacity-80"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg ${meta?.bg || 'bg-gray-50'} ${meta?.color || 'text-gray-500'}`}>
                            {meta?.emoji || '📋'}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-gray-800 dark:text-white">{a.area}</h5>
                            <p className="text-[10px] text-gray-400 capitalize">{formattedDate}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {a.status === 'confirmado' ? (
                            <span className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 uppercase">
                              Asistió
                            </span>
                          ) : (
                            <span 
                              className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50 uppercase"
                              title={a.rejectReason}
                            >
                              Inasistencia
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
