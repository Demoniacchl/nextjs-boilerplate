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
  HelpCircle,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Send,
  LogOut,
  UserPlus,
  Lock,
  Mail,
  Shield,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Inbox,
  Code2,
  Eye,
  Trophy,
  History,
  Paperclip,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'revisor' | 'colaborador';
  avatar_url?: string;
}

interface Attachment {
  id: string;
  task_id: string;
  name: string;
  url: string;
  created_at: string;
}

interface Question {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  resolved: boolean;
  created_at: string;
  author_profile?: Profile;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  created_by?: string;
  assigned_to?: string;
  created_at: string;
  assigned_profile?: Profile;
  creator_profile?: Profile;
  attachments?: Attachment[];
  questions?: Question[];
}

// Ficha visual de cada etapa del pipeline: además del color, cada columna
// lleva su propio ícono y micro-copy para que el tablero se lea como un
// flujo de trabajo (cola -> en desarrollo -> en revisión -> aprobado)
// y no como cuatro cajas grises idénticas.
const COLUMNS = [
  { 
    id: 'todo', title: 'Por Hacer', subtitle: 'Cola sin asignar', icon: Inbox,
    wrap: 'bg-slate-900/30 border-slate-800/80',
    top: 'from-slate-500 to-slate-600',
    text: 'text-slate-300', dot: 'bg-slate-400', badge: 'bg-slate-800 text-slate-300',
    emptyBorder: 'border-slate-700/70 hover:border-slate-500', emptyIcon: 'text-slate-600 group-hover:text-slate-400',
    emptyCta: 'text-slate-500 group-hover:text-slate-300', emptyMsg: 'Sin tickets en cola. Crea el primero.'
  },
  { 
    id: 'in_progress', title: 'En Progreso', subtitle: 'En desarrollo activo', icon: Code2,
    wrap: 'bg-violet-950/10 border-violet-900/40',
    top: 'from-violet-500 to-indigo-500',
    text: 'text-violet-300', dot: 'bg-violet-400', badge: 'bg-violet-500/15 text-violet-300',
    emptyBorder: 'border-violet-900/50 hover:border-violet-600/60', emptyIcon: 'text-violet-800 group-hover:text-violet-400',
    emptyCta: 'text-violet-700 group-hover:text-violet-300', emptyMsg: 'Nada en desarrollo por ahora.'
  },
  { 
    id: 'review', title: 'Bajo Revisión', subtitle: 'Esperando al revisor', icon: Eye,
    wrap: 'bg-amber-950/10 border-amber-900/40',
    top: 'from-amber-500 to-orange-500',
    text: 'text-amber-300', dot: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-300',
    emptyBorder: 'border-amber-900/50 hover:border-amber-600/60', emptyIcon: 'text-amber-800 group-hover:text-amber-400',
    emptyCta: 'text-amber-700 group-hover:text-amber-300', emptyMsg: 'Nada esperando revisión.'
  },
  { 
    id: 'done', title: 'Completado', subtitle: 'Aprobado y cerrado', icon: Trophy,
    wrap: 'bg-emerald-950/10 border-emerald-900/40',
    top: 'from-emerald-500 to-teal-500',
    text: 'text-emerald-300', dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300',
    emptyBorder: 'border-emerald-900/50 hover:border-emerald-600/60', emptyIcon: 'text-emerald-800 group-hover:text-emerald-400',
    emptyCta: 'text-emerald-700 group-hover:text-emerald-300', emptyMsg: 'Todavía no hay entregas aquí.'
  }
] as const;

