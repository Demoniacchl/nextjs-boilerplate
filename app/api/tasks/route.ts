import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Obtener todas las tareas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener tareas de Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Excepción en GET /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Crear una nueva tarea
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, priority } = body;

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
          questions: [], // Por defecto inicia sin preguntas de revisión
        },
      ])
      .select();

    if (error) {
      console.error('Error al insertar tarea en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0] || null, { status: 201 });
  } catch (err: any) {
    console.error('Excepción en POST /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
