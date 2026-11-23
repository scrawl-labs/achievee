/** @type {import('next').NextConfig} */
export default {
  // the design system package ships TypeScript source; Next compiles it with the app
  transpilePackages: ["@achievee/ui"],
  async redirects() {
    // the character used to be called Bori: old links still land on the new page
    return [
      { source: "/design/voice", destination: "/design/ux-writing", permanent: true },
      { source: "/bori", destination: "/mallow", permanent: true },
      // pages still open on code from before the rename look for the old picture
      { source: "/buddy/bori.png", destination: "/mallow/mallow.webp", permanent: false },
    ];
  },
  async headers() {
    return [
      // the service worker file must always be re-checked, or a fixed worker would never reach users that already installed the app
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};
