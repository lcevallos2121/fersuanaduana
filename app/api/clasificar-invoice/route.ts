import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const PROMPT = `Eres un agente de aduana experto de Ecuador (SENAE). Analiza este invoice comercial de importación.
1) Extrae la cabecera: numero_factura, fecha, proveedor, pais_origen, pais_embarque, incoterm, moneda, lugar_entrega (puerto/ciudad del incoterm si aparece).
2) Extrae CADA ítem de la mercancía: descripcion, modelo, marca, cantidad, precio_unitario, precio_total.
3) Clasifica cada ítem con la subpartida arancelaria de Ecuador (NANDINA, 10 dígitos, SOLO números) aplicando las 6 Reglas Generales de Interpretación del Sistema Armonizado. Para cada uno indica 'regla' (cuál/es aplicaste) y 'justificacion' (breve, por qué esa partida).
Responde en español. Devuelve SOLO un objeto JSON con esta forma:
{"cabecera":{"numero_factura":"","fecha":"","proveedor":"","pais_origen":"","pais_embarque":"","incoterm":"","moneda":"","lugar_entrega":""},
 "items":[{"descripcion":"","modelo":"","marca":"","cantidad":0,"precio_unitario":0,"precio_total":0,"subpartida":"","regla":"","justificacion":""}]}`;

const norm = (c: string) => (c || "").replace(/\D/g, "");

async function enriquecer(items: any[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return items;
  // prefijos de 6 dígitos (HS6) de cada ítem; se validan vía la función RPC (security definer)
  const pref6 = Array.from(new Set(items.map((i) => norm(i.subpartida).slice(0, 6)).filter((p) => p.length === 6)));
  if (!pref6.length) return items;
  try {
    const lotes = await Promise.all(
      pref6.map(async (p) => {
        const r = await fetch(`${url}/rest/v1/rpc/search_arancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
          body: JSON.stringify({ term: p, max_results: 60 }),
        });
        return r.ok ? ((await r.json()) as any[]) : [];
      }),
    );
    const rows = lotes.flat().map((x) => ({ ...x, n: norm(x.subpartida) }));
    return items.map((i) => {
      const d = norm(i.subpartida);
      const exact = d && rows.find((x) => x.n === d);
      const h8 = d.length >= 8 && rows.find((x) => x.n.startsWith(d.slice(0, 8)));
      const h6 = d.length >= 6 && rows.find((x) => x.n.startsWith(d.slice(0, 6)));
      const hit = exact || h8 || h6 || null;
      return {
        ...i,
        arancel_oficial: hit ? hit.descripcion : null,
        ad_valorem: hit ? hit.ad_valorem : null,
        exacto: !!exact,
      };
    });
  } catch {
    return items;
  }
}

export async function POST(req: NextRequest) {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-flash-lite-latest";
  if (!key) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });

  let body: { file?: string; mime?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!body.file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  const comma = body.file.indexOf(",");
  const b64 = comma >= 0 ? body.file.slice(comma + 1) : body.file;
  const mime = body.mime || (body.file.startsWith("data:") ? body.file.slice(5, comma).split(";")[0] : "application/pdf");

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
    generationConfig: { maxOutputTokens: 8000, responseMimeType: "application/json" },
  });
  const genUrl = `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`;

  try {
    let r: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(genUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      if (r.ok || (r.status !== 503 && r.status !== 429)) break;
      await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
    }
    if (!r || !r.ok) {
      const detail = r ? await r.text() : "sin respuesta";
      return NextResponse.json({ error: "Proveedor IA", detail: detail.slice(0, 200) }, { status: 502 });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "No se pudo leer el invoice. Prueba con otro archivo." }, { status: 502 });
    }
    const items = Array.isArray(parsed.items) ? await enriquecer(parsed.items) : [];
    return NextResponse.json({ cabecera: parsed.cabecera || {}, items });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar el invoice" }, { status: 502 });
  }
}
