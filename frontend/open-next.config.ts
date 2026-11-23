// OpenNext → Cloudflare Workers adapter config (ADR-0013).
//
// Default configuration: no incremental cache binding (the storefront does not
// use ISR) and no R2/KV/D1 bindings. Build with `npm run cf:build`, deploy with
// `npm run cf:deploy`. See docs/DEPLOY-free-combo.md.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
