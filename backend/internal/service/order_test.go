package service

import "testing"

func TestValidateContact(t *testing.T) {
	valid := []struct{ name, phone, address string }{
		{"Nguyễn Văn A", "0912345678", "123 Đường ABC, Hà Nội"},
		{"Bé Na", "+84 912 345 678", "456 Lê Lợi, TP.HCM"},
		{"Trần Thị B", "028-3812-3456", ""},
	}
	for _, c := range valid {
		if err := validateContact(c.name, c.phone, c.address, true); err != nil {
			t.Errorf("validateContact(%q, %q, %q) unexpected error: %v", c.name, c.phone, c.address, err)
		}
	}

	invalid := []struct {
		name, phone, address string
		consent              bool
	}{
		{"A", "0912345678", "123 Đường", true},             // name too short
		{"Nguyễn Văn A", "123", "123 Đường", true},         // phone too short
		{"Nguyễn Văn A", "09abc567xyz", "123", true},       // phone letters
		{"Nguyễn Văn A", "0912345678", "12", true},         // address too short
		{"Nguyễn Văn A", "0912345678", "123 Đường", false}, /* no consent*/
	}
	for _, c := range invalid {
		if err := validateContact(c.name, c.phone, c.address, c.consent); err == nil {
			t.Errorf("validateContact(%q, %q, %q, %v) expected error", c.name, c.phone, c.address, c.consent)
		}
	}
}

func TestNewOrderCodeFormat(t *testing.T) {
	code := NewOrderCode("DH")
	if len(code) < 10 || code[:3] != "DH-" {
		t.Errorf("NewOrderCode = %q, want DH- prefix and length >= 10", code)
	}
	second := NewOrderCode("DH")
	if code == second {
		t.Error("order codes must be unique")
	}
}
