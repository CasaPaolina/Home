#!/usr/bin/env bash
# Injects guest/admin passwords from Netlify environment variables into the
# static files at build time, replacing the placeholders committed to git.
set -euo pipefail

if [ -z "${GUEST_AREA:-}" ] || [ -z "${ADMIN_CHECKIN:-}" ]; then
  echo "ERROR: Missing GUEST_AREA and/or ADMIN_CHECKIN environment variable." >&2
  echo "Set them in Netlify: Site settings > Environment variables." >&2
  exit 1
fi

# Escape characters that are special to sed replacement strings (& / \)
esc() { printf '%s' "$1" | sed -e 's/[&/\]/\\&/g'; }
GUEST_AREA_ESC=$(esc "$GUEST_AREA")
ADMIN_CHECKIN_ESC=$(esc "$ADMIN_CHECKIN")

sed -i "s/__GUEST_AREA__/${GUEST_AREA_ESC}/g" guest-info.html js/main.js
sed -i "s/__ADMIN_CHECKIN__/${ADMIN_CHECKIN_ESC}/g" js/admin-checkin.js

echo "Secrets injected successfully."
