"use client";

import { FormEvent, useState } from "react";

type RedeemResult =
  | {
      success: true;
      card: {
        code: string;
        redeemedAt: string | null;
        redeemedBy: string | null;
      };
    }
  | {
      success: false;
      reason: "not_found" | "already_redeemed" | "expired";
      card?: {
        code: string;
        redeemedAt: string | null;
        redeemedBy: string | null;
      };
    };

function getReasonText(result: RedeemResult | null): string {
  if (!result) {
    return "";
  }

  if (result.success) {
    return `卡密 ${result.card.code} 已核销成功`;
  }

  if (result.reason === "not_found") {
    return "卡密不存在，请检查后重试";
  }

  if (result.reason === "expired") {
    return "卡密已过期，无法核销";
  }

  return "卡密已被核销，不能重复使用";
}

export default function RedeemClient() {
  const [code, setCode] = useState("");
  const [redeemer, setRedeemer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/cards/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          redeemer,
        }),
      });
      const data = (await response.json()) as RedeemResult & { error?: string };

      if (!response.ok && !("reason" in data)) {
        throw new Error(data.error || "核销失败");
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "核销失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel narrow-panel">
      <h1>卡密核销</h1>
      <p className="muted">输入卡密后立即校验并完成核销，已核销卡密不可重复使用。</p>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          卡密
          <input
            className="input mono"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="例如 VIP-ABCD-EFGH-IJKL"
            required
          />
        </label>
        <label>
          核销人
          <input
            className="input"
            value={redeemer}
            onChange={(event) => setRedeemer(event.target.value)}
            placeholder="可选，例如用户名或手机号"
          />
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "核销中..." : "立即核销"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {result ? (
        <div className={`result-box ${result.success ? "success-box" : "warn-box"}`}>
          <strong>{getReasonText(result)}</strong>
          {"card" in result && result.card ? (
            <p className="muted">
              核销时间：{result.card.redeemedAt ? new Date(result.card.redeemedAt).toLocaleString("zh-CN") : "-"}
              <br />
              核销人：{result.card.redeemedBy ?? "-"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
