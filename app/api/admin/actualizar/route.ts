import { NextRequest, NextResponse } from "next/server";
import { adminClient, esAdmin, tokenDe } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (c: string) => (c || "").replace(/\D/g, "");

const PROMPTS: Record<string, string> = {
  arancel:
    "Esta es una resolución del COMEX de Ecuador que fija o reforma el Arancel. Extrae TODAS las subpartidas (NANDINA, 10 dígitos) que la resolución establece o modifica, con su descripción y tarifa ad-valorem. " +
    'Devuelve SOLO JSON {"filas":[{"subpartida":"0000.00.00.00","descripcion":"","ad_valorem":0,"especifico":""}]}. ad_valorem es un número (% ); especifico es el componente específico si existe (ej. "USD 5.5 por kg"), si no, vacío.',
  notas:
    "Este documento contiene Notas Explicativas del Sistema Armonizado. Extrae cada partida (4 dígitos) con su título y el texto de la nota. " +
    'Devuelve SOLO JSON {"filas":[{"partida":"8413","titulo":"","texto":""}]}.',
};

async function geminiJSON(parts: any[], model: string, key: string, maxTokens: number) {
  const payload = JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" } });
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`;
  let lastErr = "net";
  for (let a = 0; a < 4; a++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, signal: ctrl.signal });
      clearTimeout(to);
      if (r.ok) {
        const data = await r.json();
        return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
      }
      lastErr = "http-" + r.status;
      if (r.status !== 429 && r.status < 500) throw new Error(lastErr);
    } catch (e: any) {
      clearTimeout(to);
      lastErr = e?.message || "err";
      if (lastErr.startsWith("http-4") && lastErr !== "http-429") throw e;
    }
    await sleep(700 * (a + 1));
  }
  throw new Error("ia-" + lastErr);
}

const dotted = (code: string) => {
  const d = norm(code);
  return d.length >= 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}.${d.slice(8, 10) || "00"}` : code;
};

export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDe(req)))) {
    return NextResponse.json({ error: "No autorizado (solo administradores)." }, { status: 403 });
  }
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-flash-lite-latest";

  let body: { accion?: string; tipo?: string; file?: string; mime?: string; filas?: any[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
  const tipo = body.tipo === "notas" ? "notas" : "arancel";

  // ---- PROCESAR: la IA extrae las filas (sin escribir) ----
  if (body.accion === "procesar") {
    if (!key) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });
    if (!body.file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    const comma = body.file.indexOf(",");
    const b64 = comma >= 0 ? body.file.slice(comma + 1) : body.file;
    const mime = body.mime || "application/pdf";
    try {
      const out = await geminiJSON([{ text: PROMPTS[tipo] }, { inline_data: { mime_type: mime, data: b64 } }], model, key, 8000);
      const filas = Array.isArray(out.filas) ? out.filas : [];
      return NextResponse.json({ tipo, filas });
    } catch {
      return NextResponse.json({ error: "No se pudo leer el documento. Intenta de nuevo." }, { status: 502 });
    }
  }

  // ---- APLICAR: upsert de las filas revisadas ----
  if (body.accion === "aplicar") {
    const db = adminClient();
    if (!db) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." }, { status: 503 });
    const filas = Array.isArray(body.filas) ? body.filas : [];
    if (!filas.length) return NextResponse.json({ error: "No hay filas que aplicar." }, { status: 400 });
    try {
      if (tipo === "arancel") {
        const rows = filas
          .filter((f) => norm(f.subpartida).length >= 8)
          .map((f) => {
            const sub = dotted(f.subpartida);
            const d = norm(sub);
            return {
              subpartida: sub,
              descripcion: String(f.descripcion || ""),
              ad_valorem: f.ad_valorem === "" || f.ad_valorem == null ? null : Number(f.ad_valorem),
              especifico: f.especifico ? String(f.especifico) : null,
              capitulo: d.slice(0, 2),
              partida: d.slice(0, 4),
            };
          });
        const { error, count } = await db.from("aranceles").upsert(rows, { onConflict: "subpartida", count: "exact" });
        if (error) throw error;
        return NextResponse.json({ aplicadas: count ?? rows.length });
      } else {
        const rows = filas
          .filter((f) => norm(f.partida).length >= 4)
          .map((f) => {
            const p = norm(f.partida).slice(0, 4);
            return { partida: p, capitulo: p.slice(0, 2), titulo: String(f.titulo || ""), texto: String(f.texto || "") };
          });
        const { error, count } = await db.from("notas_explicativas").upsert(rows, { onConflict: "partida", count: "exact" });
        if (error) throw error;
        return NextResponse.json({ aplicadas: count ?? rows.length });
      }
    } catch (e: any) {
      return NextResponse.json({ error: "No se pudo aplicar: " + (e?.message || "").slice(0, 120) }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}
