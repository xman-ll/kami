"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type CardRecord = {
  id: number;
  code: string;
  note: string | null;
  status: "unused" | "redeemed";
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedBy: string | null;
};

type BatchFormState = {
  count: string;
  prefix: string;
  bodyLength: string;
  note: string;
  expiresAt: string;
};

function formatTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("zh-CN");
}

function downloadCsv(cards: CardRecord[]): void {
  const rows = [
    ["卡密", "状态", "备注", "生成时间", "过期时间", "核销时间", "核销人"].join(","),
    ...cards.map((card) =>
      [
        card.code,
        card.status === "unused" ? "未使用" : "已核销",
        card.note ?? "",
        formatTime(card.createdAt),
        formatTime(card.expiresAt),
        formatTime(card.redeemedAt),
        card.redeemedBy ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];

  const blob = new Blob([`\ufeff${rows.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `cards-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminClient() {
  const [password, setPassword] = useState("");
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [latestCards, setLatestCards] = useState<CardRecord[]>([]);
  const [authState, setAuthState] = useState<"checking" | "authed" | "guest">("checking");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [filters, setFilters] = useState({
    status: "all",
    keyword: "",
  });
  const [form, setForm] = useState<BatchFormState>({
    count: "10",
    prefix: "",
    bodyLength: "16",
    note: "",
    expiresAt: "",
  });

  const summary = useMemo(() => {
    const unused = cards.filter((card) => card.status === "unused").length;
    const redeemed = cards.length - unused;

    return {
      total: cards.length,
      unused,
      redeemed,
    };
  }, [cards]);

  const fetchCards = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.status !== "all") {
        params.set("status", filters.status);
      }

      if (filters.keyword.trim()) {
        params.set("keyword", filters.keyword.trim());
      }

      const response = await fetch(`/api/cards?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        setAuthState("guest");
        setCards([]);
        return;
      }

      const data = (await response.json()) as { cards?: CardRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "获取卡密失败");
      }

      setCards(data.cards ?? []);
      setAuthState("authed");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "获取卡密失败");
      setAuthState((current) => (current === "checking" ? "guest" : current));
    } finally {
      setLoading(false);
    }
  }, [filters.keyword, filters.status]);

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "登录失败");
      }

      setPassword("");
      setAuthState("authed");
      await fetchCards();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthState("guest");
    setCards([]);
    setLatestCards([]);
    setMessage("");
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/cards/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: Number(form.count),
          prefix: form.prefix,
          bodyLength: Number(form.bodyLength),
          note: form.note,
          expiresAt: form.expiresAt || undefined,
        }),
      });
      const data = (await response.json()) as {
        cards?: CardRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      const created = data.cards ?? [];

      setLatestCards(created);
      setCards((previous) => [...created, ...previous].slice(0, 500));
      setMessageType("success");
      setMessage(`已生成 ${created.length} 个卡密`);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLatestCodes(): Promise<void> {
    if (!latestCards.length) {
      setMessageType("error");
      setMessage("还没有新生成的卡密");
      return;
    }

    await navigator.clipboard.writeText(latestCards.map((item) => item.code).join("\n"));
    setMessageType("success");
    setMessage("最新生成的卡密已复制");
  }

  if (authState === "checking") {
    return <div className="panel">正在检查登录状态...</div>;
  }

  if (authState === "guest") {
    return (
      <div className="panel narrow-panel">
        <h1>管理后台登录</h1>
        <p className="muted">
          使用 `.env.local` 或 Vercel 环境变量配置 `ADMIN_PASSWORD` 和 `ADMIN_SESSION_SECRET`。
        </p>
        <form className="stack-form" onSubmit={handleLogin}>
          <label>
            后台密码
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入后台密码"
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
        {message ? <p className="error-text">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h1>卡密批量生成</h1>
            <p className="muted">支持批量生成、导出、查询和核销状态跟踪。</p>
          </div>
          <button className="button ghost" type="button" onClick={handleLogout}>
            退出登录
          </button>
        </div>

        <form className="grid-form" onSubmit={handleGenerate}>
          <label>
            生成数量
            <input
              className="input"
              type="number"
              min="1"
              max="500"
              value={form.count}
              onChange={(event) => setForm((prev) => ({ ...prev, count: event.target.value }))}
              required
            />
          </label>
          <label>
            前缀
            <input
              className="input"
              value={form.prefix}
              onChange={(event) => setForm((prev) => ({ ...prev, prefix: event.target.value }))}
              placeholder="例如 VIP"
            />
          </label>
          <label>
            卡密长度
            <input
              className="input"
              type="number"
              min="8"
              max="24"
              value={form.bodyLength}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, bodyLength: event.target.value }))
              }
              required
            />
          </label>
          <label>
            过期时间
            <input
              className="input"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
            />
          </label>
          <label className="full-width">
            备注
            <input
              className="input"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="例如 三月活动批次"
            />
          </label>
          <div className="actions full-width">
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "生成中..." : "生成卡密"}
            </button>
            <button className="button" type="button" onClick={copyLatestCodes}>
              复制最新卡密
            </button>
          </div>
        </form>

        {message ? <p className={messageType === "success" ? "success-text" : "error-text"}>{message}</p> : null}

        {latestCards.length ? (
          <div className="card-list-preview">
            <div className="panel-header">
              <h2>最新生成</h2>
              <span className="muted">{latestCards.length} 条</span>
            </div>
            <textarea
              className="textarea"
              readOnly
              value={latestCards.map((item) => item.code).join("\n")}
            />
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="stats-row">
          <div className="stat-card">
            <strong>{summary.total}</strong>
            <span>总卡密</span>
          </div>
          <div className="stat-card">
            <strong>{summary.unused}</strong>
            <span>未使用</span>
          </div>
          <div className="stat-card">
            <strong>{summary.redeemed}</strong>
            <span>已核销</span>
          </div>
        </div>

        <form
          className="filter-row"
          onSubmit={(event) => {
            event.preventDefault();
            void fetchCards();
          }}
        >
          <select
            className="input"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="all">全部状态</option>
            <option value="unused">未使用</option>
            <option value="redeemed">已核销</option>
          </select>
          <input
            className="input"
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            placeholder="搜索卡密"
          />
          <button className="button" type="submit" disabled={loading}>
            {loading ? "刷新中..." : "查询"}
          </button>
          <button className="button ghost" type="button" onClick={() => downloadCsv(cards)}>
            导出 CSV
          </button>
        </form>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>卡密</th>
                <th>状态</th>
                <th>备注</th>
                <th>生成时间</th>
                <th>过期时间</th>
                <th>核销信息</th>
              </tr>
            </thead>
            <tbody>
              {cards.length ? (
                cards.map((card) => (
                  <tr key={card.id}>
                    <td className="mono">{card.code}</td>
                    <td>
                      <span className={`badge ${card.status === "unused" ? "green" : "orange"}`}>
                        {card.status === "unused" ? "未使用" : "已核销"}
                      </span>
                    </td>
                    <td>{card.note ?? "-"}</td>
                    <td>{formatTime(card.createdAt)}</td>
                    <td>{formatTime(card.expiresAt)}</td>
                    <td>
                      {card.redeemedAt ? `${formatTime(card.redeemedAt)} / ${card.redeemedBy ?? "-"}` : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
