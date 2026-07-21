/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AreaType = 'Fotografía' | 'Proyección' | 'Transmisión' | 'Publicidad' | 'Publicaciones';

export interface Member {
  id: string;
  name: string;
  photoUrl: string; // Emoji avatar or custom CSS background
  phone: string; // WhatsApp format, e.g., +506 8888-8888
  active: boolean;
  roles: AreaType[]; // Areas they can serve
  availability: {
    [key: string]: boolean; // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo' => true/false
  };
  notes: string;
  blockedDates: string[]; // YYYY-MM-DD list of blocked days
}

export interface Assignment {
  id: string;
  date: string; // YYYY-MM-DD
  area: AreaType;
  primaryMemberId: string;
  supportMemberId?: string; // e.g. Jeremías or Dagner
  status: 'pendiente' | 'confirmado' | 'rechazado' | 'enviado' | 'entregado';
  notified: boolean;
  notifiedAt?: string;
  rejectReason?: string;
  reassignedFromId?: string;
}

export interface SchedulePeriod {
  id: string;
  name: string; // e.g. "16 Jul - 16 Ago 2026"
  startDate: string; // YYYY-MM-DD (always 16th)
  endDate: string; // YYYY-MM-DD (always 16th of next month)
  assignments: Assignment[];
}

export interface CultoEvent {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // e.g. "Culto de Enseñanza", "Culto de Jóvenes", "Culto Dominical"
  dayOfWeek: string; // 'Martes' | 'Jueves' | 'Sábado' | 'Domingo' etc.
  areasNeeded: AreaType[];
}

export interface AssignmentRule {
  id: string;
  memberId: string;
  description: string;
  type: 'only_days' | 'never_days' | 'never_role' | 'fixed_role_day' | 'support_role_day' | 'only_roles';
  days?: string[]; // Days of week applicable
  roles?: AreaType[]; // Roles applicable
  fixedRoleDayMappings?: { day: string; role: AreaType }[]; // Day to Role mapping (e.g. Shara: Martes -> Proyección)
}

export interface WhatsAppMessageSim {
  id: string;
  assignmentId: string;
  memberName: string;
  phone: string;
  messageText: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}
