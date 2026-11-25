"use client";

import { useEffect, useState } from "react";
import { descargarExcel, type ItemClasificado, type Cabecera } from "@/lib/ecuapass";

const PLAN_KEY = "fersua-plan";
function getPlan(): string { try { return localStorage.getItem(PLAN_KEY) || "free"; } catch { return "free"; } }
function setPlanLS(p: string) { try { localStorage.setItem(PLAN_KEY, p); } catch {} }

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read-error"));
    fr.readAsDataURL(file);
  });
}

export default function InvoiceTool() {
  const [plan, setPlan] = useState("free");
  const [pay, setPay] = useState<"idle" | "form" | "procesando">("idle");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cab, setCab] = useState<Cabecera | null>(null);
  const [items, setItems] = useState<ItemClasificado[]>([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => { setPlan(getPlan()); }, []);
  const premium = plan === "premium";

  async function onFile(file: File) {
    if (!file) return;
    if (file.size > 9 * 1024 * 1024) { setErr("El archivo supera 9 MB."); return; }
    setErr(null); setItems([]); setCab(null); setFileName(file.name);
    let dataUrl: string;
    try { dataUrl = await fileToDataURL(file); } catch { setErr("No se pudo leer el archivo."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/clasificar-invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUrl, mime: file.type }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 503) { setErr("IA no configurada. Agrega AI_API_KEY en Vercel."); return; }
      if (!r.ok) { setErr(data.error || "No se pudo procesar el invoice."); return; }
      setCab(data.cabecera || {});
      setItems(data.items || []);
    } catch { setErr("Error de conexión."); }
    finally { setBusy(false); }
  }

  function editSub(i: number, v: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, subpartida: v } : it)));
  }

  function confirmarPago() {
    setPay("procesando");
    setTimeout(() => { setPlanLS("premium"); setPlan("premium"); setPay("idle"); }, 1400);
  }

  /* ---------- PANTALLA DE UPGRADE (si es free) ---------- */
  if (!premium) {
    return (
      <div className="mx-auto flex h-[calc(100%-56px)] max-w-2xl items-center justify-center px-8">
        <div className="hud hud-edge glow w-full max-w-md p-8 text-center rise">
          <div className="mono mb-3 inline-block rounded-full bg-[rgba(255,179,71,0.14)] px-3 py-1 text-[11px] font-bold tracking-wider text-[var(--amber)]">
            PREMIUM
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--fg)]">Clasificación automática de facturas</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--muted)]">
            Sube el invoice del cliente y la IA clasifica cada ítem aplicando las 6 reglas de interpretación, y te genera el Excel listo para ECUAPASS.
          </p>

          {pay === "idle" && (
            <>
              <div className="mb-6 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-[var(--cyan)]">$99</span>
                <span className="text-[var(--muted)]">/año</span>
              </div>
              <button onClick={() => setPay("form")} className="w-full rounded-xl bg-[var(--cyan)] py-3 font-semibold text-[var(--bg)] transition hover:brightness-110">
                Hazte Premium
              </button>
            </>
          )}

          {pay === "form" && (
            <div className="rise text-left">
              <div className="mb-3 rounded-lg border border-[rgba(255,179,71,0.3)] bg-[rgba(255,179,71,0.08)] px-3 py-2 text-[11px] text-[var(--amber)]">
                ⚠ Pago de demostración — no se cobra nada real.
              </div>
              <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Número de tarjeta</label>
              <input className="field mb-3 w-full px-3 py-2 text-sm" defaultValue="4242 4242 4242 4242" />
              <div className="mb-4 grid grid-cols-2 gap-3">
                <input className="field px-3 py-2 text-sm" defaultValue="12/29" />
                <input className="field px-3 py-2 text-sm" defaultValue="123" />
              </div>
              <button onClick={confirmarPago} className="w-full rounded-xl bg-[var(--cyan)] py-3 font-semibold text-[var(--bg)] transition hover:brightness-110">
                Pagar $99 (demo)
              </button>
            </div>
          )}

          {pay === "procesando" && (
            <div className="py-6">
              <span className="dots"><i /><i /><i /></span>
              <p className="mono mt-3 text-sm text-[var(--muted)]">Procesando pago…</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- HERRAMIENTA (si es premium) ---------- */
  return (
    <div className="mx-auto flex h-[calc(100%-56px)] max-w-5xl flex-col px-8 pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--cyan)] px-5 py-2.5 font-semibold text-[var(--bg)] transition hover:brightness-110">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12" /></svg>
          Subir invoice (PDF o imagen)
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>
        {items.length > 0 && (
          <button onClick={() => descargarExcel(items, cab || {})} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] px-5 py-2.5 font-semibold text-[var(--cyan)] transition hover:bg-[rgba(56,225,255,0.1)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
            Descargar Excel ECUAPASS
          </button>
        )}
      </div>

      {fileName && <p className="mono mb-2 text-[11px] text-[var(--muted)]">{fileName}</p>}
      {busy && <div className="flex items-center gap-3 text-sm text-[var(--muted)]"><span className="dots"><i /><i /><i /></span> Leyendo y clasificando los ítems…</div>}
      {err && <p className="text-sm text-[var(--bad)]">{err}</p>}
      {!busy && !err && items.length === 0 && (
        <p className="mono mt-16 text-center text-sm text-[var(--muted)]">Sube la factura del cliente. La IA extrae y clasifica cada ítem.</p>
      )}

      {cab && items.length > 0 && (
        <>
          <div className="mono mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--muted)]">
            <span>Factura <b className="text-[var(--fg)]">{cab.numero_factura || "—"}</b></span>
            <span>Proveedor <b className="text-[var(--fg)]">{(cab.proveedor || "—").slice(0, 28)}</b></span>
            <span>Origen <b className="text-[var(--fg)]">{cab.pais_origen || "—"}</b></span>
            <span>{cab.incoterm || "FOB"} · {cab.moneda || "USD"}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--line)]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--surface-2,#0c1721)]">
                <tr className="mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Descripción</th>
                  <th className="px-2 py-2 text-left">Modelo</th>
                  <th className="px-2 py-2 text-right">Cant</th>
                  <th className="px-2 py-2 text-left">Subpartida</th>
                  <th className="px-2 py-2 text-right">%</th>
                  <th className="px-2 py-2 text-left">Regla</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-[var(--line)] align-top">
                    <td className="px-2 py-2 text-[var(--muted)]">{i + 1}</td>
                    <td className="max-w-[240px] px-2 py-2">
                      <div className="truncate text-[var(--fg)]" title={it.descripcion}>{it.descripcion}</div>
                      {it.justificacion && <div className="mt-0.5 truncate text-[11px] text-[var(--muted)]" title={it.justificacion}>{it.justificacion}</div>}
                    </td>
                    <td className="mono px-2 py-2 text-[12px] text-[var(--muted)]">{it.modelo || "—"}</td>
                    <td className="mono px-2 py-2 text-right text-[var(--fg)]">{it.cantidad || 1}</td>
                    <td className="px-2 py-2">
                      <input value={it.subpartida || ""} onChange={(e) => editSub(i, e.target.value)}
                        className="field mono w-[120px] px-2 py-1 text-[13px] text-[var(--cyan)]" />
                      {it.arancel_oficial
                        ? <div className="mt-0.5 max-w-[150px] truncate text-[10px] text-[var(--good)]" title={it.arancel_oficial}>✓ {it.arancel_oficial}</div>
                        : <div className="mt-0.5 text-[10px] text-[var(--amber)]">⚠ revisar en arancel</div>}
                    </td>
                    <td className="mono px-2 py-2 text-right text-[var(--amber)]">{it.ad_valorem != null ? `${it.ad_valorem}%` : "—"}</td>
                    <td className="mono px-2 py-2 text-[11px] text-[var(--muted)]">{it.regla || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mono mt-2 pb-3 text-[11px] text-[var(--muted)]">
            Revisa y ajusta cada subpartida antes de descargar. Clasificación asistida por IA — verifica en el SENAE.
          </p>
        </>
      )}
    </div>
  );
}
