import { createClient } from "@supabase/supabase-js";
import type { Arancel } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && anon);

export const supabase = supabaseReady
  ? createClient(url as string, anon as string)
  : null;

/** Busca en el arancel por descripción o por código (usa la función RPC search_arancel). */
export async function buscarArancel(term: string, max = 20): Promise<Arancel[]> {
  if (!supabase) throw new Error("SUPABASE_NO_CONFIGURADO");
  const q = term.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc("search_arancel", {
    term: q,
    max_results: max,
  });
  if (error) throw error;
  return (data ?? []) as Arancel[];
}
