/** Navigation shown in the header and mobile menu. */
export type NavLink = { href: string; label: string };

export const navLinks: NavLink[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/categories", label: "Danh mục sản phẩm" },
  { href: "/blog", label: "Bài viết" },
  { href: "/about", label: "Giới thiệu" },
];
