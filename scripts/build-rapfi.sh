#!/usr/bin/env bash
# Builds the Rapfi gomoku engine to WebAssembly for the computer's Expert level.
#
# Rapfi is free software by dhbloo and contributors, licensed under the GNU GPL v3
# (https://github.com/dhbloo/rapfi). Its neural network weights are CC0
# (https://github.com/dhbloo/rapfi-networks). This script is the complete recipe for the engine
# files we serve: it fetches the pinned sources, packs the freestyle network and builds the
# single-threaded WebAssembly SIMD variant. (Rapfi's networks need SIMD, so there is no build for
# browsers without it; the site offers Hard instead there.)
#
# Needs Docker. Output: apps/web/public/engine/rapfi-<commit>/ (commit the result).
set -euo pipefail

RAPFI_COMMIT=3c94c2a976f24a0dd1c5517623e9ab6fffe66bd7
NETWORKS_COMMIT=e32ad77a5364363b3e3a02b3f9e8610ade19ea98
EMSDK_IMAGE=emscripten/emsdk:6.0.12

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/apps/web/public/engine/rapfi-${RAPFI_COMMIT:0:7}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "Fetching Rapfi ${RAPFI_COMMIT:0:7} and networks ${NETWORKS_COMMIT:0:7}…"
git clone --quiet https://github.com/dhbloo/rapfi.git "$WORK/rapfi"
git -C "$WORK/rapfi" checkout --quiet "$RAPFI_COMMIT"
rm -rf "$WORK/rapfi/Networks"
git clone --quiet https://github.com/dhbloo/rapfi-networks.git "$WORK/rapfi/Networks"
git -C "$WORK/rapfi/Networks" checkout --quiet "$NETWORKS_COMMIT"

# Pack only what freestyle needs: Gomocalc's config without the standard/renju networks, the
# classical model it references, and the freestyle network.
NET="$WORK/rapfi/Networks"
python3 - "$NET" <<'PY'
import re, sys
net = sys.argv[1]
config = open(f"{net}/config-example/gomocalc-mix9svq.toml").read()
blocks = config.split("[[model.evaluator.weights]]")
kept = [blocks[0]] + [b for b in blocks[1:] if "freestyle" in b]
if len(kept) != 2:
    sys.exit("expected exactly one freestyle weights entry in the config")
open(f"{net}/expert-config.toml", "w").write("[[model.evaluator.weights]]".join(kept))
PY
cat > "$NET/wasm_preloads.txt" <<'EOF'
expert-config.toml@config.toml
classical/model210901.bin@model210901.bin
mix9svq/mix9svqfreestyle_bsmix.bin.lz4@mix9svqfreestyle_bsmix.bin.lz4
EOF

echo "Building with ${EMSDK_IMAGE}…"
docker run --rm -v "$WORK/rapfi":/src -w /src/Rapfi "$EMSDK_IMAGE" bash -ec '
  mkdir -p build/simd && cd build/simd
  emcmake cmake ../.. -DCMAKE_BUILD_TYPE=Release -DNO_COMMAND_MODULES=ON -DNO_MULTI_THREADING=ON \
    -DUSE_WASM_SIMD=ON -DUSE_WASM_SIMD_RELAXED=OFF > /dev/null
  emmake cmake --build . -j"$(nproc)" 2>&1 | grep -E "error|Linking" || true
  test -f rapfi-single-simd128.wasm'

rm -rf "$OUT"
mkdir -p "$OUT"
B="$WORK/rapfi/Rapfi/build"
cp "$B/simd/rapfi-single-simd128.js" "$B/simd/rapfi-single-simd128.wasm" "$OUT/"
cp "$B/simd/rapfi-single-simd128.data" "$OUT/rapfi.data"
cp "$WORK/rapfi/Copying.txt" "$OUT/COPYING.txt"
cat > "$OUT/SOURCE.txt" <<EOF
Rapfi gomoku engine, compiled to WebAssembly for playfiveinarow.com's Expert level.

Engine: https://github.com/dhbloo/rapfi, commit $RAPFI_COMMIT (GNU GPL v3, see COPYING.txt)
Networks: https://github.com/dhbloo/rapfi-networks, commit $NETWORKS_COMMIT (CC0)
Built with $EMSDK_IMAGE by scripts/build-rapfi.sh in this site's repository.
EOF
ls -l "$OUT"
