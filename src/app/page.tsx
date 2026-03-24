import Link from "next/link";

import { hasAdminSession } from "@/lib/auth";

export default async function HomePage() {
  const isAdminLoggedIn = await hasAdminSession();

  return (
    <div className="hero-grid">
      <section className="panel">
        <span className="hero-badge">Vercel Ready</span>
        <h1>自动批量生成卡密，并支持在线核销</h1>
        <p className="lead">
          这是一个可直接部署到 Vercel 的卡密系统，包含后台批量生成、状态管理、CSV 导出和前台核销页面。
        </p>
        <div className="actions">
          {isAdminLoggedIn ? (
            <Link href="/admin" className="button primary">
              打开管理后台
            </Link>
          ) : null}
          <Link href="/redeem" className="button">
            打开核销页面
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>功能说明</h2>
        <ul className="feature-list">
          <li>批量生成卡密，可设置数量、前缀、长度、备注和过期时间。</li>
          <li>卡密存储在 Postgres，适合部署到 Vercel，不依赖本地文件。</li>
          <li>核销接口为原子更新，避免并发重复核销。</li>
          <li>后台可查看核销状态、核销时间和核销人信息。</li>
        </ul>
      </section>

      <section className="panel">
        <h2>部署前需要的环境变量</h2>
        <div className="code-card">
          <code>POSTGRES_URL</code>
          <code>POSTGRES_PRISMA_URL</code>
          <code>POSTGRES_URL_NON_POOLING</code>
          <code>POSTGRES_USER</code>
          <code>POSTGRES_HOST</code>
          <code>POSTGRES_PASSWORD</code>
          <code>POSTGRES_DATABASE</code>
          <code>ADMIN_PASSWORD</code>
          <code>ADMIN_SESSION_SECRET</code>
        </div>
      </section>
    </div>
  );
}
