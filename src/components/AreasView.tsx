/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, ShieldCheck, Users, HelpCircle, CheckSquare, Sparkles } from 'lucide-react';
import { Member, AreaType, SchedulePeriod } from '../types';
import { AREAS_METADATA } from '../data';

interface AreasViewProps {
  members: Member[];
  periods: SchedulePeriod[];
  setActiveTab: (tab: string) => void;
}

export default function AreasView({
  members,
  periods,
  setActiveTab
}: AreasViewProps) {
  // Find current/latest period
  const latestPeriod = periods.length > 0 
    ? [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : null;

  return (
    <div className="space-y-8 animate-fade-in" id="areas-root">
      {/* Page Header */}
      <div className="border-b border-gray-100 dark:border-gray-800 pb-5" id="areas-header">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          Áreas de Servicio
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualiza los cinco pilares operativos del Departamento de Comunicaciones de la iglesia.
        </p>
      </div>

      {/* Grid of Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="areas-grid-container">
        {AREAS_METADATA.map(area => {
          // Find members who can serve in this area
          const authorizedMembers = members.filter(m => m.active && m.roles.includes(area.name));
          
          // Count total historical duties in this area
          const allAssignments = periods.flatMap(p => p.assignments);
          const totalDutiesCount = allAssignments.filter(a => a.area === area.name).length;

          // Find current assignment if any today (simulating July 16, 2026)
          const todayAssignment = latestPeriod 
            ? latestPeriod.assignments.find(a => a.date === '2026-07-16' && a.area === area.name)
            : null;
          
          const todayMember = todayAssignment 
            ? members.find(m => m.id === todayAssignment.primaryMemberId)
            : null;

          return (
            <div 
              key={area.name}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                {/* Area Title Block */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100/50">
                    {area.emoji}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">
                      {area.name}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                      Ministerio de Comunicaciones
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {area.desc}
                </p>

                {/* Authorized Members list */}
                <div className="space-y-2 border-t border-b border-gray-50 dark:border-gray-800 py-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                    <span>Personal Autorizado</span>
                    <span>{authorizedMembers.length} integrantes</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {authorizedMembers.map(m => (
                      <span 
                        key={m.id}
                        className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-850 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-700/60 font-semibold"
                      >
                        <span>{m.photoUrl}</span>
                        <span>{m.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active Service Today block */}
                <div className="bg-gray-50 dark:bg-gray-850/50 p-3 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Servicio de Hoy (Simulación)</p>
                  {todayAssignment ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        👤 {todayMember?.name || 'Steven'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        todayAssignment.status === 'confirmado' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                        {todayAssignment.status}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No requerido hoy</p>
                  )}
                </div>
              </div>

              {/* Action stats at bottom */}
              <div className="pt-5 border-t border-gray-50 dark:border-gray-800 mt-5 flex items-center justify-between text-xs">
                <span className="text-gray-400">Total histórico: <strong>{totalDutiesCount} turnos</strong></span>
                <button 
                  onClick={() => setActiveTab('estadisticas')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  Estadísticas →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
