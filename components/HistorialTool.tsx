"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { descargarExcel, type ItemClasificado, type Cabecera } from "@/lib/ecuapass";

type Registro = {
  id: string;
  created_at: string;
  numero_factura: string | null;
  proveedor: string | null;
  cliente: string | null;
  cabecera: Cabecera | null;
  items: ItemClasificado[] | null;
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function HistorialTool() {
  const [regs, setRegs] = useState<Registro[]>([]);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [q, setQ] = useState("");
  const [anio, setAnio] = useState("");
  const [mes, setMes] = useState("");

  async function cargar() {
    if (!supabase) { setEstado("error"); return; }
    const { data, error } = await supabase.from("declaraciones").select("*").order("created_at", { ascending: false });
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

  const anios = useMemo(() => {
    const s = new Set<number>();
    regs.forEach((r) => { try { s.add(new Date(r.created_at).getFullYear()); } catch {} });
    return [...s].sort((a, b) => b - a);
  }, [regs]);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return regs.filter((r) => {
      const d = new Date(r.created_at);
      if (anio && d.getFullYear() !== Number(anio)) return false;
      if (mes && d.getMonth() + 1 !== Number(mes)) return false;
      if (term) {
        const blob = `${r.cliente || ""} ${r.proveedor || ""} ${r.numero_factura || ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [regs, q, anio, mes]);

  const anioActual = new Date().getFullYear();
  const esteAnio = useMemo(() => regs.filter((r) => { try { return new Date(r.created_at).getFullYear() === anioActual; } catch { return false; } }).length, [regs, anioActual]);

  const fecha = (s: string) => { try { return new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return s; } };
  const limpiar = () => { setQ(""); setAnio(""); setMes(""); };

  return (
    <div className="mx-auto flex h-[calc(100%-56px)] max-w-5xl flex-col px-4 pt-5 md:px-8 md:pt-6">
      {/* cabecera + stats */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[var(--fd)] text-xl font-semibold text-[var(--fg)]">Historial de clasificaciones</h2>
          <p className="mono text-[11px] text-[var(--muted)]">{regs.length} guardadas · {esteAnio} en {anioActual}</p>
        </div>
      </div>

      {/* filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, proveedor o factura…" className="field mono w-full py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={anio} onChange={(e) => setAnio(e.target.value)} className="field mono py-2 px-3 text-sm">
          <option value="">Todos los años</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={(e) => setMes(e.target.value)} className="field mono py-2 px-3 text-sm">
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        {(q || anio || mes) && <button onClick={limpiar} className="mono text-xs text-[var(--muted)] hover:text-[var(--cyan)]">Limpiar</button>}
      </div>

      {estado === "loading" && <div className="flex items-center gap-3 text-sm text-[var(--muted)]"><span className="dots"><i /><i /><i /></span> Cargando…</div>}
      {estado === "error" && <p className="text-sm text-[var(--bad)]">No se pudo cargar. Ejecuta <span className="mono">declaraciones_schema.sql</span> en Supabase e inicia sesión.</p>}
      {estado === "ok" && regs.length === 0 && (
        <p className="mono mt-16 text-center text-sm text-[var(--muted)]">Aún no hay clasificaciones guardadas. Clasifica un invoice y pulsa "Guardar en historial".</p>
      )}

      {estado === "ok" && regs.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--line)]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2,#0c1721)]">
              <tr className="mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <th className="px-3 py-2.5 text-left">Fecha</th>
                <th className="px-3 py-2.5 text-left">Cliente</th>
                <th className="px-3 py-2.5 text-left">Proveedor</th>
                <th className="px-3 py-2.5 text-left">Factura</th>
                <th className="px-3 py-2.5 text-right">Ítems</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-t border-[var(--line)] transition hover:bg-[rgba(56,225,255,0.04)]">
                  <td className="mono whitespace-nowrap px-3 py-2.5 text-[var(--muted)]">{fecha(r.created_at)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 font-semibold text-[var(--fg)]" title={r.cliente || ""}>{r.cliente || "—"}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-[var(--muted)]" title={r.proveedor || ""}>{r.proveedor || "—"}</td>
                  <td className="mono px-3 py-2.5 text-[var(--cyan)]">{r.numero_factura || "—"}</td>
                  <td className="mono px-3 py-2.5 text-right text-[var(--fg)]">{r.items?.length ?? 0}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => r.items && descargarExcel(r.items, r.cabecera || {})} className="rounded-lg border border-[var(--line-strong)] px-3 py-1 text-xs font-semibold text-[var(--cyan)] transition hover:bg-[rgba(56,225,255,0.1)]">Excel</button>
                      <button onClick={() => borrar(r.id)} title="Borrar" className="grid h-7 w-7 place-items-center rounded-lg text-[var(--muted)] transition hover:text-[var(--bad)]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="mono px-3 py-10 text-center text-sm text-[var(--muted)]">Sin resultados con esos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
