"""Turn one place's renders into the app's WebP files: public/mallow/<place>/<view>-<part>.webp. Checks the face boxes match."""
import json, os, sys
from PIL import Image
src, repo, place = sys.argv[1], sys.argv[2], sys.argv[3]
out = f"{repo}/public/mallow/{place}"
os.makedirs(out, exist_ok=True)
for v in ("wide", "tall"):
    m = json.load(open(f"{src}/base_{v}.json"))
    Image.open(f"{src}/base_{v}.png").convert("RGB").save(f"{out}/{v}-base.webp", quality=84, method=6)
    for f in ["idle", "blink", "talk", "happy", "joy", "sad", "think"]:
        im = Image.open(f"{src}/face_{v}_{f}.png").convert("RGB")
        x0, y0, x1, y1 = m["face"]
        assert im.size == (x1 - x0, y1 - y0), (place, v, f, im.size, m["face"])
        im.save(f"{out}/{v}-{f}.webp", quality=90, method=6)
    print(place, v, m["face"], m["head"], m["jar"])
print(place, sum(os.path.getsize(f"{out}/{x}") for x in os.listdir(out)) // 1024, "KB")
