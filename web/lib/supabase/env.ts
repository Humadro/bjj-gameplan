// Next.js inyecta las NEXT_PUBLIC_* en build; en dev se leen de .env.local.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Permite que la app arranque y muestre un aviso mientras no haya credenciales.
export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
