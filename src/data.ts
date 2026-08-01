/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, AreaType, AssignmentRule, CultoEvent, SchedulePeriod, Assignment, AppWhatsAppConfig } from './types';

export const DEFAULT_WHATSAPP_CONFIG: AppWhatsAppConfig = {
  template: `Hola *{nombre}* 👋

Te recordamos tu servicio asignado en el *Departamento de Comunicaciones (DECOM)*:

*Área:* {emoji} {area}
*Día:* {dia} {fecha}
*Hora:* Recuerda llegar 30 minutos antes para preparación y pruebas.

📖 *Versículo:* "{versiculo}"
👔 *Vestimenta sugerida:* {vestimenta}

Por favor confirma tu asistencia presionando el enlace directo:
{link_confirmacion}

¡Muchas gracias por servir con amor y excelencia! ❤️🙏`,
  verse: 'Sirvan al Señor con alegría; vengan ante su presencia con regocijo. - Salmos 100:2',
  dressCode: 'Formal o Uniforme DECOM',
  gatewayUrl: '',
  apiKey: '',
  autoSendEnabled: false
};


// Pre-configured list of members matching exactly the user requested list (excluding Merari and Yennedy)
export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'steven',
    name: 'Steven',
    photoUrl: '👨‍💻',
    phone: '+506 8421-9988',
    active: true,
    roles: ['Fotografía', 'Proyección', 'Transmisión', 'Publicidad', 'Publicaciones'],
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'Coordinador general del departamento.',
    blockedDates: []
  },
  {
    id: 'adriana',
    name: 'Adriana',
    photoUrl: '👩‍🎨',
    phone: '+506 8765-4321',
    active: true,
    roles: ['Fotografía', 'Proyección', 'Publicidad', 'Publicaciones'],
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'Especialista en diseño y publicaciones.',
    blockedDates: []
  },
  {
    id: 'dayanna',
    name: 'Dayanna',
    photoUrl: '👩‍📷',
    phone: '+506 8333-1122',
    active: true,
    roles: ['Fotografía', 'Transmisión', 'Publicaciones'],
    availability: {
      'Lunes': false, 'Martes': false, 'Miércoles': false, 'Jueves': false, 'Viernes': false, 'Sábado': true, 'Domingo': true
    },
    notes: 'Solo disponible fines de semana por estudios universitarios.',
    blockedDates: []
  },
  {
    id: 'keyla',
    name: 'Keyla',
    photoUrl: '👩‍🎤',
    phone: '+506 7211-5544',
    active: true,
    roles: ['Fotografía', 'Proyección', 'Transmisión'], // Excludes Publicidad by default roles
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'No asignable a Publicidad.',
    blockedDates: []
  },
  {
    id: 'shara',
    name: 'Shara',
    photoUrl: '👩‍💻',
    phone: '+506 8555-9900',
    active: true,
    roles: ['Proyección', 'Fotografía'],
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'Cumple roles específicos por día de la semana.',
    blockedDates: []
  },
  {
    id: 'melanie',
    name: 'Melanie',
    photoUrl: '👩‍💼',
    phone: '+506 7122-3344',
    active: true,
    roles: ['Fotografía', 'Proyección', 'Publicidad'],
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'Alta disponibilidad.',
    blockedDates: []
  },
  {
    id: 'dagner',
    name: 'Dagner',
    photoUrl: '👨‍🎥',
    phone: '+506 6011-8899',
    active: true,
    roles: ['Transmisión'],
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'Apoyo específico para transmisión martes y jueves.',
    blockedDates: []
  },
  {
    id: 'jeremias',
    name: 'Jeremías',
    photoUrl: '👨‍🔧',
    phone: '+506 6200-7766',
    active: true,
    roles: ['Transmisión'],
    availability: {
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    },
    notes: 'Apoyo específico para transmisión fines de semana.',
    blockedDates: []
  }
];

// Default scheduling rules configured on the panel
export const INITIAL_RULES: AssignmentRule[] = [
  {
    id: 'rule-dayanna-days',
    memberId: 'dayanna',
    type: 'only_days',
    days: ['Sábado', 'Domingo'],
    description: 'Dayanna: Solo trabaja sábados y domingos. Nunca martes o jueves.'
  },
  {
    id: 'rule-keyla-never-pub',
    memberId: 'keyla',
    type: 'never_role',
    roles: ['Publicidad'],
    description: 'Keyla: Nunca puede estar asignada en el área de Publicidad.'
  },
  {
    id: 'rule-shara-fixed',
    memberId: 'shara',
    type: 'fixed_role_day',
    description: 'Shara: Martes -> Proyección, Jueves -> Fotografía, Sábado -> Proyección.',
    fixedRoleDayMappings: [
      { day: 'Martes', role: 'Proyección' },
      { day: 'Jueves', role: 'Fotografía' },
      { day: 'Sábado', role: 'Proyección' }
    ]
  },
  {
    id: 'rule-dagner-support',
    memberId: 'dagner',
    type: 'support_role_day',
    days: ['Martes', 'Jueves'],
    roles: ['Transmisión'],
    description: 'Dagner: Apoyo en Transmisión los martes y jueves.'
  },
  {
    id: 'rule-jeremias-support',
    memberId: 'jeremias',
    type: 'support_role_day',
    days: ['Sábado', 'Domingo'],
    roles: ['Transmisión'],
    description: 'Jeremías: Apoyo en Transmisión los sábados y domingos.'
  },
  {
    id: 'rule-publicaciones-exclusive',
    memberId: 'publicaciones-group', // Meta ID for group checking
    type: 'only_roles',
    roles: ['Publicaciones'],
    description: 'Publicaciones únicamente: Steven, Adriana y Dayanna.'
  }
];

