import { Suspense } from "react";

import RedeemClient from "@/components/redeem-client";

export default function RedeemPage() {
  return (
    <div className="redeem-page-wrap">
      <section className="panel redeem-page-panel">
        <div className="redeem-page-head">
          <h1>卡密核销</h1>
          <p className="muted">
            请填写订单号、WorkosCursorSessionToken 和卡密进行核销。系统会校验卡密状态并记录提交信息，每个卡密仅可核销一次。
          </p>
        </div>

        <Suspense fallback={<p className="muted">正在加载核销表单...</p>}>
          <RedeemClient />
        </Suspense>
      </section>
    </div>
  );
}
