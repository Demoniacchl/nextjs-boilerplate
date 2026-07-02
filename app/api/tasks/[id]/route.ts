import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH: Actualizar una tarea (título, descripción, columna, prioridad, creador o asignado)
export async function PATCH(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { id } = (await context.params) as { id: string };
    const body = await request.json();
    
    const { title, description, status, priority, assigned_to, created_by } = body;
    
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (created_by !== undefined) updateData.created_by = created_by;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No se enviaron datos para actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assigned_profile:profiles!assigned_to(*),
        creator_profile:profiles!created_by(*),
        attachments:task_attachments(*),
        questions:task_questions(*, author_profile:profiles!author_id(*), responder_profile:profiles!responder_id(*))
      `);

    if (error) {
      console.error(`Error al actualizar la tarea relacional ${id} en Supabase:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (err: any) {
    console.error('Excepción en PATCH /api/tasks/[id]:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar una tarea
export async function DELETE(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { id } = (await context.params) as { id: string };

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error al eliminar la tarea ${id} en Supabase:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Tarea eliminada exitosamente' });
  } catch (err: any) {
    console.error('Excepción en DELETE /api/tasks/[id]:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
