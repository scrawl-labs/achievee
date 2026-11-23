// tokens.json -> src/tokens.css. Every token becomes a --ac-* custom property; colours and shadows switch with the theme.
// Theme rules match the app: light by default, dark from the system unless [data-theme="light"], or forced by
// [data-theme="dark"] on <html> or on any element (so a page section can preview the other theme).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const t = JSON.parse(readFileSync(root + "tokens.json", "utf8"));
const v = (x, theme) => (typeof x === "string" ? x : x[theme] ?? x.light);
const themed = [...t.color.tokens, ...(t.shadow?.tokens ?? [])];
const block = (theme) => themed.map((k) => `  --ac-${k.name}: ${v(k.value, theme)};`).join("\n");
const fixed = [
  ...t.spacing.tokens.map((k) => `  --ac-${k.name}: ${k.value};`),
  ...t.radius.tokens.map((k) => `  --ac-${k.name}: ${k.value};`),
  ...Object.entries(t.type.families).map(([k, f]) => `  --ac-font-${k}: ${f};`),
].join("\n");

const css = `/* Achievee design system tokens. Generated from tokens.json by scripts/build-tokens.mjs: do not edit by hand. */
:root, [data-theme="light"] {
${block("light")}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block("dark").replace(/^/gm, "  ")}
    color-scheme: dark;
  }
}
[data-theme="dark"] {
${block("dark")}
  color-scheme: dark;
}
:root {
${fixed}
}
`;
writeFileSync(root + "src/tokens.css", css);
console.log("wrote src/tokens.css:", themed.length, "themed tokens");
