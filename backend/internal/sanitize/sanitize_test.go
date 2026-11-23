package sanitize

import "testing"

func TestPostContentStripsScript(t *testing.T) {
	in := `<p>chào<script>alert(1)</script><img src="x" onerror="alert(1)"></p>`
	out := PostContent(in)
	if contains(out, "<script") || contains(out, "onerror") {
		t.Fatalf("script survived: %q", out)
	}
	if !contains(out, "<p>") {
		t.Fatalf("allowed tag stripped: %q", out)
	}
}

func TestPostContentAllowsEditorOutput(t *testing.T) {
	in := `<h2 style="text-align: center;">Tiêu đề</h2>` +
		`<p>đoạn <strong>đậm</strong> <em>nghiêng</em> <s>gạch</s></p>` +
		`<ul><li>mục</li></ul>` +
		`<img src="https://api.example.com/media/abcdefabcdefabcdefabcdefabcdefab.png" alt="ảnh">`
	out := PostContent(in)
	for _, want := range []string{
		`<h2 style="text-align: center;">`,
		"<strong>", "<em>", "<s>", "<ul>", "<li>",
		`<img src="https://api.example.com/media/abcdefabcdefabcdefabcdefabcdefab.png" alt="ảnh"`,
	} {
		if !contains(out, want) {
			t.Fatalf("expected %q in %q", want, out)
		}
	}
}

func TestPostContentBlocksNonMediaImgSrc(t *testing.T) {
	cases := []string{
		`<img src="javascript:alert(1)">`,
		`<img src="data:image/png;base64,AAAA">`,
		`<img src="https://evil.com/pixel.gif">`,
		`<img src="/media/../../etc/passwd.png">`,
	}
	for _, c := range cases {
		if out := PostContent(c); contains(out, "src=") {
			t.Fatalf("bad src survived in %q -> %q", c, out)
		}
	}
}

func TestPostContentBlocksDangerousStyles(t *testing.T) {
	cases := []string{
		`<p style="position:fixed;top:0">x</p>`,
		`<p style="background:url(javascript:alert(1))">x</p>`,
		`<p style="text-align: center; color: red">x</p>`,
	}
	for _, c := range cases {
		if out := PostContent(c); contains(out, "style=") {
			t.Fatalf("bad style survived in %q -> %q", c, out)
		}
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (func() bool {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	})()
}
