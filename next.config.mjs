/** @type {import('next').NextConfig} */
export default {
  async headers() {
    return [
      // the service worker file must always be re-checked, or a fixed worker would never reach users that already installed the app
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};
