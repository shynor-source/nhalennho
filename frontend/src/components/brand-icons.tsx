type IconProps = {
  className?: string;
};

/**
 * Official-brand-shaped icons for Zalo and Facebook. Lucide has neither brand,
 * so these are inline SVGs (no network requests, no third-party SDK).
 */

/** Zalo wordmark-style round badge. */
export function ZaloIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.62 1.3 4.98 3.4 6.6-.13 1.06-.55 2.36-1.4 3.6 1.66-.2 3.06-.84 4.1-1.57.62.13 1.26.22 1.9.25.02-.32.06-.63.12-.94a6.4 6.4 0 0 1-.62-.05c-.86-.13-1.62-.42-1.62-.42l-.53 1.06c-.6.4-1.3.76-2.06.98.55-.86.86-1.7 1.02-2.46C4.4 15.8 3.2 13.55 3.2 10.8 3.2 6.6 7.13 3.2 12 3.2s8.8 3.4 8.8 7.6c0 4.2-3.93 7.6-8.8 7.6-.6 0-1.19-.05-1.76-.15a7.4 7.4 0 0 1-2.53 1.75c1.3.35 2.68.4 4.29.4 5.52 0 10-3.94 10-8.8S17.52 2 12 2Z" />
      <path d="M7.2 8.4h1.6l1.6 4.2 1.6-4.2h1.6l-2.5 6.4h-1.4L7.2 8.4Zm7.2 0h1.4v6.4h-1.4V8.4Z" />
    </svg>
  );
}

/** Facebook "f" logo. */
export function FacebookIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.9h-2.34V22c4.78-.76 8.43-4.92 8.43-9.94Z" />
    </svg>
  );
}

/** Shopee bag icon shape (generic shopping bag for the Shopee CTA). */
export function ShopeeIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.5 8V6.5a5.5 5.5 0 0 1 11 0V8h1.6a1 1 0 0 1 1 .92l1 11A2 2 0 0 1 19.1 22H4.9a2 2 0 0 1-1.99-2.08l1-11A1 1 0 0 1 4.9 8H6.5Zm2 0h7V6.5a3.5 3.5 0 0 0-7 0V8Z" />
    </svg>
  );
}
