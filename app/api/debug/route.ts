import { NextResponse } from 'next/server';

// GET: Endpoint de diagnóstico seguro para verificar variables de entorno en Vercel
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const imackUrl = process.env.IMACK_TODO_SUPABASE_URL || '';
  const supabaseUrlRaw = process.env.SUPABASE_URL || '';

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!url,
      length: url.length,
      preview: url ? `${url.substring(0, 15)}...` : 'vacía',
      hasQuotes: url.startsWith('"') || url.endsWith('"') || url.startsWith("'") || url.endsWith("'")
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!anonKey,
      length: anonKey.length,
      preview: anonKey ? `${anonKey.substring(0, 15)}...` : 'vacía',
      hasQuotes: anonKey.startsWith('"') || anonKey.endsWith('"') || anonKey.startsWith("'") || anonKey.endsWith("'")
    },
    IMACK_TODO_SUPABASE_URL: {
      exists: !!imackUrl,
      length: imackUrl.length,
      preview: imackUrl ? `${imackUrl.substring(0, 15)}...` : 'vacía'
    },
    SUPABASE_URL: {
      exists: !!supabaseUrlRaw,
      length: supabaseUrlRaw.length
    }
  });
}
