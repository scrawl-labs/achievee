/**
 * Mallow's meadow, rendered ahead of time in Blender Cycles: one full picture per view, and the face area alone
 * for each expression (same camera), which drops exactly onto the picture. Positions are pixels in the full picture.
 * Generated from the renders' metadata; re-render to change.
 */
export type MallowView = "wide" | "tall";
export const MALLOW_FACES = ["idle", "blink", "talk", "happy", "joy", "sad", "think"] as const;
export type MallowFace = (typeof MALLOW_FACES)[number];
type ViewMeta = { w: number; h: number; face: [number, number, number, number]; head: [number, number]; jar: [number, number] };

export const MALLOW_VIEWS: Record<MallowView, ViewMeta> = {
  wide: { w: 1920, h: 1080, face: [714, 180, 1185, 480], head: [1092, 192], jar: [924, 522] },
  tall: { w: 1080, h: 1920, face: [348, 474, 717, 720], head: [639, 495], jar: [519, 741] },
};

export const mallowSrc = (view: MallowView, part: MallowFace | "base") => `/mallow/meadow/${view}-${part}.webp`;
