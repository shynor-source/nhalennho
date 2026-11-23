// Package media validates, re-encodes and stores uploaded product images.
//
// Security rules (brief section 8.5): only real JPEG/PNG images are accepted
// (decoded, not trusted by extension), size and dimensions are bounded, files
// are re-encoded to strip metadata, names are server-generated random hex.
// Since ADR-0013 the processed bytes are stored in PostgreSQL (see
// repository media functions) instead of on a disk volume, because the free
// PaaS deployment target has no persistent writable disk.
package media

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
)

var (
	ErrUnsupported = errors.New("unsupported image format")
	ErrInvalid     = errors.New("invalid or corrupt image")
	ErrDimensions  = errors.New("image dimensions out of range")
)

// Processed is the result of validating and re-encoding an uploaded image.
type Processed struct {
	Name        string // "<32-hex>.(jpg|png)" — the /media/ file name
	ContentType string // image/jpeg or image/png
	Data        []byte
	URL         string // relative public path, e.g. /media/<hex>.jpg
	Width       int
	Height      int
}

// Process decodes an uploaded image, validates it, enforces a square crop and
// re-encodes it (stripping metadata) into memory, ready to be persisted by the
// caller.
func Process(r io.Reader, maxDimension int) (Processed, error) {
	img, format, err := image.Decode(r)
	if err != nil {
		return Processed{}, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	if format != "jpeg" && format != "png" {
		return Processed{}, ErrUnsupported
	}

	b := img.Bounds()
	width, height := b.Dx(), b.Dy()
	if width < 1 || height < 1 || width > maxDimension || height > maxDimension {
		return Processed{}, ErrDimensions
	}

	// Enforce a square (1:1) product image. The admin cropper already produces
	// a square, so this normally does nothing; it protects against non-square
	// uploads from other clients.
	if width != height {
		side := width
		if height < width {
			side = height
		}
		x0 := b.Min.X + (width-side)/2
		y0 := b.Min.Y + (height-side)/2
		square := image.NewRGBA(image.Rect(0, 0, side, side))
		draw.Draw(square, square.Bounds(), img, image.Pt(x0, y0), draw.Src)
		img = square
		width, height = side, side
	}

	ext := ".jpg"
	contentType := "image/jpeg"
	if format == "png" {
		ext = ".png"
		contentType = "image/png"
	}
	name, err := randomName(ext)
	if err != nil {
		return Processed{}, err
	}

	var buf bytes.Buffer
	if err := encode(&buf, img, format); err != nil {
		return Processed{}, err
	}

	return Processed{
		Name:        name,
		ContentType: contentType,
		Data:        buf.Bytes(),
		URL:         "/media/" + name,
		Width:       width,
		Height:      height,
	}, nil
}

func encode(w io.Writer, img image.Image, format string) error {
	if format == "png" {
		if err := png.Encode(w, img); err != nil {
			return fmt.Errorf("encode png: %w", err)
		}
		return nil
	}
	if err := jpeg.Encode(w, img, &jpeg.Options{Quality: 85}); err != nil {
		return fmt.Errorf("encode jpeg: %w", err)
	}
	return nil
}

func randomName(ext string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate image name: %w", err)
	}
	return hex.EncodeToString(buf) + ext, nil
}
