'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User,
  X, 
  ChevronRight, 
  HelpCircle,
  Check,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  questions: Question[];
  created_at?: string;
}

const COLUMNS = [
  { id: 'todo', title: 'Por Hacer', color: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' },
  { id: 'in_progress', title: 'En Progreso', color: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50' },
  { id: 'review', title: 'Bajo Revisión', color: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50' },
  { id: 'done', title: 'Completado', color: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50' }
] as const;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modales
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');

  // Estados de los formularios
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Para el detalle/edición de tarea
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editStatus, setEditStatus] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  
  // Preguntas de revisión
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionAuthor, setNewQuestionAuthor] = useState('');

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Cargar tareas
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Error al obtener las tareas');
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo conectar a la base de datos. Verifica tu configuración de Supabase.');
      showToast('Error de conexión con la base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Abrir formulario para crear tarea
  const handleOpenCreate = (columnId: 'todo' | 'in_progress' | 'review' | 'done') => {
    setCreateColumn(columnId);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setIsCreateOpen(true);
  };

  // Crear tarea
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          status: createColumn,
          priority: newPriority,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar la tarea');
      const newTask = await res.json();

      setTasks((prev: Task[]) => [...prev, newTask]);
      setIsCreateOpen(false);
      showToast('Tarea creada exitosamente');
    } catch (err) {
      showToast('Error al crear la tarea', 'error');
    }
  };

  // Abrir modal de detalle
  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setNewQuestionText('');
    setNewQuestionAuthor('');
  };

  // Guardar edición general de tarea
  const handleSaveEdit = async () => {
    if (!selectedTask || !editTitle.trim()) return;

    // Actualización optimista local
    const updatedTask = {
      ...selectedTask,
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      status: editStatus,
    };

    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          priority: editPriority,
          status: editStatus,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar la tarea');
      showToast('Tarea actualizada correctamente');
    } catch (err) {
      showToast('Error al actualizar en la base de datos', 'error');
      fetchTasks(); // revertir
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      showToast('Tarea eliminada correctamente');
    } catch (err) {
      showToast('Error al eliminar de la base de datos', 'error');
      fetchTasks(); // revertir
    }
  };

  // Agregar pregunta de revisión
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newQuestionText.trim()) return;

    const newQuestion: Question = {
      id: Math.random().toString(36).substring(2, 9),
      text: newQuestionText,
      author: newQuestionAuthor.trim() || 'Revisor Anónimo',
      createdAt: new Date().toISOString(),
      resolved: false
    };

    const updatedQuestions = [...(selectedTask.questions || []), newQuestion];
    const updatedTask = { ...selectedTask, questions: updatedQuestions };

    // Actualizar local
    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    setNewQuestionText('');

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });

      if (!res.ok) throw new Error('Error al guardar la pregunta');
      showToast('Pregunta de revisión agregada');
    } catch (err) {
      showToast('Error al guardar en base de datos', 'error');
      fetchTasks();
    }
  };

  // Alternar estado de resuelta de una pregunta
  const handleToggleQuestionResolve = async (questionId: string) => {
    if (!selectedTask) return;

    const updatedQuestions = selectedTask.questions.map((q: Question) => {
      if (q.id === questionId) {
        return { ...q, resolved: !q.resolved };
      }
      return q;
    });

    const updatedTask = { ...selectedTask, questions: updatedQuestions };
    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });

      if (!res.ok) throw new Error('Error al actualizar la pregunta');
      showToast('Estado de pregunta actualizado');
    } catch (err) {
      showToast('Error al actualizar en base de datos', 'error');
      fetchTasks();
    }
  };

  // Eliminar una pregunta
  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTask || !confirm('¿Deseas eliminar esta pregunta?')) return;

    const updatedQuestions = selectedTask.questions.filter((q: Question) => q.id !== questionId);
    const updatedTask = { ...selectedTask, questions: updatedQuestions };
    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });

      if (!res.ok) throw new Error('Error al eliminar la pregunta');
      showToast('Pregunta eliminada');
    } catch (err) {
      showToast('Error al guardar cambios', 'error');
      fetchTasks();
    }
  };

  // --- DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const draggedTask = tasks.find((t: Task) => t.id === taskId);

    if (!draggedTask || draggedTask.status === targetStatus) return;

    // Actualización optimista local
    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === taskId ? { ...t, status: targetStatus } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev: Task | null) => prev ? { ...prev, status: targetStatus } : null);
      setEditStatus(targetStatus);
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error('Error al actualizar posición');
      showToast(`Tarea movida a ${COLUMNS.find(c => c.id === targetStatus)?.title}`);
    } catch (err) {
      showToast('Error al sincronizar movimiento', 'error');
      fetchTasks(); // Revertir a la base de datos
    }
  };

  // Helper para contar preguntas pendientes
  const getPendingQuestionsCount = (task: Task) => {
    return (task.questions || []).filter(q => !q.resolved).length;
  };

  return (
    <div className="min-h-screen bg-slate-550 bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 text-slate-100 font-sans flex flex-col antialiased">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-55 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 border ${
          toast.type === 'error' 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CheckCircle2 className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Imack TodoBoard
            </h1>
            <p className="text-xs text-slate-400 font-medium">Kanban Interactivo & Sistema de Revisión</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchTasks}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            title="Recargar tareas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-5 w-px bg-slate-800"></div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {tasks.length} {tasks.length === 1 ? 'Tarea' : 'Tareas'}
          </span>
        </div>
      </header>

      {/* Main Kanban Content */}
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-x-auto">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 p-4 rounded-xl flex items-start gap-3.5 max-w-4xl mx-auto w-full shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Problema de conexión detectado</p>
              <p className="text-xs mt-1 text-rose-300">{error}</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="text-xs font-mono px-2.5 py-1 rounded bg-black/40 border border-rose-500/10 text-rose-300">.env.local</code>
                <span className="text-xs text-rose-400/80">Asegúrate de agregar tus claves a este archivo.</span>
              </div>
            </div>
          </div>
        )}

        {loading && tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium animate-pulse">Sincronizando con Supabase...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 min-w-[1000px] flex-1 items-start">
            {COLUMNS.map((column) => {
              const columnTasks = tasks.filter(t => t.status === column.id);
              return (
                <div 
                  key={column.id} 
                  className={`flex flex-col rounded-xl border p-4 min-h-[500px] transition-all duration-300 ${column.color}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-slate-200 tracking-wide uppercase">
                        {column.title}
                      </h2>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {columnTasks.length}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleOpenCreate(column.id)}
                      className="p-1 rounded-md hover:bg-slate-800/80 text-slate-400 hover:text-white transition-all focus:outline-none"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                    {columnTasks.length === 0 ? (
                      <div 
                        onClick={() => handleOpenCreate(column.id)}
                        className="flex-1 border border-dashed border-slate-800 hover:border-slate-700/80 rounded-xl flex flex-col items-center justify-center p-6 text-center group cursor-pointer transition-all duration-200 bg-slate-900/10 hover:bg-slate-900/20"
                      >
                        <FolderOpen className="w-7 h-7 text-slate-700 group-hover:text-indigo-400/70 mb-2 transition-colors" />
                        <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-400 transition-colors">
                          Añadir Tarea
                        </span>
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const pendingQs = getPendingQuestionsCount(task);
                        const totalQs = (task.questions || []).length;
                        
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => handleOpenDetail(task)}
                            className="bg-slate-900/90 border border-slate-850/80 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-slate-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 group relative overflow-hidden flex flex-col gap-3"
                          >
                            {/* Prioridad Top Line */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                                task.priority === 'high' 
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                  : task.priority === 'medium'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all focus:outline-none"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Task Content */}
                            <div>
                              <h3 className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors text-sm line-clamp-2">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-xs text-slate-450 mt-1 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Footer / Questions count */}
                            {totalQs > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 pt-2.5 border-t border-slate-850/60">
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pendingQs > 0 
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' 
                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
                                }`}>
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{pendingQs} {pendingQs === 1 ? 'Pregunta' : 'Preguntas'}</span>
                                </div>
                                {pendingQs === 0 && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" /> resueltas
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Crear Tarea */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCreateOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-350"
          ></div>

          {/* Modal Content */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10 transform scale-100 transition-transform duration-300 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Nueva Tarea ({COLUMNS.find(c => c.id === createColumn)?.title})
              </h3>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Título</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Integrar login en frontend" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Descripción</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detalles sobre qué se debe implementar..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prioridad</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all uppercase tracking-wide ${
                        newPriority === p
                          ? p === 'high' 
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                            : p === 'medium'
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-850 hover:text-slate-300 text-slate-550'
                      }`}
                    >
                      {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/15"
                >
                  Añadir Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detalle y Revisión de Tarea */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedTask(null)} 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-350"
          ></div>

          {/* Modal Content */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 transform scale-100 transition-all duration-300 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Detalle de la tarea</span>
                <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-400" />
                  {selectedTask.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 flex-1">
              
              {/* Formulario de Edición Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-950/40 p-4.5 rounded-xl border border-slate-850/60">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Título</label>
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                      onBlur={handleSaveEdit}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Descripción</label>
                    <textarea 
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors min-h-[90px] text-xs leading-relaxed"
                      onBlur={handleSaveEdit}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Estado (Columna)</label>
                    <select
                      value={editStatus}
                      onChange={(e) => {
                        const newS = e.target.value as any;
                        setEditStatus(newS);
                        setTimeout(() => handleSaveEdit(), 50);
                      }}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      {COLUMNS.map((col) => (
                        <option key={col.id} value={col.id}>{col.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prioridad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setEditPriority(p);
                            setTimeout(() => handleSaveEdit(), 50);
                          }}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-wider ${
                            editPriority === p
                              ? p === 'high' 
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                                : p === 'medium'
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-950 border-slate-850 text-slate-550'
                          }`}
                        >
                          {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: Preguntas de Revisión */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <HelpCircle className="w-4.5 h-4.5 text-amber-400" />
                    Preguntas para Revisión
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {selectedTask.questions?.length || 0} preguntas
                  </span>
                </div>

                {/* Formulario para agregar pregunta */}
                <form onSubmit={handleAddQuestion} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col gap-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dejar pregunta / nota de revisión</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <input 
                        type="text" 
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Ej: ¿Qué base de datos usamos para esta tabla?" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={newQuestionAuthor}
                        onChange={(e) => setNewQuestionAuthor(e.target.value)}
                        placeholder="Tu Nombre / Rol" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Preguntar
                    </button>
                  </div>
                </form>

                {/* Lista de preguntas */}
                <div className="flex flex-col gap-3">
                  {!selectedTask.questions || selectedTask.questions.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-550 text-xs">
                      No hay preguntas pendientes para esta tarea.
                    </div>
                  ) : (
                    selectedTask.questions.map((q) => (
                      <div 
                        key={q.id}
                        className={`border rounded-xl p-3.5 transition-all flex items-start justify-between gap-4 ${
                          q.resolved 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-slate-400 opacity-70' 
                            : 'bg-amber-500/5 border-amber-500/10 text-slate-250'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleQuestionResolve(q.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              q.resolved
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-700 hover:border-amber-400 text-transparent hover:text-amber-400/40 bg-slate-950'
                            }`}
                            title={q.resolved ? "Marcar como pendiente" : "Marcar como resuelta"}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="flex flex-col gap-1">
                            <p className={`text-xs leading-relaxed ${q.resolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {q.text}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                              <span className="flex items-center gap-0.5 text-indigo-400/80">
                                <User className="w-3 h-3" />
                                {q.author}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(q.createdAt).toLocaleDateString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-slate-650 hover:text-rose-400 p-1 rounded hover:bg-slate-800/60 transition-all flex-shrink-0"
                          title="Eliminar pregunta"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 rounded-b-2xl flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Tarea
              </button>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/10"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
