import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    // Intentamos leer las variables usando diferentes nombres posibles en orden de prioridad
    const supabaseUrl = 
      process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.IMACK_TODO_SUPABASE_URL || 
      process.env.SUPABASE_URL || 
      'https://placeholder.supabase.co';

    const supabaseAnonKey = 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.IMACK_TODO_SUPABASE_ANON_KEY || 
      process.env.SUPABASE_ANON_KEY || 
      'placeholder-key';
    
    if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
      console.warn('Advertencia: Faltan variables de entorno de Supabase en process.env. Inicializando con placeholders.');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

// Exportamos un Proxy de la instancia de Supabase.
// Esto permite que el cliente se cree perezosamente (lazy) en runtime real
// en lugar de evaluarse estáticamente durante la compilación ('build') de Next.js.
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop);
    // Vinculamos las funciones del SDK al cliente para conservar su contexto (this)
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
