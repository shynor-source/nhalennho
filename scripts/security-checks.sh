#!/bin/sh
# Release security gate — run before every deploy (brief 8.6).
# Usage: ./scripts/security-checks.sh
# Runs from the repo root; requires Docker (scanners run in throwaway
# containers so the host needs no Go/Node toolchain).
set -eu

cd "$(dirname "$0")/.."

fail=0

echo "== Go: vet + tests =="
docker run --rm -v "$PWD/backend:/src" -w /src golang:1.27.4-alpine \
    sh -c "go vet ./... && go test ./..." || fail=1

echo "== Go: govulncheck =="
docker run --rm -v "$PWD/backend:/src" -w /src golang:1.27.4-alpine \
    sh -c "go install golang.org/x/vuln/cmd/govulncheck@latest >/dev/null 2>&1 && /go/bin/govulncheck ./..." || fail=1

echo "== Go: gosec =="
docker run --rm -v "$PWD/backend:/src" -w /src golang:1.27.4-alpine \
    sh -c "go install github.com/securego/gosec/v2/cmd/gosec@latest >/dev/null 2>&1 && /go/bin/gosec -quiet ./..." || fail=1

echo "== Frontend: typecheck + lint + audit =="
docker run --rm -v "$PWD/frontend:/app" -w /app node:26.13.0-alpine \
    sh -c "npm ci --no-audit >/dev/null 2>&1 && npm run typecheck && npm run lint && npm audit" || fail=1

echo "== Secret sweep (files about to be committed) =="
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    patterns='(sk-[A-Za-z0-9]{8,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,})'
    hits=$(git grep -I -nE "$patterns" $(git rev-list --parents --max-count=1 HEAD 2>/dev/null | cut -d' ' -f2-) 2>/dev/null || \
           git grep -I -nE "$patterns" --cached 2>/dev/null || true)
    if [ -n "$hits" ]; then
        echo "POSSIBLE SECRETS FOUND:"
        echo "$hits"
        fail=1
    else
        echo "no committed secret patterns found"
    fi
fi

if [ "$fail" -ne 0 ]; then
    echo ""
    echo "SECURITY CHECKS FAILED — do not deploy."
    exit 1
fi
echo ""
echo "All security checks passed."
