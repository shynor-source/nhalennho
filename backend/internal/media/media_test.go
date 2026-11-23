package media

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"strings"
	"testing"
)

func testJPEG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 120, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatalf("encode: %v", err)
	}
	return buf.Bytes()
}

func TestProcessEnforcesSquare(t *testing.T) {
	// Non-square 200x400 input must come out square (center-cropped).
	processed, err := Process(bytes.NewReader(testJPEG(t, 200, 400)), 4000)
	if err != nil {
		t.Fatalf("Process: %v", err)
	}
	if processed.Width != processed.Height {
		t.Errorf("want square image, got %dx%d", processed.Width, processed.Height)
	}
	if !strings.HasPrefix(processed.URL, "/media/") {
		t.Errorf("URL = %q, want /media/ prefix", processed.URL)
	}
	if len(processed.Data) == 0 {
		t.Errorf("expected non-empty re-encoded bytes for %s", processed.Name)
	}
	if processed.ContentType != "image/jpeg" {
		t.Errorf("content type = %q, want image/jpeg", processed.ContentType)
	}
}

func TestProcessRejectsOversized(t *testing.T) {
	_, err := Process(bytes.NewReader(testJPEG(t, 5000, 5000)), 4000)
	if err != ErrDimensions {
		t.Errorf("err = %v, want ErrDimensions", err)
	}
}

func TestProcessRejectsGarbage(t *testing.T) {
	_, err := Process(bytes.NewReader([]byte("not an image")), 4000)
	if !errors.Is(err, ErrInvalid) {
		t.Errorf("err = %v, want ErrInvalid", err)
	}
}
