// Achievee DS Builder — a development plugin that finishes the design system in the
// "Achievee Design System" Figma file without the MCP call limit. Every step is idempotent:
// it skips what already exists, and a step that fails removes what it half-made, so it can be run again.
figma.showUI(__html__, { width: 440, height: 500 });
const log = (s) => figma.ui.postMessage({ s });

const IDS = {
  light: "VariableCollectionId:2:71", dark: "VariableCollectionId:2:93", size: "VariableCollectionId:2:115",
  cover: "2:138", foundations: "2:138", screens: "0:1", components: "2:139",
  button: "3:146", iconButton: "3:184", checkbox: "3:201", chip: "4:40", field: "4:47", select: "4:72",
};
const hex = (h) => ({ r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 });

let L = {}, DK = {}, S = {}, T = {}, PR = {}, STY = {}, EFX = {};
async function loadVars(id) {
  const c = await figma.variables.getVariableCollectionByIdAsync(id);
  const m = {};
  if (!c) return m;
  for (const vid of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(vid); if (v) m[v.name] = v; }
  return m;
}
async function refresh() {
  L = await loadVars(IDS.light); DK = await loadVars(IDS.dark); S = await loadVars(IDS.size);
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const tc = cols.find((c) => c.name === "Typography"); T = tc ? await loadVars(tc.id) : {};
  const pc = cols.find((c) => c.name === "Primitives"); PR = pc ? await loadVars(pc.id) : {};
  STY = Object.fromEntries((await figma.getLocalTextStylesAsync()).map((s) => [s.name, s]));
  EFX = Object.fromEntries((await figma.getLocalEffectStylesAsync()).map((s) => [s.name, s]));
}

