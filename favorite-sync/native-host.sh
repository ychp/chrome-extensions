#!/bin/bash
set -euo pipefail

# Wrapper: locate Node by absolute path and exec the real host (native-host.js)
NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
  if [ -x "$p" ]; then NODE="$p"; break; fi
done

DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NODE" ]; then
  # Best-effort: fall back to env node (may fail if PATH not set)
  exec /usr/bin/env node "$DIR/native-host.js"
else
  exec "$NODE" "$DIR/native-host.js"
fi


