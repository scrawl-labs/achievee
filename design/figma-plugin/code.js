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

const MALLOW_PNG = "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";
async function stepCover() {
  const page = await figma.getNodeByIdAsync(IDS.cover);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  const old = page.children.find((n) => n.name === "Cover · Achievee DS");
  if (old && old.findOne((n) => n.name === "Mallow cutout")) return "이미 있음";
  let x0, y0;
  if (old) { x0 = old.x; y0 = old.y; old.remove(); }
  else { let minX = Infinity, minY = Infinity; for (const n of page.children) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); } x0 = isFinite(minX) ? minX - 1800 : 0; y0 = isFinite(minY) ? minY : 0; }
  const W = 1600, H = 1040;
  const f = figma.createFrame(); f.name = "Cover · Achievee DS"; page.appendChild(f); f.resize(W, H); f.x = x0; f.y = y0; f.clipsContent = true;
  fill(f, "background/canvas");
  // the logo on the left, Mallow standing on the page itself (no card): a cut-out plus a soft ground shadow
  if (HAVE["Logo"]) { const lg = HAVE["Logo"].createInstance(); f.appendChild(lg); lg.rescale(3.2); lg.x = 150; lg.y = Math.round((H - lg.height) / 2); }
  const ground = figma.createEllipse(); ground.name = "Ground shadow"; f.appendChild(ground); ground.resize(470, 64); ground.x = 965; ground.y = 800;
  fill(ground, "foreground/normal", 0.1);
  ground.effects = [{ type: "LAYER_BLUR", radius: 44, visible: true }];
  const m = figma.createRectangle(); m.name = "Mallow cutout"; f.appendChild(m); m.resize(596, 600); m.x = 900; m.y = 220;
  const img = figma.createImage(figma.base64Decode(MALLOW_PNG));
  m.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FIT" }];
  try { await figma.setFileThumbnailNodeAsync(f); } catch (e) { /* thumbnail is optional */ }
  return "표지: 로고 + Mallow (배경 없이)";
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
