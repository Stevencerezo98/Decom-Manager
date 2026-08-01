/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, AreaType, AssignmentRule, CultoEvent, SchedulePeriod, Assignment, AppWhatsAppConfig } from '../types';
import { getDayNameSpanish, DEFAULT_WEEKLY_CULTOS } from '../data';

/**
 * Helper to generate date strings from start date (16th) to end date (15th of next month)
 */
export function getDatesForPeriod(startDateStr: string): { dates: string[]; endDateStr: string } {
  const dates: string[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  
  // Calculate end date (16th of next month)
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(16); // Always end on the 16th of the next month

  const endStr = end.toISOString().split('T')[0];
  
  // Iterate from start date up to but not including the end date (so we have exactly 1 month of work, e.g., 16 July to 15 August)
  const current = new Date(start);
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return { dates, endDateStr: endStr };
}

/**
 * Calculates the next period dates based on the latest existing period.
 * If no periods exist, starts on July 16, 2026 (the date in our system metadata context is July 16, 2026).
 */
export function getNextPeriodDates(existingPeriods: SchedulePeriod[]): { startDate: string; endDate: string; name: string } {
  let startYear = 2026;
  let startMonth = 6; // July (0-indexed)
  
  if (existingPeriods.length > 0) {
    // Get the latest period
    const sorted = [...existingPeriods].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const latestEnd = new Date(sorted[0].endDate + 'T00:00:00');
    startYear = latestEnd.getFullYear();
    startMonth = latestEnd.getMonth();
  }

  const start = new Date(startYear, startMonth, 16);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(16);

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const periodName = `Periodo: 16 ${monthNames[start.getMonth()]} - 16 ${monthNames[end.getMonth()]} ${start.getFullYear()}`;

  return {
    startDate: startStr,
    endDate: endStr,
    name: periodName
  };
}

/**
 * Core smart engine that assigns members to cultos based on all rules and historical balance.
 */
export function generateSchedule(
  startDateStr: string,
  members: Member[],
  rules: AssignmentRule[],
  weeklyCultos: typeof DEFAULT_WEEKLY_CULTOS,
  previousPeriods: SchedulePeriod[] = []
): SchedulePeriod {
  const { dates, endDateStr } = getDatesForPeriod(startDateStr);
  const periodName = getNextPeriodDates(previousPeriods).name;
  
  // Track assignments count in this new period to distribute workload equitably
  const currentPeriodWorkload: { [memberId: string]: number } = {};
  members.forEach(m => {
    currentPeriodWorkload[m.id] = 0;
  });

  // Also factor in historical load from last 2 periods to avoid repetitive assignments
  const historicalWorkload: { [memberId: string]: number } = {};
  members.forEach(m => {
    historicalWorkload[m.id] = 0;
  });

  const recentPeriods = previousPeriods
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 2);

  recentPeriods.forEach(p => {
    p.assignments.forEach(a => {
      if (a.primaryMemberId) {
        historicalWorkload[a.primaryMemberId] = (historicalWorkload[a.primaryMemberId] || 0) + 1;
      }
    });
  });

  const assignments: Assignment[] = [];

  // Iterate date by date
  dates.forEach(date => {
    const dayName = getDayNameSpanish(date);
    const cultoConfig = weeklyCultos.find(c => c.day.toLowerCase() === dayName.toLowerCase());
    
    if (!cultoConfig) return; // No culto on this day of week

    const dailyAssignments: Assignment[] = [];

    // Prioritize fixed-role rules first (e.g. Shara's fixed days)
    const fixedAssignmentsForDay: { [area: string]: string } = {}; // Area -> MemberId

    members.forEach(member => {
      if (!member.active) return;
      if (member.blockedDates.includes(date)) return;

      // Find if this member has a fixed_role_day rule matching today
      const memberRules = rules.filter(r => r.memberId === member.id);
      memberRules.forEach(r => {
        if (r.type === 'fixed_role_day' && r.fixedRoleDayMappings) {
          const mapping = r.fixedRoleDayMappings.find(m => m.day.toLowerCase() === dayName.toLowerCase());
          if (mapping) {
            fixedAssignmentsForDay[mapping.role] = member.id;
          }
        }
      });
    });

    // Generate assignments for each required area
    cultoConfig.areas.forEach(area => {
      // 1. Check if there's a pre-defined fixed assignment for this area today
      let assignedMemberId = '';

      if (fixedAssignmentsForDay[area]) {
        const candidateId = fixedAssignmentsForDay[area];
        // Confirm candidate is active and not blocked
        const cand = members.find(m => m.id === candidateId);
        if (cand && cand.active && !cand.blockedDates.includes(date)) {
          assignedMemberId = candidateId;
        }
      }

      // 2. If no fixed assignment, find eligible members
      if (!assignedMemberId) {
        const eligibleCandidates = members.filter(member => {
          // A. Must be active
          if (!member.active) return false;

          // B. Must not have date blocked (vacations, exceptions)
          if (member.blockedDates.includes(date)) return false;

          // C. Must support this role in general
          if (!member.roles.includes(area)) return false;

          // D. Must be available on this day of the week
          if (member.availability[dayName] === false) return false;

          // E. Check global rules & exclusions
          const memberRules = rules.filter(r => r.memberId === member.id);

          // E1. Rule: Dayanna only Saturday & Sunday, never Tuesday or Thursday
          // (Handled by general availability, but let's enforce explicitly if rules exist)
          const onlyDaysRule = memberRules.find(r => r.type === 'only_days');
          if (onlyDaysRule && onlyDaysRule.days) {
            if (!onlyDaysRule.days.includes(dayName)) return false;
          }

          // E2. Rule: Keyla never Publicidad
          const neverRoleRule = memberRules.find(r => r.type === 'never_role');
          if (neverRoleRule && neverRoleRule.roles && neverRoleRule.roles.includes(area)) return false;

          // E3. Rule: Publicaciones únicamente: Steven, Adriana, Dayanna
          if (area === 'Publicaciones') {
            const allowedForPub = ['steven', 'adriana', 'dayanna'];
            if (!allowedForPub.includes(member.id)) return false;
          }

          // E4. Rule: Support staff (Dagner, Jeremías) are support, they should not be scheduled as primary
          // unless there are absolutely no other candidates. Let's make them primary ineligible by default
          // if there are others, since they only appear as support.
          if (member.id === 'dagner' || member.id === 'jeremias') {
            return false; // These are support only
          }

          // F. Avoid double assignment: If they are already assigned to an area on this same day, skip them
          const alreadyAssignedToday = dailyAssignments.some(da => da.primaryMemberId === member.id);
          if (alreadyAssignedToday) return false;

          return true;
        });

        if (eligibleCandidates.length > 0) {
          // Sort candidates by current period workload (primary) and historical workload (secondary) to distribute equity
          eligibleCandidates.sort((a, b) => {
            const loadA = currentPeriodWorkload[a.id] + (historicalWorkload[a.id] * 0.3);
            const loadB = currentPeriodWorkload[b.id] + (historicalWorkload[b.id] * 0.3);
            return loadA - loadB;
          });

          assignedMemberId = eligibleCandidates[0].id;
        } else {
          // Fallback: If absolutely nobody is available (rare), check if we can assign someone who is already assigned today, or use Steven (coordinator) as default
          const fallbackCandidates = members.filter(m => m.active && m.roles.includes(area) && m.id !== 'dagner' && m.id !== 'jeremias');
          if (fallbackCandidates.length > 0) {
            assignedMemberId = fallbackCandidates[0].id;
          } else {
            assignedMemberId = 'steven'; // Coordinator fallback
          }
        }
      }

      // Update current workload for the assigned member
      if (assignedMemberId && currentPeriodWorkload[assignedMemberId] !== undefined) {
        currentPeriodWorkload[assignedMemberId] += 1;
      }

      // 3. Check for Support staff (Apoyo)
      // Dagner: Apoyo en Transmisión martes y jueves.
      // Jeremías: Apoyo en Transmisión sábado y domingo.
      let supportMemberId: string | undefined;

      if (area === 'Transmisión') {
        if (dayName === 'Martes' || dayName === 'Jueves') {
          // Check if Dagner is active and not blocked
          const dagner = members.find(m => m.id === 'dagner');
          if (dagner && dagner.active && !dagner.blockedDates.includes(date)) {
            supportMemberId = 'dagner';
          }
        } else if (dayName === 'Sábado' || dayName === 'Domingo') {
          // Check if Jeremías is active and not blocked
          const jeremias = members.find(m => m.id === 'jeremias');
          if (jeremias && jeremias.active && !jeremias.blockedDates.includes(date)) {
            supportMemberId = 'jeremias';
          }
        }
      }

      const assignment: Assignment = {
        id: `${date}-${area.toLowerCase().replace('í', 'i').replace('ó', 'o')}`,
        date,
        area,
        primaryMemberId: assignedMemberId,
        supportMemberId,
        status: 'pendiente',
        notified: false
      };

      dailyAssignments.push(assignment);
      assignments.push(assignment);
    });
  });

  // Name period nicely, e.g. "16 Jul - 16 Ago 2026"
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const sDate = new Date(startDateStr + 'T00:00:00');
  const eDate = new Date(endDateStr + 'T00:00:00');
  const name = `Periodo: 16 ${monthNames[sDate.getMonth()]} - 16 ${monthNames[eDate.getMonth()]} ${sDate.getFullYear()}`;

  return {
    id: `period-${startDateStr}`,
    name,
    startDate: startDateStr,
    endDate: endDateStr,
    assignments
  };
}

