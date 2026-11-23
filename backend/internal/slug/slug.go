// Package slug converts human titles into URL-safe slugs.
//
// It transliterates Vietnamese diacritics to ASCII so a title like
// "Móc khóa thỏ con" becomes "moc-khoa-tho-con" without the admin having to
// think about URLs.
package slug

import (
	"strings"
	"unicode"
)

var replacements = map[rune]string{
	'à': "a", 'á': "a", 'ạ': "a", 'ả': "a", 'ã': "a",
	'â': "a", 'ầ': "a", 'ấ': "a", 'ậ': "a", 'ẩ': "a", 'ẫ': "a",
	'ă': "a", 'ằ': "a", 'ắ': "a", 'ặ': "a", 'ẳ': "a", 'ẵ': "a",
	'đ': "d",
	'è': "e", 'é': "e", 'ẹ': "e", 'ẻ': "e", 'ẽ': "e",
	'ê': "e", 'ề': "e", 'ế': "e", 'ệ': "e", 'ể': "e", 'ễ': "e",
	'ì': "i", 'í': "i", 'ị': "i", 'ỉ': "i", 'ĩ': "i",
	'ò': "o", 'ó': "o", 'ọ': "o", 'ỏ': "o", 'õ': "o",
	'ô': "o", 'ồ': "o", 'ố': "o", 'ộ': "o", 'ổ': "o", 'ỗ': "o",
	'ơ': "o", 'ờ': "o", 'ớ': "o", 'ợ': "o", 'ở': "o", 'ỡ': "o",
	'ù': "u", 'ú': "u", 'ụ': "u", 'ủ': "u", 'ũ': "u",
	'ư': "u", 'ừ': "u", 'ứ': "u", 'ự': "u", 'ử': "u", 'ữ': "u",
	'ỳ': "y", 'ý': "y", 'ỵ': "y", 'ỷ': "y", 'ỹ': "y",
}

// Make returns a lowercase, hyphen-separated slug. If nothing usable remains,
// it returns the provided fallback.
func Make(input, fallback string) string {
	input = strings.ToLower(strings.TrimSpace(input))

	var b strings.Builder
	lastHyphen := false
	for _, r := range input {
		if repl, ok := replacements[r]; ok {
			b.WriteString(repl)
			lastHyphen = false
			continue
		}
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastHyphen = false
		case unicode.IsSpace(r) || r == '-' || r == '_' || r == '/':
			if !lastHyphen && b.Len() > 0 {
				b.WriteByte('-')
				lastHyphen = true
			}
		}
	}

	out := strings.Trim(b.String(), "-")
	if out == "" {
		return fallback
	}
	if len(out) > 80 {
		out = strings.Trim(out[:80], "-")
	}
	return out
}
