#!/usr/bin/env bash
# Passwords are now validated server-side via netlify/functions/auth.js.
# GUEST_AREA and ADMIN_CHECKIN must still be set in Netlify env vars,
# but they are read by the function at runtime — never baked into static files.
echo "Auth is handled by Netlify Functions. No static injection needed."
