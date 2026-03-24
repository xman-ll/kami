import { NextResponse } from "next/server";

import { redeemCard } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      redeemer?: string;
    };

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "请输入卡密" }, { status: 400 });
    }

    const result = await redeemCard({
      code: body.code,
      redeemer: body.redeemer,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "核销失败",
      },
      { status: 500 },
    );
  }
}
