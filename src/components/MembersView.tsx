/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Edit, 
  Phone, 
  Calendar, 
  BookOpen, 
  Award,
  Trash2,
  Lock,
  Plus,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';
import { Member, AreaType, SchedulePeriod } from '../types';
import { AREAS_METADATA } from '../data';

interface MembersViewProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  periods: SchedulePeriod[];
  triggerNotification: (text: string, type: 'success' | 'info' | 'warning') => void;
}

export default function MembersView({
  members,
  setMembers,
  periods,
  triggerNotification
}: MembersViewProps) {
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedHistoryMemberId, setSelectedHistoryMemberId] = useState<string | null>(null);

  // New Member Form States
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState('👤');
  const [newPhone, setNewPhone] = useState('+506 ');
  const [newRoles, setNewRoles] = useState<AreaType[]>([]);
  const [newNotes, setNewNotes] = useState('');
  const [newAvailability, setNewAvailability] = useState<{ [key: string]: boolean }>({
    'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
  });
  const [newBlockedDate, setNewBlockedDate] = useState('');

  // Handle Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      triggerNotification('El nombre es obligatorio.', 'warning');
      return;
    }
    const id = newName.toLowerCase().replace(/\s+/g, '-');
    if (members.some(m => m.id === id)) {
      triggerNotification('Ya existe un integrante con ese nombre o identificador.', 'warning');
      return;
    }

    const member: Member = {
      id,
      name: newName,
      photoUrl: newPhoto,
      phone: newPhone,
      active: true,
      roles: newRoles.length > 0 ? newRoles : ['Fotografía'],
      availability: newAvailability,
      notes: newNotes,
      blockedDates: []
    };

    setMembers([...members, member]);
    setShowAddForm(false);
    resetAddForm();
    triggerNotification(`¡Integrante ${newName} registrado correctamente!`, 'success');
  };

  const resetAddForm = () => {
    setNewName('');
    setNewPhoto('👤');
    setNewPhone('+506 ');
    setNewRoles([]);
    setNewNotes('');
    setNewAvailability({
      'Lunes': true, 'Martes': true, 'Miércoles': true, 'Jueves': true, 'Viernes': true, 'Sábado': true, 'Domingo': true
    });
  };

  // Toggle active / inactive status
  const handleToggleActive = (memberId: string) => {
    const updated = members.map(m => {
      if (m.id === memberId) {
        const nextState = !m.active;
        triggerNotification(`${m.name} está ahora ${nextState ? 'Activo (disponible para asignaciones)' : 'Inactivo (excluido de turnos)'}.`, 'info');
        return { ...m, active: nextState };
      }
      return m;
    });
    setMembers(updated);
  };

  // Delete member
  const handleDeleteMember = (memberId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este integrante? Se borrará permanentemente de los registros.')) {
      setMembers(members.filter(m => m.id !== memberId));
      triggerNotification('Integrante eliminado.', 'success');
    }
  };

  // Block a date
  const handleAddBlockedDate = (memberId: string, dateStr: string) => {
    if (!dateStr) return;
    const updated = members.map(m => {
      if (m.id === memberId) {
        if (m.blockedDates.includes(dateStr)) {
          triggerNotification('Esta fecha ya está bloqueada para este integrante.', 'warning');
          return m;
        }
        triggerNotification(`Fecha ${dateStr} bloqueada (vacaciones/excepción) para ${m.name}.`, 'success');
        return { ...m, blockedDates: [...m.blockedDates, dateStr].sort() };
      }
      return m;
    });
    setMembers(updated);
    setNewBlockedDate('');
    // Sync current editing state
    const currentEdit = updated.find(m => m.id === memberId);
    if (currentEdit) setEditingMember(currentEdit);
  };

  // Remove blocked date
  const handleRemoveBlockedDate = (memberId: string, dateStr: string) => {
    const updated = members.map(m => {
      if (m.id === memberId) {
        return { ...m, blockedDates: m.blockedDates.filter(d => d !== dateStr) };
      }
      return m;
    });
    setMembers(updated);
    triggerNotification('Bloqueo de fecha retirado.', 'success');
    // Sync current editing state
    const currentEdit = updated.find(m => m.id === memberId);
    if (currentEdit) setEditingMember(currentEdit);
  };

  // Edit form submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const updated = members.map(m => {
      if (m.id === editingMember.id) {
        return editingMember;
      }
      return m;
    });

    setMembers(updated);
    setEditingMember(null);
    triggerNotification('Se guardaron los cambios del integrante.', 'success');
  };

  // Calculate individual history stats
  const getMemberHistoryStats = (memberId: string) => {
    const assignmentsList = periods.flatMap(p => 
      p.assignments.filter(a => a.primaryMemberId === memberId || a.supportMemberId === memberId)
    );

    const primaryCount = assignmentsList.filter(a => a.primaryMemberId === memberId).length;
    const supportCount = assignmentsList.filter(a => a.supportMemberId === memberId).length;
    
    const confirmedCount = assignmentsList.filter(a => a.status === 'confirmado').length;
    const rejectedCount = assignmentsList.filter(a => a.status === 'rechazado').length;
    const pendingCount = assignmentsList.filter(a => a.status === 'pendiente').length;

    const responseRate = assignmentsList.length > 0
      ? Math.round(((confirmedCount + rejectedCount) / assignmentsList.length) * 100)
      : 100;

    const attendanceRate = (confirmedCount + rejectedCount) > 0
      ? Math.round((confirmedCount / (confirmedCount + rejectedCount)) * 100)
      : 100;

    return {
      assignments: assignmentsList,
      primaryCount,
      supportCount,
      confirmedCount,
      rejectedCount,
      pendingCount,
      responseRate,
      attendanceRate
    };
  };

  const selectedHistoryMember = members.find(m => m.id === selectedHistoryMemberId);
  const selectedHistoryStats = selectedHistoryMemberId ? getMemberHistoryStats(selectedHistoryMemberId) : null;

  return (
    <div className="space-y-8 animate-fade-in" id="members-root">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5" id="members-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Gestión de Integrantes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra el personal disponible, sus áreas de competencia, teléfonos de WhatsApp y disponibilidad semanal.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(true)}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/15 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          id="btn-register-member"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Integrante
        </button>
      </div>

      {/* Main Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="members-grid">
        {members.map(m => {
          const stats = getMemberHistoryStats(m.id);
          return (
            <div 
              key={m.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                !m.active 
                  ? 'border-gray-200 dark:border-gray-800/60 opacity-60 bg-gray-50/50 dark:bg-black/10' 
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="space-y-4">
                {/* Header: Avatar, Name and Active/Inactive toggle */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/30">
                      {m.photoUrl}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">
                        {m.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        m.active 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {m.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingMember(m)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar ficha"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleActive(m.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        m.active 
                          ? 'border-gray-100 dark:border-gray-800 text-gray-400 hover:text-amber-500' 
                          : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 text-emerald-600'
                      }`}
                      title={m.active ? "Desactivar" : "Reactivar"}
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    {m.id !== 'steven' && ( // Don't let user easily deleteSteven coordinator by default
                      <button 
                        onClick={() => handleDeleteMember(m.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* WhatsApp & Stats Info */}
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp: <strong className="font-semibold text-gray-700 dark:text-gray-300">{m.phone}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Award className="w-3.5 h-3.5" />
                    <span>Participaciones: <strong className="font-semibold text-gray-700 dark:text-gray-300">{stats.primaryCount} servicios</strong></span>
                  </div>
                </div>

                {/* Allowed Roles chips */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Áreas Autorizadas</p>
                  <div className="flex flex-wrap gap-1">
                    {m.roles.map(role => {
                      const meta = AREAS_METADATA.find(am => am.name === role);
                      return (
                        <span 
                          key={role}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta?.bg} ${meta?.color} ${meta?.border}`}
                        >
                          {meta?.emoji} {role}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Availability Summary */}
                <div className="space-y-1 text-xs">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Disponibilidad</p>
                  <div className="flex gap-1">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                      const av = m.availability[day] !== false;
                      return (
                        <div 
                          key={day}
                          className={`flex-1 text-center py-1 rounded text-[9px] font-extrabold ${
                            av 
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/30' 
                              : 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600'
                          }`}
                          title={`${day}: ${av ? 'Disponible' : 'No disponible'}`}
                        >
                          {day.slice(0,1)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Blocked Dates Count / Vacations */}
                {m.blockedDates.length > 0 && (
                  <div className="text-[10px] p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-lg border border-rose-100/30">
                    <strong>🚫 Bloqueos:</strong> {m.blockedDates.length} fechas vacacionales / excepciones configuradas.
                  </div>
                )}

                {/* Notes */}
                {m.notes && (
                  <p className="text-[11px] text-gray-400 italic leading-snug border-l-2 border-gray-200 dark:border-gray-800 pl-2">
                    "{m.notes}"
                  </p>
                )}
              </div>

              {/* History Button at bottom */}
              <button 
                onClick={() => setSelectedHistoryMemberId(m.id)}
                className="w-full py-2.5 mt-5 border border-gray-150 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1 transition-all cursor-pointer"
                id={`btn-hist-${m.id}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Ver Historial de Turnos
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Member Slider / Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-member-modal">
          <form 
            onSubmit={handleAddMember}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-extrabold text-gray-950 dark:text-white text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Registrar Nuevo Integrante
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✖
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Adriana"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Avatar / Photo Emoji */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Emoji Avatar (Visual)</label>
                  <select 
                    value={newPhoto}
                    onChange={(e) => setNewPhoto(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="👤">👤 Genérico</option>
                    <option value="👨‍💻">👨‍💻 Tech Hombre</option>
                    <option value="👩‍💻">👩‍💻 Tech Mujer</option>
                    <option value="👨‍📷">👨‍📷 Fotógrafo</option>
                    <option value="👩‍📷">👩‍📷 Fotógrafa</option>
                    <option value="👨‍🎥">👨‍🎥 Camarógrafo</option>
                    <option value="👨‍🎨">👨‍🎨 Diseñador</option>
                    <option value="👩‍🎨">👩‍🎨 Diseñadora</option>
                    <option value="👩‍💼">👩‍💼 Administrativa</option>
                    <option value="👨‍🔧">👨‍🔧 Soporte Técnico</option>
                  </select>
                </div>
              </div>

              {/* Phone (WhatsApp) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">WhatsApp Número</label>
                <input 
                  type="text" 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+506 8888-8888"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Roles Multi Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Áreas de Competencia (Roles)</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS_METADATA.map(meta => {
                    const isSelected = newRoles.includes(meta.name);
                    return (
                      <button
                        type="button"
                        key={meta.name}
                        onClick={() => {
                          if (isSelected) {
                            setNewRoles(newRoles.filter(r => r !== meta.name));
                          } else {
                            setNewRoles([...newRoles, meta.name]);
                          }
                        }}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <span>{meta.emoji}</span>
                        <span>{meta.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability weekly checklist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Disponibilidad de Servicio por Día</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                    const isAv = newAvailability[day] !== false;
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          setNewAvailability({ ...newAvailability, [day]: !isAv });
                        }}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          isAv 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                            : 'bg-gray-100 dark:bg-gray-850 border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        {day.slice(0,3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Observaciones / Notas de Servicio</label>
                <textarea 
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Detalles sobre su servicio, vacaciones o especificaciones..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Guardar Registro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Member Drawer / Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-member-modal">
          <form 
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-extrabold text-gray-950 dark:text-white text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                Editar Ficha: {editingMember.name}
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingMember(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✖
              </button>
            </div>

            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {/* Form elements similar to add form but tied to editingMember */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Avatar</label>
                  <select 
                    value={editingMember.photoUrl}
                    onChange={(e) => setEditingMember({ ...editingMember, photoUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="👤">👤 Genérico</option>
                    <option value="👨‍💻">👨‍💻 Tech Hombre</option>
                    <option value="👩‍💻">👩‍💻 Tech Mujer</option>
                    <option value="👨‍📷">👨‍📷 Fotógrafo</option>
                    <option value="👩‍📷">👩‍📷 Fotógrafa</option>
                    <option value="👨‍🎥">👨‍🎥 Camarógrafo</option>
                    <option value="👨‍🎨">👨‍🎨 Diseñador</option>
                    <option value="👩‍🎨">👩‍🎨 Diseñadora</option>
                    <option value="👩‍💼">👩‍💼 Administrativa</option>
                    <option value="👨‍🔧">👨‍🔧 Soporte Técnico</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">WhatsApp Número</label>
                <input 
                  type="text" 
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none"
                  required
                />
              </div>

              {/* Roles */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Áreas Autorizadas (Roles)</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS_METADATA.map(meta => {
                    const isSelected = editingMember.roles.includes(meta.name);
                    return (
                      <button
                        type="button"
                        key={meta.name}
                        onClick={() => {
                          const updatedRoles = isSelected
                            ? editingMember.roles.filter(r => r !== meta.name)
                            : [...editingMember.roles, meta.name];
                          setEditingMember({ ...editingMember, roles: updatedRoles });
                        }}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <span>{meta.emoji}</span>
                        <span>{meta.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Disponibilidad Semanal</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                    const isAv = editingMember.availability[day] !== false;
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          const updatedAv = { ...editingMember.availability, [day]: !isAv };
                          setEditingMember({ ...editingMember, availability: updatedAv });
                        }}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          isAv 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                            : 'bg-gray-100 border-gray-250 dark:bg-gray-800 dark:border-gray-700 text-gray-300 dark:text-gray-500'
                        }`}
                      >
                        {day.slice(0,3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vacaciones / Bloquear Fecha */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 space-y-3">
                <div className="flex items-center gap-1">
                  <Lock className="w-4 h-4 text-rose-500" />
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Excepciones y Vacaciones (Fechas Bloqueadas)</p>
                </div>
                <p className="text-[11px] text-gray-400">El motor inteligente evitará asignarle turnos en las fechas agregadas aquí.</p>

                <div className="flex gap-2">
                  <input 
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddBlockedDate(editingMember.id, newBlockedDate)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Bloquear Fecha
                  </button>
                </div>

                {/* List of blocked dates */}
                {editingMember.blockedDates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-2 max-h-24 overflow-y-auto pr-1">
                    {editingMember.blockedDates.map(date => (
                      <span 
                        key={date}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 text-[10px] font-bold"
                      >
                        <span>📅 {date}</span>
                        <X 
                          className="w-3.5 h-3.5 hover:text-rose-900 dark:hover:text-rose-300 cursor-pointer" 
                          onClick={() => handleRemoveBlockedDate(editingMember.id, date)}
                        />
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 italic pt-1">Sin fechas bloqueadas configuradas.</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Observaciones</label>
                <textarea 
                  value={editingMember.notes}
                  onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button 
                type="button" 
                onClick={() => setEditingMember(null)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Detail Drawer */}
      {selectedHistoryMember && selectedHistoryStats && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-end z-50 animate-fade-in" id="history-drawer">
          <div className="bg-white dark:bg-gray-900 border-l border-gray-150 dark:border-gray-800 h-full max-w-lg w-full p-6 shadow-2xl overflow-y-auto space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedHistoryMember.photoUrl}</span>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-950 dark:text-white">{selectedHistoryMember.name}</h3>
                    <p className="text-xs text-gray-400">Historial histórico de participación</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedHistoryMemberId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                >
                  ✖
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100/50">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Asistencia Realizada</p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{selectedHistoryStats.attendanceRate}%</p>
                  <p className="text-[10px] text-gray-500 mt-1">{selectedHistoryStats.confirmedCount} confirmaciones</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100/50">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Total Servicios</p>
                  <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {selectedHistoryStats.primaryCount + selectedHistoryStats.supportCount}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">{selectedHistoryStats.primaryCount} Principal • {selectedHistoryStats.supportCount} Apoyo</p>
                </div>
              </div>

              {/* List of services in drawer */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historial de Turnos</h4>
                {selectedHistoryStats.assignments.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {selectedHistoryStats.assignments.map((a, i) => {
                      const isSupport = a.supportMemberId === selectedHistoryMember.id;
                      const meta = AREAS_METADATA.find(am => am.name === a.area);

                      return (
                        <div 
                          key={a.id + '-' + i}
                          className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-50 dark:border-gray-700/40 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{meta?.emoji}</span>
                            <div>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{a.area}</p>
                              <p className="text-[10px] text-gray-400">📅 {a.date} {isSupport ? '• Turno de Apoyo' : '• Turno Principal'}</p>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            a.status === 'confirmado'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : a.status === 'rechazado'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/10 rounded-xl text-xs text-gray-400 border border-dashed border-gray-100">
                    Este integrante no tiene servicios registrados todavía en los ciclos históricos.
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setSelectedHistoryMemberId(null)}
              className="w-full py-3 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Cerrar Historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
