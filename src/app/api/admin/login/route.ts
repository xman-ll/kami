import { NextResponse } from "next/server";

import { isAdminPasswordValid, setAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };

    if (!body.password?.trim()) {
      return NextResponse.json({ error: "请输入后台密码" }, { status: 400 });
    }

    if (!isAdminPasswordValid(body.password)) {
      return NextResponse.json({ error: "后台密码错误" }, { status: 401 });
    }

    await setAdminSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "登录失败",
      },
      { status: 500 },
    );
  }
}
