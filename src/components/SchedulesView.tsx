/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Calendar, 
  Search, 
  Filter, 
  Check, 
  X, 
  User, 
  ChevronRight, 
  CalendarDays, 
  HelpCircle,
  Eye,
  Plus
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType, AssignmentRule } from '../types';
import { generateSchedule, getNextPeriodDates, getDatesForPeriod } from '../utils/scheduler';
import { AREAS_METADATA, getDayNameSpanish, DEFAULT_WEEKLY_CULTOS } from '../data';

interface SchedulesViewProps {
  periods: SchedulePeriod[];
  setPeriods: React.Dispatch<React.SetStateAction<SchedulePeriod[]>>;
  members: Member[];
  rules: AssignmentRule[];
  weeklyCultos: typeof DEFAULT_WEEKLY_CULTOS;
  selectedPeriodId: string;
  setSelectedPeriodId: (id: string) => void;
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
}

export default function SchedulesView({
  periods,
  setPeriods,
  members,
  rules,
  weeklyCultos,
  selectedPeriodId,
  setSelectedPeriodId,
  triggerNotification
}: SchedulesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [showExplanation, setShowExplanation] = useState(false);

  // Manual assignment modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newArea, setNewArea] = useState<AreaType>('Publicidad');
  const [newPrimaryId, setNewPrimaryId] = useState('');
  const [newSupportId, setNewSupportId] = useState('');

  const handleUpdatePrimaryMember = (assignmentId: string, memberId: string) => {
    const updatedPeriods = periods.map(p => {
      if (p.id === selectedPeriodId) {
        const updatedAssignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            return { ...a, primaryMemberId: memberId };
          }
          return a;
        });
        return { ...p, assignments: updatedAssignments };
      }
      return p;
    });
    setPeriods(updatedPeriods);
    triggerNotification('Encargado principal actualizado con éxito.', 'success');
  };

  const handleUpdateSupportMember = (assignmentId: string, memberId: string | undefined) => {
    const updatedPeriods = periods.map(p => {
      if (p.id === selectedPeriodId) {
        const updatedAssignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            return { ...a, supportMemberId: memberId || undefined };
          }
          return a;
        });
        return { ...p, assignments: updatedAssignments };
      }
      return p;
    });
    setPeriods(updatedPeriods);
    triggerNotification('Integrante de apoyo actualizado con éxito.', 'success');
  };

  const handleUpdateArea = (assignmentId: string, area: AreaType) => {
    const updatedPeriods = periods.map(p => {
      if (p.id === selectedPeriodId) {
        const updatedAssignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            return { ...a, area };
          }
          return a;
        });
        return { ...p, assignments: updatedAssignments };
      }
      return p;
    });
    setPeriods(updatedPeriods);
    triggerNotification('Área de servicio actualizada con éxito.', 'success');
  };

  const handleUpdateDate = (assignmentId: string, dateStr: string) => {
    if (!dateStr) return;
    const updatedPeriods = periods.map(p => {
      if (p.id === selectedPeriodId) {
        const updatedAssignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            return { ...a, date: dateStr };
          }
          return a;
        });
        // Sort assignments by date
        updatedAssignments.sort((x, y) => x.date.localeCompare(y.date));
        return { ...p, assignments: updatedAssignments };
      }
      return p;
    });
    setPeriods(updatedPeriods);
    triggerNotification('Fecha de servicio actualizada con éxito.', 'success');
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta asignación del cronograma?')) {
      const updatedPeriods = periods.map(p => {
        if (p.id === selectedPeriodId) {
          const updatedAssignments = p.assignments.filter(a => a.id !== assignmentId);
          return { ...p, assignments: updatedAssignments };
        }
        return p;
      });
      setPeriods(updatedPeriods);
      triggerNotification('Asignación eliminada con éxito.', 'success');
    }
  };

  const openAddModal = () => {
    const activeP = periods.find(p => p.id === selectedPeriodId) || periods[0];
    if (!activeP) {
      triggerNotification('Primero debes generar o seleccionar un período.', 'warning');
      return;
    }
    setNewDate(activeP.startDate);
    const firstActive = members.find(m => m.active);
    setNewPrimaryId(firstActive?.id || '');
    setNewArea('Publicidad');
    setNewSupportId('');
    setShowAddModal(true);
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const activeP = periods.find(p => p.id === selectedPeriodId) || periods[0];
    if (!activeP) {
      triggerNotification('Por favor selecciona un período activo.', 'warning');
      return;
    }
    if (!newDate) {
      triggerNotification('Por favor selecciona una fecha.', 'warning');
      return;
    }
    if (!newPrimaryId) {
      triggerNotification('Por favor selecciona un encargado principal.', 'warning');
      return;
    }

    const newAssignment: Assignment = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: newDate,
      area: newArea,
      primaryMemberId: newPrimaryId,
      supportMemberId: newSupportId || undefined,
      status: 'pendiente',
      notified: false
    };

    const updatedPeriods = periods.map(p => {
      if (p.id === activeP.id) {
        const updatedAssignments = [...p.assignments, newAssignment].sort((x, y) => x.date.localeCompare(y.date));
        return { ...p, assignments: updatedAssignments };
      }
      return p;
    });

    setPeriods(updatedPeriods);
    triggerNotification('Asignación manual agregada exitosamente.', 'success');
    setShowAddModal(false);
  };

  // Compute next period parameters
  const nextDates = getNextPeriodDates(periods);

  const handleGenerateNextPeriod = () => {
    // Generate next period automatically
    try {
      const newPeriod = generateSchedule(
        nextDates.startDate,
        members,
        rules,
        weeklyCultos,
        periods
      );

      setPeriods([...periods, newPeriod]);
      setSelectedPeriodId(newPeriod.id);
      triggerNotification(`¡Se generó correctamente el cronograma "${newPeriod.name}" con ${newPeriod.assignments.length} asignaciones!`, 'success');
    } catch (error) {
      console.error(error);
      triggerNotification('Ocurrió un error al generar el cronograma.', 'warning');
    }
  };

  const handleDeletePeriod = (periodId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cronograma? Esta acción no se puede deshacer.')) {
      const remaining = periods.filter(p => p.id !== periodId);
      setPeriods(remaining);
      if (selectedPeriodId === periodId) {
        setSelectedPeriodId(remaining.length > 0 ? remaining[0].id : '');
      }
      triggerNotification('Cronograma eliminado.', 'success');
    }
  };

  const handleToggleAssignmentStatus = (assignmentId: string, status: 'confirmado' | 'rechazado' | 'pendiente') => {
    const updatedPeriods = periods.map(p => {
      if (p.id === selectedPeriodId) {
        const updatedAssignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            return { ...a, status };
          }
          return a;
        });
        return { ...p, assignments: updatedAssignments };
      }
      return p;
    });

    setPeriods(updatedPeriods);
    triggerNotification(`Asignación marcada como ${status}.`, 'success');
  };

  const activePeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];

  // Calculate workloads for current active period
  const workloadData: { [memberId: string]: number } = {};
  if (activePeriod) {
    activePeriod.assignments.forEach(a => {
      if (a.primaryMemberId) {
        workloadData[a.primaryMemberId] = (workloadData[a.primaryMemberId] || 0) + 1;
      }
    });
  }

  // Filter assignments in active period
  const filteredAssignments = activePeriod
    ? activePeriod.assignments.filter(a => {
        const member = members.find(m => m.id === a.primaryMemberId);
        const nameMatch = member ? member.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const areaMatch = selectedAreaFilter === 'all' || a.area === selectedAreaFilter;
        return (nameMatch || a.area.toLowerCase().includes(searchTerm.toLowerCase())) && areaMatch;
      })
    : [];

  return (
    <div className="space-y-8 animate-fade-in" id="schedules-root">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="schedules-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Cronogramas Mensuales
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra los ciclos de turnos del ministerio de comunicaciones, diseñados del día 16 al día 16.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowExplanation(!showExplanation)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-xl cursor-pointer"
            title="¿Cómo funciona el período?"
            id="btn-explanation"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleGenerateNextPeriod}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/15 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            id="btn-generate-schedule-engine"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Generar Siguiente Período
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      {showExplanation && (
        <div className="bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 p-5 rounded-2xl text-sm leading-relaxed text-indigo-950 dark:text-indigo-300 space-y-3" id="explanation-box">
          <div className="flex items-center gap-2 font-bold text-base text-indigo-900 dark:text-indigo-400">
            <CalendarDays className="w-5 h-5" />
            Lógica de Períodos Especiales (16 a 16)
          </div>
          <p>
            El administrador configuró que el departamento de comunicaciones no opera con meses calendario tradicionales (ej., del 1 al 30 de Septiembre). En su lugar, el ministerio se organiza en <strong>ciclos de 30 días que comienzan siempre el día 16 de un mes y finalizan el día 16 del mes subsiguiente</strong> (por ejemplo: 16 de Julio al 16 de Agosto).
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 text-indigo-900/80 dark:text-indigo-300/80">
            <li><strong>Generación inteligente:</strong> El motor consulta la fecha de fin del último ciclo y abre inmediatamente el siguiente.</li>
            <li><strong>Cumplimiento estricto de reglas:</strong> Distribuye los roles entre los {members.filter(m=>m.active).length} integrantes activos equitativamente.</li>
            <li><strong>Carga balanceada:</strong> El sistema evalúa el historial reciente para que una misma persona no deba servir repetitivamente en cultos continuos.</li>
          </ul>
        </div>
      )}

      {/* Main Content: Split Period Selector vs Detail List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="schedules-content-grid">
        
        {/* Left Side: Periods List & Workload Balance */}
        <div className="lg:col-span-4 space-y-6" id="schedules-left">
          {/* List Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs">
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Historial de Períodos
            </h3>

            {periods.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/50">
                <p className="text-xs text-gray-500">No hay períodos generados todavía.</p>
                <button 
                  onClick={handleGenerateNextPeriod}
                  className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline cursor-pointer"
                  id="link-generate-first"
                >
                  Generar primer ciclo ahora
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {periods.map(p => {
                  const isActive = p.id === selectedPeriodId || (activePeriod && activePeriod.id === p.id);
                  const startM = new Date(p.startDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' });
                  const endM = new Date(p.endDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' });
                  const startDay = new Date(p.startDate + 'T00:00:00').getDate();
                  const endDay = new Date(p.endDate + 'T00:00:00').getDate();

                  return (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPeriodId(p.id)}
                      className={`group p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50' 
                          : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          📅
                        </div>
                        <div>
                          <p className={`text-xs uppercase font-bold tracking-wider ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
                            Ciclo
                          </p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {startDay} {startM} - {endDay} {endM}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeletePeriod(p.id); }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                          title="Eliminar período"
                          id={`btn-del-${p.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className={`w-4 h-4 text-gray-400 ${isActive ? 'translate-x-1 text-indigo-500' : ''} transition-all`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Equity Workload Summary Card */}
          {activePeriod && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs space-y-4" id="workload-card">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Equidad de Participación</h3>
                <p className="text-xs text-gray-500 mt-1">Suma de turnos asignados a cada persona para este ciclo:</p>
              </div>

              <div className="space-y-3">
                {members.filter(m => m.active).map(m => {
                  const dutiesCount = workloadData[m.id] || 0;
                  
                  // Simple bar width percentage
                  const maxDuties = Math.max(...Object.values(workloadData), 1);
                  const widthPercent = Math.min((dutiesCount / maxDuties) * 100, 100);

                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{m.photoUrl}</span>
                          <span className="text-gray-700 dark:text-gray-300">{m.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          dutiesCount > 5 
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30' 
                            : dutiesCount === 0 
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30'
                        }`}>
                          {dutiesCount} {dutiesCount === 1 ? 'turno' : 'turnos'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500" 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Assignments Details List */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-6" id="schedules-right">
          
          {activePeriod ? (
            <>
              {/* Active Period Top Bar / Filter */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                      {activePeriod.name}
                    </h2>
                    <button
                      onClick={openAddModal}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/15 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Asignación
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Duración: {activePeriod.startDate} al {activePeriod.endDate} • {activePeriod.assignments.length} turnos totales
                  </p>
                </div>
                
                {/* Search / Filter Group */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Buscar integrante o rol..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs w-full sm:w-48 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                    />
                  </div>

                  <select
                    value={selectedAreaFilter}
                    onChange={(e) => setSelectedAreaFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="all">Todas las áreas</option>
                    {AREAS_METADATA.map(a => (
                      <option key={a.name} value={a.name}>{a.emoji} {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignments Table/Grid list */}
              {filteredAssignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="assignments-table">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <th className="pb-3 pt-1">Día y Fecha</th>
                        <th className="pb-3 pt-1">Área / Rol</th>
                        <th className="pb-3 pt-1">Encargado Principal</th>
                        <th className="pb-3 pt-1">Apoyo</th>
                        <th className="pb-3 pt-1 text-center">Estado</th>
                        <th className="pb-3 pt-1 text-right">Acción Manual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40 text-sm">
                      {filteredAssignments.map((a, index) => {
                        const primary = members.find(m => m.id === a.primaryMemberId);
                        const support = a.supportMemberId ? members.find(m => m.id === a.supportMemberId) : null;
                        const meta = AREAS_METADATA.find(am => am.name === a.area);
                        const daySp = getDayNameSpanish(a.date);

                        return (
                          <tr key={a.id + '-' + index} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                            <td className="py-3.5">
                              <input
                                type="date"
                                value={a.date}
                                onChange={(e) => handleUpdateDate(a.id, e.target.value)}
                                min={activePeriod.startDate}
                                max={activePeriod.endDate}
                                className="bg-transparent font-bold text-gray-800 dark:text-gray-200 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 outline-none cursor-pointer focus:border-indigo-500 text-sm py-0.5"
                              />
                              <span className="text-[10px] text-gray-400 block mt-0.5">{daySp}</span>
                            </td>
                            <td className="py-3.5">
                              <select
                                value={a.area}
                                onChange={(e) => handleUpdateArea(a.id, e.target.value as AreaType)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta?.bg} ${meta?.color} ${meta?.border} border cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500`}
                              >
                                {AREAS_METADATA.map(am => (
                                  <option key={am.name} value={am.name} className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                                    {am.emoji} {am.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">{primary?.photoUrl || '👤'}</span>
                                <select
                                  value={a.primaryMemberId}
                                  onChange={(e) => handleUpdatePrimaryMember(a.id, e.target.value)}
                                  className="bg-transparent font-medium text-gray-800 dark:text-gray-200 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 outline-none cursor-pointer focus:border-indigo-500 text-sm py-0.5"
                                >
                                  {members.map(m => (
                                    <option key={m.id} value={m.id} className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                                      {m.photoUrl} {m.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{support ? '🤝' : '👤'}</span>
                                <select
                                  value={a.supportMemberId || ''}
                                  onChange={(e) => handleUpdateSupportMember(a.id, e.target.value || undefined)}
                                  className="bg-transparent font-medium text-gray-700 dark:text-gray-300 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 outline-none cursor-pointer focus:border-indigo-500 text-xs py-0.5"
                                >
                                  <option value="" className="bg-white dark:bg-gray-900 text-gray-400">Sin Apoyo</option>
                                  {members.map(m => (
                                    <option key={m.id} value={m.id} className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                                      {m.photoUrl} {m.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="py-3.5 text-center">
                              <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${
                                a.status === 'confirmado' 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : a.status === 'rechazado'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                              }`}>
                                {a.status === 'confirmado' ? '✓ Confirmado' : a.status === 'rechazado' ? '✗ Rechazado' : '⚡ Pendiente'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              {/* Quick Override Buttons */}
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleToggleAssignmentStatus(a.id, 'confirmado')}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    a.status === 'confirmado' 
                                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400' 
                                      : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                  }`}
                                  title="Marcar como Confirmado"
                                  id={`btn-conf-${a.id}`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleToggleAssignmentStatus(a.id, 'rechazado')}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    a.status === 'rechazado' 
                                      ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-400' 
                                      : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                  }`}
                                  title="Marcar como Rechazado"
                                  id={`btn-rej-${a.id}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAssignment(a.id)}
                                  className="p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                                  title="Eliminar asignación"
                                  id={`btn-delete-assignment-${a.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <div className="text-4xl">🔍</div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">No hay coincidencias</h4>
                  <p className="text-xs text-gray-400">Prueba cambiando tu término de búsqueda o seleccionando otra área.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">No hay ciclos de servicio activos</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Crea tu primer cronograma de operaciones del 16 al 16 presionando el botón "Generar Siguiente Período". El motor asignará automáticamente a las personas correctas.
                </p>
              </div>
              <button 
                onClick={handleGenerateNextPeriod}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2 mx-auto"
                id="btn-generate-fallback"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Generar Primer Cronograma
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="add-assignment-modal">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  Nueva Asignación Manual
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Inserta un turno personalizado directamente en el cronograma actual.
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddAssignment} className="space-y-4">
              
              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Fecha del Servicio</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-gray-800 dark:text-white"
                  required
                />
                <span className="text-[10px] text-gray-400 block">
                  Puedes seleccionar cualquier fecha de servicio o culto (incluyendo Jueves, Domingos o eventos especiales).
                </span>
              </div>

              {/* Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Área / Rol</label>
                <select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value as AreaType)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none cursor-pointer focus:border-indigo-500 text-gray-800 dark:text-white"
                >
                  {AREAS_METADATA.map(am => (
                    <option key={am.name} value={am.name}>
                      {am.emoji} {am.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary Member */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Encargado Principal</label>
                <select
                  value={newPrimaryId}
                  onChange={(e) => setNewPrimaryId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none cursor-pointer focus:border-indigo-500 text-gray-800 dark:text-white"
                  required
                >
                  <option value="" disabled>Selecciona un integrante...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.photoUrl} {m.name} {!m.active ? '(Inactivo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Support Member */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Integrante de Apoyo (Opcional)</label>
                <select
                  value={newSupportId}
                  onChange={(e) => setNewSupportId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none cursor-pointer focus:border-indigo-500 text-gray-800 dark:text-white"
                >
                  <option value="">Sin Apoyo</option>
                  {members.filter(m => m.id !== newPrimaryId).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.photoUrl} {m.name} {!m.active ? '(Inactivo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-colors cursor-pointer"
                >
                  Guardar Asignación
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