// Standard church services (Cultos) that repeat weekly
export const DEFAULT_WEEKLY_CULTOS = [
  { day: 'Martes', name: 'Culto de Oración y Enseñanza', areas: ['Proyección', 'Transmisión', 'Fotografía'] as AreaType[] },
  { day: 'Jueves', name: 'Culto de Discipulado', areas: ['Proyección', 'Transmisión', 'Fotografía'] as AreaType[] },
  { day: 'Sábado', name: 'Culto de Jóvenes', areas: ['Proyección', 'Transmisión', 'Fotografía', 'Publicidad'] as AreaType[] },
  { day: 'Domingo', name: 'Culto Dominical', areas: ['Fotografía', 'Proyección', 'Transmisión', 'Publicidad', 'Publicaciones'] as AreaType[] }
];

export const AREAS_METADATA: { name: AreaType; emoji: string; color: string; bg: string; border: string; desc: string }[] = [
  {
    name: 'Fotografía',
    emoji: '📷',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/50',
    desc: 'Capturar momentos de cultos y eventos especiales.'
  },
  {
    name: 'Proyección',
    emoji: '📺',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-200 dark:border-indigo-900/50',
    desc: 'Letras, versículos y multimedia en las pantallas del templo.'
  },
  {
    name: 'Transmisión',
    emoji: '🎥',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-900/50',
    desc: 'Streaming en vivo, cámaras, audio y switches.'
  },
  {
    name: 'Publicidad',
    emoji: '📢',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/50',
    desc: 'Anuncios, banners físicos, y comunicación general.'
  },
  {
    name: 'Publicaciones',
    emoji: '📱',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-900/50',
    desc: 'Redes sociales, reels, historias y boletín digital.'
  }
];

// Helper to get Spanish name of day
export const DAY_NAMES_EN_TO_ES: { [key: string]: string } = {
  'Monday': 'Lunes',
  'Tuesday': 'Martes',
  'Wednesday': 'Miércoles',
  'Thursday': 'Jueves',
  'Friday': 'Viernes',
  'Saturday': 'Sábado',
  'Sunday': 'Domingo'
};

export const DAY_NAMES_INDEX_TO_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function getDayNameSpanish(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES_INDEX_TO_ES[date.getDay()];
}

// Function to store the entire state in local storage
export interface AppStorageState {
  members: Member[];
  rules: AssignmentRule[];
  periods: SchedulePeriod[];
  weeklyCultos: typeof DEFAULT_WEEKLY_CULTOS;
  waConfig?: AppWhatsAppConfig;
}

const STORAGE_KEY = 'decom_manager_state_v1';

export function saveStateToStorage(state: AppStorageState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadStateFromStorage(): AppStorageState {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        waConfig: parsed.waConfig || DEFAULT_WHATSAPP_CONFIG
      };
    } catch (e) {
      console.error('Error parsing stored DECOM manager state:', e);
    }
  }
  // Initial Seed State
  return {
    members: INITIAL_MEMBERS,
    rules: INITIAL_RULES,
    periods: [], // Generated automatically on first demand or seeded
    weeklyCultos: DEFAULT_WEEKLY_CULTOS,
    waConfig: DEFAULT_WHATSAPP_CONFIG
  };
}

export async function saveStateToServer(state: AppStorageState): Promise<void> {
  try {
    const response = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!response.ok) {
      throw new Error('API saving failed');
    }
    // Also save to localStorage as backup
    saveStateToStorage(state);
  } catch (error) {
    console.warn('Backend unavailable, saving to localStorage only');
    saveStateToStorage(state);
  }
}

export async function loadStateFromServer(): Promise<AppStorageState> {
  try {
    const response = await fetch('/api/state');
    if (response.ok) {
      const data = await response.json();
      if (data && Object.keys(data).length > 0) {
        return {
          members: data.members || INITIAL_MEMBERS,
          rules: data.rules || INITIAL_RULES,
          periods: data.periods || [],
          weeklyCultos: data.weeklyCultos || DEFAULT_WEEKLY_CULTOS,
          waConfig: data.waConfig || DEFAULT_WHATSAPP_CONFIG,
        };
      }
    }
  } catch (error) {
    console.warn('Backend unavailable, loading from localStorage');
  }
  return loadStateFromStorage();
}
