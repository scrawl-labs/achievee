// Achievee DS Builder — a development plugin that finishes the design system in the
// "Achievee Design System" Figma file without the MCP call limit. Every step is idempotent:
// it skips what already exists, and a step that fails removes what it half-made, so it can be run again.
figma.showUI(__html__, { width: 440, height: 500 });
const log = (s) => figma.ui.postMessage({ s });

const IDS = {
  light: "VariableCollectionId:2:71", dark: "VariableCollectionId:2:93", size: "VariableCollectionId:2:115",
  cover: "0:1", foundations: "2:138", components: "2:139",
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

async function stepCover() {
  const page = await figma.getNodeByIdAsync(IDS.cover);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  const old = page.children.find((n) => n.name === "Cover · Achievee DS");
  const fl = HAVE && HAVE["DayFlower"];
  const flowerOf = (f) => { const i = pick(fl, { level: "3" }).createInstance(); i.setProperties({ [propKey(fl, "Show count", "BOOLEAN")]: false }); f.insertChild(0, i); i.rescale(2.5); };
  if (old) {
    // an earlier run made the cover before DayFlower existed: add the flower now
    if (fl && fl.type === "COMPONENT_SET" && !old.findOne((n) => n.type === "INSTANCE")) { flowerOf(old); return "꽃 추가"; }
    return "이미 있음";
  }
  let right = 0; for (const n of page.children) right = Math.max(right, n.x + n.width);
  const f = al("Cover · Achievee DS", "VERTICAL", { gap: 24, pad: [120, 120, 120, 120], justify: "CENTER" });
  f.resize(1600, 960); f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "FIXED";
  fill(f, "background/canvas"); page.appendChild(f); f.x = right ? right + 200 : 0; f.y = 0;
  if (fl && fl.type === "COMPONENT_SET") flowerOf(f);
  f.appendChild(await txt("Achievee Design System", "Display/display-1", "foreground/normal"));
  f.appendChild(await txt("토큰 · 컴포넌트 · 화면 — Light / Dark", "Text/writing", "foreground/alternative"));
  f.appendChild(await txt("v2 · 2026.11 · Noto Sans KR (Pretendard 대체) · 코드: packages/ui", "Text/caption", "foreground/hint"));
  try { await figma.setFileThumbnailNodeAsync(f); } catch (e) { /* thumbnail is optional */ }
  return "완료";
}

// ---------- app patterns (built from the components above) ----------
const SETS = {};
async function loadSets() {
  for (const [k, id] of Object.entries({ button: IDS.button, iconButton: IDS.iconButton, checkbox: IDS.checkbox, chip: IDS.chip })) SETS[k] = await figma.getNodeByIdAsync(id);
  for (const k of ["Tabs", "Tabs.Item", "Tag", "ListRow", "DayHeader", "EventRow", "EntryCard", "DayFlower", "AppHeader", "TabBar", "TabBar.Item", "TodoRow"]) if (HAVE[k]) SETS[k] = HAVE[k];
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

async function homeBody(b) {
  // three stats
  const stats = box("Stats", { dir: "HORIZONTAL", gap: 0, pad: [0, 0, 0, 0] }); await shadow(stats); fillW(b, stats); stats.clipsContent = true;
  let i = 0;
  for (const [k, v] of [["달성률", "35%"], ["완료", "17 / 48"], ["연속 달성", "0일"]]) {
    const cell = al(k, "VERTICAL", { gap: 2, pad: [12, 12, 12, 12] }); fillW(stats, cell);
    if (i++) { cell.strokes = [paint(L["border/line"])]; cell.strokeAlign = "INSIDE"; cell.strokeLeftWeight = 1; cell.strokeTopWeight = 0; cell.strokeRightWeight = 0; cell.strokeBottomWeight = 0; }
    cell.appendChild(await txt(k, "Text/caption", "foreground/alternative"));
    cell.appendChild(await txt(v, "Text/dialog-title", "foreground/normal"));
  }
  // upcoming
  const up = box("Upcoming", { gap: 8 }); await shadow(up); fillW(b, up);
  const left = al("Title", "HORIZONTAL", { gap: 6, align: "CENTER" });
  left.appendChild(await txt("다가오는 일정", "Text/heading", "foreground/normal")); left.appendChild(await txt("앞으로 2주", "Text/caption", "foreground/hint"));
  const head = await rowLR(left, btn("일정 추가", { icon: "plus" })); fillW(up, head);
  for (const [bt, badge, t, m] of [["now", "오늘", "치과 예약", "11. 26. (목) · 18:00"], ["default", "D-2", "할아버지 제사", "11. 28. (토) · 19:15"], ["default", "D-5", "골프 라운딩", "12. 1. (화) · 07:00"]]) {
    const e = use(SETS.EventRow, { tone: "own", badgeTone: bt }, { Badge: badge, Title: t, Meta: m }); fillW(up, e);
  }
  up.appendChild(await txt("Google 일정 7개 · 전체 보기", "Text/caption", "foreground/alternative"));
  // month of flowers
  const mon = box("Month", { gap: 6 }); await shadow(mon); fillW(b, mon);
  const wk = al("Weekdays", "HORIZONTAL"); fillW(mon, wk);
  for (const [d, c] of [["월"], ["화"], ["수"], ["목"], ["금"], ["토", "accent/normal"], ["일", "status/danger"]]) {
    const t = await txt(d, "Text/caption", c || "foreground/alternative"); fillW(wk, t); t.textAlignHorizontal = "CENTER";
  }
  const levels = [3, 0, 1, 2, 0, 3, 4, 1, 0, 2, 3, 0, 1, 2, 3, 0, 0, 1, 3, 2, 0, 1, 2, 3, 1, 0, 0, 0, 0, 0];
  const counts = [2, 0, 1, 2, 0, 2, 3, 1, 0, 2, 1, 0, 1, 2, 2, 0, 0, 1, 2, 2, 0, 1, 2, 1, 0, 0, null, null, null, null];
  const days = [null, null, null, null, null, null, 1]; for (let d = 2; d <= 30; d++) days.push(d);
  while (days.length % 7) days.push(null);
  for (let w = 0; w < days.length / 7; w++) {
    const row = al("Week " + (w + 1), "HORIZONTAL"); fillW(mon, row);
    for (let c = 0; c < 7; c++) {
      const d = days[w * 7 + c];
      const cell = al(d ? String(d) : "empty", "VERTICAL", { gap: 2, align: "CENTER", pad: [4, 0, 4, 0] }); fillW(row, cell);
      if (!d) continue;
      const lv = d <= 26 ? levels[d - 1] : 0;
      const f = use(SETS.DayFlower, { level: String(lv) }, { Count: String(counts[d - 1] ?? 0), "Show count": counts[d - 1] != null && d <= 26 });
      cell.appendChild(f); f.rescale(0.8);
      const n = await txt(String(d), "Text/caption-strong", c === 5 ? "accent/normal" : c === 6 ? "status/danger" : "foreground/alternative");
      if (d === 26) { const dot = al("Today", "HORIZONTAL", { justify: "CENTER", align: "CENTER" }); dot.resize(22, 22); dot.primaryAxisSizingMode = "FIXED"; dot.counterAxisSizingMode = "FIXED"; rad(dot, "pill"); fill(dot, "accent/normal"); n.fills = [paint(L["accent/on-accent"])]; dot.appendChild(n); cell.appendChild(dot); fill(cell, "accent/soft"); cell.cornerRadius = 10; }
      else cell.appendChild(n);
    }
  }
  // the day
  const day = box("Day", { gap: 12, pad: [20, 16, 20, 16] }); await shadow(day); fillW(b, day);
  const dh = al("Date", "HORIZONTAL", { gap: 8, align: "CENTER" });
  dh.appendChild(await txt("11월 26일", "Text/title", "foreground/normal")); dh.appendChild(await txt("목요일", "Text/caption", "foreground/hint")); day.appendChild(dh);
  fillW(day, await rowLR(await txt("오늘 할 일", "Text/label", "foreground/normal"), await txt("3/5", "Text/caption-strong", "foreground/alternative")));
  for (const [t, done, src] of [["은행 서류 제출", false, null], ["영어 단어", false, "Google"], ["택배 반품", true, null], ["운동 30분", true, "Google"], ["책 20쪽", true, "Google"]]) {
    const r = use(SETS.TodoRow, { done: String(done) }, { Text: t, Source: src || "", "Show source": !!src }); fillW(day, r);
  }
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
}

async function spendBody(b) {
  const sum = box("Summary", { gap: 0, pad: [0, 0, 0, 0] }); await shadow(sum); fillW(b, sum); sum.clipsContent = true;
  const cells = [["수입", "₩3,200,000"], ["지출", "₩83,550"], ["저축·투자", "₩0"], ["남은 돈", "₩3,116,450"]];
  for (let r = 0; r < 2; r++) {
    const row = al("Row", "HORIZONTAL"); fillW(sum, row);
    if (r) { row.strokes = [paint(L["border/line"])]; row.strokeAlign = "INSIDE"; row.strokeTopWeight = 1; row.strokeLeftWeight = 0; row.strokeRightWeight = 0; row.strokeBottomWeight = 0; }
    for (let c = 0; c < 2; c++) {
      const [k, v] = cells[r * 2 + c];
      const cell = al(k, "VERTICAL", { gap: 2, pad: [12, 12, 12, 12] }); fillW(row, cell);
      if (c) { cell.strokes = [paint(L["border/line"])]; cell.strokeAlign = "INSIDE"; cell.strokeLeftWeight = 1; cell.strokeTopWeight = 0; cell.strokeRightWeight = 0; cell.strokeBottomWeight = 0; }
      cell.appendChild(await txt(k, "Text/caption", "foreground/alternative")); cell.appendChild(await txt(v, "Text/dialog-title", "foreground/normal"));
    }
  }
  const bud = box("Budget", { gap: 16, pad: [20, 16, 20, 16] }); await shadow(bud); fillW(b, bud);
  const bl = al("Title", "HORIZONTAL", { gap: 6, align: "CENTER" }); bl.appendChild(await txt("지출 목표", "Text/heading", "foreground/normal")); bl.appendChild(await txt("고정비 제외", "Text/caption", "foreground/hint"));
  fillW(bud, await rowLR(bl, btn("수정")));
  for (const [k, range, spent, limit, ratio, msg] of [["주", "11월 23일 – 11월 29일", "₩27,850", "₩189,000", 0.15, "남은 돈 ₩161,150"], ["월", "11월 1일 – 11월 30일", "₩79,050", "₩810,000", 0.1, "남은 돈 ₩730,950"]]) {
    const line = al("Goal · " + k, "VERTICAL", { gap: 6 }); fillW(bud, line);
    const l = al("Label", "HORIZONTAL", { gap: 6, align: "CENTER" }); l.appendChild(await txt(k, "Text/body-strong", "foreground/normal")); l.appendChild(await txt(range, "Text/caption", "foreground/hint"));
    const r = al("Amount", "HORIZONTAL", { gap: 2, align: "CENTER" }); r.appendChild(await txt(spent, "Text/body-strong", "foreground/normal")); r.appendChild(await txt(" / " + limit, "Text/caption", "foreground/hint"));
    fillW(line, await rowLR(l, r));
    const track = al("Bar", "HORIZONTAL"); fillW(line, track); track.resize(track.width, 8); track.counterAxisSizingMode = "FIXED"; track.primaryAxisSizingMode = "FIXED"; fill(track, "background/sunk"); rad(track, "pill"); track.clipsContent = true;
    track.layoutSizingHorizontal = "FILL";
    const bar = figma.createRectangle(); bar.name = "Spent"; bar.resize(Math.round(326 * ratio), 8); fill(bar, "accent/normal"); rad(bar, "pill"); track.appendChild(bar);
    line.appendChild(await txt(msg, "Text/caption", "foreground/alternative"));
  }
  fillW(b, await rowLR(await txt("새 지출", "Text/label", "foreground/normal"), iconBtn("plus", { variant: ["soft", "ghost"] })));
  const chips = al("Filters", "HORIZONTAL", { gap: 8 }); b.appendChild(chips);
  ["전체", "불필요만", "식비", "문화", "카페"].forEach((l, i) => chips.appendChild(use(SETS.chip, { variant: i === 0 ? ["selected", "on", "active"] : ["default"], disabled: "false", "state(design only)": "default" }, { Label: l, Removable: false })));
  const data = [["11월 26일 (목)", "−₩12,000", [["점심", "식비", "₩12,000", true, "food"]]], ["11월 25일 (수)", "−₩4,500", [["아메리카노", "카페", "₩4,500", false, "cafe"]]], ["11월 24일 (화)", "−₩1,450", [["지하철", "교통", "₩1,450", true, "bus"]]], ["11월 23일 (월)", "−₩9,900", [["양말", "쇼핑", "₩9,900", false, "bag"]]]];
  for (const [d, total, rows] of data) {
    const g = al("Day · " + d, "VERTICAL", { gap: 0 }); fillW(b, g);
    fillW(g, use(SETS.DayHeader, null, { Day: d, Total: total }));
    const list = box("List", { gap: 0, pad: [0, 0, 0, 0] }); await shadow(list); fillW(g, list); list.clipsContent = true;
    rows.forEach(([t, k, a, flag], i) => fillW(list, use(SETS.ListRow, { flag: String(flag), tone: "default", "state(design only)": "default" }, { Title: t, Category: k, Amount: a, Divider: i > 0 })));
  }
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

async function diaryBody(b) {
  const tabs = use(SETS.Tabs, { variant: "line" }); b.appendChild(tabs);
  const lk = propKey(SETS["Tabs.Item"], "Label", "TEXT");
  ["일기", "주간 회고", "내 감정"].forEach((l, i) => { const t = tabs.children[i]; if (t && t.type === "INSTANCE" && lk) t.setProperties({ [lk]: l }); });
  const card = box("Today", { gap: 14, pad: [20, 16, 20, 16] }); await shadow(card); fillW(b, card);
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
  for (const [t, cur, prev, tags] of [["11월 26일", true, "오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.", true], ["11월 25일", false, "비가 와서 하루 종일 집에 있었다. 밀린 책을 읽었다.", false], ["11월 24일", false, "운동을 다시 시작했다. 몸이 무겁지만 기분은 좋다.", true]]) {
    fillW(b, use(SETS.EntryCard, { open: "false", current: String(cur) }, { Title: t, Preview: prev, "Show tags": tags, "Show mood": false }));
  }
}

/** A copy of a light frame with every Light colour swapped for the Dark one of the same name, and shadows for their dark versions. */
async function toDark(frame) {
  const d = frame.clone(); d.name = frame.name + " · Dark";
  const byId = {}; for (const [n, v] of Object.entries(L)) if (DK[n]) byId[v.id] = DK[n];
  const fx = { [EFX["Shadow/surface"].id]: EFX["Shadow/surface (dark)"], [EFX["Shadow/float"].id]: EFX["Shadow/float (dark)"] };
  let n = 0;
  for (const node of [d, ...d.findAll(() => true)]) {
    for (const prop of ["fills", "strokes"]) {
      const ps = node[prop];
      if (!Array.isArray(ps) || !ps.some((p) => p.boundVariables && p.boundVariables.color && byId[p.boundVariables.color.id])) continue;
      node[prop] = ps.map((p) => { const id = p.boundVariables && p.boundVariables.color && p.boundVariables.color.id; return id && byId[id] ? figma.variables.setBoundVariableForPaint(p, "color", byId[id]) : p; });
      n++;
    }
    if (typeof node.effectStyleId === "string" && fx[node.effectStyleId] && fx[node.effectStyleId]) { await node.setEffectStyleIdAsync(fx[node.effectStyleId].id); n++; }
  }
  return d;
}

async function stepScreens() {
  await loadSets();
  for (const k of ["AppHeader", "TabBar", "TabBar.Item", "TodoRow", "Tabs", "Tabs.Item", "Tag", "ListRow", "DayHeader", "EventRow", "EntryCard", "DayFlower"]) if (!SETS[k]) throw new Error(k + " 컴포넌트가 없어요");
  const page = await figma.getNodeByIdAsync(IDS.cover);
  await page.loadAsync(); await figma.setCurrentPageAsync(page);
  if (page.children.some((n) => n.name === "Screens · Light")) return "이미 있음";
  if (page.name === "Cover" || page.name === "🖼 Cover") page.name = "Cover · Screens";
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
  await build("AppHeader", cPatterns);
  await step("Foundations 페이지", () => clean("Foundations · Tokens", IDS.foundations, stepFoundations));
  await step("Cover", () => clean("Cover · Achievee DS", IDS.cover, stepCover));
  await compsPage();
  await step("화면 조립 (휴대폰 · Light/Dark)", stepScreens);
  log("끝. ✗ 줄이 있으면 '로그 복사'를 눌러 붙여 주세요. 다시 실행해도 이미 된 건 건너뜁니다.");
})();
