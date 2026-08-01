/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  User, 
  Move,
  Info,
  CalendarDays,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType } from '../types';
import { AREAS_METADATA, getDayNameSpanish, DAY_NAMES_INDEX_TO_ES } from '../data';

interface CalendarViewProps {
  periods: SchedulePeriod[];
  setPeriods: React.Dispatch<React.SetStateAction<SchedulePeriod[]>>;
  members: Member[];
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
  isCoordinator?: boolean;
}

type ViewType = 'month' | 'week' | 'day';

export default function CalendarView({
  periods,
  setPeriods,
  members,
  triggerNotification,
  isCoordinator = true
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<ViewType>('month');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  
  // Real today date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Dynamic current date initialization (defaults to real today Date)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  
  // Selected assignment for the detail modal
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  
  // State for tracking what is being dragged
  const [draggedAssignmentId, setDraggedAssignmentId] = useState<string | null>(null);

  // Compile all assignments across all periods
  const allAssignments: Assignment[] = periods.flatMap(p => p.assignments);

  // Change Month handler
  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  // Reassignment handler
  const handleReassignMember = (assignmentId: string, newMemberId: string) => {
    let updated = false;
    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          updated = true;
          return { ...a, primaryMemberId: newMemberId, status: 'pendiente' as const };
        }
        return a;
      });
      return { ...p, assignments };
    });

    if (updated) {
      setPeriods(updatedPeriods);
      triggerNotification('Asignación modificada correctamente. Estado restablecido a Pendiente.', 'success');
      if (editingAssignment && editingAssignment.id === assignmentId) {
        setEditingAssignment({ ...editingAssignment, primaryMemberId: newMemberId, status: 'pendiente' });
      }
    }
  };

  // Filter assignments
  const getFilteredAssignmentsForDate = (dateStr: string) => {
    return allAssignments.filter(a => {
      if (a.date !== dateStr) return false;
      if (selectedAreaFilter !== 'all' && a.area !== selectedAreaFilter) return false;
      if (selectedMemberFilter !== 'all' && a.primaryMemberId !== selectedMemberFilter && a.supportMemberId !== selectedMemberFilter) return false;
      return true;
    });
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, assignmentId: string) => {
    setDraggedAssignmentId(assignmentId);
    e.dataTransfer.setData('text/plain', assignmentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDate = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData('text/plain') || draggedAssignmentId;
    if (!assignmentId) return;

    // Move assignment date
    let moved = false;
    const updatedPeriods = periods.map(p => {
      const hasAssignment = p.assignments.some(a => a.id === assignmentId);
      if (hasAssignment) {
        const assignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            moved = true;
            // Generate a new id based on the new date
            const areaKey = a.area.toLowerCase().replace('í', 'i').replace('ó', 'o');
            return {
              ...a,
              id: `${targetDateStr}-${areaKey}`,
              date: targetDateStr,
              status: 'pendiente' as const // reset status on move
            };
          }
          return a;
        });
        return { ...p, assignments };
      }
      return p;
    });

    if (moved) {
      setPeriods(updatedPeriods);
      triggerNotification(`Se movió la asignación al ${targetDateStr}.`, 'success');
    }
    setDraggedAssignmentId(null);
  };

  // Month rendering builders
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysCount = getDaysInMonth(year, month);
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0, Monday is 1...
    
    // Adjust so Spanish week starts on Monday
    // Mon (0), Tue (1), Wed (2), Thu (3), Fri (4), Sat (5), Sun (6)
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysArray = [];
    
    // Add empty spacer cells for previous month
    for (let i = 0; i < startOffset; i++) {
      daysArray.push(null);
    }

    // Add days of this month
    for (let d = 1; d <= daysCount; d++) {
      daysArray.push(new Date(year, month, d));
    }

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
      <div className="space-y-2" id="cal-month-container">
        {/* Week Day Titles */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-1">
          {weekDays.map(wd => (
            <div key={wd} className="py-1">{wd.slice(0, 3)}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysArray.map((day, idx) => {
            if (!day) {
              return (
                <div 
                  key={`empty-${idx}`} 
                  className="min-h-[110px] bg-gray-50/40 dark:bg-gray-900/10 rounded-xl border border-dashed border-gray-100 dark:border-gray-800/40 opacity-30"
                />
              );
            }

            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const is16th = day.getDate() === 16;
            const dayAssignments = getFilteredAssignmentsForDate(dateStr);

            return (
              <div 
                key={dateStr}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnDate(e, dateStr)}
                className={`min-h-[115px] p-2 bg-white dark:bg-gray-900 rounded-xl border transition-all flex flex-col justify-between ${
                  isToday 
                    ? 'border-amber-400 ring-2 ring-amber-400/10 dark:ring-amber-400/5' 
                    : is16th 
                    ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/5'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700/80'
                }`}
                id={`cell-${dateStr}`}
              >
                {/* Cell Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                    isToday 
                      ? 'bg-amber-400 text-gray-900 font-extrabold' 
                      : is16th 
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day.getDate()}
                  </span>
                  {is16th && (
                    <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.2 rounded font-mono">
                      Corte
                    </span>
                  )}
                </div>

                {/* Assignments in Cell */}
                <div className="space-y-1 my-1.5 flex-1 overflow-y-auto max-h-[70px] scrollbar-none pr-0.5">
                  {dayAssignments.map(a => {
                    const meta = AREAS_METADATA.find(am => am.name === a.area);
                    const member = members.find(m => m.id === a.primaryMemberId);

                    return (
                      <div 
                        key={a.id}
                        draggable={isCoordinator}
                        onDragStart={(e) => isCoordinator ? handleDragStart(e, a.id) : undefined}
                        onClick={() => setEditingAssignment(a)}
                        className={`text-[10px] p-1.5 rounded-lg border font-medium truncate transition-all flex items-center justify-between ${meta?.bg} ${meta?.color} ${meta?.border} ${isCoordinator ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                        title={isCoordinator ? `Arrastrar para mover o Click para editar: ${a.area} - ${member?.name}` : `Click para ver detalles: ${a.area} - ${member?.name}`}
                      >
                        <span className="truncate block font-semibold">{meta?.emoji} {member?.name || 'Soporte'}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          a.status === 'confirmado' ? 'bg-emerald-500' : a.status === 'rechazado' ? 'bg-rose-500' : 'bg-indigo-400'
                        }`} />
                      </div>
                    );
                  })}
                </div>

                {/* Plus button for quick overview */}
                {dayAssignments.length > 0 && (
                  <button 
                    onClick={() => {
                      // Click-to-show day
                      setCurrentDate(day);
                      setCurrentView('day');
                    }}
                    className="text-[9px] font-bold text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 self-end cursor-pointer"
                  >
                    Ver {dayAssignments.length} asignaciones
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Weekly rendering builders
  const renderWeeklyView = () => {
    // Get start of the week (Monday)
    const startOfWeek = new Date(currentDate);
    const dayIndex = startOfWeek.getDay();
    const distanceToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
    startOfWeek.setDate(startOfWeek.getDate() + distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d);
    }

    const weekDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
      <div className="space-y-4" id="cal-week-container">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDates.map((day, idx) => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayAssignments = getFilteredAssignmentsForDate(dateStr);

            return (
              <div 
                key={dateStr}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnDate(e, dateStr)}
                className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 min-h-[300px] flex flex-col justify-between ${
                  isToday 
                    ? 'border-amber-400 ring-2 ring-amber-400/10' 
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">{weekDayNames[idx]}</p>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">{day.getDate()}</h4>
                    </div>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-gray-900 text-[9px] font-extrabold uppercase">
                        Hoy
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {dayAssignments.length > 0 ? (
                      dayAssignments.map(a => {
                        const meta = AREAS_METADATA.find(am => am.name === a.area);
                        const member = members.find(m => m.id === a.primaryMemberId);
                        const support = a.supportMemberId ? members.find(m => m.id === a.supportMemberId) : null;

                        return (
                          <div 
                            key={a.id}
                            draggable={isCoordinator}
                            onDragStart={(e) => isCoordinator ? handleDragStart(e, a.id) : undefined}
                            onClick={() => setEditingAssignment(a)}
                            className={`p-3 rounded-xl border hover:shadow-xs transition-all space-y-2 ${meta?.bg} ${meta?.color} ${meta?.border} ${isCoordinator ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1">
                                <span>{meta?.emoji}</span>
                                <span>{a.area}</span>
                              </span>
                              <span className={`w-2 h-2 rounded-full ${
                                a.status === 'confirmado' ? 'bg-emerald-500' : a.status === 'rechazado' ? 'bg-rose-500' : 'bg-indigo-400'
                              }`} />
                            </div>

                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
                              {member?.name || 'Steven (Soporte)'}
                            </p>
                            
                            {support && (
                              <p className="text-[10px] font-mono opacity-80 mt-1">
                                🤝 Apoyo: {support.name}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[9px] opacity-70">
                              <span>{isCoordinator ? 'Click p/ Editar' : 'Ver Detalles'}</span>
                              <span className="capitalize">{a.status}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 border border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-gray-300 dark:text-gray-700 text-xs">Sin servicios</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      setCurrentDate(day);
                      setCurrentView('day');
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver detalles del día →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Daily rendering builders
  const renderDailyView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const daySp = getDayNameSpanish(dateStr);
    const dayAssignments = getFilteredAssignmentsForDate(dateStr);

    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-6" id="cal-day-container">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
              {daySp}, {currentDate.getDate()} de {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Vista diaria detallada con asignaciones de turnos.
            </p>
          </div>
          {isToday && (
            <span className="px-3 py-1 rounded-full bg-amber-400 text-gray-950 text-xs font-extrabold uppercase">
              Hoy es este día
            </span>
          )}
        </div>

        {dayAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dayAssignments.map(a => {
              const meta = AREAS_METADATA.find(am => am.name === a.area);
              const member = members.find(m => m.id === a.primaryMemberId);
              const support = a.supportMemberId ? members.find(m => m.id === a.supportMemberId) : null;

              return (
                <div 
                  key={a.id}
                  onClick={() => setEditingAssignment(a)}
                  className={`p-5 rounded-2xl border cursor-pointer hover:shadow-md transition-all space-y-4 ${meta?.bg} ${meta?.color} ${meta?.border}`}
                >
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      <span className="text-xl leading-none">{meta?.emoji}</span>
                      <span>{a.area}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      a.status === 'confirmado' 
                        ? 'bg-emerald-500 text-white' 
                        : a.status === 'rechazado' 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-white/70 dark:bg-black/30 rounded-xl">{member?.photoUrl || '👤'}</span>
                    <div>
                      <p className="text-[10px] opacity-75 font-bold uppercase">Encargado Principal</p>
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                        {member?.name || 'Steven (Soporte)'}
                      </h4>
                      <p className="text-xs opacity-80">{member?.phone}</p>
                    </div>
                  </div>

                  {support && (
                    <div className="p-3 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 flex items-center gap-2">
                      <span className="text-base">🤝</span>
                      <div>
                        <p className="text-[9px] opacity-75 font-bold uppercase">Personal de Apoyo</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{support.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] opacity-85 leading-relaxed bg-white/30 dark:bg-black/10 p-2 rounded-lg">
                    <strong>⏰ Hora de arribo:</strong> Llegar 30 minutos antes.
                    <br />
                    <strong>WhatsApp:</strong> {a.notified ? `✓ Notificado a las ${a.notifiedAt || 'las 9:00 AM'}` : '✖ Sin notificar todavía'}
                  </div>

                  <button className="w-full py-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-black/5 text-xs font-bold rounded-xl text-center transition-all">
                    {isCoordinator ? 'Reasignar o Modificar Estado' : 'Ver Detalles del Servicio'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-100 dark:border-gray-800">
            <span className="text-4xl">🕊️</span>
            <h4 className="font-bold text-gray-700 dark:text-gray-300 mt-3">Sin servicios asignados en esta fecha</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              No hay cultos programados para este día de la semana, o ningún integrante fue asignado.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in" id="calendar-root">
      
      {/* Calendar Header / Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="calendar-nav-bar">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Calendario de Turnos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualiza y arrastra asignaciones para reordenar el calendario del ministerio.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start" id="view-toggle">
          {(['month', 'week', 'day'] as ViewType[]).map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === view 
                  ? 'bg-white dark:bg-gray-900 shadow-xs text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {view === 'month' ? 'Mensual' : view === 'week' ? 'Semanal' : 'Diario'}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handlePrevDate}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800/80 cursor-pointer text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
            id="btn-calendar-prev"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-base font-extrabold text-gray-800 dark:text-gray-100 font-sans min-w-[150px] text-center capitalize">
            {currentView === 'month' && currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            {currentView === 'week' && `Semana del ${new Date(currentDate).getDate()} ${new Date(currentDate).toLocaleDateString('es-ES', { month: 'short' })}`}
            {currentView === 'day' && `${currentDate.getDate()} ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
          </span>

          <button 
            onClick={handleNextDate}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800/80 cursor-pointer text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
            id="btn-calendar-next"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Direct Date Picker Selector */}
          <div className="flex items-center gap-1.5 ml-2 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            <input
              type="date"
              value={currentDate.toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setCurrentDate(new Date(y, m - 1, d));
                }
              }}
              className="bg-transparent border-none text-xs font-mono font-bold outline-none cursor-pointer text-gray-700 dark:text-gray-200"
            />
          </div>
        </div>

        {/* Filters Panel inside Calendar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold outline-none cursor-pointer text-gray-600 dark:text-gray-300"
            >
              <option value="all">Todas las áreas</option>
              {AREAS_METADATA.map(a => (
                <option key={a.name} value={a.name}>{a.emoji} {a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold outline-none cursor-pointer text-gray-600 dark:text-gray-300"
            >
              <option value="all">Todo el personal</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.photoUrl} {m.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => { setSelectedAreaFilter('all'); setSelectedMemberFilter('all'); setCurrentDate(new Date()); }}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-700 dark:text-indigo-300 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            id="btn-calendar-today-reset"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ir a Hoy</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Notice */}
      {isCoordinator && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/40 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span><strong>Tip de Diseño:</strong> Puedes <strong>arrastrar y soltar</strong> (drag and drop) cualquier tarjeta de asignación a un día diferente del calendario mensual para cambiar su fecha al instante. También puedes hacer click sobre ella para cambiar el integrante asignado.</span>
        </div>
      )}

      {/* Calendar Stage Area */}
      <div className="min-h-[500px]">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && renderWeeklyView()}
        {currentView === 'day' && renderDailyView()}
      </div>

      {/* Reassign Detail Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-modal">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{isCoordinator ? '🛠️' : '📋'}</span>
                <h3 className="font-bold text-gray-950 dark:text-white text-lg">
                  {isCoordinator ? 'Modificar Asignación' : 'Detalles de Asignación'}
                </h3>
              </div>
              <button 
                onClick={() => setEditingAssignment(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                id="btn-close-modal"
              >
                ✖
              </button>
            </div>

            {isCoordinator ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 text-xs space-y-1">
                  <p className="text-gray-400 uppercase font-semibold tracking-wider">Detalles del Culto</p>
                  <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
                    Fecha: {editingAssignment.date} ({getDayNameSpanish(editingAssignment.date)})
                  </p>
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Área: {AREAS_METADATA.find(am => am.name === editingAssignment.area)?.emoji} {editingAssignment.area}
                  </p>
                </div>

                {/* Select member */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Reasignar Encargado Principal</label>
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                    {members
                      .filter(m => m.active && m.roles.includes(editingAssignment.area))
                      .map(m => {
                        const isSelected = editingAssignment.primaryMemberId === m.id;
                        const hasBlockedDate = m.blockedDates.includes(editingAssignment.date);
                        const isAvailable = m.availability[getDayNameSpanish(editingAssignment.date)] !== false;

                        return (
                          <div 
                            key={m.id}
                            onClick={() => {
                              if (!hasBlockedDate) {
                                handleReassignMember(editingAssignment.id, m.id);
                              }
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/20 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400' 
                                : hasBlockedDate
                                ? 'opacity-40 bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-400 border-dashed'
                                : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{m.photoUrl}</span>
                              <div>
                                <p className="text-sm font-bold">{m.name}</p>
                                <p className="text-[10px] font-mono opacity-80">
                                  {hasBlockedDate ? '🚫 Fecha Bloqueada' : !isAvailable ? '⚠️ Fuera de horario' : '✓ Disponible'}
                                </p>
                              </div>
                            </div>
                            {isSelected && <span className="text-sm font-bold">✓ Asignado</span>}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Manual Override Status */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Estado de Confirmación</label>
                  <div className="flex gap-2">
                    {(['pendiente', 'confirmado', 'rechazado'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          const updatedPeriods = periods.map(p => {
                            const assignments = p.assignments.map(a => {
                              if (a.id === editingAssignment.id) {
                                return { ...a, status };
                              }
                              return a;
                            });
                            return { ...p, assignments };
                          });
                          setPeriods(updatedPeriods);
                          setEditingAssignment({ ...editingAssignment, status });
                          triggerNotification(`Asignación marcada como ${status}.`, 'success');
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          editingAssignment.status === status
                            ? status === 'confirmado'
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : status === 'rechazado'
                              ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                              : 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {status === 'confirmado' ? 'Confirmado' : status === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Read only info */}
                <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/40 text-xs space-y-2">
                  <div>
                    <p className="text-gray-400 uppercase font-bold tracking-wider text-[10px]">Culto</p>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                      Fecha: {editingAssignment.date} ({getDayNameSpanish(editingAssignment.date)})
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase font-bold tracking-wider text-[10px]">Área de Servicio</p>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {AREAS_METADATA.find(am => am.name === editingAssignment.area)?.emoji} {editingAssignment.area}
                    </p>
                  </div>
                </div>

                {/* Primary member */}
                <div>
                  <p className="text-gray-400 uppercase font-bold tracking-wider text-[10px] mb-1.5">Encargado Principal</p>
                  {(() => {
                    const m = members.find(m => m.id === editingAssignment.primaryMemberId);
                    return m ? (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-center gap-3">
                        <span className="text-2xl">{m.photoUrl}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{m.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.phone || 'Sin teléfono'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No asignado</p>
                    );
                  })()}
                </div>

                {/* Support member */}
                {editingAssignment.supportMemberId && (
                  <div>
                    <p className="text-gray-400 uppercase font-bold tracking-wider text-[10px] mb-1.5">Integrante de Apoyo</p>
                    {(() => {
                      const m = members.find(m => m.id === editingAssignment.supportMemberId);
                      return m ? (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-center gap-3">
                          <span className="text-xl">🤝 {m.photoUrl}</span>
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">{m.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{m.phone || 'Sin teléfono'}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Confirmation status badge */}
                <div className="pt-2 border-t border-gray-150 dark:border-gray-800">
                  <p className="text-gray-400 uppercase font-bold tracking-wider text-[10px] mb-1.5">Estado de Confirmación</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    editingAssignment.status === 'confirmado'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : editingAssignment.status === 'rechazado'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      editingAssignment.status === 'confirmado'
                        ? 'bg-emerald-500 animate-pulse'
                        : editingAssignment.status === 'rechazado'
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`} />
                    {editingAssignment.status}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button 
                onClick={() => setEditingAssignment(null)}
                className="w-full py-3 bg-gray-150 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
