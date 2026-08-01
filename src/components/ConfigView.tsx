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
  Layers,
  MessageSquare,
  Sparkles,
  Smartphone,
  Copy,
  Pencil,
  Zap
} from 'lucide-react';
import { Member, AreaType, AssignmentRule, AppWhatsAppConfig } from '../types';
import { AREAS_METADATA } from '../data';
import { ConfiguracionWhatsApp } from './ConfiguracionWhatsApp';

interface ConfigViewProps {
  rules: AssignmentRule[];
  setRules: React.Dispatch<React.SetStateAction<AssignmentRule[]>>;
  members: Member[];
  weeklyCultos: { day: string; name: string; areas: AreaType[] }[];
  setWeeklyCultos: (cultos: any[]) => void;
  waConfig: AppWhatsAppConfig;
  setWaConfig: (config: AppWhatsAppConfig) => void;
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
  waConfig,
  setWaConfig,
  onResetSystem,
  onImportState,
  onExportState,
  triggerNotification
}: ConfigViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'whatsapp_automation'>('whatsapp_automation');
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  // WhatsApp Form local state
  const [templateInput, setTemplateInput] = useState(waConfig.template);
  const [verseInput, setVerseInput] = useState(waConfig.verse);
  const [dressCodeInput, setDressCodeInput] = useState(waConfig.dressCode);

  const handleSaveWhatsAppConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppWhatsAppConfig = {
      ...waConfig,
      template: templateInput,
      verse: verseInput,
      dressCode: dressCodeInput
    };
    setWaConfig(updated);
    triggerNotification('Plantilla y parámetros de WhatsApp guardados correctamente.', 'success');
  };

  const handleApplyPreset = (presetType: 'formal' | 'jovenes' | 'especial') => {
    if (presetType === 'formal') {
      setVerseInput('Sirvan al Señor con alegría; vengan ante su presencia con regocijo. - Salmos 100:2');
      setDressCodeInput('Formal o Uniforme DECOM');
      setTemplateInput(`Hola *{nombre}* 👋

Te recordamos tu servicio asignado en el *Departamento de Comunicaciones (DECOM)*:

*Área:* {emoji} {area}
*Día:* {dia} {fecha}
*Hora:* Recuerda llegar 30 minutos antes para preparación y pruebas.

📖 *Versículo:* "{versiculo}"
👔 *Vestimenta sugerida:* {vestimenta}

Por favor confirma tu asistencia presionando el enlace directo:
{link_confirmacion}

¡Muchas gracias por servir con amor y excelencia! ❤️🙏`);
    } else if (presetType === 'jovenes') {
      setVerseInput('Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza. - 1 Timoteo 4:12');
      setDressCodeInput('Casual Elegante / Camiseta DECOM');
      setTemplateInput(`¡Hola *{nombre}*! ⚡🚀

¡Dios te bendiga! Te compartimos tu asignación para el próximo culto:

*Área:* {emoji} {area}
*Fecha:* {dia} {fecha}
*Llegada:* 30 minutos antes para ensayar.

📖 *Versículo de la semana:* "{versiculo}"
👕 *Código de vestir:* {vestimenta}

Confirma tu disponibilidad aquí:
{link_confirmacion}

¡Contamos contigo para llevar la Palabra con energía! 🔥🙌`);
    } else if (presetType === 'especial') {
      setVerseInput('Hagan todo con amor. - 1 Corintios 16:14');
      setDressCodeInput('Formal de Gala / Vestimenta de Servicio Especial');
      setTemplateInput(`Apreciado(a) *{nombre}* ✨

Te saludamos con la paz del Señor. Te confirmamos tu privilegio de servicio en nuestro culto especial:

*Servicio:* {emoji} {area}
*Día:* {dia} {fecha}

📖 *Palabra de aliento:* "{versiculo}"
👔 *Vestimenta:* {vestimenta}

Para confirmar o notificar algún cambio, pulsa aquí:
{link_confirmacion}

Agradecemos tu constante compromiso y dedicación al ministerio. 🙏🌟`);
    }
    triggerNotification(`Plantilla predefinida (${presetType.toUpperCase()}) cargada. Recuerda hacer click en Guardar.`, 'info');
  };

  const insertPlaceholder = (tag: string) => {
    setTemplateInput(prev => prev + ` ${tag}`);
  };


  // New / Edit Rule Form States
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRuleMemberId, setNewRuleMemberId] = useState('');
  const [newRuleType, setNewRuleType] = useState<'only_days' | 'never_days' | 'never_role' | 'fixed_role_day' | 'support_role_day'>('never_role');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<AreaType[]>([]);

  // Add or Edit rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleMemberId) {
      triggerNotification('Selecciona un integrante para aplicar la regla.', 'warning');
      return;
    }
    if (!newRuleDesc.trim()) {
      triggerNotification('Ingresa una descripción clara de la regla.', 'warning');
      return;
    }

    const ruleData: AssignmentRule = {
      id: editingRuleId || `rule-custom-${Date.now()}`,
      memberId: newRuleMemberId,
      type: newRuleType,
      description: newRuleDesc,
      days: selectedDays.length > 0 ? selectedDays : undefined,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined
    };

    if (editingRuleId) {
      setRules(rules.map(r => r.id === editingRuleId ? ruleData : r));
      triggerNotification('Regla de asignación actualizada correctamente.', 'success');
    } else {
      setRules([...rules, ruleData]);
      triggerNotification('Nueva regla de asignación agregada.', 'success');
    }

    setShowAddRuleForm(false);
    resetRuleForm();
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setNewRuleMemberId('');
    setNewRuleType('never_role');
    setNewRuleDesc('');
    setSelectedDays([]);
    setSelectedRoles([]);
  };

  const handleEditRuleInit = (rule: AssignmentRule) => {
    setEditingRuleId(rule.id);
    setNewRuleMemberId(rule.memberId);
    setNewRuleType(rule.type);
    setNewRuleDesc(rule.description);
    setSelectedDays(rule.days || []);
    setSelectedRoles(rule.roles || []);
    setShowAddRuleForm(true);
  };

  const handleQuickRulePreset = (presetKey: 'no_jueves' | 'solo_domingos' | 'no_camara' | 'solo_publicidad') => {
    const defaultMember = members[0] || { id: 'm1', name: 'Servidor' };
    
    if (presetKey === 'no_jueves') {
      setEditingRuleId(null);
      setNewRuleMemberId(defaultMember.id);
      setNewRuleType('never_days');
      setNewRuleDesc(`${defaultMember.name}: No disponible los Jueves (Estudios/Trabajo)`);
      setSelectedDays(['Jueves']);
      setSelectedRoles([]);
    } else if (presetKey === 'solo_domingos') {
      setEditingRuleId(null);
      setNewRuleMemberId(defaultMember.id);
      setNewRuleType('only_days');
      setNewRuleDesc(`${defaultMember.name}: Solo disponible los Domingos`);
      setSelectedDays(['Domingo']);
      setSelectedRoles([]);
    } else if (presetKey === 'no_camara') {
      setEditingRuleId(null);
      setNewRuleMemberId(defaultMember.id);
      setNewRuleType('never_role');
      setNewRuleDesc(`${defaultMember.name}: Nunca asignable a Cámara / Streaming`);
      setSelectedDays([]);
      setSelectedRoles(['Cámara']);
    } else if (presetKey === 'solo_publicidad') {
      setEditingRuleId(null);
      setNewRuleMemberId(defaultMember.id);
      setNewRuleType('never_role');
      setNewRuleDesc(`${defaultMember.name}: Exclusivo / No asignar a Audio ni Proyección`);
      setSelectedDays([]);
      setSelectedRoles(['Audio', 'Proyección']);
    }

    setShowAddRuleForm(true);
    triggerNotification('Plantilla rápida seleccionada. Modifica el integrante o datos si es necesario y guarda la regla.', 'info');
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
            Controla las reglas del motor de cronogramas y configura las plantillas de automatización en MySQL.
          </p>
        </div>

        {/* Subtabs Navigation */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('whatsapp_automation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'whatsapp_automation'
                ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>WhatsApp Bot & Plantillas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'general'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Reglas de Asignación</span>
          </button>
        </div>
      </div>

      {/* Render WhatsApp Automation Subtab */}
      {activeSubTab === 'whatsapp_automation' && (
        <ConfiguracionWhatsApp triggerNotification={triggerNotification} />
      )}

      {/* Render General Settings Subtab */}
      {activeSubTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="config-main-grid">
        
        {/* Left column: WhatsApp Templates, Rules list, and Cultos */}
        <div className="lg:col-span-8 space-y-8">

          {/* WhatsApp Custom Templates & Verses Editor Card */}
          <form onSubmit={handleSaveWhatsAppConfig} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-5" id="wa-config-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="font-extrabold text-gray-950 dark:text-white text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  Plantilla de WhatsApp y Mensajes Personalizados
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Define las plantillas automáticas, versículos bíblicos y recomendaciones de vestimenta para los recordatorios de servicio.
                </p>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                id="btn-save-wa-config"
              >
                <Save className="w-4 h-4" />
                Guardar Plantilla
              </button>
            </div>

            {/* Presets buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">Cargar Plantilla Predefinida (Presets)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('formal')}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Estándar DECOM (Formal)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('jovenes')}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Jóvenes & Dinámico</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('especial')}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Cultos Especiales & Eventos</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verse input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <span>📖 Versículo de Inspiración</span>
                </label>
                <input
                  type="text"
                  value={verseInput}
                  onChange={(e) => setVerseInput(e.target.value)}
                  placeholder="Ej. Sirvan al Señor con alegría - Salmos 100:2"
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-emerald-500 text-gray-800 dark:text-gray-200"
                />
              </div>

              {/* Dress Code input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <span>👔 Vestimenta / Código Sugerido</span>
                </label>
                <input
                  type="text"
                  value={dressCodeInput}
                  onChange={(e) => setDressCodeInput(e.target.value)}
                  placeholder="Ej. Formal o Camiseta DECOM"
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-emerald-500 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            {/* Main Template Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Cuerpo del Mensaje (Soporta variables entre llaves `{}` y formato WhatsApp `*negrita*`)
                </label>
              </div>

              {/* Tag inserters */}
              <div className="flex flex-wrap gap-1.5 bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl border border-gray-150 dark:border-gray-700/50 text-[10px]">
                <span className="font-bold text-gray-400 self-center mr-1">Insertar variable:</span>
                {[
                  { label: 'Nombre', tag: '{nombre}' },
                  { label: 'Área', tag: '{area}' },
                  { label: 'Emoji', tag: '{emoji}' },
                  { label: 'Fecha', tag: '{fecha}' },
                  { label: 'Día', tag: '{dia}' },
                  { label: 'Versículo', tag: '{versiculo}' },
                  { label: 'Vestimenta', tag: '{vestimenta}' },
                  { label: 'Link Confirmación', tag: '{link_confirmacion}' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertPlaceholder(item.tag)}
                    className="px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-gray-600 cursor-pointer transition-all"
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>

              <textarea
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                rows={9}
                className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono outline-none focus:border-emerald-500 text-gray-800 dark:text-gray-100 leading-relaxed"
                required
              />
            </div>

            {/* Live Preview Box */}
            <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Vista Previa Interactiva en WhatsApp</span>
              </div>

              <div className="p-3 bg-emerald-900/10 dark:bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-gray-800 dark:text-gray-200 font-sans whitespace-pre-wrap leading-relaxed shadow-xs max-h-48 overflow-y-auto">
                {templateInput
                  .replace(/\{nombre\}/gi, 'Adriana')
                  .replace(/\{area\}/gi, 'Publicidad')
                  .replace(/\{emoji\}/gi, '📢')
                  .replace(/\{fecha\}/gi, '2 de Agosto, 2026')
                  .replace(/\{dia\}/gi, 'Domingo')
                  .replace(/\{hora\}/gi, 'Recuerda llegar 30 minutos antes.')
                  .replace(/\{versiculo\}/gi, verseInput || 'Sirvan al Señor con alegría')
                  .replace(/\{vestimenta\}/gi, dressCodeInput || 'Formal')
                  .replace(/\{link_confirmacion\}/gi, `✅ Confirmar:\nhttps://decom.app/?action=confirmar&assignmentId=dom-pub\n\n❌ Declinar:\nhttps://decom.app/?action=rechazar&assignmentId=dom-pub`)}
              </div>
            </div>
          </form>

          
          {/* Rules Engine list */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="font-extrabold text-gray-950 dark:text-white text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  Reglas de Negocio del Motor Inteligente
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Las reglas se ejecutan de forma automática cada vez que generas o rotas un cronograma.
                </p>
              </div>

              <button
                onClick={() => { resetRuleForm(); setShowAddRuleForm(true); }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow-xs self-start sm:self-auto"
                id="btn-add-rule"
              >
                <Plus className="w-4 h-4" />
                Agregar Regla
              </button>
            </div>

            {/* Quick Rule Presets (Opciones Rápidas) */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Opciones Rápidas (Plantillas Frecuentes DECOM)</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                Haz clic en una opción rápida para crear o personalizar reglas comunes al instante:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickRulePreset('no_jueves')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>🚫 No Jueves (Estudios/Trabajo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRulePreset('solo_domingos')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>☀️ Solo Domingos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRulePreset('no_camara')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>🎥 Restringir Cámara / Streaming</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRulePreset('solo_publicidad')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>📢 Exclusivo Publicidad</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {rules.map(rule => {
                const member = members.find(m => m.id === rule.memberId);
                return (
                  <div 
                    key={rule.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10 flex items-start justify-between gap-4 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                  >
                    <div className="flex gap-3">
                      <span className="text-xl p-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        {member?.photoUrl || '🛡️'}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <span>Regla para {member?.name || 'Todo el departamento'}</span>
                          {rule.days && rule.days.length > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[10px] rounded-md font-mono font-bold">
                              Días: {rule.days.join(', ')}
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mt-1">
                          {rule.description}
                        </p>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-2 block uppercase font-mono">
                          Clasificación: {rule.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditRuleInit(rule)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all cursor-pointer"
                        title="Editar esta regla"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                        title="Eliminar regla"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
      )}

      {/* Add / Edit Custom Rule Form Overlay */}
      {showAddRuleForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-rule-modal">
          <form 
            onSubmit={handleSaveRule}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-extrabold text-gray-950 dark:text-white text-base flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                {editingRuleId ? 'Editar Regla de Asignación' : 'Agregar Regla de Asignación'}
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowAddRuleForm(false); resetRuleForm(); }}
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
                onClick={() => { setShowAddRuleForm(false); resetRuleForm(); }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                {editingRuleId ? 'Guardar Cambios' : 'Crear Regla'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
