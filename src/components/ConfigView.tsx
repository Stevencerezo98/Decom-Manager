/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  BookOpen, 
  ShieldAlert,
  Sliders,
  Check,
  Calendar,
  Layers
} from 'lucide-react';
import { Member, AreaType, AssignmentRule } from '../types';
import { AREAS_METADATA } from '../data';

interface ConfigViewProps {
  rules: AssignmentRule[];
  setRules: React.Dispatch<React.SetStateAction<AssignmentRule[]>>;
  members: Member[];
  weeklyCultos: { day: string; name: string; areas: AreaType[] }[];
  setWeeklyCultos: (cultos: any[]) => void;
  onResetSystem: () => void;
  onImportState: (importedJson: string) => boolean;
  onExportState: () => string;
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
}

export default function ConfigView({
  rules,
  setRules,
  members,
  weeklyCultos,
  setWeeklyCultos,
  onResetSystem,
  onImportState,
  onExportState,
  triggerNotification
}: ConfigViewProps) {
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  // New Rule Form States
  const [newRuleMemberId, setNewRuleMemberId] = useState('');
  const [newRuleType, setNewRuleType] = useState<'only_days' | 'never_days' | 'never_role' | 'fixed_role_day' | 'support_role_day'>('never_role');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<AreaType[]>([]);

  // Add rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleMemberId) {
      triggerNotification('Selecciona un integrante para aplicar la regla.', 'warning');
      return;
    }
    if (!newRuleDesc.trim()) {
      triggerNotification('Ingresa una descripción clara de la regla.', 'warning');
      return;
    }

    const newRule: AssignmentRule = {
      id: `rule-custom-${Date.now()}`,
      memberId: newRuleMemberId,
      type: newRuleType,
      description: newRuleDesc,
      days: selectedDays.length > 0 ? selectedDays : undefined,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined
    };

    setRules([...rules, newRule]);
    setShowAddRuleForm(false);
    resetRuleForm();
    triggerNotification('Nueva regla de asignación agregada.', 'success');
  };

  const resetRuleForm = () => {
    setNewRuleMemberId('');
    setNewRuleType('never_role');
    setNewRuleDesc('');
    setSelectedDays([]);
    setSelectedRoles([]);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('¿Deseas eliminar esta regla de asignación? El motor dejará de considerarla para los próximos cronogramas.')) {
      setRules(rules.filter(r => r.id !== ruleId));
      triggerNotification('Regla eliminada.', 'success');
    }
  };

  // Toggle culto area requirement
  const handleToggleCultoArea = (cultoIndex: number, area: AreaType) => {
    const updated = weeklyCultos.map((c, idx) => {
      if (idx === cultoIndex) {
        const hasArea = c.areas.includes(area);
        const updatedAreas = hasArea 
          ? c.areas.filter(a => a !== area)
          : [...c.areas, area];
        return { ...c, areas: updatedAreas };
      }
      return c;
    });
    setWeeklyCultos(updated);
    triggerNotification('Requerimientos del culto actualizados.', 'success');
  };

  // Export File trigger
  const handleExportClick = () => {
    try {
      const json = onExportState();
      
      // Create a Blob and download it
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decom_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerNotification('Copia de seguridad (JSON) descargada con éxito.', 'success');
    } catch (e) {
      triggerNotification('Error al exportar datos.', 'warning');
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;

    const success = onImportState(importJsonText);
    if (success) {
      setImportJsonText('');
      setShowImportArea(false);
      triggerNotification('¡Datos de configuración restaurados correctamente!', 'success');
    } else {
      triggerNotification('Formato JSON inválido. Comprueba la estructura de tu archivo.', 'warning');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="config-root">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="config-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Panel de Configuración
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controla las reglas de negocio del motor de cronogramas, cultos de la semana y salvaguarda de datos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="config-main-grid">
        
        {/* Left column: Rules list and Cultos */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Rules Engine list */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-gray-950 dark:text-white text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  Reglas de Negocio del Motor Inteligente
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Las reglas se ejecutan de forma secuencial cada vez que generas un nuevo período.
                </p>
              </div>

              <button
                onClick={() => setShowAddRuleForm(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                id="btn-add-rule"
              >
                <Plus className="w-4 h-4" />
                Agregar Regla
              </button>
            </div>

            <div className="space-y-3">
              {rules.map(rule => {
                const member = members.find(m => m.id === rule.memberId);
                return (
                  <div 
                    key={rule.id}
                    className="p-4 rounded-xl border border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10 flex items-start justify-between gap-4 group"
                  >
                    <div className="flex gap-3">
                      <span className="text-xl p-1 bg-white dark:bg-gray-800 rounded-lg shadow-2xs border border-gray-100/40">
                        {member?.photoUrl || '🛡️'}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">
                          Regla para {member?.name || 'Todo el departamento'}
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mt-1">
                          {rule.description}
                        </p>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-2 block uppercase font-mono">
                          Clasificación: {rule.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Cultos schedule editor */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Días de Culto y Requerimientos Técnicos
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Configura en qué días de la semana hay servicios religiosos y qué soportes técnicos se deben calendarizar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {weeklyCultos.map((culto, index) => (
                <div 
                  key={culto.day}
                  className="p-4 rounded-xl border border-gray-50 dark:border-gray-850 bg-white dark:bg-gray-900 space-y-3"
                >
                  <div className="border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
                        {culto.day}
                      </span>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{culto.name}</h4>
                    </div>
                  </div>

                  {/* Areas toggler */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Áreas Requeridas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {AREAS_METADATA.map(meta => {
                        const isRequired = culto.areas.includes(meta.name);
                        return (
                          <button
                            key={meta.name}
                            type="button"
                            onClick={() => handleToggleCultoArea(index, meta.name)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              isRequired 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/25 dark:border-indigo-900/50 dark:text-indigo-400' 
                                : 'opacity-40 border-gray-150 text-gray-400 hover:opacity-150'
                            }`}
                          >
                            <span>{meta.emoji}</span>
                            <span>{meta.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Backups and Actions */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Backup utility */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white text-base">Copia de Seguridad y Datos</h3>
              <p className="text-xs text-gray-400 mt-1">Exporta o restaura todo el estado de DECOM Manager para no perder nada.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleExportClick}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="btn-export-backup"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                Descargar Backup (JSON)
              </button>

              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                Restaurar Backup (JSON)
              </button>
            </div>

            {showImportArea && (
              <form onSubmit={handleImportSubmit} className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800 animate-fade-in">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Pega el contenido de tu archivo de copia de seguridad (.json) en el recuadro para restaurar inmediatamente todos tus integrantes, turnos e historial.
                </p>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"members":[], "rules":[], "periods":[]}'
                  rows={4}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-lg text-[10px] font-mono outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Confirmar Restauración
                </button>
              </form>
            )}
          </div>

          {/* Reset System Danger Zone */}
          <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h3 className="font-extrabold text-rose-900 dark:text-rose-400 text-sm">Zona de Peligro</h3>
            </div>
            
            <p className="text-xs text-rose-950 dark:text-rose-300/80 leading-relaxed">
              Si el sistema presenta problemas o deseas iniciar el ministerio desde cero con las reglas por defecto configuradas originalmente, puedes restablecerlo.
            </p>

            <button
              onClick={() => {
                if (confirm('¿Estás absolutamente seguro de que deseas restablecer el DECOM Manager? Se borrarán todos tus turnos y configuraciones personalizadas para restablecer las reglas por defecto.')) {
                  onResetSystem();
                  triggerNotification('El sistema ha sido restablecido de fábrica.', 'info');
                }
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              id="btn-factory-reset"
            >
              Restablecer Valores de Fábrica
            </button>
          </div>

        </div>

      </div>

      {/* Add Custom Rule Form Overlay */}
      {showAddRuleForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-rule-modal">
          <form 
            onSubmit={handleAddRule}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-extrabold text-gray-950 dark:text-white text-base flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Agregar Regla de Asignación
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddRuleForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✖
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Select Member */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Integrante Destino</label>
                <select
                  value={newRuleMemberId}
                  onChange={(e) => setNewRuleMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer text-gray-700 dark:text-gray-300"
                  required
                >
                  <option value="">Selecciona integrante...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.photoUrl} {m.name}</option>
                  ))}
                </select>
              </div>

              {/* Rule Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Tipo de Restricción / Lógica</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer text-gray-700 dark:text-gray-300"
                >
                  <option value="never_role">Nunca asignable a este Área (Rol)</option>
                  <option value="only_days">Solo disponible determinados días de la semana</option>
                  <option value="never_days">Nunca disponible determinados días de la semana</option>
                </select>
              </div>

              {/* Rule Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Descripción de la regla (Visible)</label>
                <input 
                  type="text" 
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Ej. Adriana: Nunca asignable a Publicidad"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Day selection or Role selection conditional */}
              {(newRuleType === 'only_days' || newRuleType === 'never_days') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Días aplicables</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                      const sel = selectedDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => {
                            if (sel) setSelectedDays(selectedDays.filter(d => d !== day));
                            else setSelectedDays([...selectedDays, day]);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            sel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-600'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {newRuleType === 'never_role' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Áreas (Roles) aplicables</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AREAS_METADATA.map(meta => {
                      const sel = selectedRoles.includes(meta.name);
                      return (
                        <button
                          type="button"
                          key={meta.name}
                          onClick={() => {
                            if (sel) setSelectedRoles(selectedRoles.filter(r => r !== meta.name));
                            else setSelectedRoles([...selectedRoles, meta.name]);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            sel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-600'
                          }`}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddRuleForm(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Crear Regla
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
