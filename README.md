# Impossible website

Three responsive static pages: overview, phase progress, and language information.

Run `python build.py` in this directory to rebuild the pages . Serve `dist/` with `python -m http.server 4173 --directory dist` and open http://localhost:4173.

The progress page reflects the Phase 4 checklist dated 1 November 2026. Markdown download links have been removed. Progress is a snapshot, not a live integration. Contact links open the visitor's email or phone application.

The homepage uses the Dusk theme and a locally stored Unsplash landscape credited in the footer. A continuous Three.js shot follows typed CUDA off a rotating laptop and down through Rust kernel IR, LLVM IR and Hexagon instructions. A C caller supplies the three buffer pointers at the native boundary, then the instruction stream reaches the illustrated NPU. The right-hand caption identifies the language, representation or hardware at each stage. Scroll controls the camera on desktop and mobile. Reduced motion, unavailable WebGL and disabled JavaScript use a still image and a readable walkthrough.

Run `node check-site.mjs` for browser checks. Publication remains pending explicit authorization from the previous approval review.

The original laptop and chip geometry and their procedural textures in `dist/hardware.js` are released under CC0. The source, LLVM and instruction excerpts correspond to `artifacts/phase3/add-1025-0`, a verified simulator build. Three.js 0.180.0 is vendored with its MIT license. Run `node check-motion.mjs` to render controlled animation frames and rebuild the static computer preview. Start the local HTTP server before browser checks because ES modules require HTTP.
