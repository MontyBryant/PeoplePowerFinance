#!/usr/bin/env bash
set -euo pipefail

# PeoplePower Rebuild 2026 - filesystem cleanup + consolidation
#
# Goal:
# - Treat repo-root `index.html` as source of truth (GitHub Pages entrypoint)
# - Produce ONE deployable static site at repo root (GitHub Pages: "root")
# - Remove duplicate site copies in `docs/` + `site/`
# - Consolidate assets under `assets/`
#
# This script is idempotent-ish: it prefers moving duplicates into `archive/old/`.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Working in: $ROOT_DIR"

mkdir -p "archive/old"
mkdir -p "assets/css" "assets/img" "assets/fonts" "assets/vendor"

echo "==> Backing up duplicate site copies (docs/, site/) to archive/old/ (if present)"
if [[ -d "docs" ]]; then
  rm -rf "archive/old/docs" || true
  mv "docs" "archive/old/docs"
fi
if [[ -d "site" ]]; then
  rm -rf "archive/old/site" || true
  mv "site" "archive/old/site"
fi

echo "==> Moving large saved-export folders into archive/vendor (if present)"
if [[ -d "Monty Bryant _ Ecologi_files" ]]; then
  rm -rf "archive/old/ecologi_files" || true
  mv "Monty Bryant _ Ecologi_files" "archive/old/ecologi_files"
fi
if [[ -d "Monty Bryant _ Offset Earth_files" ]]; then
  rm -rf "assets/vendor/offset-earth" || true
  mv "Monty Bryant _ Offset Earth_files" "assets/vendor/offset-earth"
fi

echo "==> Consolidating images/fonts into assets/"
if [[ -d "img" ]]; then
  rsync -a "img/" "assets/img/"
  rm -rf "img"
fi
if [[ -d "fonts" ]]; then
  rsync -a "fonts/" "assets/fonts/"
  rm -rf "fonts"
fi

echo "==> Moving root-level loose images into assets/img/"
for f in co2.png leaf_icon.png nothing.png ppcoin.png ppcoin2.png solar.png; do
  if [[ -f "$f" ]]; then
    mv "$f" "assets/img/$f"
  fi
done

echo "==> Consolidating vendor JS/CSS into assets/vendor/"
# jQuery: keep existing local copy if present; otherwise keep external (user can add later)
if [[ -f "market/jquery-latest.min.js" ]]; then
  cp "market/jquery-latest.min.js" "assets/vendor/jquery.min.js"
fi

if [[ -f "fancybox-master/dist/jquery.fancybox.min.js" ]]; then
  cp "fancybox-master/dist/jquery.fancybox.min.js" "assets/vendor/jquery.fancybox.min.js"
fi
if [[ -f "fancybox-master/dist/jquery.fancybox.min.css" ]]; then
  cp "fancybox-master/dist/jquery.fancybox.min.css" "assets/vendor/jquery.fancybox.min.css"
fi

echo "==> Moving CSS into assets/css/"
if [[ -f "market/market.css" ]]; then
  mv "market/market.css" "assets/css/market.css"
fi

echo "==> Removing fancybox source tree (kept dist copies only)"
rm -rf "fancybox-master" || true
rm -rf "cssmenu" || true

echo "==> Ensure GitHub Pages entrypoint exists as index.html"
if [[ ! -f "index.html" && -f "index.htm" ]]; then
  cp "index.htm" "index.html"
fi

echo "==> Rewriting HTML references (index + market + pages) to new assets/ layout"
python3 - <<'PY'
from __future__ import annotations
from pathlib import Path
import re

root = Path(".")

