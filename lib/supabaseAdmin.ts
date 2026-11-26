import { createClient } from "@supabase/supabase-js";

/** Cliente con permisos de escritura (service role). SOLO en servidor. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Verifica que el token de sesión pertenezca a un correo de ADMIN_EMAILS. */
export async function esAdmin(token: string | null): Promise<boolean> {
  if (!token) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(token);
    const email = data?.user?.email?.toLowerCase();
    return !!email && admins.includes(email);
  } catch {
    return false;
  }
}

export function tokenDe(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}
