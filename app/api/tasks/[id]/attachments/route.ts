import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Agregar un archivo/imagen adjunto a una tarea
export async function POST(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { id: taskId } = (await context.params) as { id: string };
    const body = await request.json();
    const { name, url, uploaded_by } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'El nombre y la URL del adjunto son obligatorios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_attachments')
      .insert([
        {
          task_id: taskId,
          name,
          url,
          uploaded_by: uploaded_by || null,
        },
      ])
      .select();

    if (error) {
      console.error(`Error al insertar adjunto para la tarea ${taskId} en Supabase:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0] || null, { status: 201 });
  } catch (err: any) {
    console.error('Excepción en POST /api/tasks/[id]/attachments:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