def rewrite_html(p: Path, is_root: bool) -> None:
    t = p.read_text(encoding="utf-8", errors="ignore")
    original = t

    # Remove dead script.js includes
    t = t.replace('<script src="script.js"></script>', '')

    # jQuery: prefer local pinned
    t = t.replace("https://code.jquery.com/jquery-3.3.1.min.js", "assets/vendor/jquery.min.js" if is_root else "../assets/vendor/jquery.min.js")
    t = t.replace("https://code.jquery.com/jquery-3.2.1.min.js", "assets/vendor/jquery.min.js" if is_root else "../assets/vendor/jquery.min.js")
    t = t.replace("http://code.jquery.com/jquery-latest.min.js", "assets/vendor/jquery.min.js" if is_root else "../assets/vendor/jquery.min.js")
    t = t.replace("jquery-latest.min.js", "assets/vendor/jquery.min.js" if is_root else "../assets/vendor/jquery.min.js")

    # Fancybox: local dist
    t = t.replace("fancybox-master/dist/jquery.fancybox.min.css", "assets/vendor/jquery.fancybox.min.css" if is_root else "../assets/vendor/jquery.fancybox.min.css")
    t = t.replace("fancybox-master/dist/jquery.fancybox.min.js", "assets/vendor/jquery.fancybox.min.js" if is_root else "../assets/vendor/jquery.fancybox.min.js")

    # Offset earth legacy bundle: now under assets/vendor/offset-earth/
    t = t.replace("./Monty Bryant _ Offset Earth_files/", "assets/vendor/offset-earth/" if is_root else "../assets/vendor/offset-earth/")
    t = t.replace("../Monty Bryant _ Offset Earth_files/", "assets/vendor/offset-earth/" if is_root else "../assets/vendor/offset-earth/")

    # Point to consolidated market css
    t = t.replace('href="market/market.css"', 'href="assets/css/market.css"' if is_root else 'href="../assets/css/market.css"')
    t = t.replace('href="../market/market.css"', 'href="assets/css/market.css"' if is_root else 'href="../assets/css/market.css"')
    t = t.replace('href="market.css"', 'href="../assets/css/market.css"')

    # Images: img/* and root-level pngs moved into assets/img
    if is_root:
        t = t.replace('src="img/', 'src="assets/img/')
        t = t.replace('data-src="img/', 'data-src="assets/img/')
        t = t.replace('background-image: url(img/', 'background-image: url(assets/img/')
        for name in ["ppcoin.png","ppcoin2.png","co2.png","leaf_icon.png","solar.png","nothing.png"]:
            t = t.replace(f'src="{name}"', f'src="assets/img/{name}"')
            t = t.replace(f'data-src="{name}"', f'data-src="assets/img/{name}"')
    else:
        t = t.replace('src="../img/', 'src="../assets/img/')
        t = t.replace('src="img/', 'src="../assets/img/')
        for name in ["ppcoin.png","ppcoin2.png","co2.png","leaf_icon.png","solar.png","nothing.png"]:
            t = t.replace(f'src="../{name}"', f'src="../assets/img/{name}"')
            t = t.replace(f'src="{name}"', f'src="../assets/img/{name}"')

    # Remove obvious tracker script tags that came from saved exports (keep CSS)
    t = re.sub(r'\s*<script[^>]+assets/vendor/offset-earth/(iubenda|iubenda_cs|iubenda_i_badge|fbevents|analytics|gtm|js|l)\.js[^>]*></script>\s*', '\n', t, flags=re.I)
    t = re.sub(r'\s*<script[^>]+assets/vendor/offset-earth/17772848\.js[^>]*></script>\s*', '\n', t, flags=re.I)
    t = re.sub(r'\s*<script[^>]+assets/vendor/offset-earth/core-[^"\']+\.js[^>]*></script>\s*', '\n', t, flags=re.I)
    t = re.sub(r'\s*<script[^>]+assets/vendor/offset-earth/saved_resource[^>]*></script>\s*', '\n', t, flags=re.I)
    t = re.sub(r'\s*<script[^>]+assets/vendor/offset-earth/client\.js[^>]*></script>\s*', '\n', t, flags=re.I)
    t = re.sub(r'\s*<script[^>]+assets/vendor/offset-earth/c06s[^>]*\.js[^>]*></script>\s*', '\n', t, flags=re.I)

    if t != original:
        p.write_text(t, encoding="utf-8")


for f in [root/"index.html", root/"index.htm"]:
    if f.exists():
        rewrite_html(f, is_root=True)

for p in (root/"market").glob("*.html") if (root/"market").exists() else []:
    rewrite_html(p, is_root=False)
for p in (root/"pages").glob("*.html") if (root/"pages").exists() else []:
    rewrite_html(p, is_root=False)

print("rewrote HTML files")
PY

echo "==> Rewriting market.css for new paths (fonts + icons), removing external http @import"
python3 - <<'PY'
from pathlib import Path

p = Path("assets/css/market.css")
if not p.exists():
    raise SystemExit("assets/css/market.css not found")

t = p.read_text(encoding="utf-8", errors="ignore")
t2 = t.replace("@import url(http://fonts.googleapis.com/css?family=Raleway);",
               "/* removed external @import (render-blocking + http) */")

# Fix SofiaProSemiBold paths (they live under assets/fonts/sofiapro/Fonts)
t2 = t2.replace("src: url('../fonts/SofiaProSemiBold.eot');",
                "src: url('../fonts/sofiapro/Fonts/SofiaProSemiBold.eot');")
t2 = t2.replace("url('../fonts/SofiaProSemiBold.eot?#iefix')", "url('../fonts/sofiapro/Fonts/SofiaProSemiBold.eot?#iefix')")
t2 = t2.replace("url('../fonts/SofiaProSemiBold.woff2')", "url('../fonts/sofiapro/Fonts/SofiaProSemiBold.woff2')")
t2 = t2.replace("url('../fonts/SofiaProSemiBold.woff')", "url('../fonts/sofiapro/Fonts/SofiaProSemiBold.woff')")
t2 = t2.replace("url('../fonts/SofiaProSemiBold.ttf')", "url('../fonts/sofiapro/Fonts/SofiaProSemiBold.ttf')")

# Root-level icons moved into assets/img
t2 = t2.replace("background-image: url(../ppcoin.png);", "background-image: url(../img/ppcoin.png);")
t2 = t2.replace("background-image: url(../co2.png);", "background-image: url(../img/co2.png);")

if t2 != t:
    p.write_text(t2, encoding="utf-8")
print("rewrote assets/css/market.css")
PY

echo "==> Removing redundant copies of market css + jquery inside market/ (we now use assets/)"
rm -f "market/market.css" "market/jquery-latest.min.js" || true

echo "==> Done."
echo ""
echo "Next steps:"
echo "- Configure GitHub Pages to publish from the repository root."
echo "- Open ./index.html (or serve with python3 -m http.server)."