// ---------- helpers ----------
const SP = { 4: "spacing/space-1", 8: "spacing/space-2", 12: "spacing/space-3", 16: "spacing/space-4", 24: "spacing/space-5", 32: "spacing/space-6", 48: "spacing/space-7" };
function num(n, field, v) { const k = SP[v]; if (k && S[k]) n.setBoundVariable(field, S[k]); else n[field] = v; }
function pad(n, t, r = t, b = t, l = r) { num(n, "paddingTop", t); num(n, "paddingRight", r); num(n, "paddingBottom", b); num(n, "paddingLeft", l); }
function gap(n, v) { num(n, "itemSpacing", v); }
function rad(n, v) {
  if (typeof v === "string") { for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) n.setBoundVariable(k, S["radius/" + v]); }
  else n.cornerRadius = v;
}
function paint(v, op) {
  if (!v) throw new Error("variable not found");
  return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: op == null ? 1 : op }, "color", v);
}
function fill(n, name, op, set) { const v = (set || L)[name]; if (!v) throw new Error("no color " + name); n.fills = [paint(v, op)]; }
function stroke(n, name, w, align) { n.strokes = [paint(L[name])]; n.strokeWeight = w; n.strokeAlign = align || "INSIDE"; }
function al(name, dir, o) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name; f.layoutMode = dir; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO"; f.fills = []; f.clipsContent = false;
  if (o.gap != null) gap(f, o.gap);
  if (o.pad) pad(f, ...o.pad);
  if (o.align) f.counterAxisAlignItems = o.align;
  if (o.justify) f.primaryAxisAlignItems = o.justify;
  return f;
}
function autoComp(name, dir, o) {
  o = o || {};
  const c = figma.createComponent();
  c.name = name; c.layoutMode = dir; c.fills = []; c.clipsContent = false;
  if (o.width) { c.resize(o.width, 40); if (dir === "HORIZONTAL") { c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; } else { c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED"; } }
  else { c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO"; }
  if (o.gap != null) gap(c, o.gap);
  if (o.pad) pad(c, ...o.pad);
  if (o.align) c.counterAxisAlignItems = o.align;
  if (o.justify) c.primaryAxisAlignItems = o.justify;
  return c;
}
async function txt(chars, style, color, o) {
  o = o || {};
  const st = STY[style];
  if (!st) throw new Error("no text style " + style);
  const t = figma.createText();
  await figma.loadFontAsync(st.fontName);
  t.fontName = st.fontName;
  t.characters = chars;
  await t.setTextStyleIdAsync(st.id);
  if (o.raw) t.fills = [{ type: "SOLID", color: o.raw }];
  else t.fills = [paint((o.set || L)[color], o.op)];
  t.name = o.name || chars;
  return t;
}
function add(parent, child, h, v) { parent.appendChild(child); if (h) child.layoutSizingHorizontal = h; if (v) child.layoutSizingVertical = v; return child; }
function wrapText(t) { t.textAutoResize = "HEIGHT"; }
function absolute(parent, node, x, y, w, h, cons) {
  parent.appendChild(node); node.layoutPositioning = "ABSOLUTE";
  node.x = x; node.y = y; node.resize(w, h); node.constraints = cons;
}
function parseName(name) {
  const o = {};
  for (const part of name.split(",")) { const i = part.indexOf("="); if (i > 0) o[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return o;
}
/** The variant of a set whose properties match `want` (each value may be a list of acceptable values, first match wins). */
function pick(set, want) {
  if (!set || set.type !== "COMPONENT_SET") return null;
  let best = null, bestScore = -1;
  for (const c of set.children) {
    if (c.type !== "COMPONENT") continue;
    const p = parseName(c.name); let score = 0, ok = true;
    for (const k in want) {
      const opts = [].concat(want[k]);
      const i = opts.indexOf(p[k]);
      if (i < 0) { if (k in p) ok = false; continue; }
      score += 10 - i;
    }
    if (ok && score > bestScore) { best = c; bestScore = score; }
  }
  return best || set.defaultVariant;
}
function propKey(owner, prefix, type) {
  const d = owner.componentPropertyDefinitions;
  return Object.keys(d).find((k) => k.split("#")[0] === prefix && (!type || d[k].type === type))
    || Object.keys(d).find((k) => k.toLowerCase().startsWith(prefix.toLowerCase()) && (!type || d[k].type === type));
}
function wire(owner, layerName, field, key) {
  const roots = owner.type === "COMPONENT_SET" ? owner.children : [owner];
  let n = 0;
  // own layers only: layers inside a nested instance belong to that instance's component
  const own = (r) => { const out = []; const walk = (x) => { for (const ch of x.children || []) { if (ch.name === layerName) out.push(ch); if (ch.type !== "INSTANCE") walk(ch); } }; walk(r); return out; };
  for (const r of roots) for (const node of own(r)) {
    node.componentPropertyReferences = Object.assign({}, node.componentPropertyReferences || {}, { [field]: key }); n++;
  }
  return n;
}
function tint(inst, name) {
  for (const n of inst.findAll((x) => ["VECTOR", "BOOLEAN_OPERATION", "ELLIPSE", "RECTANGLE", "LINE", "POLYGON", "STAR"].includes(x.type))) {
    if (n.strokes && n.strokes.length) n.strokes = [paint(L[name])];
    if (n.fills && n.fills.length && n.fills[0].type === "SOLID") n.fills = [paint(L[name])];
  }
}
function combine(comps, name, parent, width, desc) {
  const set = figma.combineAsVariants(comps, parent);
  set.name = name;
  set.layoutMode = "HORIZONTAL"; set.layoutWrap = "WRAP";
  set.itemSpacing = 24; set.counterAxisSpacing = 24;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 32;
  set.counterAxisAlignItems = "MIN";
  set.resize(width || 880, set.height);
  set.primaryAxisSizingMode = "FIXED"; set.counterAxisSizingMode = "AUTO";
  fill(set, "background/canvas");
  set.cornerRadius = 16;
  if (desc) set.description = desc;
  return set;
}

// ---------- steps ----------
async function stepTokens() {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const all = await figma.variables.getLocalVariablesAsync();
  const find = (name, colId) => all.find((v) => v.name === name && v.variableCollectionId === colId);
  let prim = cols.find((c) => c.name === "Primitives");
  if (!prim) prim = figma.variables.createVariableCollection("Primitives");
  prim.renameMode(prim.modes[0].modeId, "Value");
  prim.hiddenFromPublishing = true;
  const pm = prim.modes[0].modeId;
  const P = {
    "stone/0": "ffffff", "stone/50": "f6f5f2", "stone/100": "f0efeb", "stone/150": "efeee9", "stone/200": "e7e5e0", "stone/400": "a8a6a0", "stone/500": "8d8a83", "stone/600": "6b6861", "stone/700": "5c5a55", "stone/800": "2e2d2a", "stone/850": "242422", "stone/900": "1a1917", "stone/920": "191918", "stone/950": "0f0f0e",
    "indigo/50": "eceefe", "indigo/200": "c0c7ff", "indigo/300": "9aa5ff", "indigo/400": "8b96ff", "indigo/500": "4a5bf0", "indigo/600": "3442c9", "indigo/900": "262a52", "indigo/950": "0e1030",
    "green/300": "5fd394", "green/700": "1a7d48", "red/300": "ff7b7f", "red/600": "c9353b", "red/950": "2a0607",
    "petal/pink": "fb78a2", "petal/peach": "ffb199", "petal/butter": "ffd980", "petal/mint": "9be3b4", "petal/lilac": "c3a6ff", "petal/sky": "8fb8ff",
  };
  const pv = {};
  for (const [n, h] of Object.entries(P)) {
    const v = find(n, prim.id) || figma.variables.createVariable(n, prim, "COLOR");
    v.setValueForMode(pm, hex(h)); v.scopes = []; pv[n] = v;
  }
  const ren = [["accent", "accent/normal"], ["bg", "background/canvas"], ["surface", "background/surface"], ["surface-sunk", "background/sunk"], ["line", "border/line"], ["ink", "foreground/normal"], ["ink-2", "foreground/alternative"], ["ink-3", "foreground/hint"], ["on-accent", "accent/on-accent"], ["accent-soft", "accent/soft"], ["accent-ink", "accent/on-soft"], ["focus", "focus/ring"]];
  const map = {
    light: { "background/canvas": "stone/50", "background/surface": "stone/0", "background/sunk": "stone/100", "border/line": "stone/200", "foreground/normal": "stone/900", "foreground/alternative": "stone/700", "foreground/hint": "stone/600", "accent/normal": "indigo/500", "accent/on-accent": "stone/0", "accent/soft": "indigo/50", "accent/on-soft": "indigo/600", "focus/ring": "indigo/500", "status/good": "green/700", "status/danger": "red/600", "status/on-danger": "stone/0" },
    dark: { "background/canvas": "stone/950", "background/surface": "stone/920", "background/sunk": "stone/850", "border/line": "stone/800", "foreground/normal": "stone/150", "foreground/alternative": "stone/400", "foreground/hint": "stone/500", "accent/normal": "indigo/400", "accent/on-accent": "indigo/950", "accent/soft": "indigo/900", "accent/on-soft": "indigo/200", "focus/ring": "indigo/300", "status/good": "green/300", "status/danger": "red/300", "status/on-danger": "red/950" },
  };
  for (const n of ["pink", "peach", "butter", "mint", "lilac", "sky"]) { map.light["petal/" + n] = "petal/" + n; map.dark["petal/" + n] = "petal/" + n; }
  const out = [];
  for (const [cid, key] of [[IDS.light, "light"], [IDS.dark, "dark"]]) {
    const col = await figma.variables.getVariableCollectionByIdAsync(cid);
    const mode = col.modes[0].modeId;
    for (const [a, b] of ren) { const v = find(a, cid); if (v) v.name = b; }
    let n = 0;
    for (const id of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      const p = map[key][v.name];
      if (p) { v.setValueForMode(mode, { type: "VARIABLE_ALIAS", id: pv[p].id }); n++; }
    }
    out.push(key + " " + n + "개 연결");
  }
  const size = await figma.variables.getVariableCollectionByIdAsync(IDS.size);
  const sm = size.modes[0].modeId;
  const D = { "dimension/control-sm": 32, "dimension/control": 40, "dimension/control-lg": 44, "dimension/chip": 34, "dimension/tab-pill": 36, "dimension/icon-button": 36, "dimension/icon-button-sm": 30, "dimension/select-sm": 28, "dimension/check": 20 };
  for (const [n, val] of Object.entries(D)) { const v = find(n, size.id) || figma.variables.createVariable(n, size, "FLOAT"); v.setValueForMode(sm, val); v.scopes = ["WIDTH_HEIGHT"]; }
  return "원시 색 " + Object.keys(P).length + "개, " + out.join(", ") + ", 크기 " + Object.keys(D).length + "개";
}

async function stepStyles() {
  const NEW = [
    ["Text/body-medium", "Medium", 15, 22, "Row and event titles."],
    ["Text/body-strong", "Bold", 15, 22, "Amounts at the end of a row."],
    ["Text/tab", "Medium", 14, 20, "Line tabs."],
    ["Text/tab-strong", "Bold", 14, 20, "The chosen line tab."],
    ["Text/label-strong", "Bold", 13, 18, "The chosen segment."],
    ["Text/caption-strong", "Bold", 12, 16, "Event badges (D-2), flags."],
    ["Text/preview", "Regular", 14, 22, "Two-line previews of an entry."],
    ["Text/dialog-title", "Bold", 17, 24, "Dialog titles."],
    ["Text/count", "Bold", 17, 20, "The number in a DayFlower."],
  ];
  let made = 0;
  for (const [name, style, size, lh, desc] of NEW) {
    if (STY[name]) continue;
    await figma.loadFontAsync({ family: "Noto Sans KR", style });
    const s = figma.createTextStyle();
    s.name = name; s.fontName = { family: "Noto Sans KR", style }; s.fontSize = size; s.lineHeight = { unit: "PIXELS", value: lh }; s.description = desc;
    made++;
  }
  if (!EFX["Shadow/raised"]) {
    const e = figma.createEffectStyle();
    e.name = "Shadow/raised"; e.description = "The chosen part of a segment control.";
    e.effects = [{ type: "DROP_SHADOW", color: { r: 26 / 255, g: 25 / 255, b: 23 / 255, a: 0.14 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: "NORMAL" }];
    made++;
  }
  await refresh();
  return "새 스타일 " + made + "개";
}

async function stepTypography() {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  let typo = cols.find((c) => c.name === "Typography");
  if (!typo) typo = figma.variables.createVariableCollection("Typography");
  typo.renameMode(typo.modes[0].modeId, "Value");
  const tm = typo.modes[0].modeId;
  const existing = await loadVars(typo.id);
  const get = (name, type) => existing[name] || (existing[name] = figma.variables.createVariable(name, typo, type));
  const fam = get("font-family/sans", "STRING"); fam.setValueForMode(tm, "Noto Sans KR"); fam.scopes = ["FONT_FAMILY"]; fam.setVariableCodeSyntax("WEB", "var(--ac-font-sans)");
  const famD = get("font-family/display", "STRING"); famD.setValueForMode(tm, "Noto Sans KR"); famD.scopes = ["FONT_FAMILY"]; famD.setVariableCodeSyntax("WEB", "var(--ac-font-display)");
  let n = 0;
  for (const s of Object.values(STY)) {
    await figma.loadFontAsync(s.fontName);
    const key = s.name.split("/").pop();
    const fs = get("typography/" + key + "/font-size", "FLOAT"); fs.setValueForMode(tm, s.fontSize); fs.scopes = ["FONT_SIZE"];
    const lh = get("typography/" + key + "/line-height", "FLOAT");
    lh.setValueForMode(tm, s.lineHeight.unit === "PIXELS" ? s.lineHeight.value : Math.round(s.fontSize * 1.45)); lh.scopes = ["LINE_HEIGHT"];
    s.setBoundVariable("fontSize", fs);
    s.setBoundVariable("lineHeight", lh);
    s.setBoundVariable("fontFamily", s.name.startsWith("Display") ? famD : fam);
    n++;
  }
  await refresh();
  return "텍스트 스타일 " + n + "개에 글꼴·크기·줄간격 변수 연결";
}

/** Property names like the code: lowercase; disabled on its own axis; hover/focus marked "state(design only)". */
async function stepRenameProps() {
  const done = [];
  for (const id of [IDS.button, IDS.iconButton, IDS.checkbox, IDS.chip, IDS.field, IDS.select]) {
    const set = await figma.getNodeByIdAsync(id);
    if (!set || set.type !== "COMPONENT_SET") { done.push(id + " 없음"); continue; }
    if (set.children.some((c) => c.name.includes("state(design only)") || c.name.includes("disabled="))) { done.push(set.name + " 이미 정리됨"); continue; }
    const names = set.children.map((c) => {
      const p = parseName(c.name), out = [];
      let hasState = false, disabled = "false", state = "default";
      for (const [k0, v0] of Object.entries(p)) {
        const k = k0.toLowerCase(), v = v0.toLowerCase();
        if (k === "state") { hasState = true; if (v === "disabled") disabled = "true"; else state = v === "pressed" ? "active" : v; }
        else out.push(k + "=" + v);
      }
      if (hasState) { out.push("disabled=" + disabled); out.push("state(design only)=" + state); }
      return out.join(", ");
    });
    if (new Set(names).size !== names.length) { done.push(set.name + " 건너뜀(이름 겹침)"); continue; }
    set.children.forEach((c, i) => { c.name = names[i]; });
    done.push(set.name);
  }
  return done.join(", ");
}

// ---------- components ----------
let PAGE, HAVE, ICONS, col = { x: 0, y: 0 };
async function compsPage() {
  PAGE = await figma.getNodeByIdAsync(IDS.components);
  await PAGE.loadAsync();
  await figma.setCurrentPageAsync(PAGE);
  HAVE = {};
  for (const n of PAGE.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] })) if (!(n.parent && n.parent.type === "COMPONENT_SET")) HAVE[n.name] = n;
  ICONS = PAGE.findAllWithCriteria({ types: ["COMPONENT"] }).filter((c) => c.name.startsWith("Icon/"));
  let right = 0;
  for (const n of PAGE.children) right = Math.max(right, n.x + n.width);
  const placed = PAGE.children.find((n) => n.type === "SECTION" && n.name.startsWith("2 · "));
  if (placed) { // continue the column started on an earlier run
    let bottom = 0, x = placed.x;
    for (const n of PAGE.children) if (n.type === "SECTION" && n.name.startsWith("2 · ")) { bottom = Math.max(bottom, n.y + n.height); x = n.x; }
    col = { x, y: bottom + 120 };
  } else col = { x: right + 400, y: 0 };
}
const icon = (name) => ICONS.find((c) => c.name === "Icon/" + name) || ICONS[0];
function iconInst(name, size, color) {
  const i = icon(name).createInstance();
  i.name = "Icon"; if (i.width !== size) i.rescale(size / i.width);
  if (color) tint(i, color);
  return i;
}
function place(title, nodes, note) {
  const sec = figma.createSection();
  sec.name = "2 · " + title;
  PAGE.appendChild(sec);
  let y = 80, w = 0;
  for (const n of nodes) { sec.appendChild(n); n.x = 48; n.y = y; y += n.height + 64; w = Math.max(w, n.width); }
  sec.resizeWithoutConstraints(w + 96, y + 16);
  sec.x = col.x; sec.y = col.y; col.y += sec.height + 120;
  return sec;
}
async function build(name, fn) {
  if (HAVE[name]) { log("· " + name + " 이미 있음"); return HAVE[name]; }
  const before = new Set(PAGE.children.map((n) => n.id));
  try {
    const r = await fn();
    HAVE[name] = r;
    log("✓ " + name);
    return r;
  } catch (e) {
    for (const n of [...PAGE.children]) if (!before.has(n.id)) n.remove();
    log("✗ " + name + ": " + (e && e.message ? e.message : e));
    console.error(e);
    return null;
  }
}

async function cSlot() {
  const c = autoComp(".slot/Content", "VERTICAL", { align: "CENTER", justify: "CENTER" });
  c.resize(312, 96); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED";
  fill(c, "background/sunk"); rad(c, "control");
  stroke(c, "border/line", 1); c.dashPattern = [4, 4];
  c.appendChild(await txt("내용 자리 · Content 속성으로 바꾸기", "Text/caption", "foreground/hint", { name: "Hint" }));
  c.description = "Slot placeholder. Swap it for real content with the parent's Content property.";
  place("Slot", [c]);
  return c;
}

async function cSurface(slot) {
  const make = async (flush) => {
    const c = autoComp("flush=" + flush, "VERTICAL", { width: 360 });
    if (!flush) { pad(c, 24); gap(c, 16); } else { c.clipsContent = true; }
    fill(c, "background/surface"); rad(c, "surface");
    await c.setEffectStyleIdAsync(EFX["Shadow/surface"].id);
    const s = slot.createInstance(); s.name = "Content"; add(c, s, "FILL");
    return c;
  };
  const comps = [await make(false), await make(true)];
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "Surface", PAGE, 880, "The one container for a group of content, lifted by a shadow (no border). Inside it, at most one sunk layer. flush: no padding, for lists of rows.");
  const k = set.addComponentProperty("Content", "INSTANCE_SWAP", slot.id);
  wire(set, "Content", "mainComponent", k);
  place("Surface", [set]);
  return set;
}

async function tabItem(variant, selected, state) {
  const c = autoComp(`variant=${variant}, selected=${selected}, state(design only)=${state}`, "HORIZONTAL", { align: "CENTER", justify: "CENTER" });
  let style, color;
  if (variant === "line") {
    pad(c, 6, 0, 6, 0);
    style = selected ? "Text/tab-strong" : "Text/tab"; color = selected ? "foreground/normal" : "foreground/hint";
    if (selected) { c.strokes = [paint(L["foreground/normal"])]; c.strokeAlign = "INSIDE"; c.strokeTopWeight = 0; c.strokeLeftWeight = 0; c.strokeRightWeight = 0; c.strokeBottomWeight = 2; }
  } else if (variant === "pill") {
    c.resize(80, 36); c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
    if (S["dimension/tab-pill"]) c.setBoundVariable("height", S["dimension/tab-pill"]);
    pad(c, 0, 16, 0, 16); rad(c, "pill");
    fill(c, selected ? "foreground/normal" : "background/sunk");
    style = "Text/chip"; color = selected ? "background/surface" : "foreground/alternative";
  } else {
    pad(c, 6, 12, 6, 12); c.cornerRadius = 8;
    style = selected ? "Text/label-strong" : "Text/label"; color = selected ? "foreground/normal" : "foreground/alternative";
    if (selected) { fill(c, "background/surface"); await c.setEffectStyleIdAsync(EFX["Shadow/raised"].id); }
  }
  c.appendChild(await txt("일", style, color, { name: "Label" }));
  if (state === "focus") {
    const r = figma.createRectangle(); r.name = "Focus ring"; r.fills = [];
    absolute(c, r, -4, -4, c.width + 8, c.height + 8, { horizontal: "STRETCH", vertical: "STRETCH" });
    stroke(r, "focus/ring", 2); r.cornerRadius = variant === "pill" ? 999 : variant === "segment" ? 11 : 6;
  }
  return c;
}

async function cTabs() {
  const comps = [];
  for (const v of ["line", "pill", "segment"]) for (const sel of [false, true]) for (const st of ["default", "focus"]) comps.push(await tabItem(v, sel, st));
  for (const c of comps) PAGE.appendChild(c);
  const item = combine(comps, "Tabs.Item", PAGE, 880, "One tab. Use inside Tabs; selected is the shown view. Keyboard: arrows, Home, End (state is code-driven, so hover/focus are design-only).");
  const lk = item.addComponentProperty("Label", "TEXT", "일");
  wire(item, "Label", "characters", lk);
  const labels = { line: ["목록", "캘린더", "통계"], pill: ["일기", "소비", "일정"], segment: ["일", "주", "월"] };
  const groups = [];
  for (const v of ["line", "pill", "segment"]) {
    const c = autoComp("variant=" + v, "HORIZONTAL", { align: "CENTER" });
    if (v === "line") c.itemSpacing = 18;
    if (v === "pill") gap(c, 8);
    if (v === "segment") { c.itemSpacing = 0; pad(c, 3); c.cornerRadius = 10; fill(c, "background/sunk"); }
    labels[v].forEach((l, i) => {
      const inst = pick(item, { variant: v, selected: i === 0 ? "true" : "false", "state(design only)": "default" }).createInstance();
      inst.name = "Tab " + (i + 1);
      c.appendChild(inst);
      inst.setProperties({ [lk]: l });
      if (v === "segment") { inst.layoutSizingHorizontal = "FIXED"; inst.resize(64, inst.height); }
    });
    groups.push(c);
  }
  for (const c of groups) PAGE.appendChild(c);
  const tabs = combine(groups, "Tabs", PAGE, 880, "Switches views inside one screen (2–5 short labels), not app navigation. line: in-app sections. pill: a few big choices (landing). segment: how the same data is drawn (day / week / month).");
  place("Tabs", [tabs, item]);
  return tabs;
}

async function cTag() {
  const make = async (size) => {
    const c = autoComp("size=" + size, "HORIZONTAL", { align: "CENTER", gap: 4 });
    if (size === "md") pad(c, 2, 8, 2, 8); else pad(c, 4, 12, 4, 12);
    rad(c, "pill"); fill(c, "accent/soft");
    const st = size === "lg" ? "Text/chip" : "Text/caption";
    c.appendChild(await txt("기쁨", st, "foreground/normal", { name: "Label" }));
    c.appendChild(await txt("×2", st, "foreground/hint", { name: "Count" }));
    return c;
  };
  const comps = [await make("md"), await make("lg")];
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "Tag", PAGE, 480, "A word shown, not picked (emotion words on an entry). Use Chip when it can be pressed. Count shows ×n.");
  wire(set, "Label", "characters", set.addComponentProperty("Label", "TEXT", "기쁨"));
  wire(set, "Count", "characters", set.addComponentProperty("Count", "TEXT", "×2"));
  wire(set, "Count", "visible", set.addComponentProperty("Show count", "BOOLEAN", true));
  place("Tag", [set]);
  return set;
}

async function cDayHeader() {
  const c = autoComp("DayHeader", "HORIZONTAL", { width: 360, justify: "SPACE_BETWEEN", align: "CENTER", pad: [12, 4, 6, 4], gap: 8 });
  c.appendChild(await txt("11월 22일 (토)", "Text/caption", "foreground/hint", { name: "Day" }));
  c.appendChild(await txt("₩24,000", "Text/caption", "foreground/hint", { name: "Total" }));
  wire(c, "Day", "characters", c.addComponentProperty("Day", "TEXT", "11월 22일 (토)"));
  wire(c, "Total", "characters", c.addComponentProperty("Total", "TEXT", "₩24,000"));
  wire(c, "Total", "visible", c.addComponentProperty("Show total", "BOOLEAN", true));
  c.description = "The day and its total above a group of rows.";
  return c;
}

async function listRow(flag, tone, state, iconBtn) {
  const c = autoComp(`flag=${flag}, tone=${tone}, state(design only)=${state}`, "HORIZONTAL", { width: 360, align: "CENTER", gap: 12, pad: [12, 16, 12, 16] });
  c.fills = state === "hover" ? [paint(L["background/sunk"], 0.5)] : [];
  c.appendChild(iconInst("wallet", 20, "foreground/alternative"));
  const text = al("Text", "VERTICAL"); add(c, text, "FILL");
  const title = await txt("점심 · 김치찌개", "Text/body-medium", "foreground/normal", { name: "Title" });
  add(text, title, "FILL"); wrapText(title); title.textTruncation = "ENDING"; title.maxLines = 1;
  const meta = al("Meta", "HORIZONTAL", { gap: 6 }); text.appendChild(meta);
  meta.appendChild(await txt("식비", "Text/caption", "foreground/hint", { name: "Category" }));
  if (flag) meta.appendChild(await txt("불필요", "Text/caption-strong", "status/danger", { name: "Flag" }));
  c.appendChild(await txt("₩9,000", "Text/body-strong", tone === "good" ? "status/good" : "foreground/normal", { name: "Amount" }));
  const actions = al("Actions", "HORIZONTAL", { gap: 4 });
  for (const ic of ["edit", "close"]) {
    const b = (pick(iconBtn, { size: "sm", disabled: "false", "state(design only)": "default" }) || iconBtn.defaultVariant).createInstance();
    b.name = ic === "edit" ? "Edit" : "Delete";
    const k = propKey(iconBtn, "Icon", "INSTANCE_SWAP");
    if (k) b.setProperties({ [k]: icon(ic).id });
    actions.appendChild(b);
  }
  c.appendChild(actions);
  if (flag) { const e = figma.createRectangle(); e.name = "Flag edge"; absolute(c, e, 0, 0, 3, c.height, { horizontal: "MIN", vertical: "STRETCH" }); fill(e, "status/danger"); }
  const d = figma.createRectangle(); d.name = "Divider"; absolute(c, d, 0, 0, 360, 1, { horizontal: "STRETCH", vertical: "MIN" }); fill(d, "border/line");
  return c;
}

async function cListRow() {
  const iconBtn = await figma.getNodeByIdAsync(IDS.iconButton);
  const comps = [];
  for (const flag of [false, true]) for (const tone of ["default", "good"]) for (const st of ["default", "hover"]) comps.push(await listRow(flag, tone, st, iconBtn));
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "ListRow", PAGE, 1240, "One record on one line: icon, title, a small line (category, flag), the amount. flag: marked 불필요 with a red edge and the word. Actions appear on hover or when the row is tapped open. Stack rows in a flush Surface and turn Divider on for every row after the first.");
  wire(set, "Title", "characters", set.addComponentProperty("Title", "TEXT", "점심 · 김치찌개"));
  wire(set, "Category", "characters", set.addComponentProperty("Category", "TEXT", "식비"));
  wire(set, "Flag", "characters", set.addComponentProperty("Flag", "TEXT", "불필요"));
  wire(set, "Amount", "characters", set.addComponentProperty("Amount", "TEXT", "₩9,000"));
  const iconKey = set.addComponentProperty("Icon", "INSTANCE_SWAP", icon("wallet").id, { preferredValues: ICONS.map((i) => ({ type: "COMPONENT", key: i.key })) });
  wire(set, "Icon", "mainComponent", iconKey);
  wire(set, "Icon", "visible", set.addComponentProperty("Show icon", "BOOLEAN", true));
  wire(set, "Meta", "visible", set.addComponentProperty("Show meta", "BOOLEAN", true));
  wire(set, "Amount", "visible", set.addComponentProperty("Show amount", "BOOLEAN", true));
  wire(set, "Actions", "visible", set.addComponentProperty("Show actions", "BOOLEAN", false));
  wire(set, "Divider", "visible", set.addComponentProperty("Divider", "BOOLEAN", false));
  for (const v of set.children) for (const n of v.findAll((x) => x.name === "Actions" || x.name === "Divider")) n.visible = false;
  const head = await cDayHeader();
  PAGE.appendChild(head);
  // an example group: header + flush surface of rows
  const list = al("Example · List", "VERTICAL", { gap: 0 });
  list.appendChild(head.createInstance());
  const box = al("List", "VERTICAL"); box.resize(360, 10); box.counterAxisSizingMode = "FIXED"; box.primaryAxisSizingMode = "AUTO"; box.clipsContent = true;
  fill(box, "background/surface"); rad(box, "surface"); await box.setEffectStyleIdAsync(EFX["Shadow/surface"].id);
  list.appendChild(box);
  const rows = [{ flag: "false", tone: "default", t: "점심 · 김치찌개", a: "₩9,000", k: "식비" }, { flag: "true", tone: "default", t: "택시", a: "₩14,800", k: "교통" }, { flag: "false", tone: "good", t: "중고 판매", a: "+₩30,000", k: "수입" }];
  rows.forEach((r, i) => {
    const inst = pick(set, { flag: r.flag, tone: r.tone, "state(design only)": "default" }).createInstance();
    add(box, inst, "FILL");
    const props = {};
    props[propKey(set, "Title", "TEXT")] = r.t; props[propKey(set, "Amount", "TEXT")] = r.a; props[propKey(set, "Category", "TEXT")] = r.k;
    if (i > 0) props[propKey(set, "Divider", "BOOLEAN")] = true;
    inst.setProperties(props);
  });
  PAGE.appendChild(list);
  place("ListRow", [set, head, list]);
  return set;
}

