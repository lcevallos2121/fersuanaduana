"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, supabaseReady } from "@/lib/supabase";

export default function AccesoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  function destino() {
    if (typeof window === "undefined") return "/app";
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") ? n : "/app";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady || !supabase) {
      setMsg({ type: "error", text: "Autenticación no configurada." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push(destino());
        } else {
          setMsg({ type: "ok", text: "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión." });
          setTab("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(destino());
      }
    } catch (err: any) {
      const raw = String(err?.message || "");
      const text = /invalid login/i.test(raw)
        ? "Correo o contraseña incorrectos."
        : /already registered/i.test(raw)
        ? "Ese correo ya tiene cuenta. Inicia sesión."
        : /confirm/i.test(raw)
        ? "Confirma tu correo antes de iniciar sesión."
        : raw || "Ocurrió un error. Inténtalo de nuevo.";
      setMsg({ type: "error", text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 pb-10 pt-[calc(env(safe-area-inset-top)+2.5rem)]" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2 text-[var(--cyan)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
            <circle cx="12" cy="12" r="9" opacity=".5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </svg>
          <span className="text-glow font-semibold tracking-wide">FERSUANADUANA</span>
        </Link>

        <div className="hud hud-edge p-7">
          <div className="mb-6 flex rounded-xl border border-[var(--line)] p-1">
            <button
              type="button"
              onClick={() => { setTab("signup"); setMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === "signup" ? "bg-[rgba(56,225,255,0.1)] text-[var(--cyan)]" : "text-[var(--muted)]"}`}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => { setTab("login"); setMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === "login" ? "bg-[rgba(56,225,255,0.1)] text-[var(--cyan)]" : "text-[var(--muted)]"}`}
            >
              Iniciar sesión
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="block">
              <span className="mono mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Correo</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="field px-3 py-2.5 text-sm" placeholder="tu@correo.com" />
            </label>
            <label className="block">
              <span className="mono mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Contraseña</span>
              <input type="password" required minLength={6} autoComplete={tab === "signup" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="field px-3 py-2.5 text-sm" placeholder="mínimo 6 caracteres" />
            </label>

            {msg && (
              <p className={`text-sm ${msg.type === "error" ? "text-[var(--bad)]" : "text-[var(--good)]"}`}>{msg.text}</p>
            )}

            <button type="submit" disabled={busy}
              className="mt-1 rounded-xl bg-[var(--cyan)] py-3 font-semibold text-[var(--bg)] transition hover:brightness-110 disabled:opacity-60">
              {busy ? "Un momento…" : tab === "signup" ? "Crear cuenta gratis" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mono mt-5 text-center text-[11px] text-[var(--muted)]">
          Al continuar aceptas usar la herramienta como referencia; verifica siempre en el SENAE.
        </p>
      </div>
    </main>
  );
}
