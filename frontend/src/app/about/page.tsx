import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Giới thiệu",
  description: "Câu chuyện của Nhà Len Nhỏ — đồ len handmade móc tay.",
  path: "/about",
});

export default function AboutPage() {
  const site = getSiteConfig();

  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="max-w-xl">
          <h1 className="text-3xl text-ink sm:text-4xl">Về {site.name}</h1>
          <p className="mt-4 text-muted">
            {site.name} là tiệm nhỏ làm đồ len móc tay. Mỗi món đồ được móc từng
            mũi, từ móc khóa nhỏ xinh đến thú bông và hoa len, với mong muốn
            mang đến những món quà ấm áp và ý nghĩa.
          </p>
          <p className="mt-4 text-muted">
            Tiệm nhận móc theo yêu cầu: bạn có thể chọn màu, kích thước và mẫu
            theo sở thích. Nếu cần, hãy nhắn Zalo để tiệm tư vấn thêm.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/categories" className="btn btn-primary">
              Xem sản phẩm
            </Link>
            <a
              href={site.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Nhắn Zalo
            </a>
          </div>
        </div>

        <Image
          src="/brand/banner.jpg"
          alt="Nhà Len Nhỏ — đồ len handmade"
          width={1536}
          height={1024}
          sizes="(max-width: 768px) 100vw, 560px"
          className="w-full rounded-card border border-line object-cover"
        />
      </div>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-2xl text-ink">Tiệm nhận làm</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Đồ len handmade",
            "Nhận móc theo yêu cầu",
            "Quà tặng ý nghĩa",
            "Móc khóa, thú bông, hoa len",
          ].map((item) => (
            <li
              key={item}
              className="rounded-card border border-line bg-white p-5 text-sm text-ink"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
