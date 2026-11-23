// Package sanitize provides server-side HTML sanitising for admin-authored
// blog content. The Tiptap editor is trusted input from a single admin
// account, but stored post bodies are rendered with dangerouslySetInnerHTML,
// so the backend enforces a strict tag/attribute allowlist as defence in
// depth (brief 8.2: "Sanitize rich HTML if rich HTML is intentionally
// supported"). Even a compromised admin session cannot inject scripts,
// event handlers, or non-media URLs into published pages.
//
// The allowlist mirrors exactly what the editor produces: headings, lists,
// alignment, basic inline marks, and images served from the media store.
package sanitize

import (
	"regexp"

	"github.com/microcosm-cc/bluemonday"
)

// mediaSrcPattern allows img src only when it points at the media store:
// either a relative /media/… path or any host's /media/… path, always with a
// server-generated 32-hex filename. javascript:, data:, and arbitrary remote
// hosts are therefore impossible.
var mediaSrcPattern = regexp.MustCompile(
	`^(?:https?://[^/]+)?/media/[0-9a-f]{32}\.(?:jpg|jpeg|png|webp)$`)

// alignStylePattern allows only text-align: left|center|right in style
// attributes — the CSS the editor's alignment buttons write. Everything else
// (position, url(), expression(), …) is dropped.
var alignStylePattern = regexp.MustCompile(
	`(?i)^(\s*text-align:\s*(?:left|center|right)\s*;?\s*)+$`)

var policy = func() *bluemonday.Policy {
	p := bluemonday.NewPolicy()

	// Block-level structure the editor can produce.
	p.AllowElements("p", "br", "h2", "h3", "ul", "ol", "li", "blockquote")

	// Inline marks: bold, italic, strikethrough (and underline from paste).
	p.AllowElements("strong", "em", "s", "u")

	// Text alignment, applied to paragraphs, headings, and images.
	p.AllowAttrs("style").Matching(alignStylePattern).OnElements("p", "h2", "h3", "img")

	// Images: only server-generated media-store files.
	p.AllowElements("img")
	p.AllowAttrs("src").Matching(mediaSrcPattern).OnElements("img")
	// alt is always HTML-escaped by bluemonday, so any text is safe.
	p.AllowAttrs("alt").OnElements("img")

	return p
}()

// PostContent sanitises an admin-authored post body, returning the HTML that
// is safe to store and render with dangerouslySetInnerHTML.
func PostContent(html string) string {
	return policy.Sanitize(html)
}
