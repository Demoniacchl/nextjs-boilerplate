import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH: Actualizar una pregunta (cambiar estado resolved o editar el texto)
export async function PATCH(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { qid } = (await context.params) as { qid: string };
    const body = await request.json();
    const { resolved, text } = body;

    const updateData: Record<string, any> = {};
    if (resolved !== undefined) updateData.resolved = resolved;
    if (text !== undefined) updateData.text = text;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No se enviaron datos para actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_questions')
      .update(updateData)
      .eq('id', qid)
      .select();

    if (error) {
      console.error(`Error al actualizar la pregunta ${qid} en Supabase:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (err: any) {
    console.error('Excepción en PATCH /api/questions/[qid]:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar una pregunta de revisión
export async function DELETE(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { qid } = (await context.params) as { qid: string };

    const { error } = await supabase
      .from('task_questions')
      .delete()
      .eq('id', qid);

    if (error) {
      console.error(`Error al eliminar la pregunta ${qid} en Supabase:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pregunta eliminada exitosamente' });
  } catch (err: any) {
    console.error('Excepción en DELETE /api/questions/[qid]:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
