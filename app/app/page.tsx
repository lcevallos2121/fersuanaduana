"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseReady } from "@/lib/supabase";
import Console from "@/components/Console";

export default function AppPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      router.replace("/acceso");
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace("/acceso");
        return;
      }
      setEmail(data.session.user.email ?? undefined);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    try {
      await supabase?.auth.signOut();
    } catch {}
    router.replace("/");
  }

  if (!ready) {
    return (
      <main className="grid h-screen w-screen place-items-center" style={{ background: "var(--bg)" }}>
        <span className="dots"><i /><i /><i /></span>
      </main>
    );
  }

  return <Console userEmail={email} onLogout={logout} />;
}
