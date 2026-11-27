import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FERSUANADUANA — Consola Arancelaria",
    short_name: "Fersuanaduana",
    description:
      "Clasificación arancelaria con IA para agentes de aduana del Ecuador. Partidas, restricciones, declaraciones ECUAPASS y memoria de la agencia.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#04070b",
    theme_color: "#04070b",
    lang: "es-EC",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Clasificar invoice",
        short_name: "Invoice",
        description: "Sube un invoice (PDF, imagen o Excel) y clasifícalo",
        url: "/app?m=declaracion&source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Buscar partida",
        short_name: "Buscar",
        description: "Busca una subpartida en el arancel",
        url: "/app?m=buscar&source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Historial",
        short_name: "Historial",
        description: "Declaraciones guardadas",
        url: "/app?m=historial&source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
