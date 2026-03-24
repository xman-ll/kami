"use client";

import Link from "next/link";
import { MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BrandLink() {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    // 显式走客户端导航，避免某些情况下布局内品牌链接失效。
    event.preventDefault();

    if (pathname === "/") {
      router.refresh();
      return;
    }

    router.push("/");
  }

  return (
    <Link href="/" className="brand" onClick={handleClick}>
      卡密系统
    </Link>
  );
}
