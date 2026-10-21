import type { MetadataRoute } from "next";

// Web App Manifest for browser-native PWA install (ARCHITECTURE §8).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "בדיחה לכל",
    short_name: "בדיחה לכל",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9ED",
    theme_color: "#FFF9ED",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