async function eventRow(tone, bt) {
  const own = tone === "own";
  const c = autoComp(`tone=${tone}, badgeTone=${bt}`, "HORIZONTAL", { width: 320, align: "CENTER", gap: 12, pad: [6, 12, 6, 6] });
  c.cornerRadius = 12;
  if (own) fill(c, "accent/normal"); else { stroke(c, "border/line", 1); c.clipsContent = true; }
  const badge = al("Badge", "HORIZONTAL", { justify: "CENTER", align: "CENTER" });
  pad(badge, 4, 6, 4, 6); badge.cornerRadius = 7; try { badge.minWidth = 46; } catch (e) { /* older editors: no min width */ }
  let bFill, bText;
  if (own) { bFill = bt === "default" ? ["accent/on-accent", 0.22] : ["accent/on-accent", 1]; bText = bt === "default" ? "accent/on-accent" : "accent/normal"; }
  else { bFill = ["background/sunk", 1]; bText = bt === "now" ? "accent/normal" : "foreground/alternative"; }
  fill(badge, bFill[0], bFill[1]);
  badge.appendChild(await txt("D-2", "Text/caption-strong", bText, { name: "Badge label" }));
  c.appendChild(badge);
  const text = al("Text", "VERTICAL"); add(c, text, "FILL");
  const title = await txt("팀 회의", "Text/body-medium", own ? "accent/on-accent" : "foreground/alternative", { name: "Title" });
  add(text, title, "FILL"); wrapText(title); title.textTruncation = "ENDING"; title.maxLines = 1;
  const meta = await txt("11월 24일 (월) 14:00", "Text/caption", own ? "accent/on-accent" : "foreground/hint", { name: "Meta", op: own ? 0.8 : undefined });
  add(text, meta, "FILL"); wrapText(meta); meta.textTruncation = "ENDING"; meta.maxLines = 1;
  if (!own) { const e = figma.createRectangle(); e.name = "Calendar color"; absolute(c, e, 0, 0, 3, c.height, { horizontal: "MIN", vertical: "STRETCH" }); fill(e, "petal/sky"); }
  return c;
}

async function cEventRow() {
  const comps = [];
  for (const tone of ["own", "external"]) for (const bt of ["default", "now", "soon"]) comps.push(await eventRow(tone, bt));
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "EventRow", PAGE, 1100, "One upcoming event: badge (D-2, 오늘), title, day and time. own: ours, filled with the accent. external: from another calendar, outlined, with that calendar's colour on the left edge (swap the Calendar color fill). badgeTone now = today, soon = tomorrow.");
  wire(set, "Badge label", "characters", set.addComponentProperty("Badge", "TEXT", "D-2"));
  wire(set, "Title", "characters", set.addComponentProperty("Title", "TEXT", "팀 회의"));
  wire(set, "Meta", "characters", set.addComponentProperty("Meta", "TEXT", "11월 24일 (월) 14:00"));
  wire(set, "Badge", "visible", set.addComponentProperty("Show badge", "BOOLEAN", true));
  wire(set, "Meta", "visible", set.addComponentProperty("Show meta", "BOOLEAN", true));
  place("EventRow", [set]);
  return set;
}

async function entry(open, current, tagSet, buttonSet) {
  const c = autoComp(`open=${open}, current=${current}`, "VERTICAL", { width: 360 });
  fill(c, "background/surface"); rad(c, "surface");
  await c.setEffectStyleIdAsync(EFX["Shadow/surface"].id);
  if (current) stroke(c, "accent/normal", 1.5);
  const head = al("Head", "VERTICAL", { gap: 4, pad: [12, 16, 12, 16] }); add(c, head, "FILL");
  const top = al("Top", "HORIZONTAL", { gap: 8, align: "CENTER", justify: "SPACE_BETWEEN" }); add(head, top, "FILL");
  top.appendChild(await txt("11월 22일 토요일", "Text/heading", "foreground/normal", { name: "Title" }));
  const aside = al("Aside", "HORIZONTAL", { gap: 8, align: "CENTER" });
  const mood = al("Mood", "HORIZONTAL", { gap: 4, align: "CENTER" });
  for (const p of ["petal/pink", "petal/butter", "petal/mint"]) { const d = figma.createEllipse(); d.resize(8, 8); fill(d, p); mood.appendChild(d); }
  aside.appendChild(mood);
  const chev = iconInst("right", 16, "foreground/hint"); chev.name = "Chevron";
  aside.appendChild(chev);
  if (open) chev.rotation = -90;
  top.appendChild(aside);
  const tags = al("Tags", "HORIZONTAL", { gap: 6 });
  for (const w of ["기쁨", "설렘"]) { const t = tagSet.defaultVariant.createInstance(); tags.appendChild(t); t.setProperties({ [propKey(tagSet, "Label", "TEXT")]: w, [propKey(tagSet, "Show count", "BOOLEAN")]: false }); }
  head.appendChild(tags);
  const preview = await txt("오늘은 발표가 생각보다 잘 끝났다. 끝나고 팀이랑 점심을 먹으면서 다음 분기 이야기를 했는데, 다들 같은 걸 걱정하고 있어서 조금 안심이 됐다.", "Text/preview", open ? "foreground/normal" : "foreground/alternative", { name: "Preview" });
  add(head, preview, "FILL"); wrapText(preview);
  if (!open) { preview.textTruncation = "ENDING"; preview.maxLines = 2; }
  if (open) {
    const body = al("Body", "VERTICAL", { gap: 12, pad: [0, 16, 12, 16] }); add(c, body, "FILL");
    const b = pick(buttonSet, { variant: ["ghost", "quiet", "default"], size: "sm", disabled: "false", "state(design only)": "default" }).createInstance();
    b.name = "Edit"; body.appendChild(b);
    const lk = propKey(buttonSet, "Label", "TEXT"); if (lk) b.setProperties({ [lk]: "수정" });
    const ik = propKey(buttonSet, "Show icon", "BOOLEAN"); if (ik) b.setProperties({ [ik]: false });
  }
  return c;
}

async function cEntryCard(tagSet) {
  const buttonSet = await figma.getNodeByIdAsync(IDS.button);
  const comps = [];
  for (const open of [false, true]) for (const cur of [false, true]) comps.push(await entry(open, cur, tagSet, buttonSet));
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "EntryCard", PAGE, 880, "A past entry (a diary day, a weekly review) that opens in place. Closed: title, mood dots, tags and two lines of preview. Open: the preview in full, then more (an Edit button). current: the entry the editor above is showing, outlined with the accent.");
  wire(set, "Title", "characters", set.addComponentProperty("Title", "TEXT", "11월 22일 토요일"));
  wire(set, "Preview", "characters", set.addComponentProperty("Preview", "TEXT", "오늘은 발표가 생각보다 잘 끝났다. 끝나고 팀이랑 점심을 먹으면서 다음 분기 이야기를 했는데, 다들 같은 걸 걱정하고 있어서 조금 안심이 됐다."));
  wire(set, "Tags", "visible", set.addComponentProperty("Show tags", "BOOLEAN", true));
  wire(set, "Mood", "visible", set.addComponentProperty("Show mood", "BOOLEAN", true));
  place("EntryCard", [set]);
  return set;
}

async function cDialog() {
  const buttonSet = await figma.getNodeByIdAsync(IDS.button);
  const c = autoComp("ConfirmDialog", "VERTICAL", { width: 360, gap: 8, pad: [24, 24, 24, 24] });
  fill(c, "background/surface"); rad(c, "surface");
  await c.setEffectStyleIdAsync(EFX["Shadow/float"].id);
  const title = await txt("이 기록을 지울까요?", "Text/dialog-title", "foreground/normal", { name: "Title" }); add(c, title, "FILL"); wrapText(title);
  const detail = al("Detail", "HORIZONTAL", { pad: [10, 12, 10, 12] }); add(c, detail, "FILL"); fill(detail, "background/sunk"); rad(detail, "control");
  const dt = await txt("점심 · 김치찌개 ₩9,000", "Text/chip", "foreground/normal", { name: "Detail text" }); add(detail, dt, "FILL"); wrapText(dt);
  const note = await txt("지운 기록은 되돌릴 수 없어요.", "Text/caption", "foreground/hint", { name: "Note" }); add(c, note, "FILL"); wrapText(note);
  const actions = al("Actions", "HORIZONTAL", { gap: 8, pad: [12, 0, 0, 0] }); add(c, actions, "FILL");
  const lk = propKey(buttonSet, "Label", "TEXT"), ik = propKey(buttonSet, "Show icon", "BOOLEAN");
  for (const [name, variant, label] of [["Cancel", ["default", "secondary", "neutral"], "취소"], ["Confirm", ["danger"], "지우기"]]) {
    const b = pick(buttonSet, { variant, size: "md", disabled: "false", "state(design only)": "default" }).createInstance();
    b.name = name; actions.appendChild(b);
    b.resize(b.width, 44);
    if (S["dimension/control-lg"]) b.setBoundVariable("height", S["dimension/control-lg"]);
    b.layoutSizingHorizontal = "FILL";
    const props = {}; if (lk) props[lk] = label; if (ik) props[ik] = false; b.setProperties(props);
    b.isExposedInstance = true;
  }
  wire(c, "Title", "characters", c.addComponentProperty("Title", "TEXT", "이 기록을 지울까요?"));
  wire(c, "Detail text", "characters", c.addComponentProperty("Detail", "TEXT", "점심 · 김치찌개 ₩9,000"));
  wire(c, "Note", "characters", c.addComponentProperty("Note", "TEXT", "지운 기록은 되돌릴 수 없어요."));
  wire(c, "Detail", "visible", c.addComponentProperty("Show detail", "BOOLEAN", true));
  wire(c, "Note", "visible", c.addComponentProperty("Show note", "BOOLEAN", true));
  c.description = "Asks before something is removed for good. Cancel is focused first; Escape, Cancel and a tap outside keep it. Shown over a 45% black dim.";
  PAGE.appendChild(c);
  // example: on the dim
  const dim = figma.createFrame(); dim.name = "Example · On dim"; dim.resize(440, 340);
  dim.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.45 }]; dim.cornerRadius = 16;
  const inst = c.createInstance(); dim.appendChild(inst); inst.x = 40; inst.y = (340 - inst.height) / 2;
  PAGE.appendChild(dim);
  place("ConfirmDialog", [c, dim]);
  return c;
}

async function flower(level) {
  const c = figma.createComponent(); c.name = "level=" + level; c.resize(44, 44); c.fills = []; c.clipsContent = false;
  const pts = [0, 1, 2, 3, 4, 5].map((i) => [22 + 11 * Math.cos((i * Math.PI) / 3), 22 + 11 * Math.sin((i * Math.PI) / 3)]);
  const shapes = () => {
    const out = pts.map(([x, y]) => { const e = figma.createEllipse(); e.resize(15, 15); e.x = x - 7.5; e.y = y - 7.5; c.appendChild(e); return e; });
    const m = figma.createEllipse(); m.resize(22, 22); m.x = 11; m.y = 11; c.appendChild(m); out.push(m);
    return out;
  };
  const body = figma.union(shapes(), c); body.name = "Body"; fill(body, "background/sunk");
  const tintOp = [0, 0.4, 0.7, 1, 1][level];
  const t = figma.union(shapes(), c); t.name = "Tint"; fill(t, level === 4 ? "petal/mint" : "petal/pink", tintOp);
  if (level === 0) t.visible = false;
  const n = await txt("3", "Text/count", "foreground/alternative", level === 0 ? { name: "Count" } : { name: "Count", raw: { r: 42 / 255, g: 34 / 255, b: 48 / 255 } });
  c.appendChild(n); n.textAutoResize = "NONE"; n.resize(44, 44); n.x = 0; n.y = 0; n.textAlignHorizontal = "CENTER"; n.textAlignVertical = "CENTER";
  // boolean shapes have no constraints of their own; their circles do
  const scale = (k) => { if ("constraints" in k) k.constraints = { horizontal: "SCALE", vertical: "SCALE" }; else for (const ch of k.children || []) scale(ch); };
  for (const k of c.children) scale(k);
  return c;
}

async function cDayFlower() {
  const comps = [];
  for (const l of [0, 1, 2, 3, 4]) comps.push(await flower(l));
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "DayFlower", PAGE, 480, "How much of a day's plan got done, as the logo's flower. level 0 (nothing) to 3 (all, pink); 4 = a goal met (mint). Count = how many were done; hide it when nothing was planned. Scale the instance for other sizes.");
  wire(set, "Count", "characters", set.addComponentProperty("Count", "TEXT", "3"));
  wire(set, "Count", "visible", set.addComponentProperty("Show count", "BOOLEAN", true));
  place("DayFlower", [set]);
  return set;
}

// ---------- foundations & cover ----------
async function stepFoundations() {
  const page = await figma.getNodeByIdAsync(IDS.foundations);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  if (page.children.some((n) => n.name === "Foundations · Tokens")) return "이미 있음";
  let right = 0; for (const n of page.children) right = Math.max(right, n.x + n.width);
  const root = al("Foundations · Tokens", "VERTICAL", { gap: 56, pad: [64, 64, 64, 64] });
  fill(root, "background/canvas"); root.cornerRadius = 24;
  page.appendChild(root); root.x = right ? right + 200 : 0; root.y = 0;
  const head = al("Header", "VERTICAL", { gap: 8 }); root.appendChild(head);
  head.appendChild(await txt("Foundations", "Display/display-1", "foreground/normal"));
  head.appendChild(await txt("색은 두 층: Primitives(숨김) → Light / Dark 의미 변수. 코드에서는 var(--ac-*)로 씁니다.", "Text/body", "foreground/alternative"));
  const section = async (title, note) => {
    const s = al(title, "VERTICAL", { gap: 16 }); root.appendChild(s);
    s.appendChild(await txt(title, "Text/title", "foreground/normal"));
    if (note) s.appendChild(await txt(note, "Text/caption", "foreground/hint"));
    return s;
  };
  const wrap = (name) => { const w = al(name, "HORIZONTAL", { gap: 16 }); w.layoutWrap = "WRAP"; w.counterAxisSpacing = 24; w.resize(1312, 10); w.primaryAxisSizingMode = "FIXED"; w.counterAxisSizingMode = "AUTO"; return w; };
  const aliasName = async (v, set) => {
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    const val = v.valuesByMode[col.modes[0].modeId];
    if (val && val.type === "VARIABLE_ALIAS") { const a = await figma.variables.getVariableByIdAsync(val.id); return a ? a.name : "?"; }
    return "";
  };
  // semantic colors
  const sem = await section("Color · 의미", "왼쪽 Light, 오른쪽 Dark. 이름 아래는 코드 변수와 원시 색.");
  const groups = {};
  for (const name of Object.keys(L)) (groups[name.split("/")[0]] = groups[name.split("/")[0]] || []).push(name);
  for (const [g, names] of Object.entries(groups)) {
    const row = wrap("Color · " + g); sem.appendChild(row);
    for (const name of names) {
      const card = al(name, "VERTICAL", { gap: 6 });
      const sw = al("Swatch", "HORIZONTAL"); sw.clipsContent = true; sw.cornerRadius = 10; stroke(sw, "border/line", 1);
      for (const set of [L, DK]) { const r = figma.createRectangle(); r.resize(100, 64); r.fills = set[name] ? [paint(set[name])] : []; sw.appendChild(r); }
      card.appendChild(sw);
      card.appendChild(await txt(name, "Text/label", "foreground/normal"));
      card.appendChild(await txt((L[name].codeSyntax.WEB || "") , "Text/caption", "foreground/hint"));
      card.appendChild(await txt((await aliasName(L[name])) + " · " + (DK[name] ? await aliasName(DK[name]) : ""), "Text/caption", "foreground/hint"));
      row.appendChild(card);
    }
  }
  // primitives
  const pr = await section("Color · Primitives", "직접 쓰지 않습니다. 의미 변수만 이걸 가리킵니다.");
  const prow = wrap("Primitives"); pr.appendChild(prow);
  for (const [name, v] of Object.entries(PR)) {
    const card = al(name, "VERTICAL", { gap: 4 });
    const r = figma.createRectangle(); r.resize(88, 56); r.cornerRadius = 8; r.fills = [paint(v)]; stroke(r, "border/line", 1); card.appendChild(r);
    card.appendChild(await txt(name, "Text/caption", "foreground/alternative"));
    prow.appendChild(card);
  }
  // type
  const SAMPLES = { "display-1": "11월 22일", "display-2": "₩83,550", title: "2026년 11월", heading: "오늘 할 일", writing: "오늘은 발표가 생각보다 잘 끝났다.", body: "은행 서류 제출", label: "오늘 마음은", caption: "38자 · 저장됨", button: "저장", chip: "식비", count: "3" };
  const ty = await section("Typography", "Noto Sans KR (Pretendard 대체). 크기와 줄간격은 Typography 변수에 연결돼 있습니다.");
  for (const s of Object.values(STY)) {
    const row = al(s.name, "HORIZONTAL", { gap: 24, align: "CENTER" });
    const meta = al("Meta", "VERTICAL", { gap: 2 }); meta.resize(240, 10); meta.counterAxisSizingMode = "FIXED"; meta.primaryAxisSizingMode = "AUTO";
    meta.appendChild(await txt(s.name, "Text/label", "foreground/normal"));
    meta.appendChild(await txt(s.fontName.style + " · " + s.fontSize + "/" + (s.lineHeight.value || "auto"), "Text/caption", "foreground/hint"));
    row.appendChild(meta);
    row.appendChild(await txt(SAMPLES[s.name.split("/").pop()] || "가나다 Achievee 123", s.name, "foreground/normal"));
    ty.appendChild(row);
  }
  // spacing, radius, shadow
  const sp = await section("Spacing · Radius · Shadow");
  const spRow = al("Spacing", "VERTICAL", { gap: 8 }); sp.appendChild(spRow);
  for (const [name, v] of Object.entries(S)) {
    if (!name.startsWith("spacing/")) continue;
    const val = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
    const row = al(name, "HORIZONTAL", { gap: 16, align: "CENTER" });
    const lb = await txt(name.replace("spacing/", "") + " · " + val, "Text/caption", "foreground/alternative"); row.appendChild(lb); lb.textAutoResize = "NONE"; lb.resize(120, 16);
    const bar = figma.createRectangle(); bar.resize(val, 16); bar.cornerRadius = 3; fill(bar, "accent/normal"); row.appendChild(bar);
    spRow.appendChild(row);
  }
  const tiles = al("Radius & Shadow", "HORIZONTAL", { gap: 24 }); sp.appendChild(tiles);
  for (const r of ["control", "surface", "pill"]) {
    const card = al("radius/" + r, "VERTICAL", { gap: 6 });
    const box = figma.createRectangle(); box.resize(r === "pill" ? 120 : 96, r === "pill" ? 40 : 96); fill(box, "background/sunk"); rad(box, r); card.appendChild(box);
    card.appendChild(await txt("radius/" + r, "Text/caption", "foreground/alternative")); tiles.appendChild(card);
  }
  for (const e of ["Shadow/surface", "Shadow/float", "Shadow/raised"]) {
    if (!EFX[e]) continue;
    const card = al(e, "VERTICAL", { gap: 6 });
    const box = figma.createRectangle(); box.resize(160, 96); fill(box, "background/surface"); rad(box, "surface"); await box.setEffectStyleIdAsync(EFX[e].id); card.appendChild(box);
    card.appendChild(await txt(e, "Text/caption", "foreground/alternative")); tiles.appendChild(card);
  }
  return "색 " + Object.keys(L).length + " · 원시 " + Object.keys(PR).length + " · 글꼴 " + Object.keys(STY).length;
}

