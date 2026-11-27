"use client";

import Link from "next/link";
import HudBackground from "@/components/HudBackground";

const Feature = ({ icon, title, body, badge }: { icon: React.ReactNode; title: string; body: string; badge?: string }) => (
  <div className="hud hud-edge relative p-6">
    {badge && (
      <span className="absolute right-4 top-4 rounded-full bg-[rgba(56,225,255,0.12)] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[var(--cyan)]">
        {badge}
      </span>
    )}
    <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[rgba(255,179,71,0.1)] text-[var(--cyan)]">
      <span className="h-6 w-6">{icon}</span>
    </div>
    <h3 className="mb-2 text-lg font-semibold text-[var(--fg)]">{title}</h3>
    <p className="text-sm text-[var(--muted)]">{body}</p>
  </div>
);

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <HudBackground />

      {/* NAV */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pb-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <div className="flex items-center gap-2 text-[var(--cyan)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
            <circle cx="12" cy="12" r="9" opacity=".5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </svg>
          <span className="text-glow font-semibold tracking-wide">FERSUANADUANA</span>
        </div>
        <Link href="/acceso" className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--fg)] transition hover:border-[var(--cyan)] hover:text-[var(--cyan)]">
          Iniciar sesión
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <p className="mono mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--cyan)]">
          <span className="h-px w-6 bg-[var(--cyan)] opacity-60" /> Inteligencia arancelaria · Ecuador
        </p>
        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[var(--fg)] sm:text-6xl">
          Clasifica, liquida y despacha a la velocidad de la <span className="text-[var(--cyan)] text-glow">IA</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]">
          La consola arancelaria para agentes de aduana en Ecuador: subpartidas NANDINA, tributos de nacionalización y normativa, con datos oficiales del Arancel vigente.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/acceso" className="rounded-xl bg-[var(--cyan)] px-7 py-3.5 font-semibold text-[var(--bg)] transition hover:brightness-110">
            Empezar gratis
          </Link>
          <a href="#planes" className="rounded-xl border border-[var(--line)] px-7 py-3.5 font-semibold text-[var(--fg)] transition hover:border-[var(--cyan)]">
            Ver planes
          </a>
        </div>

        <div className="mono mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-[var(--muted)]">
          <span><b className="text-[var(--fg)]">6.536</b> subpartidas</span>
          <span className="opacity-40">·</span>
          <span>Arancel <b className="text-[var(--fg)]">002-2023</b></span>
          <span className="opacity-40">·</span>
          <span>IVA <b className="text-[var(--fg)]">15%</b> · FODINFA · ICE</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>}
            title="Clasificación instantánea"
            body="Busca por descripción o código y obtén la subpartida NANDINA con su tarifa ad-valorem oficial."
          />
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2.5" /><path d="M8 7h8M8 12h3M8 16h3M15 12v4" /></svg>}
            title="Liquidación de tributos"
            body="CIF, ad-valorem, FODINFA, ICE, salvaguardia e IVA. El costo nacionalizado, al instante."
          />
          <Feature
            badge="NUEVO"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>}
            title="Clasifica por foto"
            body="Sube una imagen del producto y la IA sugiere la partida correcta. (Próximamente)"
          />
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>}
            title="Consultor de normativa"
            body="Pregunta sobre regímenes, documentos y requisitos. Respuestas claras para tu despacho."
          />
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-2 text-center text-3xl font-bold text-[var(--fg)]">Planes simples</h2>
        <p className="mb-10 text-center text-[var(--muted)]">Empieza gratis. Crece cuando lo necesites.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Free */}
          <div className="hud hud-edge flex flex-col p-6">
            <div className="mono text-xs uppercase tracking-wider text-[var(--muted)]">Free</div>
            <div className="my-3 text-4xl font-bold text-[var(--fg)]">$0</div>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-[var(--muted)]">
              <li>✓ Búsqueda de partidas</li>
              <li>✓ Calculadora de tributos</li>
              <li>✓ 15 consultas al mes</li>
            </ul>
            <Link href="/acceso" className="rounded-xl border border-[var(--line)] py-2.5 text-center font-semibold text-[var(--fg)] transition hover:border-[var(--cyan)]">
              Empezar
            </Link>
          </div>
          {/* Pro */}
          <div className="hud hud-edge glow relative flex flex-col border-[var(--line-strong)] p-6">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--cyan)] px-3 py-1 text-[11px] font-bold text-[var(--bg)]">RECOMENDADO</span>
            <div className="mono text-xs uppercase tracking-wider text-[var(--cyan)]">Pro</div>
            <div className="my-3 text-4xl font-bold text-[var(--fg)]">$99<span className="text-base font-normal text-[var(--muted)]">/año</span></div>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-[var(--muted)]">
              <li>✓ Todo lo del plan Free</li>
              <li>✓ Clasificación con IA e imágenes</li>
              <li>✓ Consultas ilimitadas</li>
              <li>✓ Historial y exportar a PDF</li>
            </ul>
            <Link href="/acceso" className="rounded-xl bg-[var(--cyan)] py-2.5 text-center font-semibold text-[var(--bg)] transition hover:brightness-110">
              Probar Pro
            </Link>
          </div>
          {/* Agencia */}
          <div className="hud hud-edge flex flex-col p-6">
            <div className="mono text-xs uppercase tracking-wider text-[var(--muted)]">Agencia</div>
            <div className="my-3 text-4xl font-bold text-[var(--fg)]">$29<span className="text-base font-normal text-[var(--muted)]">/mes</span></div>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-[var(--muted)]">
              <li>✓ Todo lo del plan Pro</li>
              <li>✓ Varios usuarios</li>
              <li>✓ Soporte prioritario</li>
            </ul>
            <Link href="/acceso" className="rounded-xl border border-[var(--line)] py-2.5 text-center font-semibold text-[var(--fg)] transition hover:border-[var(--cyan)]">
              Contactar
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-balance text-3xl font-bold text-[var(--fg)]">Deja atrás las hojas de cálculo.</h2>
        <p className="mx-auto mt-3 max-w-lg text-[var(--muted)]">Clasifica y liquida con datos oficiales en una sola pantalla.</p>
        <Link href="/acceso" className="mt-7 inline-block rounded-xl bg-[var(--cyan)] px-8 py-3.5 font-semibold text-[var(--bg)] transition hover:brightness-110">
          Crear cuenta gratis
        </Link>
      </section>

      <footer className="relative z-10 border-t border-[var(--line)] py-8 text-center">
        <p className="mono text-xs text-[var(--muted)]">
          FERSUANADUANA · Ecuador · Datos del Arancel 002-2023 (referencia; verifica en el SENAE).
        </p>
      </footer>
    </main>
  );
}
