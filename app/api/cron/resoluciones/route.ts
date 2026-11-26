import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Página de regulaciones del COMEX (configurable). Mejor esfuerzo: si cambia o bloquea, degrada.
const DEFAULT_URL = "https://www.gob.ec/regulaciones?institucion=comite-de-comercio-exterior-comex";

export async function GET(req: NextRequest) {
  // protección: Vercel Cron envía "Authorization: Bearer <CRON_SECRET>" si la variable existe
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = adminClient();
  const key = process.env.AI_API_KEY;
  if (!db) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  if (!key) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });

  const fuente = process.env.RESOLUCIONES_URL || DEFAULT_URL;
  let texto = "";
  try {
    const r = await fetch(fuente, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AduanaBot/1.0)" } });
    if (!r.ok) return NextResponse.json({ error: "Fuente no disponible", status: r.status }, { status: 200 });
    const html = await r.text();
    texto = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 12000);
  } catch {
    return NextResponse.json({ error: "No se pudo leer la fuente" }, { status: 200 });
  }

  // IA extrae las resoluciones del COMEX listadas
  let filas: any[] = [];
  try {
    const prompt =
      "Del siguiente texto de una página de regulaciones de Ecuador, extrae las RESOLUCIONES del COMEX que aparezcan, con su referencia y título. " +
      'Devuelve SOLO JSON {"resoluciones":[{"referencia":"COMEX 0XX-20XX","titulo":""}]}. Si no hay ninguna, devuelve {"resoluciones":[]}.\n\nTexto:\n' + texto;
    const payload = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2000, responseMimeType: "application/json" } });
    const gr = await fetch(`${GEMINI_BASE}/models/${process.env.AI_MODEL || "gemini-flash-lite-latest"}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: payload,
    });
    if (gr.ok) {
      const data = await gr.json();
      const out = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
      filas = Array.isArray(out.resoluciones) ? out.resoluciones : [];
    }
  } catch {}

  // insertar las nuevas (referencia única); ignora las ya existentes
  let nuevas = 0;
  for (const f of filas.slice(0, 20)) {
    const ref = String(f.referencia || "").trim();
    if (!ref) continue;
    const { error } = await db.from("alertas").insert({ referencia: ref, titulo: String(f.titulo || ""), url: fuente });
    if (!error) nuevas++;
  }
  return NextResponse.json({ ok: true, detectadas: filas.length, nuevas });
}
