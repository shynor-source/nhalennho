// Package auth holds password hashing and session/token logic.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2id parameters follow current OWASP guidance.
const (
	argonMemoryKiB  = 19456 // 19 MiB
	argonIterations = 2
	argonParallel   = 1
	argonSaltLen    = 16
	argonKeyLen     = 32
)

// HashPassword returns an encoded Argon2id hash for the given password.
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, argonIterations, argonMemoryKiB, argonParallel, argonKeyLen)
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemoryKiB, argonIterations, argonParallel,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// VerifyPassword reports whether password matches the encoded hash.
func VerifyPassword(encodedHash, password string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errors.New("invalid password hash format")
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, errors.New("unsupported argon2 version")
	}
	var mem, iter, par int
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &mem, &iter, &par); err != nil {
		return false, errors.New("invalid argon2 parameters")
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, errors.New("invalid salt encoding")
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, errors.New("invalid key encoding")
	}

	// Values come from a strict Sscanf parse; guard the conversions so a
	// malformed hash can never trigger an integer overflow.
	if iter < 0 || iter > 1_000_000 || mem < 0 || mem > 1_000_000 || par < 1 || par > 8 || len(key) < 16 || len(key) > 1024 {
		return false, errors.New("invalid argon2 parameters")
	}
	// All four values are bounded by the range checks above.
	computed := argon2.IDKey([]byte(password), salt, uint32(iter), uint32(mem), uint8(par), uint32(len(key))) // #nosec G115 -- bounded above
	return subtle.ConstantTimeCompare(computed, key) == 1, nil
}

// NewToken returns a cryptographically random URL-safe token (raw) and its
// SHA-256 hex hash (stored in the database).
func NewToken() (raw string, hash string, err error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("generate token: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(buf)
	return raw, HashToken(raw), nil
}

// HashToken returns the SHA-256 hex digest of a token.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
