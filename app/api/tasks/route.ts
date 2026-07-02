import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Obtener todas las tareas con JOINs relacionales
export async function GET() {
  try {
    // Consultamos la tabla tasks incluyendo perfiles de usuario, adjuntos y preguntas con perfiles
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_profile:profiles!assigned_to(*),
        creator_profile:profiles!created_by(*),
        attachments:task_attachments(*),
        questions:task_questions(*, author_profile:profiles!author_id(*))
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener tareas relacionales de Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Excepción en GET /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Crear una nueva tarea relacional
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, priority, created_by, assigned_to } = body;

    if (!title) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title,
          description: description || '',
          status: status || 'todo',
          priority: priority || 'medium',
          created_by: created_by || null,
          assigned_to: assigned_to || null,
        },
      ])
      .select(`
        *,
        assigned_profile:profiles!assigned_to(*),
        creator_profile:profiles!created_by(*),
        attachments:task_attachments(*),
        questions:task_questions(*, author_profile:profiles!author_id(*))
      `);

    if (error) {
      console.error('Error al insertar tarea relacional en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0] || null, { status: 201 });
  } catch (err: any) {
    console.error('Excepción en POST /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
