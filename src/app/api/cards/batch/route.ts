import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { createCards } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = (await request.json()) as {
      count?: number;
      prefix?: string;
      note?: string;
      expiresAt?: string;
      bodyLength?: number;
    };

    const count = Number(body.count);
    const bodyLength = Number(body.bodyLength ?? 16);

    if (!Number.isInteger(count) || count < 1 || count > 500) {
      return NextResponse.json({ error: "生成数量必须在 1 到 500 之间" }, { status: 400 });
    }

    if (!Number.isInteger(bodyLength) || bodyLength < 8 || bodyLength > 24) {
      return NextResponse.json({ error: "卡密长度必须在 8 到 24 之间" }, { status: 400 });
    }

    if (body.expiresAt && Number.isNaN(new Date(body.expiresAt).getTime())) {
      return NextResponse.json({ error: "过期时间格式不正确" }, { status: 400 });
    }

    const cards = await createCards({
      count,
      prefix: body.prefix,
      note: body.note,
      expiresAt: body.expiresAt,
      bodyLength,
    });

    return NextResponse.json({ cards });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成卡密失败",
      },
      { status: 500 },
    );
  }
}
