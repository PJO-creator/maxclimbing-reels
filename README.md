# Max Climbing reels

Instagram reels (1080×1920, 30 fps) generated with [Remotion](https://www.remotion.dev). All text lives in `data/*.json`; change the text and re-render, no video editing needed.

## Compositions

| id | file | what |
|---|---|---|
| `pps` | `src/PPSReel.tsx` + `data/pps.json` | Version A: product reel (clip → product → schema → tilt → price + link in bio) |
| `pps-learn` | `src/PPSLearn.tsx` + `data/pps-learn.json` | Version B: "how to train" reel, no price |

## Assets

- `public/clips/` – cleaned product clips (cropped, colour-corrected, denoised, muted)
- `public/products/<product>/` – product photos from Shopify
- `public/brand/` – logo (brand red `#A10303`)

## Render

```bash
npm install
npx remotion studio                                   # preview in the browser
npx remotion render src/index.ts pps out/pps.mp4 --muted
npx remotion render src/index.ts pps-learn out/pps-learn.mp4 --muted
```

Videos have no audio on purpose: add music in Instagram when posting.

## Cleaning a raw clip

```bash
ffmpeg -i raw.mp4 -vf "crop=900:1600:100:110,scale=1080:1920:flags=lanczos,hqdn3d=1.5:1.5:4:4,eq=contrast=1.07:saturation=1.12:gamma=1.03,colorbalance=rm=-0.03:bm=0.03:rh=-0.02:bh=0.02,unsharp=5:5:0.5" -an -c:v libx264 -crf 17 -pix_fmt yuv420p public/clips/name_clean.mp4
```

The crop values assume a static phone shot in the Ghent shop; adjust per clip. The anchor marker in the intro uses fixed pixel coordinates (`intro.anchor`, `intro.barCenter`), so it only works for clips filmed on a tripod.
