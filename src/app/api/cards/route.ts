import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { listCards } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const keyword = searchParams.get("keyword") ?? undefined;
    const cards = await listCards({ status, keyword });

    return NextResponse.json({ cards });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取卡密失败",
      },
      { status: 500 },
    );
  }
}
