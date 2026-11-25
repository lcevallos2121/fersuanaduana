"use client";

import { useEffect, useState } from "react";

const KEY = "fersua-onboarded-v1";

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
    ),
    title: "Clasifica en segundos",
    body: "Escribe la descripción de la mercancía o el código NANDINA. Te mostramos la subpartida y su tarifa ad-valorem oficial.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2.5" /><path d="M8 7h8M8 12h3M8 16h3M15 12v4" /></svg>
    ),
    title: "Liquida los tributos",
    body: "Ingresa FOB, flete y seguro. Calculamos CIF, ad-valorem, FODINFA, ICE, salvaguardia e IVA, y el costo nacionalizado.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
    ),
    title: "Consulta la normativa",
    body: "Pregunta sobre regímenes, documentos o requisitos. El asistente te responde al instante.",
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  }

  if (!show) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(2,6,10,0.78)] px-6 backdrop-blur-sm">
      <div className="hud hud-edge glow rise w-full max-w-md p-7 text-center">
        <div className="mono mb-5 text-[11px] tracking-[0.3em] text-[var(--muted)]">
          BIENVENIDO · {i + 1}/{STEPS.length}
        </div>
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-soft,rgba(255,179,71,0.12))] text-[var(--cyan)] text-glow">
          <span className="h-8 w-8">{step.icon}</span>
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-[var(--fg)]">{step.title}</h2>
        <p className="mx-auto mb-7 max-w-sm text-[15px] text-[var(--muted)]">{step.body}</p>

        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, k) => (
            <span
              key={k}
              className="h-1.5 rounded-full transition-all"
              style={{ width: k === i ? 22 : 7, background: k === i ? "var(--cyan)" : "var(--line-strong)" }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={close} className="mono text-xs text-[var(--muted)] hover:text-[var(--fg)]">
            Saltar
          </button>
          <button
            onClick={() => (last ? close() : setI(i + 1))}
            className="rounded-xl bg-[var(--cyan)] px-6 py-2.5 font-semibold text-[var(--bg)] transition hover:brightness-110"
          >
            {last ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