const COVER_JPG = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGiEcFxgfGRQUHScdHyIjJSUlFhwpLCgkKyEkJST/2wBDAQYGBgkICREJCREkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCT/wAARCARsAogDASIAAhEBAxEB/8QAHAABAAMBAQEBAQAAAAAAAAAAAAECAwQFBgcI/8QATBAAAgEDAQUEBwUGAwYDCAMAAAECAwQRIQUSMUFREyJhcQYjMoGRobEUQlJiwQckMzRy0UNjkhUlU4Ki4RZz8Bc1RIOTssLxCFTi/8QAGgEBAQEBAQEBAAAAAAAAAAAAAAECAwQFBv/EACkRAQEAAgICAQQCAgMBAQAAAAABAhEhMQNBEgQiMlETFEJSBSNxgWH/2gAMAwEAAhEDEQA/AP6ZAB53cAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIRJQAAAAAAAAAAAAAAAAAAAAAAAAAAAlEEoVEPkEHyCM+hLDDDNQQQSQKoACL6AAEEAgFAAECGSQwl7QAAoAAAYDAgAAAAAIZJDCAACAAAAAAAAIZBLIAESJIkFQACq2ABAAAAAAWAAWiAQAAAAwwwwgAACJIR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";
/** One-off cover type (not a library style): big, black weight, tight. */
async function coverText(chars, size, lh, style, color, o) {
  o = o || {};
  const t = figma.createText();
  await figma.loadFontAsync({ family: "Noto Sans KR", style });
  t.fontName = { family: "Noto Sans KR", style }; t.fontSize = size; t.lineHeight = { unit: "PIXELS", value: lh };
  if (o.ls) t.letterSpacing = { unit: "PERCENT", value: o.ls };
  t.characters = chars; t.fills = [paint(L[color])]; t.name = o.name || chars.split("\n")[0];
  return t;
}
async function floatCard(name, o) {
  const f = al(name, o.dir || "HORIZONTAL", { gap: o.gap == null ? 12 : o.gap, pad: o.pad || [14, 18, 14, 18], align: "CENTER" });
  fill(f, "background/surface"); f.cornerRadius = o.radius || 20;
  await f.setEffectStyleIdAsync(EFX["Shadow/float"].id);
  return f;
}
async function stepCover() {
  const page = await figma.getNodeByIdAsync(IDS.cover);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  const old = page.children.find((n) => n.name === "Cover · Achievee DS");
  if (old && old.findOne((n) => n.name === "Hero")) return "이미 있음";
  let x0, y0;
  if (old) { x0 = old.x; y0 = old.y; old.remove(); }
  else { let minX = Infinity, minY = Infinity; for (const n of page.children) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); } x0 = isFinite(minX) ? minX - 1800 : 0; y0 = isFinite(minY) ? minY : 0; }
  const W = 1600, H = 1040;
  const f = figma.createFrame(); f.name = "Cover · Achievee DS"; page.appendChild(f); f.resize(W, H); f.x = x0; f.y = y0; f.clipsContent = true;
  fill(f, "background/canvas");
  const put = (n, x, y) => { f.appendChild(n); n.x = x; n.y = y; return n; };
  // soft colour behind the photo
  const glow = figma.createEllipse(); glow.name = "Glow"; glow.resize(980, 980); put(glow, 760, -180); fill(glow, "accent/soft", 0.9);
  const blush = figma.createEllipse(); blush.name = "Blush"; blush.resize(560, 560); put(blush, -260, 800); fill(blush, "petal/pink", 0.1);
  // left: the name and what is inside
  if (HAVE["Logo"]) { const lg = HAVE["Logo"].createInstance(); put(lg, 120, 112); lg.rescale(1.6); }
  put(await coverText("DESIGN SYSTEM  ·  v2", 13, 18, "Bold", "accent/normal", { ls: 12, name: "Eyebrow" }), 120, 300);
  put(await coverText("기록할수록\n피어나는 하루", 76, 90, "Black", "foreground/normal", { ls: -2, name: "Title" }), 116, 332);
  const sub = await coverText("일정, 지출, 감정, 일기를 한 곳에 담는 Achievee의\n토큰 · 컴포넌트 · 화면을 라이트와 다크로 정리했어요.", 18, 30, "Regular", "foreground/alternative", { name: "Subtitle" });
  put(sub, 120, 540);
  const stats = al("Stats", "HORIZONTAL", { gap: 12 }); put(stats, 120, 652);
  for (const [n, k] of [["2층", "토큰 · 원시 → 의미"], ["26", "컴포넌트"], ["16", "화면 · Light / Dark"]]) {
    const t = al(k, "VERTICAL", { gap: 2, pad: [16, 20, 16, 20] }); fill(t, "background/surface"); rad(t, "surface");
    await t.setEffectStyleIdAsync(EFX["Shadow/surface"].id);
    t.appendChild(await txt(n, "Display/display-2", "foreground/normal")); t.appendChild(await txt(k, "Text/caption", "foreground/alternative"));
    stats.appendChild(t);
  }
  const dots = al("Petals", "HORIZONTAL", { gap: 8, align: "CENTER" }); put(dots, 120, 790);
  for (const p of ["pink", "peach", "butter", "mint", "lilac", "sky"]) { const d = figma.createEllipse(); d.resize(18, 18); fill(d, "petal/" + p); dots.appendChild(d); }
  const pl = await txt("petal palette", "Text/caption", "foreground/hint"); dots.appendChild(pl);
  put(await txt("2026.11 · Noto Sans KR (Pretendard 대체) · 코드 packages/ui · Figma ↔ var(--ac-*)", "Text/caption", "foreground/hint", { name: "Meta" }), 120, 952);
  // right: Mallow in the meadow, with bits of the app floating around
  const hero = figma.createRectangle(); hero.name = "Hero"; hero.resize(520, 908); put(hero, 1000, 66); hero.cornerRadius = 40;
  const img = figma.createImage(figma.base64Decode(COVER_JPG));
  hero.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FILL" }];
  await hero.setEffectStyleIdAsync(EFX["Shadow/float"].id);
  const bubble = await floatCard("Bubble", { pad: [14, 22, 14, 22], radius: 999 });
  bubble.appendChild(await txt("오늘 하루, 어땠어?", "Text/body-medium", "foreground/normal")); put(bubble, 1110, 190);
  const tail = figma.createRectangle(); tail.name = "Bubble tail"; tail.resize(16, 16); fill(tail, "background/surface"); put(tail, 1214, 230); tail.rotation = 45;
  f.insertChild(f.children.indexOf(bubble), tail);
  if (HAVE["EventRow"]) {
    const ev = await floatCard("Upcoming", { pad: [6, 6, 6, 6], radius: 18 });
    const e = pick(HAVE["EventRow"], { tone: "own", badgeTone: "now" }).createInstance(); ev.appendChild(e);
    const set = HAVE["EventRow"]; const p = {};
    for (const [k, v] of [["Badge", "오늘"], ["Title", "치과 예약"], ["Meta", "11. 26. (목) · 18:00"]]) { const key = propKey(set, k, "TEXT"); if (key) p[key] = v; }
    e.setProperties(p); put(ev, 840, 776);
  }
  if (HAVE["DayFlower"]) {
    const fc = await floatCard("Done today", { gap: 12 });
    const fl = pick(HAVE["DayFlower"], { level: "3" }).createInstance(); fc.appendChild(fl);
    const k = propKey(HAVE["DayFlower"], "Count", "TEXT"); if (k) fl.setProperties({ [k]: "5" });
    const tx = al("Text", "VERTICAL", { gap: 0 }); tx.appendChild(await txt("오늘 5개 완료", "Text/heading", "foreground/normal")); tx.appendChild(await txt("3일 연속 피었어요", "Text/caption", "foreground/alternative"));
    fc.appendChild(tx); put(fc, 1336, 820);
  }
  try { await figma.setFileThumbnailNodeAsync(f); } catch (e) { /* thumbnail is optional */ }
  return "Mallow 표지 완료";
}

// ---------- app patterns (built from the components above) ----------
const SETS = {};
async function loadSets() {
  for (const [k, id] of Object.entries({ button: IDS.button, iconButton: IDS.iconButton, checkbox: IDS.checkbox, chip: IDS.chip })) SETS[k] = await figma.getNodeByIdAsync(id);
  for (const k of ["Tabs", "Tabs.Item", "Tag", "ListRow", "DayHeader", "EventRow", "EntryCard", "DayFlower", "AppHeader", "TabBar", "TabBar.Item", "TodoRow", "SideNav", "SideNav.Item", "PageHeader"]) if (HAVE[k]) SETS[k] = HAVE[k];
}
/** Instance of a set's variant, with properties set by their names (TEXT/BOOLEAN/INSTANCE_SWAP prefixes). */
function use(set, variant, props) {
  if (!set) throw new Error("component missing");
  const base = set.type === "COMPONENT_SET" ? pick(set, variant || {}) : set;
  const i = base.createInstance();
  if (props) {
    const defs = set.componentPropertyDefinitions;
    for (const [name, v] of Object.entries(props)) {
      const k = propKey(set, name); if (!k) continue;
      const val = defs[k].type === "VARIANT" ? String(v) : defs[k].type === "BOOLEAN" ? !!v : v;
      try { i.setProperties({ [k]: val }); } catch (e) { log("· " + set.name + "." + name + " 건너뜀: " + e.message); }
    }
  }
  return i;
}
const btn = (label, o) => use(SETS.button, { variant: (o && o.variant) || ["ghost", "quiet", "default"], size: (o && o.size) || "sm", disabled: "false", "state(design only)": "default" },
  Object.assign({ Label: label, "Show icon": !!(o && o.icon) }, o && o.icon ? { Icon: icon(o.icon).id } : {}));
const iconBtn = (name, o) => use(SETS.iconButton, { variant: (o && o.variant) || ["ghost", "default"], size: (o && o.size) || "md", disabled: "false", "state(design only)": "default" }, { Icon: icon(name).id });

async function cAppHeader() {
  const c = autoComp("AppHeader", "HORIZONTAL", { width: 390, align: "CENTER", justify: "SPACE_BETWEEN", pad: [16, 16, 12, 16], gap: 8 });
  c.appendChild(await txt("2026년 11월", "Text/title", "foreground/normal", { name: "Title" }));
  const right = al("Actions", "HORIZONTAL", { gap: 8, align: "CENTER" }); c.appendChild(right);
  const s = iconBtn("search"); s.name = "Search"; right.appendChild(s);
  const nav = al("Date nav", "HORIZONTAL", { align: "CENTER" }); fill(nav, "background/sunk"); rad(nav, "control"); right.appendChild(nav);
  const prev = iconBtn("left", { size: "sm" }); prev.name = "Prev"; nav.appendChild(prev);
  const today = al("Today", "HORIZONTAL", { pad: [0, 8, 0, 8] }); today.appendChild(await txt("오늘", "Text/label", "foreground/normal", { name: "Today label" })); nav.appendChild(today);
  const next = iconBtn("right", { size: "sm" }); next.name = "Next"; nav.appendChild(next);
  wire(c, "Title", "characters", c.addComponentProperty("Title", "TEXT", "2026년 11월"));
  wire(c, "Actions", "visible", c.addComponentProperty("Show actions", "BOOLEAN", true));
  c.description = "Phone page header: the page title (month or page name), search, and the day stepper with 오늘.";
  return c;
}

async function cTabBar() {
  const make = async (selected) => {
    const c = autoComp("selected=" + selected, "VERTICAL", { align: "CENTER", gap: 4, pad: [8, 0, 10, 0] });
    c.resize(78, 56); c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
    const col = selected ? "accent/normal" : "foreground/alternative";
    c.appendChild(iconInst("home", 20, col));
    c.appendChild(await txt("홈", "Text/caption", col, { name: "Label" }));
    return c;
  };
  const items = [await make(false), await make(true)];
  for (const c of items) PAGE.appendChild(c);
  const item = combine(items, "TabBar.Item", PAGE, 480, "One destination in the phone tab bar.");
  wire(item, "Label", "characters", item.addComponentProperty("Label", "TEXT", "홈"));
  wire(item, "Icon", "mainComponent", item.addComponentProperty("Icon", "INSTANCE_SWAP", icon("home").id, { preferredValues: ICONS.map((i) => ({ type: "COMPONENT", key: i.key })) }));
  const bar = autoComp("TabBar", "HORIZONTAL", { width: 390, justify: "SPACE_BETWEEN", pad: [0, 4, 16, 4] });
  fill(bar, "background/surface");
  bar.strokes = [paint(L["border/line"])]; bar.strokeAlign = "INSIDE"; bar.strokeTopWeight = 1; bar.strokeLeftWeight = 0; bar.strokeRightWeight = 0; bar.strokeBottomWeight = 0;
  const lk = propKey(item, "Label", "TEXT"), ik = propKey(item, "Icon", "INSTANCE_SWAP");
  [["홈", "home"], ["일정", "calendar"], ["일기", "book"], ["지출", "wallet"], ["더보기", "more"]].forEach(([l, ic], i) => {
    const it = pick(item, { selected: i === 0 ? "true" : "false" }).createInstance();
    it.name = "Tab · " + l; bar.appendChild(it);
    it.setProperties({ [lk]: l, [ik]: icon(ic).id });
  });
  bar.description = "Phone bottom navigation. Set the shown page's item to selected=true.";
  PAGE.appendChild(bar);
  return [item, bar];
}