// Estilo por prioridad, reutilizado en tarjeta, modal y formulario
const PRIORITY_STYLE: Record<string, { label: string; text: string; bg: string; border: string; dot: string; stripe: string }> = {
  low: { label: 'Baja', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', dot: 'bg-sky-400', stripe: 'border-l-sky-500' },
  medium: { label: 'Media', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400', stripe: 'border-l-amber-500' },
  high: { label: 'Alta', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25', dot: 'bg-rose-400', stripe: 'border-l-rose-500' },
};

// Código corto de ticket, tipo "TCK-4F2A", para reforzar la identidad de
// ticketera de desarrollo (no un simple to-do)
const ticketCode = (id: string) => `TCK-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;

// Fecha relativa breve para el pie de la tarjeta y el historial
const timeAgo = (iso: string) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `hace ${day} d`;
  return new Date(iso).toLocaleDateString();
};

export default function Home() {
  // Autenticación & Perfil
  const [session, setSession] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Datos Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'colaborador' | 'revisor'>('colaborador');

  // Kanban & Tareas
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [modalTab, setModalTab] = useState<'detalles' | 'adjuntos' | 'consultas' | 'actividad'>('detalles');

  // Form Tarea
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAssignedTo, setNewAssignedTo] = useState('');

  // Form Adjunto (ImgBB Upload)
  const [attachmentName, setAttachmentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Form Pregunta
  const [questionText, setQuestionText] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Abre el modal de creación pre-cargado con la columna sobre la que se hizo clic
  const handleOpenCreate = (column: 'todo' | 'in_progress' | 'review' | 'done') => {
    setCreateColumn(column);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewAssignedTo('');
    setIsCreateOpen(true);
  };

  // Abre el modal de detalle de una tarea, siempre arrancando en la pestaña "Detalles"
  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setModalTab('detalles');
  };

  // --- EFECTOS DE AUTENTICACIÓN ---
  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then((result: any) => {
      const session = result?.data?.session;
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar perfil del usuario logueado
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setCurrentUserProfile(data);
    } catch (err) {
      console.error('Error al obtener perfil:', err);
      showToast('Error al cargar perfil de usuario', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Cargar todos los perfiles disponibles para asignación
  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      console.error('Error al obtener perfiles:', err);
    }
  };

  // Cargar Tareas
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Problema al conectar a Supabase. Asegúrate de haber ejecutado las tablas SQL.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando iniciamos sesión
  useEffect(() => {
    if (session && currentUserProfile) {
      fetchTasks();
      fetchProfiles();
    }
  }, [session, currentUserProfile]);

  // --- CONTROL DE LOGIN / REGISTRO ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast('¡Sesión iniciada!');
      } else {
        if (!fullName) {
          showToast('El nombre es obligatorio', 'error');
          setAuthLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              role: selectedRole
            }
          }
        });
        if (error) throw error;
        showToast('¡Registro exitoso! Ya puedes iniciar sesión.');
        setAuthMode('login');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de autenticación', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTasks([]);
    setProfiles([]);
    showToast('Sesión cerrada');
  };

  // --- ACCIONES KANBAN ---
  
  // 1. Crear Tarea
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
          created_by: session?.user?.id,
          assigned_to: newAssignedTo || null
        }),
      });

      if (!res.ok) throw new Error();
      const newTask = await res.json();

      setTasks((prev: Task[]) => [...prev, newTask]);
      setIsCreateOpen(false);
      showToast('Tarea añadida con éxito');
    } catch (err) {
      showToast('Error al crear tarea', 'error');
    }
  };

  // 2. Transiciones Rápidas del Flujo Automatizado
  const handleTransition = async (task: Task, targetStatus: 'todo' | 'in_progress' | 'review' | 'done', newAssigneeId?: string | null) => {
    if (!session) return;
    
    // Obtenemos los campos de actualización
    const body: Record<string, any> = { status: targetStatus };
    if (newAssigneeId !== undefined) {
      body.assigned_to = newAssigneeId;
    }

    // Actualización local rápida (optimistic)
    setTasks((prev: Task[]) => prev.map((t: Task) => {
      if (t.id === task.id) {
        const assignedProfile = newAssigneeId 
          ? profiles.find((p: Profile) => p.id === newAssigneeId) 
          : newAssigneeId === null ? undefined : t.assigned_profile;
        
        return {
          ...t,
          status: targetStatus,
          assigned_to: newAssigneeId !== undefined ? (newAssigneeId || undefined) : t.assigned_to,
          assigned_profile: assignedProfile
        };
      }
      return t;
    }));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      
      // Actualizar el estado con el dato del backend
      setTasks((prev: Task[]) => prev.map((t: Task) => t.id === task.id ? updatedData : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask(updatedData);
      }
      showToast(`Tarea actualizada a ${COLUMNS.find(c => c.id === targetStatus)?.title}`);
    } catch (err) {
      showToast('Error al guardar transición en base de datos', 'error');
      fetchTasks(); // revertir en fallo
    }
  };

  // Asignarse la tarea a sí mismo (mueve a En Progreso)
  const handleClaimTask = (task: Task) => {
    handleTransition(task, 'in_progress', session.user.id);
  };

  // Enviar a revisión
  const handleSendToReview = (task: Task) => {
    handleTransition(task, 'review');
  };

  // Devolver a En Progreso (Solo revisor/admin)
  const handleReturnToProgress = (task: Task) => {
    handleTransition(task, 'in_progress');
  };

  // Aprobar e ir a Completado (Solo revisor/admin)
  const handleApprove = (task: Task) => {
    handleTransition(task, 'done');
  };

  // 3. Eliminar tarea
  const handleDeleteTask = async (id: string) => {
    if (!confirm('¿Deseas eliminar permanentemente esta tarea?')) return;

    setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Tarea eliminada');
    } catch (err) {
      showToast('Error al eliminar tarea', 'error');
      fetchTasks();
    }
  };

  // 4. Agregar Adjunto (Imagen con ImgBB)
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedFile || !attachmentName.trim()) return;

    setUploadingFile(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '4a53239a58b8d447d25164bc1495c2e1';
      
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Subir imagen a ImgBB
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });

      if (!imgbbRes.ok) {
        const errJson = await imgbbRes.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || 'Error al subir imagen a ImgBB (Verifica tu API Key)');
      }
      const imgbbData = await imgbbRes.json();
      const imageUrl = imgbbData?.data?.url;

      if (!imageUrl) throw new Error('No se pudo obtener el enlace de la imagen subida');

      // Guardar el enlace de la imagen en Supabase
      const res = await fetch(`/api/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: attachmentName,
          url: imageUrl,
          uploaded_by: session.user.id
        })
      });

      if (!res.ok) throw new Error('Error al registrar el adjunto en la base de datos');
      const newAttach = await res.json();

      const updatedAttachments = [...(selectedTask.attachments || []), newAttach];
      const updatedTask = { ...selectedTask, attachments: updatedAttachments };

      setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      setAttachmentName('');
      setSelectedFile(null);

      // Limpiar input de archivo
      const fileInput = document.getElementById('task-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      showToast('Imagen subida y adjuntada correctamente');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al subir adjunto', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // 5. Agregar Pregunta de Revisión
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !questionText.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: questionText,
          author_id: session.user.id
        })
      });

      if (!res.ok) throw new Error();
      const newQuest = await res.json();
      
      // Asignar el perfil del usuario actual para visualización local
      newQuest.author_profile = currentUserProfile;

      const updatedQuestions = [...(selectedTask.questions || []), newQuest];
      const updatedTask = { ...selectedTask, questions: updatedQuestions };

      setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      setQuestionText('');
      showToast('Pregunta de revisión enviada');
    } catch (err) {
      showToast('Error al enviar pregunta', 'error');
    }
  };

  // 6. Resolver Pregunta
  const handleToggleQuestionResolve = async (question: Question) => {
    if (!selectedTask) return;

    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !question.resolved })
      });

      if (!res.ok) throw new Error();
      const updatedQuest = await res.json();
      updatedQuest.author_profile = question.author_profile; // Mantener información del perfil

      const updatedQuestions = selectedTask.questions?.map((q: Question) => q.id === question.id ? updatedQuest : q) || [];
      const updatedTask = { ...selectedTask, questions: updatedQuestions };

      setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      showToast(updatedQuest.resolved ? 'Pregunta resuelta' : 'Pregunta reactivada');
    } catch (err) {
      showToast('Error al actualizar pregunta', 'error');
    }
  };

  // --- DRAG AND DROP CON VALIDACIÓN ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t: Task) => t.id === taskId);

    if (!task || task.status === targetStatus) return;

    // VALIDACIÓN DE ROLES PARA DRAG & DROP
    const isRevisor = currentUserProfile?.role === 'revisor' || currentUserProfile?.role === 'admin';
    const isOwner = task.assigned_to === session?.user?.id;

    if (targetStatus === 'done' && !isRevisor) {
      showToast('Solo los Revisores o Admins pueden aprobar y completar tareas', 'error');
      return;
    }

    if (task.status === 'review' && targetStatus === 'in_progress' && !isRevisor) {
      showToast('Solo los Revisores o Admins pueden devolver tareas a progreso', 'error');
      return;
    }

    if (targetStatus === 'review' && task.status === 'in_progress' && !isOwner && !isRevisor) {
      showToast('Solo el programador asignado puede enviar esta tarea a revisión', 'error');
      return;
    }

    // Ejecutar transiciones automáticas según la columna destino
    if (targetStatus === 'in_progress' && task.status === 'todo') {
      handleClaimTask(task);
    } else {
      handleTransition(task, targetStatus);
    }
  };

  // Helper de avatar
  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  };

  // Contar preguntas pendientes
  const getPendingQuestions = (task: Task) => {
    return (task.questions || []).filter((q: Question) => !q.resolved).length;
  };

  // Verificar si el usuario logueado es el asignado
  const isUserAssigned = (task: Task) => {
    return task.assigned_to === session?.user?.id;
  };

  // Verificar rol de revisor
  const isRevisorUser = () => {
    return currentUserProfile?.role === 'revisor' || currentUserProfile?.role === 'admin';
  };

  // --- CARGA Y RENDERIZADO PRINCIPAL ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-9 h-9 animate-spin text-indigo-500" />
        <p className="text-sm font-medium tracking-wide animate-pulse">Cargando TodoBoard...</p>
      </div>
    );
  }

  // Si no está logueado, mostrar formulario de Login/Registro
  if (!session || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 text-slate-100 font-sans flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          
          {/* Decoración superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          {/* Cabecera */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CheckCircle2 className="w-6.5 h-6.5 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mt-3">
              {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-xs">
              {authMode === 'login' 
                ? 'Gestiona tus tareas y colabora en tiempo real con tu equipo.' 
                : 'Regístrate para integrarte a tu tablero de tareas y revisiones.'}
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Selecciona tu Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('colaborador')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedRole === 'colaborador'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold'
                        : 'bg-slate-950 border-slate-850 hover:bg-slate-850 hover:text-slate-350 text-slate-500'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Colaborador
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('revisor')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedRole === 'revisor'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-semibold'
                        : 'bg-slate-950 border-slate-850 hover:bg-slate-850 hover:text-slate-350 text-slate-500'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Revisor (Admin)
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
            >
              {authMode === 'login' ? 'Acceder al Tablero' : 'Registrar Usuario'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Modo */}
          <div className="flex justify-center border-t border-slate-850/60 pt-4 text-xs">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- RENDERIZADO DEL TABLERO (LOGUEADO) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 text-slate-100 font-sans flex flex-col antialiased">
      
      {/* Toast */}
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

        {/* Info Usuario */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-850/80 px-3.5 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {getInitials(currentUserProfile.name)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-200 leading-tight">{currentUserProfile.name}</span>
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                currentUserProfile.role === 'revisor' || currentUserProfile.role === 'admin' 
                  ? 'text-amber-400' 
                  : 'text-indigo-400'
              }`}>{currentUserProfile.role}</span>
            </div>
          </div>

          <button 
            onClick={fetchTasks}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all text-slate-400"
            title="Recargar tareas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-lg border border-rose-500/10 hover:border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-350 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Kanban Content */}
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-x-auto">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 p-4 rounded-xl flex items-start gap-3.5 max-w-4xl mx-auto w-full shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Problema con la base de datos relacional</p>
              <p className="text-xs mt-1 text-rose-300">{error}</p>
            </div>
          </div>
        )}

        {loading && tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium animate-pulse">Sincronizando con Supabase relacional...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 min-w-[1000px] flex-1 items-start">
            {COLUMNS.map((column) => {
              const columnTasks = tasks.filter(t => t.status === column.id);
              return (
                <div 
                  key={column.id} 
                  className={`flex flex-col rounded-2xl border overflow-hidden min-h-[560px] transition-all duration-300 ${column.wrap}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {/* Riel superior de color: refuerza la posición en el pipeline */}
                  <div className={`h-1 w-full bg-gradient-to-r ${column.top}`} />

                  {/* Column Header */}
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center ${column.text}`}>
                        <column.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className={`font-bold text-[13px] tracking-wide ${column.text}`}>
                            {column.title}
                          </h2>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${column.badge}`}>
                            {columnTasks.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight">{column.subtitle}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenCreate(column.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all focus:outline-none"
                      title="Añadir tarea aquí"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] p-3">
                    {columnTasks.length === 0 ? (
                      <div 
                        onClick={() => handleOpenCreate(column.id)}
                        className={`flex-1 border border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center group cursor-pointer transition-all duration-200 ${column.emptyBorder}`}
                      >
                        <column.icon className={`w-7 h-7 mb-2 transition-colors ${column.emptyIcon}`} />
                        <span className={`text-xs font-semibold transition-colors ${column.emptyCta}`}>
                          {column.emptyMsg}
                        </span>
                        <span className="text-[10px] text-slate-600 mt-2 flex items-center gap-1 font-semibold">
                          <Plus className="w-3 h-3" /> Añadir tarea
                        </span>
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const pendingQs = getPendingQuestions(task);
                        const totalQs = (task.questions || []).length;
                        const pStyle = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
                        const stageIndex = COLUMNS.findIndex(c => c.id === task.status);
                        
                        // Primera imagen adjunta sirve como portada
                        const coverAttachment = task.attachments?.find((att: Attachment) => 
                          att.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || att.url.includes('images')
                        );
                        
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => handleOpenDetail(task)}
                            className={`bg-slate-900 border border-slate-800 border-l-4 ${pStyle.stripe} rounded-xl cursor-grab active:cursor-grabbing hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 group relative overflow-hidden flex flex-col`}
                          >
                            {/* Portada de Imagen (Trello style) */}
                            {coverAttachment && (
                              <div className="w-full h-28 relative overflow-hidden border-b border-slate-850 bg-slate-950 flex justify-center items-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={coverAttachment.url} 
                                  alt={coverAttachment.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent" />
                              </div>
                            )}

                            {/* Contenido de la tarjeta */}
                            <div className="p-3.5 flex flex-col gap-2.5">
                              {/* Fila superior: código de ticket, prioridad y eliminar */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-mono font-bold text-slate-550 tracking-tight">
                                    {ticketCode(task.id)}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${pStyle.bg} ${pStyle.border} ${pStyle.text}`}>
                                    {pStyle.label}
                                  </span>
                                </div>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all"
                                  title="Eliminar tarea"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Título y Descripción */}
                              <div>
                                <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors text-sm leading-snug line-clamp-2">
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="text-[11px] text-slate-450 mt-1 line-clamp-2 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Mini riel de etapas: dónde va este ticket dentro del pipeline */}
                              <div className="flex items-center gap-1" title={`Etapa ${stageIndex + 1} de ${COLUMNS.length}: ${column.title}`}>
                                {COLUMNS.map((c, i) => (
                                  <span
                                    key={c.id}
                                    className={`h-1 flex-1 rounded-full transition-colors ${i <= stageIndex ? column.dot : 'bg-slate-800'}`}
                                  />
                                ))}
                              </div>

                              {/* Asignado & Preguntas en el Footer */}
                              <div className="flex items-center justify-between mt-0.5 pt-2 border-t border-slate-850/60">
                                
                                {/* Badges de actividad */}
                                <div className="flex items-center gap-2">
                                  {totalQs > 0 && (
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      pendingQs > 0 
                                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' 
                                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
                                    }`}>
                                      <MessageSquare className="w-3 h-3" />
                                      <span>{pendingQs > 0 ? pendingQs : totalQs}</span>
                                    </div>
                                  )}
                                  
                                  {task.attachments && task.attachments.length > 0 && (
                                    <div className="flex items-center gap-0.5 text-slate-500" title={`${task.attachments.length} archivos adjuntos`}>
                                      <Paperclip className="w-3 h-3" />
                                      <span className="text-[10px] font-bold">{task.attachments.length}</span>
                                    </div>
                                  )}

                                  <span className="text-[9px] font-mono text-slate-600">{timeAgo(task.created_at)}</span>
                                </div>

                                {/* Avatar Asignado, con anillo de color según rol */}
                                {task.assigned_profile ? (
                                  <div 
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[9px] shadow-sm ring-2 ${
                                      task.assigned_profile.role === 'revisor' || task.assigned_profile.role === 'admin'
                                        ? 'bg-amber-500/20 text-amber-300 ring-amber-500/40'
                                        : 'bg-violet-500/20 text-violet-300 ring-violet-500/40'
                                    }`}
                                    title={`Asignada a: ${task.assigned_profile.name} (${task.assigned_profile.role})`}
                                  >
                                    {getInitials(task.assigned_profile.name)}
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full border border-dashed border-slate-700 bg-slate-950 flex items-center justify-center text-slate-650" title="Sin asignar">
                                    <User className="w-3 h-3" />
                                  </div>
                                )}
                              </div>

                              {/* ACCIONES AUTOMÁTICAS EN TARJETA */}
                              <div className="flex justify-end gap-1.5">
                                
                                {/* COLUMNA: Por Hacer -> Tomar Tarea */}
                                {task.status === 'todo' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClaimTask(task);
                                    }}
                                    className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm shadow-violet-950/40"
                                  >
                                    Tomar Tarea
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}

                                {/* COLUMNA: En Progreso -> Enviar a revisión */}
                                {task.status === 'in_progress' && isUserAssigned(task) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendToReview(task);
                                    }}
                                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm shadow-amber-950/40"
                                  >
                                    Enviar a Revisión
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}

                                {/* COLUMNA: Bajo Revisión -> Acciones del Revisor */}
                                {task.status === 'review' && isRevisorUser() && (
                                  <div className="grid grid-cols-2 gap-1.5 w-full">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReturnToProgress(task);
                                      }}
                                      className="py-1 bg-rose-500/10 hover:bg-rose-500/80 text-rose-400 hover:text-white border border-rose-500/10 rounded-md text-[9px] font-bold transition-all"
                                      title="Devolver a progreso para corregir dudas"
                                    >
                                      Devolver
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(task);
                                      }}
                                      className="py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[9px] font-bold transition-all flex items-center justify-center gap-0.5"
                                      title="Aprobar y Completar tarea"
                                    >
                                      Aprobar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
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
          <div onClick={() => setIsCreateOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs"></div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Nueva Tarea ({COLUMNS.find(c => c.id === createColumn)?.title})
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Título</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Integrar login en Vercel" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Descripción</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Instrucciones sobre qué se debe revisar..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Prioridad</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all uppercase tracking-wide ${
                        newPriority === p
                          ? `${PRIORITY_STYLE[p].bg} ${PRIORITY_STYLE[p].border} ${PRIORITY_STYLE[p].text}`
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-850 text-slate-500'
                      }`}
                    >
                      {PRIORITY_STYLE[p].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Asignar a (Opcional)</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Sin Asignar (Disponible)</option>
                  {profiles.map((p: Profile) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
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
                  className="px-4.5 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detalle y Revisión de Tarea */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={() => setSelectedTask(null)} className="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 pb-0 border-b border-slate-800/80">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{ticketCode(selectedTask.id)}</span>
                    {(() => {
                      const col = COLUMNS.find(c => c.id === selectedTask.status)!;
                      return (
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-1 ${col.badge}`}>
                          <col.icon className="w-2.5 h-2.5" /> {col.title}
                        </span>
                      );
                    })()}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                    {selectedTask.title}
                  </h3>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pestañas */}
              <div className="flex items-center gap-1">
                {([
                  { id: 'detalles', label: 'Detalles', icon: Info, count: undefined },
                  { id: 'adjuntos', label: 'Adjuntos', icon: ImageIcon, count: undefined },
                  { id: 'consultas', label: 'Consultas', icon: HelpCircle, count: getPendingQuestions(selectedTask) || undefined },
                  { id: 'actividad', label: 'Actividad', icon: History, count: undefined },
                ] as { id: 'detalles' | 'adjuntos' | 'consultas' | 'actividad'; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 border-b-2 transition-all ${
                      modalTab === tab.id
                        ? 'text-indigo-300 border-indigo-500 bg-indigo-500/5'
                        : 'text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {!!tab.count && (
                      <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 rounded-full px-1.5">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 flex-1">
              
              {/* PESTAÑA: Detalles */}
              {modalTab === 'detalles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-950/40 p-4.5 rounded-xl border border-slate-850/60">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción de Tarea</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-850/50 min-h-[90px] whitespace-pre-wrap">
                    {selectedTask.description || 'Sin descripción adicional.'}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Asignado a</label>
                    <select
                      value={selectedTask.assigned_to || ''}
                      onChange={(e) => handleTransition(selectedTask, selectedTask.status, e.target.value || null)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Sin Asignar (Disponible)</option>
                      {profiles.map((p: Profile) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Prioridad</label>
                      <span className={`text-center py-1.5 rounded-lg text-xs font-bold border uppercase tracking-wider ${PRIORITY_STYLE[selectedTask.priority].bg} ${PRIORITY_STYLE[selectedTask.priority].border} ${PRIORITY_STYLE[selectedTask.priority].text}`}>
                        {PRIORITY_STYLE[selectedTask.priority].label}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Creada</label>
                      <span className="text-center py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-950 text-slate-350 font-mono">
                        {timeAgo(selectedTask.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Riel de etapas también dentro del modal, para orientar de un vistazo */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Progreso en el pipeline</label>
                    <div className="flex items-center gap-1.5">
                      {COLUMNS.map((c, i) => {
                        const currentIdx = COLUMNS.findIndex(x => x.id === selectedTask.status);
                        return (
                          <div key={c.id} className="flex-1 flex flex-col items-center gap-1">
                            <span className={`h-1.5 w-full rounded-full ${i <= currentIdx ? c.dot : 'bg-slate-800'}`} />
                            <span className={`text-[8px] font-bold ${i === currentIdx ? c.text : 'text-slate-600'}`}>{c.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* PESTAÑA: Adjuntos */}
              {modalTab === 'adjuntos' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <ImageIcon className="w-4.5 h-4.5 text-indigo-400" />
                    Adjuntos e Imágenes
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {selectedTask.attachments?.length || 0} archivos
                  </span>
                </div>

                {/* Lista de adjuntos en cuadrícula */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedTask.attachments.map((att: Attachment) => {
                      const isImage = att.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || att.url.includes('images');
                      return (
                        <div key={att.id} className="bg-slate-950 rounded-xl border border-slate-850 p-2.5 flex flex-col gap-2 group relative overflow-hidden">
                          {isImage ? (
                            <div className="w-full h-24 rounded-lg bg-slate-900 overflow-hidden relative border border-slate-850">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              <a 
                                href={att.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[10px] font-bold text-white"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ampliar
                              </a>
                            </div>
                          ) : (
                            <div className="w-full h-24 rounded-lg bg-slate-900/60 border border-slate-850 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-slate-650" />
                            </div>
                          )}
                          <span className="text-[10px] text-slate-350 font-bold truncate block">{att.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Formulario para adjuntar */}
                <form onSubmit={handleAddAttachment} className="bg-slate-950/40 border border-slate-850/50 p-4 rounded-xl flex flex-col gap-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subir Captura / Imagen (vía ImgBB)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input 
                      type="text"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      placeholder="Nombre del archivo (Ej: Captura de pantalla)"
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <input 
                      id="task-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        if (file && !attachmentName) {
                          // Auto-completar el nombre del archivo sin la extensión
                          setAttachmentName(file.name.replace(/\.[^/.]+$/, ""));
                        }
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-450 file:mr-4 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 file:cursor-pointer"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={uploadingFile}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-550 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {uploadingFile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Subir y Adjuntar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              )}

              {/* PESTAÑA: Consultas */}
              {modalTab === 'consultas' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <HelpCircle className="w-4.5 h-4.5 text-amber-400" />
                    Hilo de Consultas y Dudas
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {selectedTask.questions?.length || 0} dudas
                  </span>
                </div>

                {/* Formulario para dejar dudas */}
                <form onSubmit={handleAddQuestion} className="bg-slate-950/40 border border-slate-850/50 p-4 rounded-xl flex items-center gap-3">
                  <input 
                    type="text" 
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Escribe una duda con imágenes adjuntas arriba, o responde..." 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button 
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex-shrink-0"
                    title="Enviar pregunta/respuesta"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>

                {/* Hilo de preguntas */}
                <div className="flex flex-col gap-3">
                  {!selectedTask.questions || selectedTask.questions.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-550 text-xs">
                      No hay consultas en esta tarea aún.
                    </div>
                  ) : (
                    selectedTask.questions.map((q: Question) => (
                      <div 
                        key={q.id}
                        className={`border rounded-xl p-4 transition-all flex items-start justify-between gap-4 ${
                          q.resolved 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-slate-400 opacity-70' 
                            : 'bg-amber-500/5 border-amber-500/10 text-slate-250'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          
                          {/* Checkbox resolver (puede alternarlo el asignado o revisores) */}
                          <button
                            onClick={() => handleToggleQuestionResolve(q)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              q.resolved
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-700 hover:border-amber-400 text-transparent hover:text-amber-400/40 bg-slate-950'
                            }`}
                            title={q.resolved ? "Marcar como pendiente" : "Marcar como resuelta"}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="flex flex-col gap-1.5 flex-1 text-left">
                            <p className={`text-xs leading-relaxed ${q.resolved ? 'line-through text-slate-500' : 'text-slate-250 font-medium'}`}>
                              {q.text}
                            </p>
                            
                            {/* Información del Autor */}
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium">
                              <span className="flex items-center gap-0.5 text-indigo-400 font-semibold">
                                <User className="w-3 h-3" />
                                {q.author_profile ? q.author_profile.name : 'Usuario'}
                              </span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-800 ${
                                q.author_profile?.role === 'revisor' ? 'text-amber-400 border border-amber-500/10' : 'text-indigo-400'
                              }`}>
                                {q.author_profile ? q.author_profile.role : 'Colaborador'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(q.created_at).toLocaleDateString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}

              {/* PESTAÑA: Actividad — historial de cambios y avances del ticket */}
              {modalTab === 'actividad' && (() => {
                type Event = { date: string; label: string; detail?: string; icon: React.ComponentType<{ className?: string }>; color: string };
                const events: Event[] = [];

                events.push({
                  date: selectedTask.created_at,
                  label: 'Ticket creado',
                  detail: selectedTask.creator_profile ? `por ${selectedTask.creator_profile.name}` : 'en Por Hacer',
                  icon: Inbox,
                  color: 'text-slate-400 bg-slate-800',
                });

                (selectedTask.attachments || []).forEach((att: Attachment) => {
                  events.push({
                    date: att.created_at,
                    label: `Adjunto añadido: ${att.name}`,
                    icon: Paperclip,
                    color: 'text-indigo-400 bg-indigo-500/15',
                  });
                });

                (selectedTask.questions || []).forEach((q: Question) => {
                  events.push({
                    date: q.created_at,
                    label: q.resolved ? 'Consulta resuelta' : 'Nueva consulta abierta',
                    detail: `"${q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text}" — ${q.author_profile?.name || 'usuario'}`,
                    icon: q.resolved ? CheckCircle2 : HelpCircle,
                    color: q.resolved ? 'text-emerald-400 bg-emerald-500/15' : 'text-amber-400 bg-amber-500/15',
                  });
                });

                events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const currentCol = COLUMNS.find(c => c.id === selectedTask.status)!;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                        <History className="w-4.5 h-4.5 text-indigo-400" />
                        Historial de Avances
                      </h4>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${currentCol.badge}`}>
                        <currentCol.icon className="w-3 h-3" /> Estado actual: {currentCol.title}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">
                      Línea de tiempo derivada de la actividad registrada del ticket (creación, adjuntos y consultas). 
                      Para un historial completo de cada cambio de columna (quién movió qué y cuándo), se puede sumar 
                      una tabla <code className="font-mono text-slate-400">activity_log</code> en el backend.
                    </p>

                    <div className="flex flex-col">
                      {events.map((ev, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ev.color}`}>
                              <ev.icon className="w-3.5 h-3.5" />
                            </div>
                            {i < events.length - 1 && <div className="w-px flex-1 bg-slate-800 my-1" />}
                          </div>
                          <div className="pb-5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-200">{ev.label}</span>
                              <span className="text-[9px] font-mono text-slate-600">{timeAgo(ev.date)}</span>
                            </div>
                            {ev.detail && <p className="text-[11px] text-slate-500 mt-0.5">{ev.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer con Acciones de Flujo */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Tarea
              </button>

              <div className="flex items-center gap-2">
                
                {/* ACCIONES DEL REVISOR DENTRO DEL MODAL */}
                {selectedTask.status === 'review' && isRevisorUser() && (
                  <>
                    <button
                      onClick={() => handleReturnToProgress(selectedTask)}
                      className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/80 border border-rose-500/30 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Devolver a Progreso
                    </button>
                    <button
                      onClick={() => handleApprove(selectedTask)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-emerald-600/10"
                    >
                      <Check className="w-4 h-4" />
                      Aprobar y Completar
                    </button>
                  </>
                )}

                {/* ACCIÓN DE ENVIAR A REVISIÓN EN MODAL */}
                {selectedTask.status === 'in_progress' && isUserAssigned(selectedTask) && (
                  <button
                    onClick={() => handleSendToReview(selectedTask)}
                    className="px-4.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                  >
                    Enviar a Revisión
                  </button>
                )}

                {/* ACCIÓN DE TOMAR EN MODAL */}
                {selectedTask.status === 'todo' && (
                  <button
                    onClick={() => handleClaimTask(selectedTask)}
                    className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                  >
                    Tomar Tarea
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-350 transition-all border border-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
