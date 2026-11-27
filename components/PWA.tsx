"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // --- Estado de conexión ---
    const setNet = () => setOffline(!navigator.onLine);
    setNet();
    window.addEventListener("online", setNet);
    window.addEventListener("offline", setNet);

    // --- Registro del service worker ---
    if ("serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Detecta una versión nueva esperando
            if (reg.waiting) setUpdateReady(reg.waiting);
            reg.addEventListener("updatefound", () => {
              const sw = reg.installing;
              if (!sw) return;
              sw.addEventListener("statechange", () => {
                if (sw.state === "installed" && navigator.serviceWorker.controller) {
                  setUpdateReady(sw);
                }
              });
            });
          })
          .catch(() => {});

        // Recarga cuando el nuevo SW toma control
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      };
      if (document.readyState === "complete") onLoad();
      else window.addEventListener("load", onLoad);
    }

    // --- Prompt de instalación (Android/desktop Chrome/Edge) ---
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      const dismissed = (() => {
        try {
          return localStorage.getItem("fsa_install_dismissed") === "1";
        } catch {
          return false;
        }
      })();
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
      if (!dismissed && !standalone) setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const onInstalled = () => {
      setShowInstall(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("online", setNet);
      window.removeEventListener("offline", setNet);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setShowInstall(false);
    setDeferred(null);
  }

  function dismissInstall() {
    setShowInstall(false);
    try {
      localStorage.setItem("fsa_install_dismissed", "1");
    } catch {}
  }

  function applyUpdate() {
    updateReady?.postMessage("SKIP_WAITING");
    setUpdateReady(null);
  }

  return (
    <>
      {offline && (
        <div className="pwa-toast pwa-offline" role="status">
          <span className="pwa-dot" /> Sin conexión — modo consulta local
        </div>
      )}

      {updateReady && (
        <div className="pwa-toast pwa-update" role="status">
          <span>Nueva versión disponible</span>
          <button onClick={applyUpdate}>Actualizar</button>
        </div>
      )}

      {showInstall && (
        <div className="pwa-install hud" role="dialog" aria-label="Instalar aplicación">
          <div className="pwa-install-ico" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={40} height={40} />
          </div>
          <div className="pwa-install-txt">
            <strong>Instalar FERSUANADUANA</strong>
            <span>Ábrela como app, sin navegador, con acceso directo.</span>
          </div>
          <div className="pwa-install-act">
            <button className="pwa-btn-primary" onClick={install}>
              Instalar
            </button>
            <button className="pwa-btn-ghost" onClick={dismissInstall}>
              Ahora no
            </button>
          </div>
        </div>
      )}

      <style>{`
        .pwa-toast {
          position: fixed; left: 50%; transform: translateX(-50%);
          z-index: 1000; display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 12px; font-size: 13px; letter-spacing: .03em;
          backdrop-filter: blur(10px); animation: pwaIn .25s ease;
        }
        .pwa-offline {
          bottom: 18px; background: rgba(255,107,107,.12);
          border: 1px solid rgba(255,107,107,.4); color: #ff9c9c;
        }
        .pwa-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff6b6b; box-shadow: 0 0 10px #ff6b6b; }
        .pwa-update {
          top: 18px; background: rgba(56,225,255,.1);
          border: 1px solid rgba(56,225,255,.4); color: #d6ecf5;
        }
        .pwa-update button {
          background: transparent; color: #38e1ff; border: 1px solid rgba(56,225,255,.5);
          border-radius: 8px; padding: 5px 12px; font-size: 12px; cursor: pointer;
          text-transform: uppercase; letter-spacing: .06em;
        }
        .pwa-update button:hover { background: rgba(56,225,255,.12); }

        .pwa-install {
          position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
          z-index: 1001; width: min(420px, calc(100vw - 32px));
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          animation: pwaIn .3s ease;
        }
        .pwa-install-ico img { border-radius: 10px; display: block; }
        .pwa-install-txt { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .pwa-install-txt strong { font-size: 14px; color: #eaf6fb; letter-spacing: .04em; }
        .pwa-install-txt span { font-size: 12px; color: #5f7d8c; }
        .pwa-install-act { display: flex; flex-direction: column; gap: 6px; }
        .pwa-btn-primary {
          background: rgba(56,225,255,.14); color: #9fe9ff; border: 1px solid rgba(56,225,255,.5);
          border-radius: 9px; padding: 7px 14px; font-size: 12px; cursor: pointer;
          text-transform: uppercase; letter-spacing: .07em; white-space: nowrap;
        }
        .pwa-btn-primary:hover { background: rgba(56,225,255,.22); box-shadow: 0 0 20px rgba(56,225,255,.2); }
        .pwa-btn-ghost {
          background: transparent; color: #5f7d8c; border: none; font-size: 11px;
          cursor: pointer; text-transform: uppercase; letter-spacing: .06em;
        }
        .pwa-btn-ghost:hover { color: #9fb4c0; }

        @keyframes pwaIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </>
  );
}