async function cTodoRow() {
  const make = async (done) => {
    const c = autoComp("done=" + done, "HORIZONTAL", { width: 326, align: "CENTER", gap: 12, pad: [8, 0, 8, 0] });
    const cb = use(SETS.checkbox, { shape: ["circle", "round"], checked: done ? "true" : "false", disabled: "false", "state(design only)": "default" });
    cb.name = "Check"; c.appendChild(cb);
    const t = await txt("은행 서류 제출", "Text/body", done ? "foreground/hint" : "foreground/normal", { name: "Text" });
    add(c, t, "FILL"); wrapText(t); if (done) t.textDecoration = "STRIKETHROUGH";
    const src = al("Source", "HORIZONTAL", { pad: [2, 8, 2, 8] }); rad(src, "pill"); fill(src, "background/sunk");
    src.appendChild(await txt("Google", "Text/caption-strong", "foreground/alternative", { name: "Source label" }));
    c.appendChild(src);
    return c;
  };
  const comps = [await make(false), await make(true)];
  for (const c of comps) PAGE.appendChild(c);
  const set = combine(comps, "TodoRow", PAGE, 760, "A to-do of the day: check, text (struck through when done), and where it came from (Google) when it was not made here.");
  wire(set, "Text", "characters", set.addComponentProperty("Text", "TEXT", "은행 서류 제출"));
  wire(set, "Source label", "characters", set.addComponentProperty("Source", "TEXT", "Google"));
  wire(set, "Source", "visible", set.addComponentProperty("Show source", "BOOLEAN", true));
  return set;
}

async function cPatterns() {
  await loadSets();
  const head = await cAppHeader(); PAGE.appendChild(head);
  const [item, bar] = await cTabBar();
  const todo = await cTodoRow();
  HAVE["AppHeader"] = head; HAVE["TabBar"] = bar; HAVE["TabBar.Item"] = item; HAVE["TodoRow"] = todo;
  place("App patterns", [head, bar, item, todo]);
  return head;
}

// ---------- screens ----------
function box(name, o) {
  o = o || {};
  const f = al(name, o.dir || "VERTICAL", { gap: o.gap == null ? 12 : o.gap, pad: o.pad || [16, 16, 16, 16], align: o.align, justify: o.justify });
  fill(f, o.fill || "background/surface");
  if (o.fill === "background/sunk") rad(f, "control"); else rad(f, "surface");
  return f;
}
async function shadow(f) { await f.setEffectStyleIdAsync(EFX["Shadow/surface"].id); }
const fillW = (parent, child) => add(parent, child, "FILL");
async function rowLR(left, right) { const r = al("Row", "HORIZONTAL", { align: "CENTER", justify: "SPACE_BETWEEN", gap: 8 }); r.appendChild(left); r.appendChild(right); return r; }

async function screen(title, tab, build) {
  const s = al("휴대폰 · " + title, "VERTICAL", { gap: 0, pad: [0, 0, 96, 0] });
  s.resize(390, 100); s.counterAxisSizingMode = "FIXED"; s.primaryAxisSizingMode = "AUTO"; s.clipsContent = true;
  fill(s, "background/canvas");
  const h = use(SETS.AppHeader, null, { Title: "2026년 11월" }); fillW(s, h);
  const body = al("Body", "VERTICAL", { gap: 16, pad: [4, 16, 16, 16] }); fillW(s, body);
  await build(body);
  const bar = SETS.TabBar.createInstance(); bar.name = "TabBar";
  absolute(s, bar, 0, s.height - 72, 390, bar.height, { horizontal: "STRETCH", vertical: "MAX" });
  bar.y = s.height - bar.height;
  for (const it of bar.children) if (it.type === "INSTANCE") {
    const k = propKey(SETS["TabBar.Item"], "selected") || "selected";
    it.setProperties({ [k]: it.name === "Tab · " + tab ? "true" : "false" });
  }
  return s;
}

// ----- shared screen parts (phone and web) -----
function edge(f, side, color) {
  f.strokes = [paint(L[color || "border/line"])]; f.strokeAlign = "INSIDE";
  f.strokeTopWeight = side === "top" ? 1 : 0; f.strokeBottomWeight = side === "bottom" ? 1 : 0;
  f.strokeLeftWeight = side === "left" ? 1 : 0; f.strokeRightWeight = side === "right" ? 1 : 0;
}
/** Numbers in one flush surface: cells in rows of `perRow`, split by hairlines. */
async function statsBox(pairs, perRow, valueStyle) {
  const s = box("Stats", { gap: 0, pad: [0, 0, 0, 0] }); await shadow(s); s.clipsContent = true;
  for (let r = 0; r < pairs.length / perRow; r++) {
    const row = al("Row", "HORIZONTAL"); fillW(s, row); if (r) edge(row, "top");
    for (let c = 0; c < perRow; c++) {
      const [k, v] = pairs[r * perRow + c];
      const cell = al(k, "VERTICAL", { gap: 2, pad: perRow > 2 && valueStyle !== "Text/dialog-title" ? [16, 20, 16, 20] : [12, 12, 12, 12] }); fillW(row, cell);
      if (c) edge(cell, "left");
      cell.appendChild(await txt(k, "Text/caption", "foreground/alternative"));
      cell.appendChild(await txt(v, valueStyle || "Text/dialog-title", "foreground/normal"));
    }
  }
  return s;
}
async function upcomingBox() {
  const up = box("Upcoming", { gap: 8 }); await shadow(up);
  const left = al("Title", "HORIZONTAL", { gap: 6, align: "CENTER" });
  left.appendChild(await txt("다가오는 일정", "Text/heading", "foreground/normal")); left.appendChild(await txt("앞으로 2주", "Text/caption", "foreground/hint"));
  fillW(up, await rowLR(left, btn("일정 추가", { icon: "plus" })));
  for (const [bt, badge, t, m] of [["now", "오늘", "치과 예약", "11. 26. (목) · 18:00"], ["default", "D-2", "할아버지 제사", "11. 28. (토) · 19:15"], ["default", "D-5", "골프 라운딩", "12. 1. (화) · 07:00"]])
    fillW(up, use(SETS.EventRow, { tone: "own", badgeTone: bt }, { Badge: badge, Title: t, Meta: m }));
  up.appendChild(await txt("Google 일정 7개 · 전체 보기", "Text/caption", "foreground/alternative"));
  return up;
}
async function monthBox(scale, cellPad) {
  const mon = box("Month", { gap: 6 }); await shadow(mon);
  const wk = al("Weekdays", "HORIZONTAL"); fillW(mon, wk);
  for (const [d, c] of [["월"], ["화"], ["수"], ["목"], ["금"], ["토", "accent/normal"], ["일", "status/danger"]]) {
    const t = await txt(d, "Text/caption", c || "foreground/alternative"); fillW(wk, t); t.textAlignHorizontal = "CENTER";
  }
  const levels = [3, 0, 1, 2, 0, 3, 4, 1, 0, 2, 3, 0, 1, 2, 3, 0, 0, 1, 3, 2, 0, 1, 2, 3, 1, 0];
  const counts = [2, 0, 1, 2, 0, 2, 3, 1, 0, 2, 1, 0, 1, 2, 2, 0, 0, 1, 2, 2, 0, 1, 2, 1, 0, 0];
  const days = [null, null, null, null, null, null, 1]; for (let d = 2; d <= 30; d++) days.push(d);
  while (days.length % 7) days.push(null);
  for (let w = 0; w < days.length / 7; w++) {
    const row = al("Week " + (w + 1), "HORIZONTAL"); fillW(mon, row);
    for (let c = 0; c < 7; c++) {
      const d = days[w * 7 + c];
      const cell = al(d ? String(d) : "empty", "VERTICAL", { gap: 4, align: "CENTER", pad: [cellPad, 0, cellPad, 0] }); fillW(row, cell);
      if (!d) continue;
      const lv = d <= 26 ? levels[d - 1] : 0;
      const f = use(SETS.DayFlower, { level: String(lv) }, { Count: String(d <= 26 ? counts[d - 1] : 0), "Show count": d <= 25 && lv > 0 || d === 26 });
      cell.appendChild(f); if (scale !== 1) f.rescale(scale);
      const n = await txt(String(d), "Text/caption-strong", c === 5 ? "accent/normal" : c === 6 ? "status/danger" : "foreground/alternative");
      if (d === 26) {
        const dot = al("Today", "HORIZONTAL", { justify: "CENTER", align: "CENTER" }); dot.resize(22, 22); dot.primaryAxisSizingMode = "FIXED"; dot.counterAxisSizingMode = "FIXED";
        rad(dot, "pill"); fill(dot, "accent/normal"); n.fills = [paint(L["accent/on-accent"])]; dot.appendChild(n); cell.appendChild(dot);
        fill(cell, "accent/soft"); cell.cornerRadius = 12;
      } else cell.appendChild(n);
    }
  }
  return mon;
}
async function dayBox() {
  const day = box("Day", { gap: 12, pad: [20, 16, 20, 16] }); await shadow(day);
  const dh = al("Date", "HORIZONTAL", { gap: 8, align: "CENTER" });
  dh.appendChild(await txt("11월 26일", "Text/title", "foreground/normal")); dh.appendChild(await txt("목요일", "Text/caption", "foreground/hint")); day.appendChild(dh);
  fillW(day, await rowLR(await txt("오늘 할 일", "Text/label", "foreground/normal"), await txt("3/5", "Text/caption-strong", "foreground/alternative")));
  for (const [t, done, src] of [["은행 서류 제출", false, null], ["영어 단어", false, "Google"], ["택배 반품", true, null], ["운동 30분", true, "Google"], ["책 20쪽", true, "Google"]])
    fillW(day, use(SETS.TodoRow, { done: String(done) }, { Text: t, Source: src || "", "Show source": !!src }));
  day.appendChild(btn("투두 추가", { icon: "plus" }));
  const tiles = al("Tiles", "VERTICAL", { gap: 8 }); fillW(day, tiles);
  for (const pair of [[["운동", "러닝 30분"], ["지출", "₩12,000"]], [["물", "1.2L"], ["단백질", "40g"]]]) {
    const r = al("Tile row", "HORIZONTAL", { gap: 8 }); fillW(tiles, r);
    for (const [k, v] of pair) { const t = box(k, { fill: "background/sunk", gap: 2, pad: [12, 12, 12, 12] }); fillW(r, t); t.appendChild(await txt(k, "Text/caption", "foreground/alternative")); t.appendChild(await txt(v, "Text/heading", "foreground/normal")); }
  }
  const diary = box("Diary", { fill: "background/sunk", gap: 8, pad: [14, 14, 14, 14] }); fillW(day, diary);
  fillW(diary, await rowLR(await txt("일기", "Text/label", "foreground/normal"), await txt("수정 ›", "Text/caption", "foreground/alternative")));
  const tags = al("Tags", "HORIZONTAL", { gap: 6 }); for (const w of ["joy", "relief"]) tags.appendChild(use(SETS.Tag, { size: "md" }, { Label: w, "Show count": false })); diary.appendChild(tags);
  const p = await txt("오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.", "Text/preview", "foreground/alternative"); fillW(diary, p); wrapText(p);
  return day;
}
async function homeBody(b) {
  fillW(b, await statsBox([["달성률", "35%"], ["완료", "17 / 48"], ["연속 달성", "0일"]], 3));
  fillW(b, await upcomingBox());
  fillW(b, await monthBox(0.8, 4));
  fillW(b, await dayBox());
}

async function budgetBox() {
  const bud = box("Budget", { gap: 16, pad: [20, 16, 20, 16] }); await shadow(bud);
  const bl = al("Title", "HORIZONTAL", { gap: 6, align: "CENTER" }); bl.appendChild(await txt("지출 목표", "Text/heading", "foreground/normal")); bl.appendChild(await txt("고정비 제외", "Text/caption", "foreground/hint"));
  fillW(bud, await rowLR(bl, btn("수정")));
  for (const [k, range, spent, limit, ratio, msg] of [["주", "11월 23일 – 11월 29일", "₩27,850", "₩189,000", 0.15, "남은 돈 ₩161,150"], ["월", "11월 1일 – 11월 30일", "₩79,050", "₩810,000", 0.1, "남은 돈 ₩730,950"]]) {
    const line = al("Goal · " + k, "VERTICAL", { gap: 6 }); fillW(bud, line);
    const l = al("Label", "HORIZONTAL", { gap: 6, align: "CENTER" }); l.appendChild(await txt(k, "Text/body-strong", "foreground/normal")); l.appendChild(await txt(range, "Text/caption", "foreground/hint"));
    const r = al("Amount", "HORIZONTAL", { gap: 2, align: "CENTER" }); r.appendChild(await txt(spent, "Text/body-strong", "foreground/normal")); r.appendChild(await txt(" / " + limit, "Text/caption", "foreground/hint"));
    fillW(line, await rowLR(l, r));
    fillW(line, meter(ratio, "accent/normal"));
    line.appendChild(await txt(msg, "Text/caption", "foreground/alternative"));
  }
  return bud;
}
/** A sunk pill track with a filled share; the fill follows the track's width. */
function meter(ratio, color, h) {
  h = h || 8;
  const track = figma.createFrame(); track.name = "Meter"; track.resize(300, h); track.clipsContent = true; fill(track, "background/sunk"); rad(track, "pill");
  const bar = figma.createRectangle(); bar.name = "Value"; track.appendChild(bar); bar.resize(Math.max(h, Math.round(300 * ratio)), h); fill(bar, color); rad(bar, "pill");
  bar.constraints = { horizontal: "SCALE", vertical: "STRETCH" };
  return track;
}
async function chipsRow(labels) {
  const chips = al("Filters", "HORIZONTAL", { gap: 8 });
  labels.forEach((l, i) => chips.appendChild(use(SETS.chip, { variant: i === 0 ? ["selected", "on", "active"] : ["default"], disabled: "false", "state(design only)": "default" }, { Label: l, Removable: false })));
  return chips;
}
const SPEND = [["11월 26일 (목)", "−₩12,000", "점심", "식비", "₩12,000", true], ["11월 25일 (수)", "−₩4,500", "아메리카노", "카페", "₩4,500", false], ["11월 24일 (화)", "−₩1,450", "지하철", "교통", "₩1,450", true], ["11월 23일 (월)", "−₩9,900", "양말", "쇼핑", "₩9,900", false], ["11월 22일 (일)", "−₩12,000", "점심", "문화", "₩12,000", true], ["11월 21일 (토)", "−₩4,500", "아메리카노", "고정비", "₩4,500", false]];
async function dayGroups(parent, n) {
  for (const [d, total, t, k, a, flag] of SPEND.slice(0, n)) {
    const g = al("Day · " + d, "VERTICAL", { gap: 0 }); fillW(parent, g);
    fillW(g, use(SETS.DayHeader, null, { Day: d, Total: total }));
    const list = box("List", { gap: 0, pad: [0, 0, 0, 0] }); await shadow(list); fillW(g, list); list.clipsContent = true;
    fillW(list, use(SETS.ListRow, { flag: String(flag), tone: "default", "state(design only)": "default" }, { Title: t, Category: k, Amount: a }));
  }
}
const newRow = async (label) => rowLR(await txt(label, "Text/label", "foreground/normal"), iconBtn("plus", { variant: ["soft", "ghost"] }));
async function spendBody(b) {
  fillW(b, await statsBox([["수입", "₩3,200,000"], ["지출", "₩83,550"], ["저축·투자", "₩0"], ["남은 돈", "₩3,116,450"]], 2));
  fillW(b, await budgetBox());
  fillW(b, await newRow("새 지출"));
  b.appendChild(await chipsRow(["전체", "불필요만", "식비", "문화", "카페"]));
  await dayGroups(b, 4);
}

