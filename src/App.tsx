/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  MessageSquareShare, 
  BarChart3, 
  Settings, 
  Sparkles, 
  Layers, 
  Calendar,
  X,
  Bell,
  HelpCircle,
  Menu,
  BookOpen,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  Loader2
} from 'lucide-react';
import { Member, SchedulePeriod, Assignment, AreaType, AssignmentRule } from './types';
import { loadStateFromStorage, saveStateToStorage, INITIAL_MEMBERS, INITIAL_RULES, DEFAULT_WEEKLY_CULTOS, loadStateFromServer, saveStateToServer } from './data';
import { generateSchedule } from './utils/scheduler';

// Import Views
import DashboardView from './components/DashboardView';
import SchedulesView from './components/SchedulesView';
import CalendarView from './components/CalendarView';
import MembersView from './components/MembersView';
import AreasView from './components/AreasView';
import ConfirmationsView from './components/ConfirmationsView';
import StatsView from './components/StatsView';
import ConfigView from './components/ConfigView';
import MyServicePortalView from './components/MyServicePortalView';

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning';
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Central State Hub
  const [members, setMembers] = useState<Member[]>([]);
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [weeklyCultos, setWeeklyCultos] = useState<typeof DEFAULT_WEEKLY_CULTOS>([]);
  // Coordinator Authentication state
  const [isCoordinatorLoggedIn, setIsCoordinatorLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('is_coordinator_logged_in') === 'true';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedMode = localStorage.getItem('app_user_mode');
    const savedLoggedIn = localStorage.getItem('is_coordinator_logged_in') === 'true';
    if (savedLoggedIn && savedMode === 'coordinador') {
      return 'dashboard';
    }
    return 'portal-servidores';
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  
  // Mobile UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Simulated Logged-In Member & User Role Mode
  const [portalLoggedMemberId, setPortalLoggedMemberId] = useState<string>(() => {
    return localStorage.getItem('portal_logged_member_id') || 'steven';
  });
  const [userMode, setUserMode] = useState<'coordinador' | 'servidor'>(() => {
    const savedMode = localStorage.getItem('app_user_mode') as 'coordinador' | 'servidor';
    const savedLoggedIn = localStorage.getItem('is_coordinator_logged_in') === 'true';
    if (savedLoggedIn && savedMode === 'coordinador') {
      return 'coordinador';
    }
    return 'servidor';
  });

  // Load from backend on mount
  useEffect(() => {
    let isMounted = true;
    loadStateFromServer().then(loaded => {
      if (!isMounted) return;
      let currentPeriods = loaded.periods || [];
      if (currentPeriods.length === 0) {
        const initialPeriod = generateSchedule(
          '2026-07-16',
          loaded.members,
          loaded.rules,
          loaded.weeklyCultos,
          []
        );
        currentPeriods = [initialPeriod];
      }
      setMembers(loaded.members);
      setRules(loaded.rules);
      setPeriods(currentPeriods);
      setWeeklyCultos(loaded.weeklyCultos);
      setSelectedPeriodId(currentPeriods[0]?.id || '');
      setIsLoaded(true);
    });
    return () => { isMounted = false; };
  }, []);

  // Coordinator login modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sync portal states to localStorage
  useEffect(() => {
    localStorage.setItem('portal_logged_member_id', portalLoggedMemberId);
  }, [portalLoggedMemberId]);

  useEffect(() => {
    localStorage.setItem('app_user_mode', userMode);
  }, [userMode]);

  useEffect(() => {
    localStorage.setItem('is_coordinator_logged_in', isCoordinatorLoggedIn ? 'true' : 'false');
  }, [isCoordinatorLoggedIn]);

  // Enforce tab locking when in Servidor Mode or Not Logged In
  useEffect(() => {
    if ((userMode === 'servidor' || !isCoordinatorLoggedIn) && activeTab !== 'portal-servidores' && activeTab !== 'calendario') {
      setActiveTab('portal-servidores');
    }
  }, [userMode, isCoordinatorLoggedIn, activeTab]);

  // Interactive Bot State
  const [botResponse, setBotResponse] = useState<{
    action: 'confirmar' | 'rechazar';
    assignmentId: string;
    member: Member;
    assignment: Assignment;
    submitted: boolean;
    rejectReason?: string;
  } | null>(null);

  // Initialize on mount: check query params for WhatsApp Actions
  useEffect(() => {
    // Parse URL query parameters for Interactive Response Bot Action
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const assignmentId = params.get('assignmentId');

    if (action && assignmentId && (action === 'confirmar' || action === 'rechazar')) {
      let foundAssignment: Assignment | null = null;
      let foundPeriodId = '';

      for (const p of periods) {
        const found = p.assignments.find(a => a.id === assignmentId);
        if (found) {
          foundAssignment = found;
          foundPeriodId = p.id;
          break;
        }
      }

      if (foundAssignment) {
        const member = members.find(m => m.id === foundAssignment!.primaryMemberId);
        if (member) {
          // Trigger bot response modal view - starts NOT submitted so they can choose
          setBotResponse({
            action: action as 'confirmar' | 'rechazar',
            assignmentId,
            member,
            assignment: foundAssignment,
            submitted: false
          });

          // Set them to Servidor Mode logged in as themselves
          setPortalLoggedMemberId(member.id);
          setUserMode('servidor');
          setActiveTab('portal-servidores');

          // Clean up URL parameters so refresh works normally
          window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
        }
      }
    }
  }, []);

  const handleBotSubmit = (status: 'confirmado' | 'rechazado', reason: string) => {
    if (!botResponse) return;
    const { assignmentId } = botResponse;

    const updatedPeriods = periods.map(p => {
      const assignments = p.assignments.map(a => {
        if (a.id === assignmentId) {
          return { 
            ...a, 
            status: status, 
            notified: true, 
            notifiedAt: a.notifiedAt || new Date().toLocaleTimeString() 
          };
        }
        return a;
      });
      return { ...p, assignments };
    });

    setPeriods(updatedPeriods);
    setBotResponse({
      ...botResponse,
      action: status === 'confirmado' ? 'confirmar' : 'rechazar',
      submitted: true,
      rejectReason: status === 'rechazado' ? reason : undefined
    });

    // Enforce Servidor Mode for this volunteer
    setUserMode('servidor');
    setPortalLoggedMemberId(botResponse.member.id);
    setActiveTab('portal-servidores');

    if (status === 'confirmado') {
      triggerNotification(`¡Se confirmó la asistencia de ${botResponse.member.name}!`, 'success');
    } else {
      triggerNotification(`Se registró la inasistencia de ${botResponse.member.name}. Razón: "${reason}"`, 'warning');
    }
  };

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (usernameInput.trim().toUpperCase() === 'STCEREZO4' && passwordInput === '06129812') {
      setIsCoordinatorLoggedIn(true);
      localStorage.setItem('is_coordinator_logged_in', 'true');
      setUserMode('coordinador');
      localStorage.setItem('app_user_mode', 'coordinador');
      setPortalLoggedMemberId('steven'); // Steven is the coordinator
      setActiveTab('dashboard');
      setShowLoginModal(false);
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
      triggerNotification('¡Bienvenido, Steven Cerezo! Sesión de coordinador iniciada.', 'success');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
      triggerNotification('Credenciales de coordinador incorrectas', 'warning');
    }
  };

  // Save to storage on state changes
  useEffect(() => {
    if (isLoaded && members.length > 0) {
      saveStateToServer({
        members,
        rules,
        periods,
        weeklyCultos
      });
    }
  }, [members, rules, periods, weeklyCultos, isLoaded]);

  // Toast alert launcher helper
  const triggerNotification = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleRemoveToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Simulation handler: WhatsApp message triggered
  const handleSimulateMessage = (assignment: Assignment, member: Member) => {
    // This logs inside our confirmations dashboard
    triggerNotification(`Recordatorio enviado a ${member.name}: ${member.phone}`, 'success');
  };

  // Factory reset back to initial setup
  const handleResetSystem = () => {
    // Generate initial period with defaults
    const defaultPeriod = generateSchedule(
      '2026-07-16',
      INITIAL_MEMBERS,
      INITIAL_RULES,
      DEFAULT_WEEKLY_CULTOS,
      []
    );
    setMembers(INITIAL_MEMBERS);
    setRules(INITIAL_RULES);
    setPeriods([defaultPeriod]);
    setWeeklyCultos(DEFAULT_WEEKLY_CULTOS);
    setSelectedPeriodId(defaultPeriod.id);
  };

  // JSON Export / Import state
  const handleExportState = (): string => {
    const state = {
      members,
      rules,
      periods,
      weeklyCultos
    };
    return JSON.stringify(state, null, 2);
  };

  const handleImportState = (importedJson: string): boolean => {
    try {
      const parsed = JSON.parse(importedJson);
      if (parsed.members && parsed.rules && parsed.periods && parsed.weeklyCultos) {
        setMembers(parsed.members);
        setRules(parsed.rules);
        setPeriods(parsed.periods);
        setWeeklyCultos(parsed.weeklyCultos);
        if (parsed.periods.length > 0) {
          setSelectedPeriodId(parsed.periods[0].id);
        }
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  // Tab definitions
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cronogramas', label: 'Cronogramas', icon: CalendarDays },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'integrantes', label: 'Integrantes', icon: Users },
    { id: 'areas', label: 'Áreas de servicio', icon: Layers },
    { id: 'confirmaciones', label: 'Confirmaciones', icon: MessageSquareShare },
    { id: 'portal-servidores', label: 'Portal de Servidores', icon: UserCheck },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  // Filter tabs based on user mode and authentication status
  const visibleTabs = (userMode === 'coordinador' && isCoordinatorLoggedIn) 
    ? tabs 
    : tabs.filter(t => t.id === 'portal-servidores' || t.id === 'calendario');

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Conectando al Servidor</h2>
        <p className="text-sm">Iniciando base de datos y cargando estado de la aplicación...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-800 font-sans antialiased flex flex-col md:flex-row" id="app-root">
      
      {/* 1. Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-r border-gray-200 p-6 shrink-0" id="desktop-sidebar">
        <div className="space-y-8">
          {/* Brand/Logo Header */}
          <div className="flex items-center gap-3 px-1 pt-1" id="brand-header">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-xs">
              ⛪
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900 text-sm leading-none tracking-tight">DECOM</h2>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">Manager</span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1" id="desktop-nav">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile footer info */}
        <div className="border-t border-gray-100 pt-4 px-2 flex flex-col gap-2.5" id="profile-footer">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center font-extrabold text-sm text-indigo-700">
              {portalLoggedMemberId === 'steven' ? 'SC' : members.find(m => m.id === portalLoggedMemberId)?.name.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="truncate flex-1">
              <h4 className="text-xs font-extrabold text-gray-900 leading-none">
                {portalLoggedMemberId === 'steven' ? 'Steven Cerezo' : members.find(m => m.id === portalLoggedMemberId)?.name || 'Usuario'}
              </h4>
              <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
                {portalLoggedMemberId === 'steven' ? 'stevencerezo42@gmail.com' : 'Servidor Activo'}
              </span>
            </div>
          </div>

          {/* Mode Switcher for Simulation/Testing */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Rol del Sistema</label>
              {isCoordinatorLoggedIn && (
                <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                  ✓ Verificado
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1 bg-gray-50 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-100 dark:border-gray-700">
              <button
                onClick={() => {
                  if (isCoordinatorLoggedIn) {
                    setUserMode('coordinador');
                    setPortalLoggedMemberId('steven');
                    setActiveTab('dashboard');
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  userMode === 'coordinador' && isCoordinatorLoggedIn
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {!isCoordinatorLoggedIn && <Lock className="w-2.5 h-2.5" />}
                Coordinador
              </button>
              <button
                onClick={() => {
                  setUserMode('servidor');
                  if (portalLoggedMemberId === 'steven') {
                    const firstNonSteven = members.find(m => m.id !== 'steven' && m.active)?.id || '';
                    setPortalLoggedMemberId(firstNonSteven);
                  }
                  setActiveTab('portal-servidores');
                }}
                className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  userMode === 'servidor'
                    ? 'bg-amber-500 text-gray-950 font-extrabold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Servidor
              </button>
            </div>

            {isCoordinatorLoggedIn && (
              <button
                onClick={() => {
                  setIsCoordinatorLoggedIn(false);
                  localStorage.setItem('is_coordinator_logged_in', 'false');
                  setUserMode('servidor');
                  localStorage.setItem('app_user_mode', 'servidor');
                  const firstNonSteven = members.find(m => m.id !== 'steven' && m.active)?.id || '';
                  setPortalLoggedMemberId(firstNonSteven);
                  setActiveTab('portal-servidores');
                  triggerNotification('Sesión de coordinator cerrada.', 'info');
                }}
                className="w-full mt-1.5 py-1 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold rounded-md border border-dashed border-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Cerrar Sesión 🔒</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Top Bar (Mobile) */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-20 sticky top-0" id="mobile-header">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base shadow-sm">
            ⛪
          </div>
          <span className="font-extrabold text-gray-950 text-sm">DECOM Manager</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
          id="btn-mobile-menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Drawer menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30" 
          onClick={() => setMobileMenuOpen(false)}
          id="mobile-drawer-backdrop"
        />
      )}

      {/* Mobile Drawer container */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-40 p-5 border-r border-gray-200 transform transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`} id="mobile-drawer">
        <div className="space-y-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⛪</span>
                <span className="font-black text-gray-950 text-sm">DECOM Menu</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <nav className="space-y-1">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-700 font-extrabold' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                {portalLoggedMemberId === 'steven' ? 'SC' : members.find(m => m.id === portalLoggedMemberId)?.name.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="truncate flex-1">
                <h4 className="text-xs font-bold text-gray-900 leading-none">
                  {portalLoggedMemberId === 'steven' ? 'Steven Cerezo' : members.find(m => m.id === portalLoggedMemberId)?.name || 'Usuario'}
                </h4>
                <span className="text-[9px] text-gray-400 block mt-0.5 truncate">
                  {portalLoggedMemberId === 'steven' ? 'stevencerezo42@gmail.com' : 'Servidor Activo'}
                </span>
              </div>
            </div>

            {/* Mobile Mode Switcher */}
            <div className="mt-1 bg-gray-50 p-1 rounded-lg border border-gray-100 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Rol</span>
                {isCoordinatorLoggedIn && (
                  <span className="text-[9px] text-emerald-600 font-extrabold">✓ Verificado</span>
                )}
              </div>
              <div className="flex items-center justify-around gap-1 w-full">
                <button
                  onClick={() => {
                    if (isCoordinatorLoggedIn) {
                      setUserMode('coordinador');
                      setPortalLoggedMemberId('steven');
                      setActiveTab('dashboard');
                    } else {
                      setShowLoginModal(true);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all text-center flex items-center justify-center gap-1 ${
                    userMode === 'coordinador' && isCoordinatorLoggedIn
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {!isCoordinatorLoggedIn && <Lock className="w-2.5 h-2.5" />}
                  Coordinador
                </button>
                <button
                  onClick={() => {
                    setUserMode('servidor');
                    if (portalLoggedMemberId === 'steven') {
                      const firstNonSteven = members.find(m => m.id !== 'steven' && m.active)?.id || '';
                      setPortalLoggedMemberId(firstNonSteven);
                    }
                    setActiveTab('portal-servidores');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all text-center ${
                    userMode === 'servidor'
                      ? 'bg-amber-500 text-gray-950 font-extrabold shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Servidor
                </button>
              </div>

              {isCoordinatorLoggedIn && (
                <button
                  onClick={() => {
                    setIsCoordinatorLoggedIn(false);
                    localStorage.setItem('is_coordinator_logged_in', 'false');
                    setUserMode('servidor');
                    localStorage.setItem('app_user_mode', 'servidor');
                    const firstNonSteven = members.find(m => m.id !== 'steven' && m.active)?.id || '';
                    setPortalLoggedMemberId(firstNonSteven);
                    setActiveTab('portal-servidores');
                    setMobileMenuOpen(false);
                    triggerNotification('Sesión de coordinador cerrada.', 'info');
                  }}
                  className="w-full py-1 text-[9px] text-rose-600 hover:text-rose-700 font-bold rounded-md border border-dashed border-rose-200 text-center cursor-pointer transition-all"
                >
                  Cerrar Sesión 🔒
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Stage Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-20 md:pb-8" id="stage-area">
        {activeTab === 'dashboard' && (
          <DashboardView 
            members={members} 
            periods={periods} 
            setPeriods={setPeriods}
            setActiveTab={setActiveTab}
            triggerNotification={triggerNotification}
            onSimulateMessage={handleSimulateMessage}
          />
        )}
        {activeTab === 'cronogramas' && (
          <SchedulesView 
            periods={periods} 
            setPeriods={setPeriods} 
            members={members}
            rules={rules}
            weeklyCultos={weeklyCultos}
            selectedPeriodId={selectedPeriodId}
            setSelectedPeriodId={setSelectedPeriodId}
            triggerNotification={triggerNotification}
          />
        )}
        {activeTab === 'calendario' && (
          <CalendarView 
            periods={periods} 
            setPeriods={setPeriods} 
            members={members}
            triggerNotification={triggerNotification}
            isCoordinator={userMode === 'coordinador' && isCoordinatorLoggedIn}
          />
        )}
        {activeTab === 'integrantes' && (
          <MembersView 
            members={members} 
            setMembers={setMembers} 
            periods={periods}
            triggerNotification={triggerNotification}
          />
        )}
        {activeTab === 'areas' && (
          <AreasView 
            members={members} 
            periods={periods} 
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'confirmaciones' && (
          <ConfirmationsView 
            periods={periods} 
            setPeriods={setPeriods} 
            members={members}
            triggerNotification={triggerNotification}
          />
        )}
        {activeTab === 'portal-servidores' && (
          <MyServicePortalView 
            periods={periods} 
            setPeriods={setPeriods} 
            members={members}
            triggerNotification={triggerNotification}
            selectedMemberId={portalLoggedMemberId}
            setSelectedMemberId={setPortalLoggedMemberId}
          />
        )}
        {activeTab === 'estadisticas' && (
          <StatsView 
            periods={periods} 
            members={members}
          />
        )}
        {activeTab === 'configuracion' && (
          <ConfigView 
            rules={rules} 
            setRules={setRules} 
            members={members}
            weeklyCultos={weeklyCultos}
            setWeeklyCultos={setWeeklyCultos}
            onResetSystem={handleResetSystem}
            onImportState={handleImportState}
            onExportState={handleExportState}
            triggerNotification={triggerNotification}
          />
        )}
      </main>

      {/* 4. Sticky Mobile Bottom Navigation Tab Bar (iPhone/Android optimized quick access) */}
      {userMode === 'coordinador' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 h-16 flex items-center justify-around z-10 px-2 shadow-lg" id="mobile-bottom-tabs">
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'calendario', label: 'Calendar', icon: Calendar },
            { id: 'confirmaciones', label: 'WhatsApp', icon: MessageSquareShare },
            { id: 'integrantes', label: 'Equipo', icon: Users },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center cursor-pointer transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
                <span className="text-[10px] font-bold mt-1 tracking-tight leading-none">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* 5. Floating Toast Notifications Banner */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full" id="toast-banner">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`flex items-start gap-2.5 p-4 rounded-xl shadow-lg border border-gray-100 animate-slide-in text-xs font-semibold text-white ${
              toast.type === 'success' 
                ? 'bg-gray-950 dark:bg-black/95 text-emerald-400' 
                : toast.type === 'warning'
                ? 'bg-rose-950 text-rose-400 border-rose-900/50'
                : 'bg-indigo-950 text-indigo-400 border-indigo-900/50'
            }`}
          >
            <div className="flex-1">
              {toast.text}
            </div>
            <button 
              onClick={() => handleRemoveToast(toast.id)}
              className="p-0.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 6. Bot Response Interactive Modal overlay (Simulating WhatsApp Link Action Feedback) */}
      {botResponse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl relative overflow-hidden animate-scale-up">
            
            {/* Header with Church Logo & Bot tag */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base">
                  ⛪
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">Asistente DECOM</h3>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Respuesta Automática Bot</span>
                </div>
              </div>
              <button 
                onClick={() => setBotResponse(null)} 
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content states */}
            {!botResponse.submitted ? (
              // Interactive Selection Form
              <div className="space-y-4">
                <div className="text-center mb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Hola <strong className="text-gray-850 dark:text-white">{botResponse.member.name}</strong>, por favor elige una opción de respuesta para tu servicio de <strong>{botResponse.assignment.area}</strong> el <strong>{botResponse.assignment.date}</strong>:
                  </p>
                </div>

                {/* Option Toggles */}
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setBotResponse({ ...botResponse, action: 'confirmar' })}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      botResponse.action === 'confirmar'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    ✅ Sí, asistiré
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotResponse({ ...botResponse, action: 'rechazar' })}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      botResponse.action === 'rechazar'
                        ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/10'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    ❌ No podré
                  </button>
                </div>

                {/* Conditional Sub-panels */}
                {botResponse.action === 'confirmar' ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center animate-scale-up">
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
                      ¡Excelente! Nos alegra contar con tu apoyo.
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                      Recuerda llegar 30 minutos antes para preparación y pruebas técnicas en el templo. ¡Bendiciones!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-scale-up">
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      <p className="text-xs text-rose-800 dark:text-rose-400 font-semibold">
                        Entendemos que hay imprevistos.
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                        Para ayudar a Steven a buscar un reemplazo a tiempo, déjanos un breve motivo de tu ausencia:
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Motivo o Comentario (Opcional)</label>
                      <textarea
                        id="reject-reason-input"
                        rows={3}
                        placeholder="Ej. Compromiso familiar / Enfermedad / Viaje..."
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 transition-all resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Unified submit button */}
                <button
                  onClick={() => {
                    if (botResponse.action === 'confirmar') {
                      handleBotSubmit('confirmado', '');
                    } else {
                      const input = document.getElementById('reject-reason-input') as HTMLTextAreaElement;
                      handleBotSubmit('rechazado', input?.value || 'No especificado');
                    }
                  }}
                  className={`w-full py-3 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-98 ${
                    botResponse.action === 'confirmar'
                      ? 'bg-emerald-600 shadow-emerald-600/15'
                      : 'bg-rose-600 shadow-rose-600/15'
                  }`}
                >
                  {botResponse.action === 'confirmar' ? 'Confirmar Mi Asistencia' : 'Enviar Notificación de Inasistencia'}
                </button>
              </div>
            ) : (
              // Success feedback screen (for both confirmation and submitted rejection)
              <div className="text-center py-4 space-y-5">
                <div className="flex justify-center">
                  {botResponse.action === 'confirmar' ? (
                    <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl shadow-xs">
                      ✅
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center text-3xl shadow-xs">
                      ✉️
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                    {botResponse.action === 'confirmar' 
                      ? '¡Asistencia Confirmada!' 
                      : 'Notificación de Inasistencia Enviada'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                    {botResponse.action === 'confirmar' 
                      ? `Muchas gracias, ${botResponse.member.name}. Tu asistencia para el área de ${botResponse.assignment.area} ha sido registrada con éxito.`
                      : `Entendido, ${botResponse.member.name}. Hemos notificado al coordinador de tu ausencia para el área de ${botResponse.assignment.area}.`}
                  </p>
                </div>

                {/* Detail summary ticket */}
                <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-left space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-400 font-medium">Servicio:</span>
                    <span className="font-bold text-gray-800 dark:text-white">{botResponse.assignment.area}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-400 font-medium">Fecha:</span>
                    <span className="font-bold text-gray-800 dark:text-white">{botResponse.assignment.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-400 font-medium">Colaborador:</span>
                    <span className="font-bold text-gray-800 dark:text-white">{botResponse.member.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-gray-400 font-medium">Estado:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      botResponse.action === 'confirmar' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                    }`}>
                      {botResponse.action === 'confirmar' ? 'Confirmado' : 'Cancelado'}
                    </span>
                  </div>
                  {botResponse.rejectReason && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 pt-1.5 italic border-t border-gray-100 dark:border-gray-800 mt-2">
                      Razón: "{botResponse.rejectReason}"
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setBotResponse(null);
                    setUserMode('servidor');
                    setActiveTab('portal-servidores');
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Ir a mi Portal de Servicios ⛪</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 5. Coordinator Login Lock Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="login-modal-overlay">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-900 w-full max-w-md overflow-hidden animate-scale-up" id="login-modal-card">
            
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 text-white relative">
              <button 
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError('');
                  setUsernameInput('');
                  setPasswordInput('');
                }}
                className="absolute top-4 right-4 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-lg shadow-inner">
                  🔒
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Acceso de Coordinador</h3>
                  <p className="text-[10px] text-indigo-200 mt-0.5">Introduce tus credenciales del DECOM Manager</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <span className="text-sm">⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Usuario</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. STCEREZO4"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono uppercase"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Contraseña</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginError('');
                    setUsernameInput('');
                    setPasswordInput('');
                  }}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ingresar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
