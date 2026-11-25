"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HudBackground from "./HudBackground";
import Onboarding from "./Onboarding";
import { buscarArancel, supabaseReady } from "@/lib/supabase";
import { liquidar, usd, type Entrada } from "@/lib/tributos";
import type { Arancel } from "@/lib/types";

type Mode = "buscar" | "calcular" | "consultar";

/* ---------- iconos ---------- */
const I = {
  mark: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...p}>
      <circle cx="12" cy="12" r="9" opacity=".5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  ),
  search: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" {...p}>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  calc: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" {...p}>
      <rect x="4" y="2" width="16" height="20" rx="2.5" /><path d="M8 7h8M8 12h3M8 16h3M15 12v4" />
    </svg>
  ),
  chat: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  send: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  ),
  bolt: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  ),
};

/* ---------- número animado ---------- */
function Animated({ value, className }: { value: number; className?: string }) {
  const [disp, setDisp] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisp(value); from.current = value; return; }
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 550);
      const e = 1 - Math.pow(1 - k, 3);
      setDisp(a + (value - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{usd(disp)}</span>;
}

export default function Console({ userEmail, onLogout }: { userEmail?: string; onLogout?: () => void }) {
  const [mode, setMode] = useState<Mode>("buscar");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Arancel[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Arancel | null>(null);
  const [calc, setCalc] = useState<Entrada>({ fob: 1000, flete: 150, seguro: 20, adValorem: 15, iva: 15, ice: 0, salvaguardia: 0 });

  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  /* búsqueda con debounce */
  useEffect(() => {
    if (!supabaseReady) { setSearchErr("Conecta tu Supabase (variables de entorno)."); return; }
    setSearchErr(null);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const data = await buscarArancel(q, 25);
        setResults(data);
      } catch {
        setSearchErr("Error de búsqueda. Revisa el esquema SQL en Supabase.");
        setResults([]);
      } finally { setSearching(false); }
    }, 320);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chat, chatBusy]);

  const liq = useMemo(() => liquidar(calc), [calc]);

  function pick(a: Arancel) {
    setSelected(a);
    if (a.ad_valorem != null) setCalc((c) => ({ ...c, adValorem: Number(a.ad_valorem) }));
  }
  function liquidarDesde(a: Arancel) { pick(a); setMode("calcular"); }

  async function enviarConsulta(text: string) {
    const q = text.trim();
    if (!q || chatBusy) return;
    const next = [...chat, { role: "user" as const, content: q }];
    setChat(next); setChatInput(""); setChatBusy(true);
    try {
      const r = await fetch("/api/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (r.status === 503) { setChat((c) => [...c, { role: "assistant", content: "⚠ IA no configurada. Agrega AI_API_KEY en las variables de entorno." }]); return; }
      const data = await r.json();
      setChat((c) => [...c, { role: "assistant", content: data.text || "Sin respuesta." }]);
    } catch {
      setChat((c) => [...c, { role: "assistant", content: "No se pudo contactar la IA." }]);
    } finally { setChatBusy(false); }
  }

  const tributos = [
    { k: "Ad-valorem", v: liq.adValorem, c: "var(--cyan)" },
    { k: "FODINFA", v: liq.fodinfa, c: "var(--amber)" },
    { k: "ICE", v: liq.ice, c: "#8b5cf6" },
    { k: "Salvaguardia", v: liq.salvaguardia, c: "#ff6b6b" },
    { k: "IVA", v: liq.iva, c: "var(--good)" },
  ].filter((x) => x.v > 0);
  let acc = 0;
  const donut = tributos
    .map((t) => {
      const start = (acc / (liq.totalTributos || 1)) * 360;
      acc += t.v;
      const end = (acc / (liq.totalTributos || 1)) * 360;
      return `${t.c} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <HudBackground />
      <Onboarding />

      {/* aviso PC */}
      <div className="fixed inset-0 z-50 hidden max-[940px]:flex items-center justify-center bg-[var(--bg)] px-8 text-center">
        <div className="hud hud-edge glow max-w-xs p-6">
          <div className="mono text-sm tracking-widest text-[var(--cyan)]">FERSUANADUANA</div>
          <p className="mt-3 text-[var(--muted)]">Consola optimizada para escritorio. Ábrela en PC.</p>
        </div>
      </div>

      <div className="relative z-10 flex h-full">
        {/* rail */}
        <nav className="flex w-[70px] flex-none flex-col items-center gap-2 border-r border-[var(--line)] py-5">
          <div className="mb-4 grid h-10 w-10 place-items-center text-[var(--cyan)] text-glow">
            <I.mark className="h-7 w-7" />
          </div>
          <button className="rail-btn" data-active={mode === "buscar"} onClick={() => setMode("buscar")} title="Clasificar">
            <I.search className="h-5 w-5" />
          </button>
          <button className="rail-btn" data-active={mode === "calcular"} onClick={() => setMode("calcular")} title="Liquidar">
            <I.calc className="h-5 w-5" />
          </button>
          <button className="rail-btn" data-active={mode === "consultar"} onClick={() => setMode("consultar")} title="Consultar IA">
            <I.chat className="h-5 w-5" />
          </button>
          <div className="mt-auto flex flex-col items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${supabaseReady ? "bg-[var(--good)]" : "bg-[var(--bad)]"} blink`} />
            <span className="mono text-[9px] text-[var(--muted)]">EC</span>
          </div>
        </nav>

        {/* contenido */}
        <section className="relative flex-1 overflow-hidden">
          {/* encabezado minimal */}
          <div className="flex items-center justify-between px-8 pt-6">
            <div className="mono text-xs tracking-[0.35em] text-[var(--muted)]">
              FERSUANADUANA <span className="text-[var(--cyan)]">/</span> {mode === "buscar" ? "CLASIFICACIÓN" : mode === "calcular" ? "LIQUIDACIÓN" : "CONSULTA"}
            </div>
            <div className="flex items-center gap-3">
              <span className="mono hidden text-[11px] text-[var(--muted)] sm:inline">ARANCEL 002-2023</span>
              {userEmail && (
                <span className="mono max-w-[160px] truncate text-[11px] text-[var(--muted)]" title={userEmail}>{userEmail}</span>
              )}
              {onLogout && (
                <button onClick={onLogout} title="Cerrar sesión" className="rail-btn !h-8 !w-8 text-[var(--muted)] hover:text-[var(--cyan)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* ---- BUSCAR ---- */}
          {mode === "buscar" && (
            <div className="flex h-[calc(100%-56px)] flex-col px-8 pt-8">
              <div className="relative mx-auto w-full max-w-2xl">
                <I.search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  autoFocus
                  className="cmd mono py-4 pl-14 pr-5 text-lg"
                  placeholder="describe la mercancía o escribe el código…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {searching && <span className="dots absolute right-6 top-1/2 -translate-y-1/2"><i /><i /><i /></span>}
              </div>

              <div className="mx-auto mt-6 w-full max-w-2xl flex-1 overflow-y-auto pb-6 pr-1">
                {searchErr && <p className="mono mt-10 text-center text-sm text-[var(--bad)]">{searchErr}</p>}
                {!searchErr && query.trim().length < 2 && (
                  <p className="mono mt-16 text-center text-sm text-[var(--muted)]">
                    6.536 subpartidas · busca por texto o código NANDINA
                  </p>
                )}
                {!searchErr && query.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="mono mt-10 text-center text-sm text-[var(--muted)]">Sin coincidencias.</p>
                )}
                <div className="flex flex-col gap-2">
                  {results.map((a, i) => (
                    <div
                      key={a.subpartida}
                      className="row-result rise flex items-center gap-4 p-3"
                      data-sel={selected?.subpartida === a.subpartida}
                      style={{ animationDelay: `${Math.min(i, 10) * 0.025}s` }}
                      onClick={() => pick(a)}
                    >
                      <div className="mono text-base font-semibold text-[var(--cyan)]">{a.subpartida}</div>
                      <div className="min-w-0 flex-1 truncate text-[15px] text-[var(--fg)]">{a.descripcion}</div>
                      <div className="mono text-right text-sm">
                        <span className="text-[var(--amber)]">{a.ad_valorem != null ? `${a.ad_valorem}%` : "—"}</span>
                        {a.especifico && <span className="ml-1 text-[10px] text-[var(--muted)]">+esp</span>}
                      </div>
                      <button
                        className="rail-btn !h-8 !w-8 text-[var(--muted)] hover:text-[var(--cyan)]"
                        title="Liquidar"
                        onClick={(e) => { e.stopPropagation(); liquidarDesde(a); }}
                      >
                        <I.bolt className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- CALCULAR ---- */}
          {mode === "calcular" && (
            <div className="grid h-[calc(100%-56px)] grid-cols-2 gap-6 px-8 pb-8 pt-6">
              {/* entradas */}
              <div className="hud hud-edge flex flex-col p-6">
                {selected ? (
                  <div className="mb-5 flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[rgba(56,225,255,0.05)] p-3">
                    <div className="mono text-sm font-semibold text-[var(--cyan)]">{selected.subpartida}</div>
                    <div className="min-w-0 flex-1 truncate text-sm text-[var(--fg)]">{selected.descripcion}</div>
                  </div>
                ) : (
                  <p className="mb-5 mono text-xs text-[var(--muted)]">Sin partida seleccionada · ingresa los valores</p>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {([["fob", "FOB"], ["flete", "Flete"], ["seguro", "Seguro"]] as const).map(([k, lbl]) => (
                    <Num key={k} label={lbl} prefix="$" value={calc[k]} onChange={(v) => setCalc((c) => ({ ...c, [k]: v }))} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {([["adValorem", "Arancel"], ["iva", "IVA"], ["ice", "ICE"], ["salvaguardia", "Salvag."]] as const).map(([k, lbl]) => (
                    <Num key={k} label={lbl} suffix="%" value={calc[k]} onChange={(v) => setCalc((c) => ({ ...c, [k]: v }))} />
                  ))}
                </div>
                <p className="mono mt-auto pt-5 text-[11px] text-[var(--muted)]">FODINFA 0,5% incluido automáticamente.</p>
              </div>

              {/* resultado */}
              <div className="hud hud-edge glow flex flex-col items-center justify-center p-6">
                <div className="relative grid place-items-center">
                  <div
                    className="h-44 w-44 rounded-full"
                    style={{ background: donut ? `conic-gradient(${donut})` : "rgba(56,225,255,0.1)" }}
                  />
                  <div className="absolute grid h-32 w-32 place-items-center rounded-full bg-[var(--bg)] text-center">
                    <div>
                      <div className="mono text-[10px] tracking-widest text-[var(--muted)]">TRIBUTOS</div>
                      <Animated value={liq.totalTributos} className="mono text-xl font-bold text-[var(--cyan)]" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="mono text-[10px] tracking-[0.3em] text-[var(--muted)]">COSTO NACIONALIZADO</div>
                  <Animated value={liq.costoNacionalizado} className="mono text-4xl font-bold text-[var(--fg)] text-glow" />
                  <div className="mono mt-1 text-xs text-[var(--muted)]">CIF {usd(liq.cif)}</div>
                </div>

                <div className="mt-6 grid w-full grid-cols-2 gap-x-6 gap-y-1">
                  {tributos.map((t) => (
                    <div key={t.k} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-[var(--muted)]">
                        <span className="h-2 w-2 rounded-full" style={{ background: t.c }} />{t.k}
                      </span>
                      <span className="mono text-[var(--fg)]">{usd(t.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- CONSULTAR ---- */}
          {mode === "consultar" && (
            <div className="mx-auto flex h-[calc(100%-56px)] max-w-2xl flex-col px-8 pb-6 pt-6">
              <div ref={chatRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
                {chat.length === 0 && (
                  <p className="mono mt-20 text-center text-sm text-[var(--muted)]">Pregunta sobre regímenes, documentos o normativa aduanera.</p>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={`rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] ${
                        m.role === "user"
                          ? "border border-[var(--line-strong)] bg-[rgba(56,225,255,0.08)]"
                          : "border border-[var(--line)] bg-[rgba(8,16,24,0.6)]"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatBusy && <div className="dots pl-2"><i /><i /><i /></div>}
              </div>
              <form
                className="mt-4 flex items-center gap-3"
                onSubmit={(e) => { e.preventDefault(); enviarConsulta(chatInput); }}
              >
                <input
                  className="cmd mono flex-1 py-3 px-5"
                  placeholder="escribe tu consulta…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="grid h-11 w-11 flex-none place-items-center rounded-full border border-[var(--line-strong)] text-[var(--cyan)] hover:bg-[rgba(56,225,255,0.1)]">
                  <I.send className="h-5 w-5" />
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------- campo numérico ---------- */
function Num({
  label, value, onChange, prefix, suffix,
}: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <label className="block">
      <span className="mono mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <div className="relative">
        {prefix && <span className="mono pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">{prefix}</span>}
        <input
          type="number"
          min={0}
          step="0.01"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`field mono py-2 text-sm ${prefix ? "pl-6" : "pl-2.5"} ${suffix ? "pr-6" : "pr-2.5"}`}
        />
        {suffix && <span className="mono pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">{suffix}</span>}
      </div>
    </label>
  );
}