async function diaryEditor() {
  const card = box("Today", { gap: 14, pad: [24, 24, 24, 24] }); await shadow(card);
  const date = box("Date", { dir: "HORIZONTAL", fill: "background/sunk", justify: "SPACE_BETWEEN", align: "CENTER", pad: [12, 14, 12, 14] }); fillW(card, date);
  date.appendChild(await txt("2026년 11월 26일", "Text/body-medium", "foreground/normal")); date.appendChild(iconInst("calendar", 16, "foreground/alternative"));
  card.appendChild(await txt("지금 어떤 감정일까요?", "Text/label", "foreground/alternative"));
  const ch = al("Feelings", "HORIZONTAL", { gap: 8 }); card.appendChild(ch);
  for (const w of ["joy", "relief"]) ch.appendChild(use(SETS.chip, { variant: ["selected", "on", "active"], disabled: "false", "state(design only)": "default" }, { Label: w, Removable: true }));
  ch.appendChild(use(SETS.chip, { variant: ["add", "default"], disabled: "false", "state(design only)": "default" }, { Label: "단어 고르기", Removable: false }));
  const paper = box("Paper", { fill: "background/sunk", pad: [14, 16, 14, 16] }); fillW(card, paper); paper.cornerRadius = 14;
  paper.resize(paper.width, 220); paper.primaryAxisSizingMode = "FIXED"; paper.layoutSizingHorizontal = "FILL";
  const w = await txt("오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.", "Text/writing", "foreground/normal"); fillW(paper, w); wrapText(w);
  const st = al("Status", "HORIZONTAL", { justify: "SPACE_BETWEEN", align: "CENTER" }); fillW(card, st);
  st.appendChild(await txt("42자", "Text/caption", "foreground/hint"));
  const saved = al("Saved", "HORIZONTAL", { gap: 6, align: "CENTER" }); const dot = figma.createEllipse(); dot.resize(6, 6); fill(dot, "status/good"); saved.appendChild(dot); saved.appendChild(await txt("저장됐어요", "Text/caption", "foreground/hint")); st.appendChild(saved);
  return card;
}
const ENTRIES = [["11월 26일", true, "오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.", true], ["11월 25일", false, "비가 와서 하루 종일 집에 있었다. 밀린 책을 읽었다.", false], ["11월 24일", false, "운동을 다시 시작했다. 몸이 무겁지만 기분은 좋다.", true], ["11월 23일", false, "오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.", true], ["11월 22일", false, "비가 와서 하루 종일 집에 있었다. 밀린 책을 읽었다.", false], ["11월 21일", false, "운동을 다시 시작했다. 몸이 무겁지만 기분은 좋다.", true]];
function entries(parent, n) {
  for (const [t, cur, prev, tags] of ENTRIES.slice(0, n)) fillW(parent, use(SETS.EntryCard, { open: "false", current: String(cur) }, { Title: t, Preview: prev, "Show tags": tags, "Show mood": false }));
}
function lineTabs(labels) {
  const tabs = use(SETS.Tabs, { variant: "line" });
  const lk = propKey(SETS["Tabs.Item"], "Label", "TEXT");
  labels.forEach((l, i) => { const t = tabs.children[i]; if (t && t.type === "INSTANCE" && lk) t.setProperties({ [lk]: l }); });
  return tabs;
}
async function diaryBody(b) {
  b.appendChild(lineTabs(["일기", "주간 회고", "내 감정"]));
  fillW(b, await diaryEditor());
  entries(b, 3);
}

async function scheduleBody(b) {
  const ctl = al("Controls", "HORIZONTAL", { gap: 12, align: "CENTER", justify: "SPACE_BETWEEN" }); fillW(b, ctl);
  ctl.appendChild(use(SETS.Tabs, { variant: "segment" }));
  ctl.appendChild(btn("캘린더 선택"));
  const strip = al("Week strip", "HORIZONTAL"); fillW(b, strip);
  const wd = ["월", "화", "수", "목", "금", "토", "일"];
  for (let i = 0; i < 7; i++) {
    const d = 23 + i;
    const cell = al(String(d), "VERTICAL", { gap: 4, align: "CENTER" }); fillW(strip, cell);
    cell.appendChild(await txt(wd[i], "Text/caption", i === 5 ? "accent/normal" : i === 6 ? "status/danger" : "foreground/alternative"));
    const n = await txt(String(d), "Text/title", d === 26 ? "accent/on-accent" : "foreground/normal");
    const dot = al("Day", "HORIZONTAL", { justify: "CENTER", align: "CENTER" }); dot.resize(36, 36); dot.primaryAxisSizingMode = "FIXED"; dot.counterAxisSizingMode = "FIXED"; rad(dot, "pill");
    if (d === 26) fill(dot, "accent/normal");
    dot.appendChild(n); cell.appendChild(dot);
  }
  const lab = al("Day label", "HORIZONTAL", { justify: "CENTER", pad: [10, 0, 10, 0] }); fillW(b, lab);
  lab.strokes = [paint(L["border/line"])]; lab.strokeAlign = "INSIDE"; lab.strokeTopWeight = 1; lab.strokeBottomWeight = 1; lab.strokeLeftWeight = 0; lab.strokeRightWeight = 0;
  lab.appendChild(await txt("11월 26일 목요일", "Text/heading", "foreground/normal"));
  const chips = al("Tasks", "HORIZONTAL", { gap: 8, align: "CENTER" }); b.appendChild(chips);
  chips.appendChild(use(SETS.Tag, { size: "lg" }, { Label: "사무실", "Show count": false }));
  for (const [t, done] of [["은행 서류 제출", false], ["영어 단어", false]]) {
    const c = al("Task · " + t, "HORIZONTAL", { gap: 6, align: "CENTER", pad: [6, 12, 6, 8] }); rad(c, "pill"); fill(c, "background/sunk");
    c.appendChild(use(SETS.checkbox, { shape: ["circle", "round"], checked: String(done), disabled: "false", "state(design only)": "default" }));
    c.appendChild(await txt(t, "Text/chip", "foreground/normal"));
    chips.appendChild(c);
  }
  // the time grid
  const H = 60, first = 5, hours = 7;
  const grid = figma.createFrame(); grid.name = "Time grid"; grid.fills = []; grid.clipsContent = true;
  fillW(b, grid); grid.resize(358, H * hours); grid.layoutSizingVertical = "FIXED"; grid.layoutSizingHorizontal = "FILL";
  for (let h = 0; h < hours; h++) {
    const y = h * H + 10;
    const t = await txt((first + h) + "시", "Text/caption-strong", "foreground/alternative"); grid.appendChild(t);
    t.textAutoResize = "NONE"; t.resize(36, 16); t.textAlignHorizontal = "RIGHT"; t.x = 0; t.y = y - 8;
    const ln = figma.createRectangle(); ln.name = "Hour line"; grid.appendChild(ln); ln.resize(358 - 44, 1); ln.x = 44; ln.y = y; fill(ln, "border/line"); ln.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  }
  const nowY = 10 + (55 / 60) * H;
  const nl = figma.createRectangle(); nl.name = "Now line"; grid.appendChild(nl); nl.resize(358 - 44, 2); nl.x = 44; nl.y = nowY - 1; fill(nl, "status/danger"); nl.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  const nd = figma.createEllipse(); nd.name = "Now dot"; grid.appendChild(nd); nd.resize(8, 8); nd.x = 41; nd.y = nowY - 4; fill(nd, "status/danger");
  const nt = await txt("05:55", "Text/caption-strong", "status/danger", { name: "Now time" }); grid.appendChild(nt); nt.x = 0; nt.y = nowY - 8;
  const ev = al("Event · 보고서 초안", "VERTICAL", { gap: 2, pad: [6, 8, 6, 10] }); grid.appendChild(ev);
  ev.resize(160, 2 * H - 2); ev.primaryAxisSizingMode = "FIXED"; ev.counterAxisSizingMode = "FIXED"; ev.x = 48; ev.y = 10 + 4 * H + 1;
  fill(ev, "accent/soft"); ev.cornerRadius = 8;
  ev.strokes = [paint(L["accent/normal"])]; ev.strokeAlign = "INSIDE"; ev.strokeLeftWeight = 3; ev.strokeTopWeight = 0; ev.strokeRightWeight = 0; ev.strokeBottomWeight = 0; ev.dashPattern = [4, 3];
  ev.appendChild(await txt("보고서 초안", "Text/body-medium", "accent/on-soft")); ev.appendChild(await txt("09:00 - 11:00", "Text/caption", "accent/on-soft"));
}

/** A copy of a light frame with every Light colour swapped for the Dark one of the same name, and shadows for their dark versions. */
async function toDark(frame) {
  const d = frame.clone(); d.name = frame.name + " · Dark";
  await darken(d);
  return d;
}

async function stepScreens() {
  await loadSets();
  for (const k of ["AppHeader", "TabBar", "TabBar.Item", "TodoRow", "Tabs", "Tabs.Item", "Tag", "ListRow", "DayHeader", "EventRow", "EntryCard", "DayFlower"]) if (!SETS[k]) throw new Error(k + " 컴포넌트가 없어요");
  const page = await figma.getNodeByIdAsync(IDS.screens);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  if (page.children.some((n) => n.name === "Screens · Light")) return "이미 있음";
  let right = 0; for (const n of page.children) right = Math.max(right, n.x + n.width);
  const before = new Set(page.children.map((n) => n.id));
  const made = [];
  try {
    const frames = [];
    frames.push(await screen("홈", "홈", homeBody));
    frames.push(await screen("일정 · 일", "일정", scheduleBody));
    frames.push(await screen("지출", "지출", spendBody));
    frames.push(await screen("일기", "일기", diaryBody));
    made.push(...frames);
    const darks = []; for (const f of frames) darks.push(await toDark(f));
    made.push(...darks);
    const lay = (name, list, y) => {
      const sec = figma.createSection(); sec.name = name; page.appendChild(sec); made.push(sec);
      let x = 80, h = 0; for (const f of list) { sec.appendChild(f); f.x = x; f.y = 96; x += f.width + 80; h = Math.max(h, f.height); }
      sec.resizeWithoutConstraints(x, h + 176); sec.x = right + 400; sec.y = y; return sec;
    };
    const s1 = lay("Screens · Light", frames, 0);
    lay("Screens · Dark", darks, s1.height + 160);
    return "휴대폰 화면 " + frames.length + "개 × Light/Dark";
  } catch (e) { for (const n of [...page.children]) if (!before.has(n.id)) n.remove(); throw e; }
}

// ---------- web: side navigation and page header ----------
const NAV = [["홈", "home"], ["통계", "chart"], ["일기", "book"], ["지출", "wallet"], ["운동", "activity"], ["일정", "calendar"], ["연동", "plug"], ["설정", "user"]];
async function cWebPatterns() {
  await loadSets();
  const make = async (selected) => {
    const c = autoComp("selected=" + selected, "HORIZONTAL", { width: 200, align: "CENTER", gap: 12, pad: [10, 12, 10, 12] });
    rad(c, "control"); if (selected) fill(c, "background/sunk");
    c.appendChild(iconInst("home", 18, selected ? "foreground/normal" : "foreground/alternative"));
    c.appendChild(await txt("홈", selected ? "Text/body-medium" : "Text/body", selected ? "foreground/normal" : "foreground/alternative", { name: "Label" }));
    return c;
  };
  const items = [await make(false), await make(true)];
  for (const c of items) PAGE.appendChild(c);
  const item = combine(items, "SideNav.Item", PAGE, 520, "One destination in the web side navigation.");
  wire(item, "Label", "characters", item.addComponentProperty("Label", "TEXT", "홈"));
  wire(item, "Icon", "mainComponent", item.addComponentProperty("Icon", "INSTANCE_SWAP", icon("home").id, { preferredValues: ICONS.map((i) => ({ type: "COMPONENT", key: i.key })) }));
  const nav = autoComp("SideNav", "VERTICAL", { width: 224, gap: 4, pad: [24, 12, 24, 12] });
  nav.resize(224, 900); nav.primaryAxisSizingMode = "FIXED"; nav.counterAxisSizingMode = "FIXED";
  fill(nav, "background/canvas"); edge(nav, "right");
  const logo = al("Logo", "HORIZONTAL", { gap: 8, align: "CENTER", pad: [0, 12, 24, 12] }); nav.appendChild(logo);
  if (HAVE["Logo"]) logo.appendChild(HAVE["Logo"].createInstance());
  const lk = propKey(item, "Label", "TEXT"), ik = propKey(item, "Icon", "INSTANCE_SWAP");
  NAV.forEach(([l, ic], i) => { const it = pick(item, { selected: i === 0 ? "true" : "false" }).createInstance(); it.name = "Nav · " + l; add(nav, it, "FILL"); it.setProperties({ [lk]: l, [ik]: icon(ic).id }); });
  nav.description = "Web side navigation. Set the shown page's item to selected=true.";
  PAGE.appendChild(nav);
  const head = autoComp("PageHeader", "HORIZONTAL", { width: 1152, align: "CENTER", justify: "SPACE_BETWEEN", gap: 16 });
  head.appendChild(await txt("2026년 11월", "Display/display-2", "foreground/normal", { name: "Title" }));
  head.appendChild(await dateNav());
  wire(head, "Title", "characters", head.addComponentProperty("Title", "TEXT", "2026년 11월"));
  wire(head, "Actions", "visible", head.addComponentProperty("Show actions", "BOOLEAN", true));
  head.description = "Web page title with search and the day stepper.";
  PAGE.appendChild(head);
  HAVE["SideNav"] = nav; HAVE["SideNav.Item"] = item; HAVE["PageHeader"] = head;
  place("Web patterns", [nav, item, head]);
  return nav;
}
async function dateNav() {
  const right = al("Actions", "HORIZONTAL", { gap: 8, align: "CENTER" });
  const s = iconBtn("search"); s.name = "Search"; right.appendChild(s);
  const nav = al("Date nav", "HORIZONTAL", { align: "CENTER" }); fill(nav, "background/sunk"); rad(nav, "control"); right.appendChild(nav);
  const prev = iconBtn("left", { size: "sm" }); prev.name = "Prev"; nav.appendChild(prev);
  const today = al("Today", "HORIZONTAL", { pad: [0, 8, 0, 8] }); today.appendChild(await txt("오늘", "Text/label", "foreground/normal", { name: "Today label" })); nav.appendChild(today);
  const next = iconBtn("right", { size: "sm" }); next.name = "Next"; nav.appendChild(next);
  return right;
}

// ---------- web screens ----------
async function webScreen(title, navLabel, build, o) {
  o = o || {};
  const s = al("웹 · " + title, "HORIZONTAL", { gap: 0 });
  s.resize(1440, 900); s.primaryAxisSizingMode = "FIXED"; s.counterAxisSizingMode = "AUTO"; s.clipsContent = true;
  fill(s, "background/canvas");
  const nav = SETS.SideNav.createInstance(); nav.name = "SideNav"; s.appendChild(nav);
  for (const it of nav.children) if (it.type === "INSTANCE" && it.name.startsWith("Nav · ")) it.setProperties({ selected: it.name === "Nav · " + navLabel ? "true" : "false" });
  const main = al("Main", "VERTICAL", { gap: 24, pad: [32, 32, 48, 32] }); fillW(s, main);
  if (!o.customHeader) fillW(main, use(SETS.PageHeader, null, { Title: "2026년 11월" }));
  await build(main);
  nav.resize(224, Math.max(900, main.height));
  return s;
}
const column = (name, w, gapV) => { const c = al(name, "VERTICAL", { gap: gapV == null ? 24 : gapV }); if (w) { c.resize(w, 10); c.counterAxisSizingMode = "FIXED"; c.primaryAxisSizingMode = "AUTO"; } return c; };
const columns = (name) => { const r = al(name, "HORIZONTAL", { gap: 24 }); r.counterAxisAlignItems = "MIN"; return r; };

async function webHome(m) {
  fillW(m, await statsBox([["달성률", "35%"], ["완료", "17 / 48"], ["연속 달성", "0일"]], 3, "Display/display-2"));
  const row = columns("Columns"); fillW(m, row);
  const month = await monthBox(1, 12); fillW(row, month);
  const side = column("Side", 300, 24); row.appendChild(side);
  fillW(side, await upcomingBox()); fillW(side, await dayBox());
}

