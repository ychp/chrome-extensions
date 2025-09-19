#!/bin/bash
set -euo pipefail

# Usage: EXT_ID=<your_extension_id> ./install-native-host.sh

if [ -z "${EXT_ID:-}" ]; then
  echo "ERROR: Please provide EXT_ID environment variable (your extension ID)." >&2
  exit 1
fi

HOST_NAME="com.ychp.arc.export_pins"
SRC_JSON="$(cd "$(dirname "$0")" && pwd)/native-host.json"
DST_DIRS=(
  "$HOME/Library/Application Support/Arc/NativeMessagingHosts"
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
)

for d in "${DST_DIRS[@]}"; do
  mkdir -p "$d"
  sed -E "s/abcdefghijklmnopqrstuvwxyzabcdef/${EXT_ID}/" "$SRC_JSON" > "$d/${HOST_NAME}.json"
  echo "Installed: $d/${HOST_NAME}.json"
done

chmod +x "$(cd "$(dirname "$0")" && pwd)/native-host.sh"
echo "Native host script made executable."


