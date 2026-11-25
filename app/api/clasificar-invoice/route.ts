import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const norm = (c: string) => (c || "").replace(/\D/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EXTRACT_PROMPT = `Eres un agente de aduana experto de Ecuador (SENAE). Analiza este invoice comercial de importación.
1) Extrae la cabecera: numero_factura, fecha, proveedor, pais_origen, pais_embarque, incoterm, moneda, lugar_entrega.
2) Extrae CADA ítem: descripcion, modelo, marca, cantidad, precio_unitario, precio_total.
3) Propón para cada ítem la subpartida NANDINA de Ecuador (10 dígitos, solo números) aplicando las 6 Reglas Generales de Interpretación.
Devuelve SOLO JSON: {"cabecera":{"numero_factura":"","fecha":"","proveedor":"","pais_origen":"","pais_embarque":"","incoterm":"","moneda":"","lugar_entrega":""},"items":[{"descripcion":"","modelo":"","marca":"","cantidad":0,"precio_unitario":0,"precio_total":0,"subpartida":""}]}`;

const REFINE_PROMPT = `Eres un clasificador arancelario experto de Ecuador. Para cada ítem tienes su descripción y una lista de subpartidas OFICIALES candidatas del arancel (código de 10 dígitos "c" y su texto "d").
Elige para cada ítem la subpartida MÁS ESPECÍFICA que corresponda según las 6 Reglas Generales de Interpretación. Prefiere SIEMPRE la subpartida específica sobre las de "los demás"; usa "los demás" solo si ninguna específica aplica. Elige un código que esté en la lista de candidatos.
Devuelve SOLO JSON: {"items":[{"i":0,"subpartida":"<10 dígitos del código elegido>","regla":"regla(s) aplicada(s)","justificacion":"explicación clara de por qué ese producto va en esa partida, 1-2 frases"}]}.
Datos:
`;

async function rpcPrefix(url: string, key: string, prefix: string) {
  try {
    const r = await fetch(`${url}/rest/v1/rpc/search_arancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ term: prefix, max_results: 60 }),
    });
    return r.ok ? ((await r.json()) as any[]) : [];
  } catch {
    return [];
  }
}

async function gruposCandidatos(items: any[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const map = new Map<string, { c: string; d: string; adv: number | null }[]>();
  if (!url || !key) return map;
  const pref6 = Array.from(new Set(items.map((i) => norm(i.subpartida).slice(0, 6)).filter((p) => p.length === 6)));
  await Promise.all(
    pref6.map(async (p) => {
      const rows = await rpcPrefix(url, key, p);
      map.set(p, rows.map((r) => ({ c: norm(r.subpartida), d: r.descripcion, adv: r.ad_valorem })));
    }),
  );
  return map;
}

async function geminiJSON(parts: any[], model: string, key: string, maxTokens: number) {
  const payload = JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" } });
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`;
  let r: Response | null = null;
  for (let a = 0; a < 3; a++) {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
    if (r.ok || (r.status !== 503 && r.status !== 429)) break;
    await sleep(800 * (a + 1));
  }
  if (!r || !r.ok) throw new Error("ia-" + (r ? r.status : "net"));
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-flash-lite-latest";
  if (!key) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });

  let body: { file?: string; mime?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
  if (!body.file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  const comma = body.file.indexOf(",");
  const b64 = comma >= 0 ? body.file.slice(comma + 1) : body.file;
  const mime = body.mime || (body.file.startsWith("data:") ? body.file.slice(5, comma).split(";")[0] : "application/pdf");

  try {
    // Paso 1: extraer + clasificación inicial
    const ext = await geminiJSON([{ text: EXTRACT_PROMPT }, { inline_data: { mime_type: mime, data: b64 } }], model, key, 8000);
    let items: any[] = Array.isArray(ext.items) ? ext.items : [];
    const cabecera = ext.cabecera || {};
    if (!items.length) return NextResponse.json({ cabecera, items: [] });

    // candidatos reales por grupo
    const grupos = await gruposCandidatos(items);

    // Paso 2: elegir el código específico real + justificación
    const refineInput = items.map((it, i) => ({
      i,
      descripcion: it.descripcion,
      modelo: it.modelo,
      candidatos: (grupos.get(norm(it.subpartida).slice(0, 6)) || []).slice(0, 40).map((x) => ({ c: x.c, d: x.d })),
    }));
    let refined: any[] = [];
    try {
      const rr = await geminiJSON([{ text: REFINE_PROMPT + JSON.stringify(refineInput) }], model, key, 8000);
      refined = Array.isArray(rr.items) ? rr.items : [];
    } catch { refined = []; }

    items = items.map((it, idx) => {
      const rf = refined.find((r) => r.i === idx) || {};
      const code = rf.subpartida ? String(rf.subpartida) : it.subpartida;
      const d = norm(code);
      const grp = grupos.get(d.slice(0, 6)) || [];
      const exact = grp.find((x) => x.c === d);
      const near = exact || grp.find((x) => x.c.startsWith(d.slice(0, 8))) || grp[0] || null;
      return {
        ...it,
        subpartida: code,
        regla: rf.regla || it.regla || "",
        justificacion: rf.justificacion || it.justificacion || "",
        arancel_oficial: near ? near.d : null,
        ad_valorem: near ? near.adv : null,
        exacto: !!exact,
      };
    });

    return NextResponse.json({ cabecera, items });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar el invoice" }, { status: 502 });
  }
}
