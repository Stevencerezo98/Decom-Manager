import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  Sliders,
  Plus,
  Trash2,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Sparkles,
  Smartphone,
  Info,
  Layers,
  Zap,
  Check,
  Code
} from 'lucide-react';

export interface OpcionConfig {
  key: string;            // e.g. "1", "2", "CONFIRMAR", "CANCELAR"
  label: string;          // e.g. "Confirmar Asistencia"
  target_status: "CONFIRMADO" | "CANCELADO" | "PENDIENTE";
  bot_response: string;   // e.g. "¡Gracias por confirmar tu servicio!"
}

export interface PlantillaConfig {
  id?: number;
  tipo_interaccion: "BUTTONS" | "NUMBERS";
  mensaje_encabezado: string;
  opciones: OpcionConfig[];
}

export interface ConfirmacionRecord {
  id?: number;
  telefono: string;
  nombre: string;
  asignacion: string;
  fecha: string;
  mensaje_enviado: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO";
  respuesta_recibida?: string | null;
  fecha_respuesta?: string | null;
  created_at?: string;
}

interface ConfiguracionWhatsAppProps {
  triggerNotification?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export const ConfiguracionWhatsApp: React.FC<ConfiguracionWhatsAppProps> = ({ triggerNotification }) => {
  const [config, setConfig] = useState<PlantillaConfig>({
    tipo_interaccion: "NUMBERS",
    mensaje_encabezado: "Hola *{nombre}* 👋\n\nTe recordamos tu servicio asignado en el *Comité de Comunicaciones*:\n\n📌 *Asignación:* {asignacion}\n\nPor favor selecciona una opción para confirmar tu disponibilidad:",
    opciones: [
      {
        key: "1",
        label: "Confirmar Asistencia",
        target_status: "CONFIRMADO",
        bot_response: "¡Excelente *{nombre}*! Tu asistencia ha sido confirmada en el sistema. Nos vemos 30 minutos antes. 🙏✨"
      },
      {
        key: "2",
        label: "No Podré Asistir",
        target_status: "CANCELADO",
        bot_response: "Entendido *{nombre}*. Agradecemos tu aviso previo. Notificaremos al coordinador para gestionar tu reemplazo. Bendiciones. ❤️"
      }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmaciones, setConfirmaciones] = useState<ConfirmacionRecord[]>([]);
  const [simPhone, setSimPhone] = useState("+18095550199");
  const [simName, setSimName] = useState("Adriana Pérez");
  const [simRole, setSimRole] = useState("Cámara - Culto Dominical");
  const [sendingTest, setSendingTest] = useState(false);
  const [simAnswer, setSimAnswer] = useState("1");
  const [simulating, setSimulating] = useState(false);
  const [botReplyLog, setBotReplyLog] = useState<{ nombre: string; estado: string; botReply: string } | null>(null);

  // Load config from backend
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/configuracion-plantilla');
      if (res.ok) {
        const data = await res.json();
        if (data.mensaje_encabezado) {
          setConfig(data);
        }
      }
    } catch (err) {
      console.warn('Backend API disconnected, using client state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load confirmaciones log
  const fetchConfirmaciones = async () => {
    try {
      const res = await fetch('/api/confirmaciones');
      if (res.ok) {
        const data = await res.json();
        setConfirmaciones(data);
      }
    } catch (err) {
      console.warn('Error fetching confirmaciones log:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchConfirmaciones();
  }, []);

  // Save Plantilla Config via PUT /api/configuracion-plantilla
  const handleSaveConfig = async () => {
    if (!config.mensaje_encabezado.trim()) {
      alert('El mensaje de encabezado no puede estar vacío.');
      return;
    }
    if (config.opciones.length === 0) {
      alert('Debes definir al menos una opción para interactuar.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/configuracion-plantilla', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        if (triggerNotification) triggerNotification('✅ Configuración guardada en MySQL plantilla_config', 'success');
        else alert('✅ Configuración de plantilla guardada exitosamente.');
      } else {
        alert(data.error || 'Error guardando configuración.');
      }
    } catch (err) {
      alert('Configuración guardada en el cliente (servidor backend offline).');
    } finally {
      setSaving(false);
    }
  };

  // Dispatch committee reminder via POST /api/recordatorio-comite
  const handleSendTestReminder = async () => {
    setSendingTest(true);
    try {
      const res = await fetch('/api/recordatorio-comite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          miembros: [
            {
              nombre: simName,
              telefono: simPhone,
              asignacion: simRole,
              fecha: new Date().toISOString().split('T')[0]
            }
          ]
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (triggerNotification) triggerNotification(`🚀 Recordatorio enviado a ${simName} (${config.tipo_interaccion})`, 'success');
        fetchConfirmaciones();
      } else {
        alert(data.error || 'Error enviando recordatorio.');
      }
    } catch (err) {
      alert('Error de red al conectar con /api/recordatorio-comite');
    } finally {
      setSendingTest(false);
    }
  };

  // Simulate incoming bot response via POST /api/simular-respuesta
  const handleSimulateResponse = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/simular-respuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: simPhone,
          respuesta: simAnswer
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBotReplyLog({
          nombre: data.nombre,
          estado: data.nuevoEstado,
          botReply: data.respuestaBot
        });
        if (triggerNotification) triggerNotification(`🤖 Bot respondió: "${data.respuestaBot}"`, 'info');
        fetchConfirmaciones();
      } else {
        alert(data.error || 'No se encontró confirmación pendiente para este teléfono. Envía un recordatorio primero.');
      }
    } catch (err) {
      alert('Error simulando respuesta.');
    } finally {
      setSimulating(false);
    }
  };

  // Add Option
  const handleAddOption = () => {
    const nextNum = (config.opciones.length + 1).toString();
    const newOpt: OpcionConfig = {
      key: nextNum,
      label: `Opción ${nextNum}`,
      target_status: "CONFIRMADO",
      bot_response: `¡Gracias *{nombre}* por seleccionar Opción ${nextNum}!`
    };
    setConfig({
      ...config,
      opciones: [...config.opciones, newOpt]
    });
  };

  // Update Option field
  const handleUpdateOption = (index: number, field: keyof OpcionConfig, value: any) => {
    const updated = [...config.opciones];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, opciones: updated });
  };

  // Delete Option
  const handleDeleteOption = (index: number) => {
    if (config.opciones.length <= 1) {
      alert('Debes mantener al menos 1 opción.');
      return;
    }
    const updated = config.opciones.filter((_, i) => i !== index);
    setConfig({ ...config, opciones: updated });
  };

  // Generate WhatsApp Message Preview Text
  const getPreviewMessage = () => {
    let text = config.mensaje_encabezado
      .replace(/\{nombre\}/gi, simName)
      .replace(/\{asignacion\}/gi, simRole);

    if (config.tipo_interaccion === "NUMBERS") {
      text += "\n\n";
      config.opciones.forEach(opt => {
        text += `${opt.key}️⃣ *${opt.label}*\n`;
      });
      text += "\n✍️ *Responde enviando el número de tu opción (1 o 2)*";
    }

    return text;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase">
              <Bot className="w-4 h-4 text-emerald-200" />
              <span>Módulo WhatsApp Automation DECOM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Plantilla & Bot de Recordatorios sin Costo
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Configura cómo interactúa el bot con los integrantes del Comité de Comunicaciones. Guarda tus plantillas en MySQL y automatiza confirmaciones por números o botones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold rounded-2xl text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              id="btn-save-whatsapp-template"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>{saving ? 'Guardando en MySQL...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Main Configuration Editor */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Selector de Modo: Botones vs Números */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  <span>Tipo de Interacción (`tipo_interaccion`)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Selecciona el modo de respuesta para los miembros del comité.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, tipo_interaccion: 'NUMBERS' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 text-center ${
                  config.tipo_interaccion === 'NUMBERS'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400'
                }`}
                id="mode-numbers-btn"
              >
                <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-2xs">
                  <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block">Modo Números</span>
                  <span className="text-[11px] opacity-80 font-normal">
                    1️⃣ Confirmar, 2️⃣ Cancelar. Compatible con el 100% de dispositivos sin costo.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, tipo_interaccion: 'BUTTONS' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 text-center ${
                  config.tipo_interaccion === 'BUTTONS'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 font-bold shadow-xs'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400'
                }`}
                id="mode-buttons-btn"
              >
                <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-2xs">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block">Modo Botones Interactivos</span>
                  <span className="text-[11px] opacity-80 font-normal">
                    Genera botones interactivos nativos (`new Buttons()`).
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Editor del Mensaje de Encabezado */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  <span>Mensaje de Encabezado (`mensaje_encabezado`)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Variables dinámicas disponibles: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[11px]">{"{nombre}"}</code> y <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[11px]">{"{asignacion}"}</code>
                </p>
              </div>
            </div>

            <textarea
              rows={5}
              value={config.mensaje_encabezado}
              onChange={(e) => setConfig({ ...config, mensaje_encabezado: e.target.value })}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono leading-relaxed"
              placeholder="Escribe el texto de recordatorio..."
            />
          </div>

          {/* 3. Editor Dinámico de Opciones */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <span>Opciones de Respuesta (`opciones` JSON)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Define la clave recibida, la etiqueta y la respuesta automática que enviará el Bot.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddOption}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Opción</span>
              </button>
            </div>

            <div className="space-y-4">
              {config.opciones.map((opcion, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                      Opción #{index + 1}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(index)}
                      className="text-gray-400 hover:text-rose-500 p-1 rounded-lg transition-all cursor-pointer"
                      title="Eliminar opción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                        Clave (`key`)
                      </label>
                      <input
                        type="text"
                        value={opcion.key}
                        onChange={(e) => handleUpdateOption(index, 'key', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold font-mono text-gray-900 dark:text-white"
                        placeholder="1, 2, CONFIRMAR"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                        Etiqueta (`label`)
                      </label>
                      <input
                        type="text"
                        value={opcion.label}
                        onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                        placeholder="Confirmar Asistencia"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                        Estado Destino (`target_status`)
                      </label>
                      <select
                        value={opcion.target_status}
                        onChange={(e) => handleUpdateOption(index, 'target_status', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white cursor-pointer"
                      >
                        <option value="CONFIRMADO">CONFIRMADO (Verde)</option>
                        <option value="CANCELADO">CANCELADO (Rojo)</option>
                        <option value="PENDIENTE">PENDIENTE (Amarillo)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                      Respuesta del Bot (`bot_response`)
                    </label>
                    <input
                      type="text"
                      value={opcion.bot_response}
                      onChange={(e) => handleUpdateOption(index, 'bot_response', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
                      placeholder="¡Excelente {nombre}! Asistencia confirmada..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WhatsApp Live Smartphone Preview & Test Sandbox */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Smartphone Visual Preview */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl p-5 shadow-2xl border border-gray-800 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-sm tracking-wide text-gray-200">
                  Vista Previa WhatsApp Chat
                </span>
              </div>
              <span className="text-[10px] font-mono bg-gray-800 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                {config.tipo_interaccion}
              </span>
            </div>

            {/* Chat Bubble Container */}
            <div className="bg-[#0b141a] rounded-2xl p-4 min-h-[260px] font-sans text-xs space-y-3 relative overflow-hidden border border-gray-800/80">
              <div className="flex justify-center">
                <span className="bg-[#182229] text-gray-400 text-[10px] px-2.5 py-0.5 rounded-md font-medium">
                  HOY
                </span>
              </div>

              {/* Incoming Reminder Message */}
              <div className="bg-[#202c33] text-gray-100 p-3.5 rounded-2xl rounded-tl-xs max-w-[90%] space-y-2 shadow-xs">
                <p className="whitespace-pre-line leading-relaxed text-xs">
                  {getPreviewMessage()}
                </p>

                {config.tipo_interaccion === 'BUTTONS' && (
                  <div className="pt-2 space-y-1.5 border-t border-gray-700/50">
                    {config.opciones.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSimAnswer(opt.key)}
                        className="w-full py-2 bg-[#182229] hover:bg-[#2a3942] text-emerald-400 font-bold text-center rounded-xl text-xs transition-all border border-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="text-[9px] text-gray-400 text-right font-mono">12:30 PM</div>
              </div>

              {/* Bot Auto-reply Log preview */}
              {botReplyLog && (
                <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-xs ml-auto max-w-[85%] space-y-1 shadow-xs">
                  <p className="text-[11px] leading-relaxed">
                    {botReplyLog.botReply}
                  </p>
                  <div className="text-[9px] text-emerald-200 text-right flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Sandbox Testing Trigger */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-bold text-gray-300">Prueba Directa de API Express</span>
                <span className="text-[10px] font-mono text-indigo-400">MySQL `/api/recordatorio-comite`</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSendTestReminder}
                  disabled={sendingTest}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  id="btn-trigger-recordatorio-test"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTest ? 'Enviando...' : '1. Enviar Recordatorio'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateResponse}
                  disabled={simulating}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  id="btn-simulate-answer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{simulating ? 'Procesando...' : '2. Simular Respuesta Bot'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-400 font-bold whitespace-nowrap">Respuesta:</span>
                <input
                  type="text"
                  value={simAnswer}
                  onChange={(e) => setSimAnswer(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-xs font-mono text-emerald-400 font-bold outline-none"
                  placeholder="Ingresa '1' o '2'"
                />
              </div>
            </div>
          </div>

          {/* MySQL Confirmaciones Log Table Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Bitácora MySQL (`confirmaciones`)</span>
              </h3>
              <button
                onClick={fetchConfirmaciones}
                className="text-gray-400 hover:text-indigo-600 transition-all p-1"
                title="Actualizar tabla de MySQL"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {confirmaciones.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No hay registros aún en la tabla <code className="font-mono">confirmaciones</code>. Haz clic en "1. Enviar Recordatorio" arriba.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {confirmaciones.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">
                        {c.nombre}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {c.telefono} • {c.asignacion}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        c.estado === 'CONFIRMADO'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : c.estado === 'CANCELADO'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {c.estado}
                      </span>
                      {c.respuesta_recibida && (
                        <span className="block text-[9px] text-gray-400 mt-0.5 font-mono">
                          Resp: "{c.respuesta_recibida}"
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