async function webSpend(m) {
  fillW(m, await statsBox([["수입", "₩3,200,000"], ["지출", "₩83,550"], ["저축·투자", "₩0"], ["남은 돈", "₩3,116,450"]], 4, "Display/display-2"));
  const row = columns("Columns"); fillW(m, row);
  const left = column("Left", null, 16); fillW(row, left);
  fillW(left, await budgetBox());
  fillW(left, await newRow("새 지출"));
  left.appendChild(await txt("내역", "Text/label", "foreground/normal"));
  const split = box("This month", { gap: 8, pad: [16, 16, 16, 16] }); await shadow(split); fillW(left, split);
  split.appendChild(await txt("이번 달 지출", "Text/caption", "foreground/alternative"));
  split.appendChild(await txt("₩83,550", "Display/display-2", "foreground/normal"));
  const bars = al("Split", "HORIZONTAL", { gap: 4 }); fillW(split, bars);
  const need = meter(1, "petal/mint"); fillW(bars, need);
  const waste = meter(1, "petal/peach"); fillW(bars, waste);
  fillW(split, await rowLR(await txt("필요 ₩43,200", "Text/caption", "foreground/alternative"), await txt("불필요 ₩40,350 · 48%", "Text/caption", "foreground/alternative")));
  left.appendChild(await chipsRow(["전체", "불필요만", "식비", "문화", "카페", "쇼핑", "교통", "고정비", "기타"]));
  await dayGroups(left, 6);
  const right = column("Right", 420, 0); row.appendChild(right);
  const cat = box("Categories", { gap: 12, pad: [20, 20, 20, 20] }); await shadow(cat); fillW(right, cat);
  cat.appendChild(await txt("카테고리 ₩83,550", "Text/label", "foreground/normal"));
  for (const [k, c, r, a] of [["식비", "petal/peach", 0.26, "₩21,900"], ["문화", "petal/lilac", 0.26, "₩21,900"], ["카페", "petal/butter", 0.2, "₩16,500"], ["쇼핑", "petal/pink", 0.14, "₩11,350"], ["교통", "petal/mint", 0.07, "₩5,950"], ["고정비", "petal/sky", 0.05, "₩4,500"], ["기타", "foreground/hint", 0.02, "₩1,450"]]) {
    const line = al(k, "HORIZONTAL", { gap: 12, align: "CENTER" }); fillW(cat, line);
    const lb = await txt(k, "Text/body", "foreground/normal"); line.appendChild(lb); lb.textAutoResize = "NONE"; lb.resize(48, 22);
    const mt = meter(r, c); fillW(line, mt);
    const am = await txt(a, "Text/body", "foreground/alternative"); line.appendChild(am); am.textAutoResize = "NONE"; am.resize(76, 22); am.textAlignHorizontal = "RIGHT";
  }
  const foot = al("Footer", "HORIZONTAL", { pad: [12, 0, 0, 0] }); fillW(cat, foot); edge(foot, "top");
  foot.appendChild(await txt("▸ 이번 달 시작일 바꾸기", "Text/caption", "foreground/alternative"));
}

async function webDiary(m) {
  m.appendChild(lineTabs(["일기", "주간 회고", "내 감정"]));
  const row = columns("Columns"); fillW(m, row);
  fillW(row, await diaryEditor());
  const right = column("Entries", 470, 8); row.appendChild(right);
  entries(right, 6);
}

async function webWeek(m) {
  const head = al("Header", "HORIZONTAL", { gap: 24, align: "CENTER" }); fillW(m, head);
  head.appendChild(await txt("2026년 11월", "Display/display-2", "foreground/normal", { name: "Title" }));
  const tabs = use(SETS.Tabs, { variant: "segment" }); head.appendChild(tabs);
  tabs.children.forEach((t, i) => { if (t.type === "INSTANCE") t.setProperties({ selected: i === 1 ? "true" : "false" }); });
  const spacer = al("Spacer", "HORIZONTAL"); fillW(head, spacer);
  head.appendChild(btn("캘린더 선택"));
  head.appendChild(btn("Google Calendar에서 보기", { icon: "external" }));
  head.appendChild(await dateNav());
  // the week, drawn on one canvas so the columns line up
  const W = 1152, G = 56, C = (W - G) / 7, HEAD = 64, BAND = 116, H = 56, HOURS = 9, top = HEAD + BAND;
  const g = figma.createFrame(); g.name = "Week"; g.fills = []; g.clipsContent = true; fillW(m, g);
  g.resize(W, top + 16 + HOURS * H); g.layoutSizingHorizontal = "FILL";
  const at = (n, x, y, w, h, cons) => { g.appendChild(n); n.x = x; n.y = y; if (w) n.resize(w, h); if (cons) n.constraints = cons; return n; };
  const rect = (name, x, y, w, h, color, op) => { const r = figma.createRectangle(); r.name = name; at(r, x, y, w, h); fill(r, color, op); return r; };
  // washes first, under everything: weekend and today
  for (const i of [5, 6]) rect("Weekend", G + i * C, top, C, HOURS * H + 16, "background/sunk", 0.6);
  rect("Today", G + 3 * C, HEAD, C, BAND + HOURS * H + 16, "accent/soft", 0.5);
  rect("Head line", 0, HEAD - 1, W, 1, "border/line");
  rect("Band line", 0, top, W, 1, "border/line");
  const wd = ["월", "화", "수", "목", "금", "토", "일"];
  for (let i = 0; i < 7; i++) {
    const x = G + i * C, d = 23 + i;
    const w = await txt(wd[i], "Text/caption", i === 5 ? "accent/normal" : i === 6 ? "status/danger" : "foreground/alternative"); at(w, x, 4); w.textAutoResize = "NONE"; w.resize(C, 16); w.textAlignHorizontal = "CENTER";
    if (d === 26) { const c = figma.createEllipse(); c.name = "Today circle"; at(c, x + C / 2 - 18, 22, 36, 36); fill(c, "accent/normal"); }
    const n = await txt(String(d), "Text/title", d === 26 ? "accent/on-accent" : "foreground/normal"); at(n, x, 26); n.textAutoResize = "NONE"; n.resize(C, 28); n.textAlignHorizontal = "CENTER";
  }
  const tasks = [[["은행 서류 제출", 0], ["영어 단어", 0], ["택배 반품", 1]], [["엄마 생신", "plan"], ["영어 단어", 0], ["운동 30분", 1]], [["영어 단어", 0], ["운동 30분", 1], ["책 20쪽", 1]], [["사무실", "place"], ["영어 단어", 0], ["운동 30분", 1]], [["사무실", "place"]], [], []];
  for (let i = 0; i < 7; i++) {
    const stack = al("Tasks · " + (23 + i), "VERTICAL", { gap: 4 }); at(stack, G + i * C + 6, HEAD + 8); stack.resize(C - 12, 10); stack.counterAxisSizingMode = "FIXED"; stack.primaryAxisSizingMode = "AUTO";
    for (const [t, k] of tasks[i]) {
      const chip = al(t, "HORIZONTAL", { gap: 6, align: "CENTER", pad: [3, 8, 3, 8] }); fillW(stack, chip); chip.cornerRadius = 6;
      if (k === "plan" || k === "place") { fill(chip, k === "plan" ? "petal/butter" : "petal/lilac", 0.35); chip.appendChild(await txt(t, "Text/caption", "foreground/alternative")); continue; }
      fill(chip, "background/sunk");
      const dot = figma.createEllipse(); dot.resize(12, 12); dot.name = k ? "Done" : "Open";
      if (k) fill(dot, "accent/normal"); else { dot.fills = []; stroke(dot, "foreground/hint", 1.5); }
      chip.appendChild(dot);
      const tt = await txt(t, "Text/caption-strong", k ? "foreground/hint" : "foreground/normal"); if (k) tt.textDecoration = "STRIKETHROUGH"; chip.appendChild(tt);
    }
  }
  for (let h = 0; h < HOURS; h++) {
    const y = top + 16 + h * H;
    const t = await txt((5 + h) + "시", "Text/caption-strong", "foreground/alternative"); at(t, 0, y - 8); t.textAutoResize = "NONE"; t.resize(G - 10, 16); t.textAlignHorizontal = "RIGHT";
    rect("Hour line", G, y, W - G, 1, "border/line");
  }
  const nowY = top + 16 + (54 / 60) * H;
  rect("Now line", G + 3 * C, nowY - 1, C, 2, "status/danger");
  const nd = figma.createEllipse(); nd.name = "Now dot"; at(nd, G + 3 * C - 4, nowY - 4, 8, 8); fill(nd, "status/danger");
  const nt = await txt("05:54", "Text/caption-strong", "status/danger", { name: "Now time" }); at(nt, 0, nowY - 8); nt.textAutoResize = "NONE"; nt.resize(G - 10, 16); nt.textAlignHorizontal = "RIGHT";
  const ev = async (day, from, to, title, time, color, edgeColor, half) => {
    const x = G + day * C + 2 + (half === 2 ? (C - 4) / 2 : 0), w = half ? (C - 4) / 2 - 2 : C - 4;
    const f = al("Event · " + title, "VERTICAL", { gap: 2, pad: [6, 8, 6, 10] }); at(f, x, top + 16 + (from - 5) * H + 1);
    f.resize(w, (to - from) * H - 2); f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "FIXED";
    fill(f, color, color === "accent/soft" ? 1 : 0.45); f.cornerRadius = 6;
    f.strokes = [paint(L[edgeColor])]; f.strokeAlign = "INSIDE"; f.strokeLeftWeight = 3; f.strokeTopWeight = 0; f.strokeRightWeight = 0; f.strokeBottomWeight = 0;
    if (color === "accent/soft") f.dashPattern = [4, 3];
    const tt = await txt(title, "Text/caption-strong", "foreground/normal"); fillW(f, tt); wrapText(tt);
    if (time) { const tm = await txt(time, "Text/caption", "foreground/alternative"); fillW(f, tm); wrapText(tm); }
  };
  await ev(4, 7, 8, "운동", "07:00 - 08:00", "accent/soft", "accent/normal");
  await ev(3, 9, 11, "보고서 초안", "", "accent/soft", "accent/normal", 1);
  await ev(3, 10, 11, "주간 회의", "", "petal/mint", "status/good", 2);
  await ev(6, 12, 13.5, "점심 약속", "12:00 - 13:30", "petal/butter", "petal/butter");
  m.appendChild(await txt("빈 시간을 드래그하면 일정이 만들어져요. 클릭하면 1시간짜리가 만들어져요. 할 일을 시간 칸으로 끌어다 놓으면 일정이 돼요.", "Text/caption", "foreground/alternative"));
}

async function stepWeb() {
  await loadSets();
  for (const k of ["SideNav", "SideNav.Item", "PageHeader", "TodoRow", "Tabs", "Tabs.Item", "Tag", "ListRow", "DayHeader", "EventRow", "EntryCard", "DayFlower"]) if (!SETS[k]) throw new Error(k + " 컴포넌트가 없어요");
  const page = await figma.getNodeByIdAsync(IDS.screens);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  if (page.children.some((n) => n.name === "Web · Light")) return "이미 있음";
  let bottom = 0, left = null;
  for (const n of page.children) { bottom = Math.max(bottom, n.y + n.height); if (n.name === "Screens · Light") left = n.x; }
  if (left == null) { let r = 0; for (const n of page.children) r = Math.max(r, n.x + n.width); left = r + 400; }
  const before = new Set(page.children.map((n) => n.id));
  try {
    const frames = [];
    frames.push(await webScreen("홈", "홈", webHome));
    frames.push(await webScreen("일정 · 주", "일정", webWeek, { customHeader: true }));
    frames.push(await webScreen("지출", "지출", webSpend));
    frames.push(await webScreen("일기", "일기", webDiary));
    const darks = []; for (const f of frames) darks.push(await toDark(f));
    const lay = (name, list, y) => {
      const sec = figma.createSection(); sec.name = name; page.appendChild(sec);
      let x = 80, h = 0; for (const f of list) { sec.appendChild(f); f.x = x; f.y = 96; x += f.width + 120; h = Math.max(h, f.height); }
      sec.resizeWithoutConstraints(x - 40, h + 176); sec.x = left; sec.y = y; return sec;
    };
    const s1 = lay("Web · Light", frames, bottom + 200);
    lay("Web · Dark", darks, s1.y + s1.height + 160);
    return "웹 화면 " + frames.length + "개 × Light/Dark";
  } catch (e) { for (const n of [...page.children]) if (!before.has(n.id)) n.remove(); throw e; }
}


