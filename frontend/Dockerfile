# syntax=docker/dockerfile:1

# ---- dependencies -----------------------------------------------------------
FROM node:26.13.0-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

# ---- development target (used by compose.dev.yml) ---------------------------
FROM deps AS dev
WORKDIR /app
COPY . .
# The host bind-mount hides the image's node_modules, so the named volume starts
# empty. Install once on startup, then run the dev server.
CMD ["sh", "-c", "npm install && npm run dev"]

# ---- production build -------------------------------------------------------
FROM deps AS build
WORKDIR /app
# Public values are inlined at build time. They must be supplied as build args
# (see compose.prod.yml). Never pass a secret here.
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_TAGLINE
ARG NEXT_PUBLIC_SITE_DESCRIPTION
ARG NEXT_PUBLIC_SHOPEE_URL
ARG NEXT_PUBLIC_ZALO_URL
ARG NEXT_PUBLIC_FACEBOOK_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SITE_TAGLINE=$NEXT_PUBLIC_SITE_TAGLINE \
    NEXT_PUBLIC_SITE_DESCRIPTION=$NEXT_PUBLIC_SITE_DESCRIPTION \
    NEXT_PUBLIC_SHOPEE_URL=$NEXT_PUBLIC_SHOPEE_URL \
    NEXT_PUBLIC_ZALO_URL=$NEXT_PUBLIC_ZALO_URL \
    NEXT_PUBLIC_FACEBOOK_URL=$NEXT_PUBLIC_FACEBOOK_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Docker builds keep `output: "standalone"` (see next.config.ts); the
# Cloudflare/OpenNext build runs outside Docker and must not set this.
ENV DOCKER_BUILD=1
COPY . .
RUN npm run build

# ---- production runtime -----------------------------------------------------
FROM node:26.13.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# The standalone server only needs the node binary. Removing npm and its bundled
# dependencies (which carry the CVEs of the base image, not our app) shrinks the
# attack surface; our code never invokes npm at runtime.
RUN addgroup -S nextjs && adduser -S -G nextjs -H -s /sbin/nologin nextjs \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
    && apk add --no-cache wget >/dev/null
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
