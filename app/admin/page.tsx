"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, supabaseReady } from "@/lib/supabase";

type Fila = Record<string, any>;
type Alerta = { id: string; referencia: string | null; titulo: string | null; url: string | null; detectada: string };

function fileToDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error("read"));
    fr.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"arancel" | "notas">("arancel");
  const [fileName, setFileName] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [estado, setEstado] = useState<"idle" | "procesando" | "revisar" | "aplicando">("idle");
  const [msg, setMsg] = useState<{ t: "error" | "ok"; x: string } | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    if (!supabaseReady || !supabase) { router.replace("/acceso"); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/acceso"); return; }
      setToken(data.session.access_token);
      setReady(true);
    });
    supabase.from("alertas").select("id,referencia,titulo,url,detectada").eq("revisada", false).order("detectada", { ascending: false })
      .then(({ data }) => setAlertas((data as Alerta[]) || []));
  }, [router]);

  async function procesar(file: File) {
    setMsg(null); setFilas([]); setFileName(file.name);
    const dataUrl = await fileToDataURL(file);
    setEstado("procesando");
    try {
      const r = await fetch("/api/admin/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accion: "procesar", tipo, file: dataUrl, mime: file.type }),
      });
      const data = await r.json();
      if (r.status === 403) { setMsg({ t: "error", x: "Tu cuenta no es administrador." }); setEstado("idle"); return; }
      if (!r.ok) { setMsg({ t: "error", x: data.error || "Error al procesar." }); setEstado("idle"); return; }
      setFilas(data.filas || []);
      setEstado("revisar");
      if (!data.filas?.length) setMsg({ t: "error", x: "La IA no extrajo filas de este documento." });
    } catch { setMsg({ t: "error", x: "Error de conexión." }); setEstado("idle"); }
  }

  async function aplicar() {
    setEstado("aplicando"); setMsg(null);
    try {
      const r = await fetch("/api/admin/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accion: "aplicar", tipo, filas }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ t: "error", x: data.error || "Error al aplicar." }); setEstado("revisar"); return; }
      setMsg({ t: "ok", x: `✓ ${data.aplicadas} registros actualizados en la base.` });
      setEstado("idle"); setFilas([]); setFileName("");
    } catch { setMsg({ t: "error", x: "Error de conexión." }); setEstado("revisar"); }
  }

  if (!ready) return <main className="grid h-screen place-items-center" style={{ background: "var(--bg)" }}><span className="dots"><i /><i /><i /></span></main>;

  const cols = tipo === "arancel" ? ["subpartida", "descripcion", "ad_valorem", "especifico"] : ["partida", "titulo", "texto"];

  return (
    <main className="min-h-screen px-6 py-8" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--cyan)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6"><circle cx="12" cy="12" r="9" opacity=".5" /><circle cx="12" cy="12" r="4.5" /></svg>
            <span className="text-glow font-semibold tracking-wide">FERSUANADUANA · Admin</span>
          </div>
          <Link href="/app" className="mono text-xs text-[var(--muted)] hover:text-[var(--cyan)]">← Volver a la consola</Link>
        </div>

        {alertas.length > 0 && (
          <div className="hud hud-edge mb-5 p-4">
            <div className="mono mb-2 text-[11px] uppercase tracking-wider text-[var(--amber)]">Resoluciones nuevas detectadas</div>
            {alertas.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1 text-sm">
                <span className="text-[var(--fg)]">{a.referencia || a.titulo}</span>
                {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="mono text-xs text-[var(--cyan)]">ver</a>}
              </div>
            ))}
          </div>
        )}

        <div className="hud hud-edge p-6">
          <h1 className="mb-1 text-xl font-semibold text-[var(--fg)]">Actualizar base de datos</h1>
          <p className="mb-5 text-sm text-[var(--muted)]">Sube el PDF de la resolución. La IA extrae los cambios y los revisas antes de aplicar.</p>

          <div className="mb-4 flex gap-2">
            {(["arancel", "notas"] as const).map((t) => (
              <button key={t} onClick={() => { setTipo(t); setFilas([]); setMsg(null); }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tipo === t ? "bg-[rgba(56,225,255,0.12)] text-[var(--cyan)]" : "border border-[var(--line)] text-[var(--muted)]"}`}>
                {t === "arancel" ? "Arancel (tarifas)" : "Notas Explicativas"}
              </button>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--cyan)] px-5 py-2.5 font-semibold text-[var(--bg)] transition hover:brightness-110">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12" /></svg>
            Subir PDF de la resolución
            <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); }} />
          </label>
          {fileName && <span className="mono ml-3 text-[11px] text-[var(--muted)]">{fileName}</span>}

          {estado === "procesando" && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]"><span className="dots"><i /><i /><i /></span> Leyendo la resolución…</p>}
          {msg && <p className={`mt-4 text-sm ${msg.t === "error" ? "text-[var(--bad)]" : "text-[var(--good)]"}`}>{msg.x}</p>}

          {filas.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="mono text-xs text-[var(--muted)]">{filas.length} filas detectadas — revísalas</span>
                <button onClick={aplicar} disabled={estado === "aplicando"} className="rounded-xl bg-[var(--good)] px-5 py-2 font-semibold text-[var(--bg)] transition hover:brightness-110 disabled:opacity-60">
                  {estado === "aplicando" ? "Aplicando…" : "Aplicar a la base"}
                </button>
              </div>
              <div className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--line)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--surface-2,#0c1721)]">
                    <tr className="mono text-[10px] uppercase text-[var(--muted)]">{cols.map((c) => <th key={c} className="px-2 py-2 text-left">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 200).map((f, i) => (
                      <tr key={i} className="border-t border-[var(--line)]">
                        {cols.map((c) => <td key={c} className="max-w-[260px] truncate px-2 py-1.5 text-[var(--fg)]" title={String(f[c] ?? "")}>{String(f[c] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