// ---------- logo (the real mark and wordmark, as vectors) ----------
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="29" height="27.2" viewBox="152 200 950 890"><g fill="#FB78A2"><circle cx="625" cy="388" r="187"/><circle cx="333" cy="585" r="187"/><circle cx="922" cy="585" r="187"/><circle cx="435" cy="905" r="187"/><circle cx="815" cy="905" r="187"/><circle cx="627" cy="665" r="235"/></g><path d="M490 668L585 770L790 577" fill="none" stroke="#F8F7F2" stroke-width="100" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const WORDMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="124.0" height="22" viewBox="30 120 4406 782"><path fill="#1A1917" d="M347 129Q364 129 379.0 135.0Q394 141 405.5 149.0Q417 157 424.5 165.5Q432 174 435 179Q449 204 468.0 247.0Q487 290 508.5 343.5Q530 397 552.5 457.0Q575 517 596.0 576.5Q617 636 635.0 690.0Q653 744 665 785Q669 802 666.5 818.5Q664 835 656.5 849.0Q649 863 636.5 873.0Q624 883 608 887Q585 893 566.5 890.0Q548 887 534.5 878.5Q521 870 512.0 857.0Q503 844 498 830Q489 801 476.0 758.0Q463 715 448.0 667.0Q433 619 417.5 570.0Q402 521 388.5 479.0Q375 437 364.0 406.5Q353 376 348 366Q344 374 337.5 393.0Q331 412 322.0 439.0Q313 466 302.5 498.5Q292 531 281 567H353Q367 567 377.5 574.5Q388 582 395.5 594.0Q403 606 406.5 621.5Q410 637 410 652Q410 665 407.5 679.5Q405 694 398.0 706.5Q391 719 380.0 727.0Q369 735 352 735H228Q220 763 212.0 787.5Q204 812 199 830Q195 844 186.0 857.0Q177 870 164.0 879.0Q151 888 133.5 891.0Q116 894 94 888Q53 878 38.5 849.0Q24 820 33 785Q45 744 63.0 690.0Q81 636 102.0 576.5Q123 517 145.5 457.0Q168 397 189.5 343.5Q211 290 230.5 247.0Q250 204 264 179Q267 174 274.0 165.5Q281 157 292.0 149.0Q303 141 317.0 135.0Q331 129 347 129Z M970 901Q904 898 852.5 874.5Q801 851 766.0 812.0Q731 773 713.5 719.5Q696 666 699 602Q701 536 724.5 483.5Q748 431 787.0 394.5Q826 358 879.5 339.0Q933 320 995 320Q1005 320 1020.0 320.5Q1035 321 1051.5 321.5Q1068 322 1083.5 323.5Q1099 325 1110 328Q1144 335 1159.0 358.5Q1174 382 1169 417Q1164 452 1143.5 476.5Q1123 501 1087 496Q1079 495 1066.0 493.5Q1053 492 1039.0 491.0Q1025 490 1012.5 489.5Q1000 489 993 489Q965 489 942.5 498.5Q920 508 904.0 524.5Q888 541 879.5 563.0Q871 585 871 609Q871 630 876.5 651.0Q882 672 894.0 689.0Q906 706 925.5 717.5Q945 729 973 732Q1005 735 1035.5 728.5Q1066 722 1089 714Q1106 709 1121.5 710.5Q1137 712 1150.5 720.0Q1164 728 1173.0 741.5Q1182 755 1185 773Q1189 792 1185.5 807.0Q1182 822 1174.5 833.5Q1167 845 1157.0 853.5Q1147 862 1138 867Q1106 887 1060.5 895.0Q1015 903 970 901Z M1592 587Q1592 564 1589.5 546.5Q1587 529 1579.0 517.5Q1571 506 1556.0 500.0Q1541 494 1517 494Q1488 494 1471.5 470.0Q1455 446 1455 410Q1455 392 1460.5 377.0Q1466 362 1474.5 351.0Q1483 340 1493.5 333.5Q1504 327 1515 327H1573Q1672 327 1718.0 386.0Q1764 445 1764 548Q1764 572 1763.5 610.5Q1763 649 1762.5 689.5Q1762 730 1761.5 766.5Q1761 803 1761 823Q1761 830 1757.5 842.0Q1754 854 1744.5 864.5Q1735 875 1718.5 883.0Q1702 891 1675 891Q1653 891 1636.5 884.5Q1620 878 1609.5 868.0Q1599 858 1594.0 846.0Q1589 834 1589 823Q1590 799 1590.5 766.0Q1591 733 1591.5 699.5Q1592 666 1592.0 636.0Q1592 606 1592 587ZM1264 184Q1266 170 1275.0 159.0Q1284 148 1297.0 140.5Q1310 133 1326.0 130.0Q1342 127 1357 129Q1372 131 1386.5 137.0Q1401 143 1412.0 153.0Q1423 163 1428.5 177.0Q1434 191 1432 208Q1429 242 1426.5 290.0Q1424 338 1423.0 393.0Q1422 448 1422.0 506.5Q1422 565 1423.0 621.0Q1424 677 1426.5 727.0Q1429 777 1432 815Q1434 831 1428.0 844.5Q1422 858 1411.0 868.0Q1400 878 1385.5 884.0Q1371 890 1355 891Q1319 893 1292.5 877.5Q1266 862 1263 831Q1260 803 1257.5 756.5Q1255 710 1253.5 652.5Q1252 595 1251.5 531.0Q1251 467 1252.0 404.5Q1253 342 1256.0 284.5Q1259 227 1264 184Z M2059 404Q2062 502 2063.0 603.5Q2064 705 2059 824Q2058 838 2049.5 850.5Q2041 863 2028.0 872.5Q2015 882 1998.5 887.0Q1982 892 1966 891Q1933 889 1909.5 868.5Q1886 848 1886 817Q1888 761 1888.5 710.0Q1889 659 1889.0 609.5Q1889 560 1888.5 510.5Q1888 461 1887 408Q1887 378 1909.5 359.0Q1932 340 1964 337Q1981 335 1998.0 339.0Q2015 343 2028.5 351.0Q2042 359 2050.5 372.5Q2059 386 2059 404ZM2060 218Q2059 236 2050.5 249.0Q2042 262 2029.0 270.5Q2016 279 1999.0 282.5Q1982 286 1964 285Q1931 282 1910.0 265.5Q1889 249 1888 225L1887 186Q1886 170 1894.0 157.5Q1902 145 1914.5 137.0Q1927 129 1941.5 124.5Q1956 120 1969 120Q2001 120 2029.5 133.5Q2058 147 2060 175Z M2155 611Q2155 549 2173.0 495.5Q2191 442 2226.5 403.0Q2262 364 2314.0 341.5Q2366 319 2433 319Q2483 319 2530.0 336.0Q2577 353 2613.5 386.5Q2650 420 2673.0 470.5Q2696 521 2698 588Q2699 635 2678.0 660.5Q2657 686 2613 686H2428Q2400 686 2387.0 665.0Q2374 644 2374 616Q2374 588 2389.0 565.5Q2404 543 2430 543H2525Q2525 531 2520.5 517.0Q2516 503 2506.5 491.5Q2497 480 2480.0 472.5Q2463 465 2437 465Q2386 465 2357.0 499.5Q2328 534 2328 611Q2328 685 2358.0 719.0Q2388 753 2443 756Q2470 758 2500.5 752.5Q2531 747 2560 731Q2575 724 2591.0 723.0Q2607 722 2621.0 727.0Q2635 732 2645.5 744.0Q2656 756 2661 774Q2666 791 2662.0 805.5Q2658 820 2650.5 831.0Q2643 842 2634.0 849.5Q2625 857 2619 860Q2582 882 2533.0 893.0Q2484 904 2433 901Q2359 897 2306.0 872.5Q2253 848 2219.5 809.0Q2186 770 2170.5 719.0Q2155 668 2155 611Z M2998 891Q2962 891 2939.0 880.0Q2916 869 2902 846Q2887 823 2864.0 774.5Q2841 726 2815.5 666.0Q2790 606 2766.0 541.5Q2742 477 2727 421Q2721 402 2725.5 387.0Q2730 372 2740.0 360.5Q2750 349 2764.0 341.0Q2778 333 2791 330Q2822 322 2851.5 331.5Q2881 341 2892 374Q2901 402 2911.0 437.5Q2921 473 2932.0 510.0Q2943 547 2954.5 583.5Q2966 620 2978 651Q2986 671 2997.0 671.0Q3008 671 3016 652Q3028 621 3040.5 584.5Q3053 548 3065.0 511.0Q3077 474 3087.5 438.5Q3098 403 3105 375Q3113 346 3141.5 334.0Q3170 322 3205 330Q3220 333 3234.5 341.5Q3249 350 3259.0 362.5Q3269 375 3273.0 391.0Q3277 407 3272 426Q3254 491 3230.0 556.0Q3206 621 3180.5 677.5Q3155 734 3130.5 778.5Q3106 823 3088 847Q3075 867 3052.5 879.0Q3030 891 2998 891Z M3296 611Q3296 549 3314.0 495.5Q3332 442 3367.5 403.0Q3403 364 3455.0 341.5Q3507 319 3574 319Q3624 319 3671.0 336.0Q3718 353 3754.5 386.5Q3791 420 3814.0 470.5Q3837 521 3839 588Q3840 635 3819.0 660.5Q3798 686 3754 686H3569Q3541 686 3528.0 665.0Q3515 644 3515 616Q3515 588 3530.0 565.5Q3545 543 3571 543H3666Q3666 531 3661.5 517.0Q3657 503 3647.5 491.5Q3638 480 3621.0 472.5Q3604 465 3578 465Q3527 465 3498.0 499.5Q3469 534 3469 611Q3469 685 3499.0 719.0Q3529 753 3584 756Q3611 758 3641.5 752.5Q3672 747 3701 731Q3716 724 3732.0 723.0Q3748 722 3762.0 727.0Q3776 732 3786.5 744.0Q3797 756 3802 774Q3807 791 3803.0 805.5Q3799 820 3791.5 831.0Q3784 842 3775.0 849.5Q3766 857 3760 860Q3723 882 3674.0 893.0Q3625 904 3574 901Q3500 897 3447.0 872.5Q3394 848 3360.5 809.0Q3327 770 3311.5 719.0Q3296 668 3296 611Z M3893 611Q3893 549 3911.0 495.5Q3929 442 3964.5 403.0Q4000 364 4052.0 341.5Q4104 319 4171 319Q4221 319 4268.0 336.0Q4315 353 4351.5 386.5Q4388 420 4411.0 470.5Q4434 521 4436 588Q4437 635 4416.0 660.5Q4395 686 4351 686H4166Q4138 686 4125.0 665.0Q4112 644 4112 616Q4112 588 4127.0 565.5Q4142 543 4168 543H4263Q4263 531 4258.5 517.0Q4254 503 4244.5 491.5Q4235 480 4218.0 472.5Q4201 465 4175 465Q4124 465 4095.0 499.5Q4066 534 4066 611Q4066 685 4096.0 719.0Q4126 753 4181 756Q4208 758 4238.5 752.5Q4269 747 4298 731Q4313 724 4329.0 723.0Q4345 722 4359.0 727.0Q4373 732 4383.5 744.0Q4394 756 4399 774Q4404 791 4400.0 805.5Q4396 820 4388.5 831.0Q4381 842 4372.0 849.5Q4363 857 4357 860Q4320 882 4271.0 893.0Q4222 904 4171 901Q4097 897 4044.0 872.5Q3991 848 3957.5 809.0Q3924 770 3908.5 719.0Q3893 668 3893 611Z"/></svg>`;
/** A component from an SVG: its layers moved in, sized to the SVG. */
function svgComp(name, svg) {
  const n = figma.createNodeFromSvg(svg);
  const c = figma.createComponent(); c.name = name; c.resize(n.width, n.height); c.fills = []; c.clipsContent = false;
  for (const k of [...n.children]) c.appendChild(k);
  n.remove();
  return c;
}
/** Light paints inside `root` swapped for their Dark twins (by variable name); shadows for their dark styles. */
async function darken(root) {
  const byId = {}; for (const [n, v] of Object.entries(L)) if (DK[n]) byId[v.id] = DK[n];
  const fx = { [EFX["Shadow/surface"].id]: EFX["Shadow/surface (dark)"], [EFX["Shadow/float"].id]: EFX["Shadow/float (dark)"] };
  let n = 0;
  for (const node of [root, ...root.findAll(() => true)]) {
    for (const prop of ["fills", "strokes"]) {
      const ps = node[prop];
      if (!Array.isArray(ps) || !ps.some((p) => p.boundVariables && p.boundVariables.color && byId[p.boundVariables.color.id])) continue;
      node[prop] = ps.map((p) => { const id = p.boundVariables && p.boundVariables.color && p.boundVariables.color.id; return id && byId[id] ? figma.variables.setBoundVariableForPaint(p, "color", byId[id]) : p; });
      n++;
    }
    if (typeof node.effectStyleId === "string" && fx[node.effectStyleId]) { await node.setEffectStyleIdAsync(fx[node.effectStyleId].id); n++; }
  }
  return n;
}
async function cLogo() {
  const mark = svgComp("Logo/Mark", MARK_SVG);
  for (const n of mark.findAll((x) => x.type === "ELLIPSE" || (x.fills && x.fills.length && x.type !== "VECTOR"))) if (n.type === "ELLIPSE") fill(n, "petal/pink");
  for (const n of mark.findAll((x) => x.type === "GROUP" || x.type === "FRAME")) if (n.fills && n.fills.length) n.fills = [];
  mark.description = "The flower mark: pink petals with a check. Use at 20px or larger.";
  const word = svgComp("Logo/Wordmark", WORDMARK_SVG);
  for (const n of word.findAll((x) => x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION")) fill(n, "foreground/normal");
  word.description = "The Achievee wordmark (AchieveeMark face, outlined). Its colour follows foreground/normal.";
  const lock = autoComp("Logo", "HORIZONTAL", { align: "CENTER" }); lock.itemSpacing = 9;
  lock.appendChild(mark.createInstance()); lock.appendChild(word.createInstance());
  lock.description = "Mark + wordmark lockup (mark left, gap 0.4 × wordmark height).";
  for (const c of [mark, word, lock]) PAGE.appendChild(c);
  HAVE["Logo/Mark"] = mark; HAVE["Logo/Wordmark"] = word;
  place("Logo", [lock, mark, word]);
  return lock;
}
/** Put the real logo where an earlier run used the flower and a text stand-in, and fix the dark screens' colours. */
async function stepLogoFix() {
  const lock = HAVE["Logo"], mark = HAVE["Logo/Mark"];
  if (!lock) throw new Error("Logo 컴포넌트가 없어요");
  const out = [];
  const nav = HAVE["SideNav"];
  if (nav) {
    const slot = nav.findOne((n) => n.name === "Logo" && n.type === "FRAME");
    let has = false;
    if (slot) for (const n of slot.findAll((x) => x.type === "INSTANCE")) { const m = await n.getMainComponentAsync(); if (m && m.id === lock.id) has = true; }
    if (slot && !has) {
      for (const k of [...slot.children]) k.remove();
      slot.appendChild(lock.createInstance()); out.push("SideNav 로고 교체");
    }
  }
  const cover = await figma.getNodeByIdAsync(IDS.cover);
  await cover.loadAsync();
  const cf = cover.children.find((n) => n.name === "Cover · Achievee DS");
  if (cf && mark) {
    let old = null;
    for (const n of cf.children) if (n.type === "INSTANCE") { const m = await n.getMainComponentAsync(); if (m && m.parent && m.parent.name === "DayFlower") old = n; }
    if (old) { const i = mark.createInstance(); cf.insertChild(cf.children.indexOf(old), i); old.remove(); i.rescale(96 / i.width); out.push("Cover 마크 교체"); }
  }
  let fixed = 0;
  const screens = await figma.getNodeByIdAsync(IDS.screens);
  await screens.loadAsync();
  for (const sec of screens.children) if (sec.type === "SECTION" && / · Dark$/.test(sec.name)) fixed += await darken(sec);
  if (fixed) out.push("다크 화면 색 " + fixed + "곳 정리");
  return out.join(", ") || "바꿀 것 없음";
}

/**
 * Three pages (the Starter limit), each with one job: "Cover · Foundations" (the cover frame beside the tokens),
 * "Components", and "Screens". Moves the cover frame off the first page, renames, and orders the pages.
 */
async function stepPages() {
  const scr = await figma.getNodeByIdAsync(IDS.screens), fnd = await figma.getNodeByIdAsync(IDS.foundations), cmp = await figma.getNodeByIdAsync(IDS.components);
  if (!scr || !fnd || !cmp) throw new Error("페이지를 찾지 못했어요");
  await scr.loadAsync(); await fnd.loadAsync();
  const out = [];
  const cover = scr.children.find((n) => n.name === "Cover · Achievee DS");
  if (cover) {
    let minX = Infinity, minY = Infinity;
    for (const n of fnd.children) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); }
    if (!isFinite(minX)) { minX = 0; minY = 0; }
    fnd.appendChild(cover); cover.x = minX - cover.width - 200; cover.y = minY;
    out.push("Cover를 Foundations 페이지로 이동");
  }
  if (fnd.name !== "Cover · Foundations") { fnd.name = "Cover · Foundations"; out.push("페이지 이름 정리"); }
  scr.name = "Screens"; cmp.name = "Components";
  figma.root.insertChild(0, fnd); figma.root.insertChild(1, cmp); figma.root.insertChild(2, scr);
  return out.join(", ") || "이미 정리됨";
}

// ---------- run ----------
/** Runs a page builder; if it throws, removes the half-built frame so the next run starts clean. */
async function clean(name, pageId, fn) {
  try { return await fn(); }
  catch (e) {
    const page = await figma.getNodeByIdAsync(pageId);
    if (page) for (const n of [...page.children]) if (n.name === name) n.remove();
    throw e;
  }
}
async function step(name, fn) {
  try { const r = await fn(); log("✓ " + name + (r ? " — " + r : "")); return true; }
  catch (e) { log("✗ " + name + ": " + (e && e.message ? e.message : e)); console.error(e); return false; }
}

(async () => {
  log("시작…");
  for (const style of ["Regular", "Medium", "Bold", "Black"]) { try { await figma.loadFontAsync({ family: "Noto Sans KR", style }); } catch (e) { log("✗ 글꼴 Noto Sans KR " + style + " 없음"); } }
  await refresh();
  await step("토큰 두 층 (Primitives → Light/Dark)", stepTokens);
  await refresh();
  await step("텍스트·그림자 스타일 추가", stepStyles);
  await step("Typography 변수", stepTypography);
  await step("기존 컴포넌트 속성 이름 정리", stepRenameProps);
  await compsPage();
  const slot = await build(".slot/Content", cSlot);
  if (slot) await build("Surface", () => cSurface(slot));
  await build("Tabs", cTabs);
  const tag = await build("Tag", cTag);
  await build("ListRow", cListRow);
  await build("EventRow", cEventRow);
  if (tag) await build("EntryCard", () => cEntryCard(tag));
  await build("ConfirmDialog", cDialog);
  await build("DayFlower", cDayFlower);
  await build("Logo", cLogo);
  await build("AppHeader", cPatterns);
  await build("SideNav", cWebPatterns);
  await step("페이지 정리 (Cover · Foundations / Components / Screens)", stepPages);
  await step("Foundations 페이지", () => clean("Foundations · Tokens", IDS.foundations, stepFoundations));
  await step("Cover", () => clean("Cover · Achievee DS", IDS.cover, stepCover));
  await compsPage();
  await step("화면 조립 (휴대폰 · Light/Dark)", stepScreens);
  await step("화면 조립 (웹 · Light/Dark)", stepWeb);
  await step("로고 교체 · 다크 색 정리", stepLogoFix);
  log("끝. ✗ 줄이 있으면 '로그 복사'를 눌러 붙여 주세요. 다시 실행해도 이미 된 건 건너뜁니다.");
})();
