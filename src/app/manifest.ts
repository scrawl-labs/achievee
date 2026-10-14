import type { MetadataRoute } from "next";

/** Installable web app: standalone window, the app's own colors, and icons the OS can mask (Android) or use as is. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Achievee",
    short_name: "Achievee",
    description: "Your Google Calendar and Google Tasks as daily progress, with a diary, spending and more.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e0f11",
    theme_color: "#0e0f11",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
