package slug

import "testing"

func TestMakeVietnamese(t *testing.T) {
	cases := []struct{ in, want string }{
		{"Móc khóa thỏ con", "moc-khoa-tho-con"},
		{"Handmade Bé Thỏ Bunny Len Big Size 40cm", "handmade-be-tho-bunny-len-big-size-40cm"},

		{"Hà Nội!", "ha-noi"},
		{"  Kẹp tóc  ", "kep-toc"},
		{"Bánh Há Cảo — Hồng Pastel", "banh-ha-cao-hong-pastel"},
	}
	for _, c := range cases {
		if got := Make(c.in, "san-pham"); got != c.want {
			t.Errorf("Make(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestMakeFallback(t *testing.T) {
	if got := Make("!!!", "san-pham"); got != "san-pham" {
		t.Errorf("Make(empty) = %q, want fallback", got)
	}
}

func TestMakeLength(t *testing.T) {
	long := ""
	for i := 0; i < 100; i++ {
		long += "abc"
	}
	got := Make(long, "x")
	if len(got) > 80 {
		t.Errorf("Make too long: %d", len(got))
	}
}
