# syntax=docker/dockerfile:1

# ---- shared base: modules + source ------------------------------------------
FROM golang:1.27.4-alpine AS base
WORKDIR /src
# Download modules first for better layer caching.
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# ---- development target (used by compose.dev.yml) ---------------------------
FROM base AS dev
# go run rebuilds on start; source is bind-mounted by Compose for live edits.
EXPOSE 8080
CMD ["go", "run", "./cmd/api"]

# ---- production build -------------------------------------------------------
FROM base AS build
# CGO disabled -> static binaries; trimpath and -s -w reduce size.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# ---- production runtime -----------------------------------------------------
FROM alpine:3.24 AS runtime
# wget from busybox is used by the health check.
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app -H -s /sbin/nologin app
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/migrate /app/migrate
# Writable upload volume directory owned by the non-root user.
RUN mkdir -p /data/uploads && chown -R app:app /data/uploads
USER app
EXPOSE 8080
# The API listens on 0.0.0.0 so other containers can reach it (brief 7.2).
ENTRYPOINT ["/app/api"]
