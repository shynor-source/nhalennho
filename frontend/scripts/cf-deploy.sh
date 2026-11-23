#!/usr/bin/env bash
# Build the Next.js frontend with the OpenNext adapter and deploy it to
# Cloudflare Workers (free plan) — ADR-0013.
#
# Requires frontend/.env.cloudflare (copy from .env.cloudflare.example).
# The API (Render free) must be deployed and reachable first, because the
# NEXT_PUBLIC_API_URL is inlined into the browser bundle at build time.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.cloudflare ]; then
  echo "Missing .env.cloudflare — copy .env.cloudflare.example and fill it in." >&2
  exit 1
fi

set -a
. ./.env.cloudflare
set +a

export OPENNEXT=1
export NEXT_TELEMETRY_DISABLED=1
npx opennextjs-cloudflare build

# Forward every variable from .env.cloudflare to the Worker runtime so
# server components can read them through process.env (OpenNext maps Worker
# vars into process.env). NEXT_PUBLIC_* are also inlined at build time, but
# the server side still needs the runtime copy.
args=()
while IFS= read -r key; do
  val="${!key:-}"
  if [ -n "$val" ]; then
    args+=(--var "$key:$val")
  fi
done < <(sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env.cloudflare)

npx wrangler deploy "${args[@]}"
echo
echo "Deployed. Set up a custom domain or use the printed workers.dev URL."
