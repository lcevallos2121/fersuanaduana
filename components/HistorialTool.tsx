"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { descargarExcel, type ItemClasificado, type Cabecera } from "@/lib/ecuapass";

type Registro = {
  id: string;
  created_at: string;
  numero_factura: string | null;
  proveedor: string | null;
  cabecera: Cabecera | null;
  items: ItemClasificado[] | null;
};

export default function HistorialTool() {
  const [regs, setRegs] = useState<Registro[]>([]);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");

  async function cargar() {
    if (!supabase) { setEstado("error"); return; }
    const { data, error } = await supabase
      .from("declaraciones")
      .select("id,created_at,numero_factura,proveedor,cabecera,items")
      .order("created_at", { ascending: false });
    if (error) { setEstado("error"); return; }
    setRegs((data as Registro[]) || []);
    setEstado("ok");
  }
  useEffect(() => { cargar(); }, []);

  async function borrar(id: string) {
    if (!supabase) return;
    setRegs((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("declaraciones").delete().eq("id", id);
  }

  const fecha = (s: string) => {
    try { return new Date(s).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return s; }
  };

  return (
    <div className="mx-auto flex h-[calc(100%-56px)] max-w-3xl flex-col px-8 pt-6">
      <h2 className="mb-4 font-[var(--fd)] text-xl font-semibold text-[var(--fg)]">Historial de declaraciones</h2>

      {estado === "loading" && <div className="flex items-center gap-3 text-sm text-[var(--muted)]"><span className="dots"><i /><i /><i /></span> Cargando…</div>}
      {estado === "error" && (
        <p className="text-sm text-[var(--bad)]">No se pudo cargar. Ejecuta <span className="mono">declaraciones_schema.sql</span> en Supabase e inicia sesión.</p>
      )}
      {estado === "ok" && regs.length === 0 && (
        <p className="mono mt-16 text-center text-sm text-[var(--muted)]">Aún no has guardado declaraciones. Clasifica un invoice y pulsa "Guardar en historial".</p>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
        {regs.map((r) => (
          <div key={r.id} className="hud hud-edge rise flex items-center gap-4 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="mono text-sm font-semibold text-[var(--cyan)]">Factura {r.numero_factura || "—"}</span>
                <span className="mono text-[11px] text-[var(--muted)]">· {(r.items?.length ?? 0)} ítems</span>
              </div>
              <div className="truncate text-[13px] text-[var(--muted)]">{r.proveedor || "Sin proveedor"}</div>
              <div className="mono text-[10px] text-[var(--muted)]">{fecha(r.created_at)}</div>
            </div>
            <button
              onClick={() => r.items && descargarExcel(r.items, r.cabecera || {})}
              className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--cyan)] transition hover:bg-[rgba(56,225,255,0.1)]"
            >
              Descargar
            </button>
            <button onClick={() => borrar(r.id)} title="Borrar" className="rail-btn !h-8 !w-8 text-[var(--muted)] hover:text-[var(--bad)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
