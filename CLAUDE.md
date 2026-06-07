# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # dev server (Parcel, hot reload)
pnpm build      # production build → dist/
bash deploy.sh  # build + force-push dist/ to Gitee Pages
```

## Architecture

Static personal resume site. No framework, no JS bundler logic beyond Parcel asset pipeline.

**Entry**: `src/index.html` — single HTML file, all content inline.

**Styling**: Two CSS files loaded in order:
- `src/init.css` — CSS reset / base
- `src/index.css` — all layout and component styles

**Bilingual (zh/en)**: Language switching is pure CSS + minimal inline JS. `[data-lang="zh"]` / `[data-lang="en"]` elements are shown/hidden by toggling `body.className` between `"zh"` and `"en"`. Default is `zh`. URL param `?translate=english` auto-switches to English; `?translate=true` reveals the language toggle buttons.

**Build**: Parcel 2 bundles `src/index.html` → `dist/`. No minification (`--no-minify`), relative public URL (`--public-url ./`) for Gitee Pages compatibility.

**Deploy**: `deploy.sh` builds, then initializes a fresh git repo in `dist/` and force-pushes to `gitee` remote (Gitee Pages hosting). The dist repo is ephemeral — never commit directly to `dist/`.

**`em` tags** render in gold (`rgb(208, 181, 52)`) and are used throughout content to highlight tech stack keywords.
