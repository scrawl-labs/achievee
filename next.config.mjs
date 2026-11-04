/** @type {import('next').NextConfig} */
export default {
  async redirects() {
    // the character used to be called Bori: old links still land on the new page
    return [{ source: "/bori", destination: "/mallow", permanent: true }];
  },
  async headers() {
    return [
      // the service worker file must always be re-checked, or a fixed worker would never reach users that already installed the app
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};
