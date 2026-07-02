import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Crear una nueva pregunta de revisión relacional para una tarea
export async function POST(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { id: taskId } = (await context.params) as { id: string };
    const body = await request.json();
    const { text, author_id } = body;

    if (!text) {
      return NextResponse.json({ error: 'El texto de la pregunta es obligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_questions')
      .insert([
        {
          task_id: taskId,
          text,
          author_id: author_id || null,
          resolved: false,
        },
      ])
      .select();

    if (error) {
      console.error(`Error al insertar pregunta para la tarea ${taskId} en Supabase:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0] || null, { status: 201 });
  } catch (err: any) {
    console.error('Excepción en POST /api/tasks/[id]/questions:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
