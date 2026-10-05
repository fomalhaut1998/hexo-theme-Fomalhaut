# Reference Paperclip Implementation Plan

**Goal:** Replace the author-card paperclip with the user’s slender blue-white reference; keep the rest of the personal card unchanged.

**Architecture:** Keep the existing card `::after` and independent `source/css/paperclip.css` injection. Redraw the inline SVG with rounded wire ends, layered blue-white shading, soft local shadow and two separate yellow accents. No theme template changes, external image requests or new DOM.

**Tech Stack:** Hexo, CSS custom properties, inline SVG.

### Task 1: Preserve the current version
- Back up `source/css/paperclip.css` and `_config.fomalhaut.yml` to `bak/paperclip-20261005-reference/before/`.
- Keep unrelated working-tree edits intact.

### Task 2: Match the supplied reference
- Slim the wire geometry and reduce the decoration relative to the card.
- Use navy-blue edge, cyan side shading and white reflective face; rounded ends and separated yellow accents with white rims.
- Keep overflow visible, radius preservation and pointer-events disabled.
- Update only the paperclip injection comment/cache version.

### Task 3: Verify
- Decode the inline SVG and validate XML; confirm expected sizing and injection version.
- Run the existing Hexo generate script; do not start another server.
- Refresh the running http://127.0.0.1:4000/ preview in the explicitly bound Chrome Agent Window; inspect the card and light/dark presentation.
- Confirm no new changes under themes/.

### Rollback
Restore the two files from the backup and regenerate.

### Verification completed
- Hexo generate completed successfully (exit 0).
- Generated CSS hash matches the source; the complete inline SVG parses as XML (9 paths).
- Configuration diff against the backup contains only the paperclip comment and cache version.
- Author card inspected in light and dark modes, then restored to light mode.
- Restarted the existing port-4000 Hexo preview because it retained the old configuration in memory; the response now injects `paperclip.css?v=20261005-reference1`.
- Preview remains available at http://127.0.0.1:4000/ (current managed job `pwsh-220`).

### Night-palette follow-up completed
- Added only a `html[data-theme="dark"]` SVG color override: deep-ocean blue metal, restrained ice-blue highlights, muted starlight-gold accents.
- Original daytime CSS is an unchanged prefix; both SVGs have identical path geometry (9 paths) and valid XML. Size, position and author-card layout are unchanged.
- Regenerated successfully (exit 0); source and generated CSS hashes match.
- Configuration differs from the pre-night backup only by the night-palette comment and `20261005-night1` cache version.
- Restarted only the verified port-4000 Hexo preview to reload configuration; HTTP 200 response injects the new stylesheet version.
- Live browser verified light → dark → light, including screenshots and HTML theme state; restored the initial light theme and closed the Agent Window.
- Pre-night rollback files: [backup](<E:/Blog/MainBlog/bak/paperclip-20261005-night/before/>). Restore the two backed-up files and regenerate to remove only the night addition.

### Night-glow follow-up completed
- Enhanced only the dark-mode SVG palette with luminous ice-blue wire and warm-gold accents; added a restrained cyan glow. Daytime CSS and all SVG path geometry remain unchanged.
- Added a 4.8-second gentle opacity-only breathing animation. `prefers-reduced-motion: reduce` disables the animation while retaining the static glow. No animated blur, new DOM, theme-template changes or dependencies.
- Hexo generate succeeded (exit 0); source and generated CSS SHA256 hashes match. Both complete inline SVGs parse as XML and retain the same 9 paths.
- Configuration differs from the pre-glow backup only by the paperclip comment and `20261005-nightglow1` cache version. The live port-4000 preview responds HTTP 200 and serves the new injection.
- Live Chrome author-card screenshots verified the unchanged daytime style and cyan night glow without obscuring the avatar. Verified light → dark → light, restored the original light theme and closed the Agent Window.
- Pre-glow rollback files: [backup](<E:/Blog/MainBlog/bak/paperclip-20261005-glow/before/>). Restore the two backed-up files and regenerate to return to the previous non-glowing night palette.