/**
 * Formats a premium customized WhatsApp message text for a member.
 */
export function getWhatsAppMessageText(
  memberName: string,
  areaEmoji: string,
  areaName: string,
  dateStr: string,
  dayName: string,
  baseUrl?: string,
  assignmentId?: string,
  waConfig?: AppWhatsAppConfig
): string {
  // Convert YYYY-MM-DD to a beautiful readable format e.g. "16 de Julio"
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dayNum = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  const yearNum = dateObj.getFullYear();
  const readableDate = `${dayNum} de ${monthName}, ${yearNum}`;
  
  // Map emojis safely using String.fromCodePoint to avoid bundler or encoding issues
  let safeAreaEmoji = areaEmoji;
  if (areaName === 'Fotografía') safeAreaEmoji = String.fromCodePoint(0x1F4F7);
  else if (areaName === 'Proyección') safeAreaEmoji = String.fromCodePoint(0x1F4FA);
  else if (areaName === 'Transmisión') safeAreaEmoji = String.fromCodePoint(0x1F3AC);
  else if (areaName === 'Publicidad') safeAreaEmoji = String.fromCodePoint(0x1F4E2);
  else if (areaName === 'Publicaciones') safeAreaEmoji = String.fromCodePoint(0x1F4F1);
  else if (safeAreaEmoji) {
    if (safeAreaEmoji === '📷') safeAreaEmoji = String.fromCodePoint(0x1F4F7);
    else if (safeAreaEmoji === '📺') safeAreaEmoji = String.fromCodePoint(0x1F4FA);
    else if (safeAreaEmoji === '🎥') safeAreaEmoji = String.fromCodePoint(0x1F3A5);
    else if (safeAreaEmoji === '📢') safeAreaEmoji = String.fromCodePoint(0x1F4E2);
    else if (safeAreaEmoji === '📱') safeAreaEmoji = String.fromCodePoint(0x1F4F1);
  }

  const emojiCheck = String.fromCodePoint(0x2705);
  const emojiCross = String.fromCodePoint(0x274C);

  // Construct direct confirmation links
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const memberSlug = encodeURIComponent(memberName.toLowerCase());
  
  let linkConfirmation = `${origin}/?member=${memberSlug}`;
  if (assignmentId) {
    linkConfirmation = `${origin}/?member=${memberSlug}&assignmentId=${assignmentId}`;
  }

  const linkConfirmDirect = assignmentId 
    ? `${origin}/?action=confirmar&assignmentId=${assignmentId}`
    : `${origin}/?member=${memberSlug}`;

  const linkDeclineDirect = assignmentId 
    ? `${origin}/?action=rechazar&assignmentId=${assignmentId}`
    : `${origin}/?member=${memberSlug}`;

  // If custom template is set, evaluate placeholders
  if (waConfig && waConfig.template) {
    let result = waConfig.template
      .replace(/\{nombre\}/gi, memberName)
      .replace(/\{area\}/gi, areaName)
      .replace(/\{emoji\}/gi, safeAreaEmoji)
      .replace(/\{fecha\}/gi, readableDate)
      .replace(/\{dia\}/gi, dayName)
      .replace(/\{hora\}/gi, 'Recuerda llegar 30 minutos antes para preparación.')
      .replace(/\{versiculo\}/gi, waConfig.verse || 'Sirvan al Señor con alegría - Salmos 100:2')
      .replace(/\{vestimenta\}/gi, waConfig.dressCode || 'Formal / Uniforme DECOM')
      .replace(/\{link_confirmacion\}/gi, `${emojiCheck} Confirmar:\n${linkConfirmDirect}\n\n${emojiCross} Declinar:\n${linkDeclineDirect}`);

    return result;
  }

  // Fallback default format
  const emojiWave = String.fromCodePoint(0x1F44B);
  const emojiHeart = String.fromCodePoint(0x2764) + String.fromCodePoint(0xFE0F);
  const emojiHands = String.fromCodePoint(0x1F64F);

  let msg = `Hola *${memberName}* ${emojiWave}\n\n` +
         `Te escribimos de parte del *Departamento de Comunicaciones (DECOM)* para recordarte tu servicio asignado:\n\n` +
         `*Área:* ${safeAreaEmoji} ${areaName}\n` +
         `*Día:* ${dayName} ${readableDate}\n` +
         `*Hora:* Recuerda llegar 30 minutos antes para preparación y pruebas.\n\n`;

  if (waConfig?.verse) {
    msg += `📖 *Versículo:* "${waConfig.verse}"\n`;
  }
  if (waConfig?.dressCode) {
    msg += `👔 *Vestimenta:* ${waConfig.dressCode}\n`;
  }

  msg += `\nPor favor, confirma tu asistencia presionando uno de los siguientes enlaces:\n\n` +
         `${emojiCheck} *Confirmar asistencia:*\n${linkConfirmDirect}\n\n` +
         `${emojiCross} *No podré asistir:*\n${linkDeclineDirect}\n\n` +
         `¡Muchas gracias por servir con amor y dedicación! ${emojiHeart}${emojiHands}`;

  return msg;
}

