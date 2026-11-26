import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const norm = (c: string) => (c || "").replace(/\D/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EXTRACT_PROMPT = `Eres un agente de aduana experto de Ecuador (SENAE). Analiza este invoice comercial de importación.
1) Extrae la cabecera: numero_factura, fecha, proveedor (vendedor), comprador (el importador/cliente que recibe la mercancía), pais_origen, pais_embarque, incoterm, moneda, lugar_entrega.
2) Extrae CADA ítem: descripcion, modelo, marca, cantidad, precio_unitario, precio_total.
3) Propón para cada ítem la subpartida NANDINA de Ecuador (10 dígitos, solo números) aplicando las 6 Reglas Generales de Interpretación.
Devuelve SOLO JSON: {"cabecera":{"numero_factura":"","fecha":"","proveedor":"","comprador":"","pais_origen":"","pais_embarque":"","incoterm":"","moneda":"","lugar_entrega":""},"items":[{"descripcion":"","modelo":"","marca":"","cantidad":0,"precio_unitario":0,"precio_total":0,"subpartida":""}]}`;

const REFINE_PROMPT = `Eres un clasificador arancelario experto de Ecuador. Para cada ítem tienes su descripción, posibles "previos" (clasificaciones que ESTA agencia de aduana ya hizo para productos iguales o muy parecidos) y una lista de subpartidas OFICIALES candidatas del arancel (código "c" y texto "d").
PRIORIDAD 1: Si en "previos" hay un producto que es claramente el MISMO (o prácticamente el mismo) que el ítem, usa esa subpartida — así clasifica la agencia y debe mantenerse la consistencia (salvo que sea evidentemente incorrecta).
PRIORIDAD 2: Si no hay previo aplicable, elige la subpartida MÁS ESPECÍFICA según las 6 Reglas Generales de Interpretación; usa las NOTAS EXPLICATIVAS oficiales como criterio para incluir/excluir el producto de la partida. Prefiere SIEMPRE la subpartida específica sobre las de "los demás". Elige un código que esté en la lista de candidatos.
Devuelve SOLO JSON: {"items":[{"i":0,"subpartida":"<10 dígitos del código elegido>","regla":"regla(s) aplicada(s)","justificacion":"explicación clara de por qué ese producto va en esa partida, citando la nota explicativa si aplica, 1-2 frases"}]}.`;

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

async function fetchNotas(headings: string[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const map = new Map<string, { titulo: string; texto: string }>();
  if (!url || !key || !headings.length) return map;
  try {
    const inList = headings.map((h) => `"${h}"`).join(",");
    const r = await fetch(`${url}/rest/v1/notas_explicativas?partida=in.(${inList})&select=partida,titulo,texto`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return map;
    const rows = (await r.json()) as any[];
    rows.forEach((x) => map.set(x.partida, { titulo: x.titulo || "", texto: x.texto || "" }));
  } catch {}
  return map;
}

async function buscarMemoria(term: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !term.trim()) return [];
  try {
    const r = await fetch(`${url}/rest/v1/rpc/buscar_memoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ term: term.slice(0, 200), max_results: 4 }),
    });
    return r.ok ? ((await r.json()) as any[]) : [];
  } catch {
    return [];
  }
}

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
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return JSON.parse(text);
      }
      lastErr = "http-" + r.status;
      // 4xx (salvo 429) son definitivos: no reintentar
      if (r.status !== 429 && r.status < 500) throw new Error(lastErr);
    } catch (e: any) {
      clearTimeout(to);
      lastErr = e?.message || "err";
      if (lastErr.startsWith("http-4") && lastErr !== "http-429") throw e;
    }
    await sleep(700 * (a + 1));
  }
  throw new Error("ia-agotado:" + lastErr);
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
    const ext = await geminiJSON([{ text: EXTRACT_PROMPT }, { inline_data: { mime_type: mime, data: b64 } }], model, key, 5000);
    let items: any[] = Array.isArray(ext.items) ? ext.items : [];
    const cabecera = ext.cabecera || {};
    if (!items.length) return NextResponse.json({ cabecera, items: [] });

    // candidatos reales por grupo + notas explicativas de las partidas
    const grupos = await gruposCandidatos(items);
    const headings = Array.from(new Set(items.map((it) => norm(it.subpartida).slice(0, 4)).filter((h) => h.length === 4)));
    const notas = await fetchNotas(headings);
    const memorias = await Promise.all(items.map((it) => buscarMemoria(`${it.descripcion || ""} ${it.modelo || ""}`)));
    const notasTxt = headings
      .map((h) => {
        const n = notas.get(h);
        return n ? `Partida ${h.slice(0, 2)}.${h.slice(2, 4)} — ${n.titulo}\n${n.texto.slice(0, 1800)}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

    // Paso 2: elegir el código específico real + justificación (guiado por las notas)
    const refineInput = items.map((it, i) => ({
      i,
      descripcion: it.descripcion,
      modelo: it.modelo,
      previos: (memorias[i] || []).filter((m: any) => m.score >= 0.35).slice(0, 3).map((m: any) => ({ d: (m.descripcion || "") + (m.modelo ? " / " + m.modelo : ""), sub: m.subpartida })),
      candidatos: (grupos.get(norm(it.subpartida).slice(0, 6)) || []).slice(0, 25).map((x) => ({ c: x.c, d: x.d })),
    }));
    const refinePrompt =
      REFINE_PROMPT +
      (notasTxt ? "\n\nNOTAS EXPLICATIVAS OFICIALES (criterio principal):\n" + notasTxt : "") +
      "\n\nÍtems a clasificar:\n" +
      JSON.stringify(refineInput);
    let refined: any[] = [];
    try {
      const rr = await geminiJSON([{ text: refinePrompt }], model, key, 4000);
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
    return NextResponse.json(
      { error: "El modelo de IA estuvo ocupado. Espera unos segundos e inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
