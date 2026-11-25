import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SYSTEM =
  "Eres FERSUANADUANA, un asistente experto en comercio exterior y normativa aduanera de Ecuador " +
  "(SENAE, COPCI, ECUAPASS, nomenclatura NANDINA, COMEX). Responde en español, claro y directo, " +
  "con frases breves y orientado a agentes de aduana. Si algo depende del caso o pudo haber cambiado, " +
  "dilo y recomienda verificar en el SENAE. No inventes números de artículo ni cifras exactas si no estás seguro.";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  const key = process.env.AI_API_KEY;
  const base = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!key) {
    return NextResponse.json({ error: "IA no configurada" }, { status: 503 });
  }

  let body: { messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const history = (body.messages ?? []).filter((m) => m && m.content).slice(-10);
  const messages: Msg[] = [{ role: "system", content: SYSTEM }, ...history];

  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 700 }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json({ error: "Proveedor IA", detail: detail.slice(0, 300) }, { status: 502 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "Sin respuesta.";
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar la IA" }, { status: 502 });
  }
}
