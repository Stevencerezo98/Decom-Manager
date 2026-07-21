/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType } from '../types';
import { AREAS_METADATA } from '../data';

interface StatsViewProps {
  periods: SchedulePeriod[];
  members: Member[];
}

export default function StatsView({
  periods,
  members
}: StatsViewProps) {
  const [activeAreaTooltip, setActiveAreaTooltip] = useState<string | null>(null);

  // Compile global stats
  const allAssignments = periods.flatMap(p => p.assignments);
  const totalCount = allAssignments.length;
  
  const confirmedCount = allAssignments.filter(a => a.status === 'confirmado').length;
  const rejectedCount = allAssignments.filter(a => a.status === 'rechazado').length;
  const pendingCount = allAssignments.filter(a => a.status === 'pendiente').length;

  const totalResponded = confirmedCount + rejectedCount;
  const attendanceRate = totalResponded > 0 
    ? Math.round((confirmedCount / totalResponded) * 100) 
    : 100;

  const responseRate = totalCount > 0
    ? Math.round((totalResponded / totalCount) * 100)
    : 100;

  // Calculate area stats
  const areaStats: { [key in AreaType]: { total: number; confirmed: number; rejected: number; pending: number } } = {
    'Fotografía': { total: 0, confirmed: 0, rejected: 0, pending: 0 },
    'Proyección': { total: 0, confirmed: 0, rejected: 0, pending: 0 },
    'Transmisión': { total: 0, confirmed: 0, rejected: 0, pending: 0 },
    'Publicidad': { total: 0, confirmed: 0, rejected: 0, pending: 0 },
    'Publicaciones': { total: 0, confirmed: 0, rejected: 0, pending: 0 }
  };

  allAssignments.forEach(a => {
    if (areaStats[a.area]) {
      areaStats[a.area].total++;
      if (a.status === 'confirmado') areaStats[a.area].confirmed++;
      else if (a.status === 'rechazado') areaStats[a.area].rejected++;
      else areaStats[a.area].pending++;
    }
  });

  // Calculate member stats
  const memberRanking = members.map(m => {
    const primaryDuties = allAssignments.filter(a => a.primaryMemberId === m.id);
    const supportDuties = allAssignments.filter(a => a.supportMemberId === m.id);
    const totalDuties = primaryDuties.length + supportDuties.length;

    const confirmed = primaryDuties.filter(a => a.status === 'confirmado').length + supportDuties.filter(a => a.status === 'confirmado').length;
    const rejected = primaryDuties.filter(a => a.status === 'rechazado').length + supportDuties.filter(a => a.status === 'rechazado').length;
    
    const responded = confirmed + rejected;
    const memberAttendanceRate = responded > 0 
      ? Math.round((confirmed / responded) * 100) 
      : 100;

    // Determine their primary area (mode role)
    const areaCounts: { [key: string]: number } = {};
    primaryDuties.forEach(a => {
      areaCounts[a.area] = (areaCounts[a.area] || 0) + 1;
    });
    
    let primaryArea = 'Varios';
    let maxAreaCount = 0;
    Object.keys(areaCounts).forEach(area => {
      if (areaCounts[area] > maxAreaCount) {
        maxAreaCount = areaCounts[area];
        primaryArea = area;
      }
    });

    return {
      ...m,
      totalDuties,
      primaryCount: primaryDuties.length,
      supportCount: supportDuties.length,
      attendanceRate: memberAttendanceRate,
      primaryArea,
      confirmed,
      rejected
    };
  }).sort((a, b) => b.totalDuties - a.totalDuties); // Sort by total participations

  // SVG Doughnut Chart math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const confirmedPercentage = totalResponded > 0 ? (confirmedCount / totalResponded) * 100 : 100;
  const strokeDashoffset = circumference - (confirmedPercentage / 100) * circumference;

  return (
    <div className="space-y-8 animate-fade-in" id="stats-root">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="stats-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Métricas y Estadísticas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analiza el cumplimiento de asistencia, turnos realizados y distribución de cargas de trabajo.
          </p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-summary-row">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cumplimiento Global</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{attendanceRate}%</span>
            <span className="text-xs text-gray-400">Asistencia</span>
          </div>
          <p className="text-[10px] text-gray-500">Relación confirmaciones / respuestas</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasa de Respuesta</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{responseRate}%</span>
            <span className="text-xs text-gray-400">Notificados</span>
          </div>
          <p className="text-[10px] text-gray-500">{totalResponded} de {totalCount} total respondido</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Servicios Completados</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{confirmedCount}</span>
            <span className="text-xs text-gray-400">Turnos</span>
          </div>
          <p className="text-[10px] text-emerald-500 font-medium">✓ Personal asistió y sirvió con éxito</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ausencias Justificadas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{rejectedCount}</span>
            <span className="text-xs text-gray-400">Rechazos</span>
          </div>
          <p className="text-[10px] text-gray-500">Notificados que declinaron a tiempo</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="stats-charts-grid">
        
        {/* Left Card: Doughnut Chart (Attendance vs Absence) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs flex flex-col justify-between" id="attendance-doughnut">
          <div>
            <h3 className="font-extrabold text-gray-950 dark:text-white text-base mb-1">Métrica de Asistencia</h3>
            <p className="text-xs text-gray-400 mb-6">Proporción de asistencia positiva frente a ausencias acumuladas.</p>
            
            {/* SVG Doughnut Render */}
            {totalResponded > 0 ? (
              <div className="relative flex flex-col items-center justify-center py-6">
                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
                  {/* Background Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="var(--color-gray-100, #f3f4f6)"
                    strokeWidth="12"
                  />
                  {/* Foreground Circle */}
                  <circle
                    className="transition-all duration-1000 ease-out"
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="var(--color-emerald-500, #10b981)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                  {/* Support Circle for rejected */}
                  {rejectedCount > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="var(--color-rose-500, #f43f5e)"
                      strokeWidth="12"
                      strokeDasharray={`${circumference * (rejectedCount / totalResponded)} ${circumference}`}
                      strokeDashoffset={strokeDashoffset + circumference}
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  )}
                </svg>

                {/* Center text in Doughnut */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">{attendanceRate}%</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cumplimiento</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-300">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-gray-500">Sin datos de respuestas todavía</p>
              </div>
            )}
          </div>

          {/* Chart Legend */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-around text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <div>
                <span className="text-gray-500 block">Asistirá</span>
                <strong className="text-gray-900 dark:text-white">{confirmedCount}</strong>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              <div>
                <span className="text-gray-500 block">No asistirá</span>
                <strong className="text-gray-900 dark:text-white">{rejectedCount}</strong>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-indigo-400" />
              <div>
                <span className="text-gray-500 block">Pendiente</span>
                <strong className="text-gray-900 dark:text-white">{pendingCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Area Participations (Horizontal Bar Chart) */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs flex flex-col justify-between" id="area-bar-chart">
          <div>
            <h3 className="font-extrabold text-gray-950 dark:text-white text-base mb-1">Participación por Área del Ministerio</h3>
            <p className="text-xs text-gray-400 mb-6">Volumen de actividades planificadas por departamento operativo.</p>
            
            <div className="space-y-4">
              {AREAS_METADATA.map(meta => {
                const stats = areaStats[meta.name] || { total: 0, confirmed: 0, rejected: 0, pending: 0 };
                
                // Percent width math
                const maxTotal = Math.max(...Object.values(areaStats).map(s => s.total), 1);
                const percent = Math.min((stats.total / maxTotal) * 100, 100);

                return (
                  <div 
                    key={meta.name} 
                    className="space-y-1.5 group relative"
                    onMouseEnter={() => setActiveAreaTooltip(meta.name)}
                    onMouseLeave={() => setActiveAreaTooltip(null)}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                        <span>{meta.emoji}</span>
                        <span>{meta.name}</span>
                      </span>
                      <span className="text-gray-400 font-bold">{stats.total} servicios</span>
                    </div>

                    <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-100/30 dark:border-gray-700/10 flex">
                      {/* Confirmed portion of bar */}
                      {stats.confirmed > 0 && (
                        <div 
                          className="h-full bg-emerald-500/80 transition-all duration-500"
                          style={{ width: `${(stats.confirmed / Math.max(stats.total, 1)) * percent}%` }}
                          title={`${stats.confirmed} Confirmados`}
                        />
                      )}
                      {/* Pending portion */}
                      {stats.pending > 0 && (
                        <div 
                          className="h-full bg-indigo-400/80 transition-all duration-500"
                          style={{ width: `${(stats.pending / Math.max(stats.total, 1)) * percent}%` }}
                          title={`${stats.pending} Pendientes`}
                        />
                      )}
                      {/* Rejected portion */}
                      {stats.rejected > 0 && (
                        <div 
                          className="h-full bg-rose-500/80 transition-all duration-500"
                          style={{ width: `${(stats.rejected / Math.max(stats.total, 1)) * percent}%` }}
                          title={`${stats.rejected} Rechazados`}
                        />
                      )}
                      {stats.total === 0 && (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
                      )}
                    </div>

                    {/* Quick Tooltip overlay */}
                    {activeAreaTooltip === meta.name && (
                      <div className="absolute -top-12 right-0 bg-gray-950 text-white p-2.5 rounded-xl text-[10px] shadow-xl border border-gray-800 z-10 space-y-1 flex items-center gap-3">
                        <span className="font-extrabold text-amber-400">{meta.name}:</span>
                        <span className="text-emerald-400">✓ {stats.confirmed} Conf</span>
                        <span className="text-rose-400">✗ {stats.rejected} Rech</span>
                        <span className="text-indigo-300">⚡ {stats.pending} Pend</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex items-center justify-between">
            <span>Las barras se segmentan por: Confirmado, Pendiente y Rechazado.</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Máximo: {Math.max(...Object.values(areaStats).map(s => s.total), 0)} servicios/área</span>
          </div>
        </div>
      </div>

      {/* Ranking and Attendance Table (Leaderboard bento grid) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4" id="member-ranking">
        <div>
          <h3 className="font-extrabold text-gray-950 dark:text-white text-base">Carga de Trabajo y Fidelidad por Integrante</h3>
          <p className="text-xs text-gray-400 mt-1">
            Detalle del cumplimiento y turnos completados por cada miembro del ministerio de comunicaciones.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="ranking-table">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="pb-3 pt-1">Integrante</th>
                <th className="pb-3 pt-1 text-center">Fidelidad de Asistencia</th>
                <th className="pb-3 pt-1 text-center">Turnos Totales</th>
                <th className="pb-3 pt-1 text-center">Como Principal</th>
                <th className="pb-3 pt-1 text-center">Como Apoyo</th>
                <th className="pb-3 pt-1">Área Predilecta</th>
                <th className="pb-3 pt-1 text-right">Firma Histórica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40 text-sm text-gray-700 dark:text-gray-300">
              {memberRanking.map((rank, index) => {
                let badgeMedal = '👤';
                if (index === 0) badgeMedal = '🏆';
                else if (index === 1) badgeMedal = '🥈';
                else if (index === 2) badgeMedal = '🥉';

                return (
                  <tr key={rank.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{badgeMedal}</span>
                        <span className="text-lg p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">{rank.photoUrl}</span>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{rank.name}</p>
                          <p className="text-[10px] text-gray-400">{rank.active ? 'Activo' : 'Inactivo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-block font-extrabold px-2.5 py-1 rounded-full text-xs ${
                        rank.attendanceRate >= 90 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : rank.attendanceRate >= 70 
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                      }`}>
                        {rank.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-3.5 text-center font-bold font-mono text-gray-900 dark:text-white">
                      {rank.totalDuties}
                    </td>
                    <td className="py-3.5 text-center font-mono text-gray-500">
                      {rank.primaryCount}
                    </td>
                    <td className="py-3.5 text-center font-mono text-gray-500">
                      {rank.supportCount}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 font-semibold">
                        {rank.primaryArea}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-xs">
                      <div className="flex items-center justify-end gap-1.5 font-bold">
                        <span className="text-emerald-600">✓ {rank.confirmed}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-rose-600">✗ {rank.rejected}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
