# Mallow's pictures

Mallow is not drawn in the browser: every place is rendered ahead of time in Blender Cycles and the app shows
the pictures (`public/mallow/`), swapping only the face area for each expression. These scripts make them.

| File | What it does |
| --- | --- |
| `mallow_places.py` | Builds Mallow (a soft marshmallow body, face, arms, the jar of feelings) and one of the places, then renders. `MODE` is `base` (the whole picture plus a JSON of where the face, head and jar are), `patch` (only the face area, for one expression) or `cutout` (Mallow alone on transparent). `PLACE` picks the scene: meadow, forest, subway, rain, beach. |
| `render_place.sh` | Renders everything one place needs: both views (`wide` 1920×1080, `tall` 1080×1920) and the seven faces (idle, blink, talk, happy, joy, sad, think). Skips what is already rendered. |
| `post_place.py` | Turns a place's renders into the app's WebP files in `public/mallow/<place>/` and checks every face patch matches the face box. |
| `ui_assets.py` | The small UI pieces on Mallow's screen, as PNGs: the glass progress beads and the cork name tag. Saved as WebP in `public/mallow/ui/`. |
| `places/advert.png` | The poster in the rainy bus stop. |

Mallow and the camera stand in the same spot in every place, so the face, head and jar positions are shared; they
live in `src/lib/mallowScene.ts` (`MALLOW_VIEWS`). If Mallow or the camera moves, update those numbers from the
JSON that a `base` render writes.

Adding a place: write a `place_<name>()` in `mallow_places.py`, render it, run `post_place.py`, then add the name to
`MALLOW_PLACES` in `src/lib/mallowScene.ts` and its lines (`buddy.hi…`, `buddy.result…`, `buddy.map…`, `buddy.load…`)
to `src/lib/i18n.ts` and `src/lib/i18n-zh.ts`.
