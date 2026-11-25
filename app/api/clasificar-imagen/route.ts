import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const PROMPT =
  "Eres un clasificador arancelario experto de Ecuador (nomenclatura NANDINA / Arancel del SENAE). " +
  "Observa la imagen del producto (y la nota del usuario si existe) e identifícalo para clasificarlo. " +
  'Devuelve SOLO un objeto JSON válido, sin texto extra, con esta forma: ' +
  '{"producto":"nombre corto del producto","material":"material principal o composición","uso":"uso o función",' +
  '"terminos":"3 a 6 palabras clave en español para buscar la subpartida en el arancel"}. ' +
  "Usa términos técnicos del arancel (por ejemplo 'calzado' en vez de 'zapatos', 'telefonía móvil' en vez de 'celular').";

function parseJson(text: string): any | null {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

async function buscarEnArancel(terminos: string, max = 12) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const r = await fetch(`${url}/rest/v1/rpc/search_arancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ term: terminos, max_results: max }),
  });
  if (!r.ok) return [];
  return (await r.json()) as any[];
}

export async function POST(req: NextRequest) {
  const key = process.env.AI_API_KEY;
  const base = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = process.env.AI_MODEL || "gemini-3.8-flash";
  if (!key) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });

  let body: { image?: string; nota?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!body.image || !body.image.startsWith("data:image")) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }

  const userText = PROMPT + (body.nota ? `\n\nNota del usuario: ${body.nota}` : "");

  const payload = JSON.stringify({
    model,
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: body.image } },
        ],
      },
    ],
  });

  try {
    let r: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: payload,
      });
      if (r.ok || (r.status !== 503 && r.status !== 429)) break;
      await new Promise((res) => setTimeout(res, 700 * (attempt + 1)));
    }

    if (!r || !r.ok) {
      const detail = r ? await r.text() : "sin respuesta";
      return NextResponse.json({ error: "Proveedor IA", detail: detail.slice(0, 200) }, { status: 502 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const analisis = parseJson(text) || { producto: "", material: "", uso: "", terminos: "" };
    const terminos: string = (analisis.terminos || analisis.producto || "").toString();

    const candidatos = terminos ? await buscarEnArancel(terminos) : [];

    return NextResponse.json({
      analisis: {
        producto: analisis.producto || "",
        material: analisis.material || "",
        uso: analisis.uso || "",
      },
      terminos,
      candidatos,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo analizar la imagen" }, { status: 502 });
  }
}
