import { db, sql } from "@vercel/postgres";

import { generateCardCode, normalizeCardCode } from "@/lib/cards";

export type CardStatus = "unused" | "redeemed";

export type CardRecord = {
  id: number;
  code: string;
  note: string | null;
  status: CardStatus;
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedBy: string | null;
};

type CardRow = {
  id: number;
  code: string;
  note: string | null;
  status: CardStatus;
  created_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
};

let initialized = false;

function mapCard(row: CardRow): CardRecord {
  return {
    id: row.id,
    code: row.code,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    redeemedAt: row.redeemed_at,
    redeemedBy: row.redeemed_by,
  };
}

export async function ensureTables(): Promise<void> {
  if (initialized) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS card_keys (
      id SERIAL PRIMARY KEY,
      code VARCHAR(80) UNIQUE NOT NULL,
      note VARCHAR(255),
      status VARCHAR(16) NOT NULL DEFAULT 'unused',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      redeemed_at TIMESTAMPTZ,
      redeemed_by VARCHAR(120)
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_card_keys_status ON card_keys (status);
  `;

  initialized = true;
}

export async function listCards(filters: {
  status?: string;
  keyword?: string;
}): Promise<CardRecord[]> {
  await ensureTables();

  const clauses: string[] = [];
  const params: Array<string> = [];

  if (filters.status && ["unused", "redeemed"].includes(filters.status)) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  if (filters.keyword) {
    params.push(`%${filters.keyword.trim().toUpperCase()}%`);
    clauses.push(`code ILIKE $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `
    SELECT id, code, note, status, created_at, expires_at, redeemed_at, redeemed_by
    FROM card_keys
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 500
  `;

  const result = await sql.query<CardRow>(query, params);

  return result.rows.map(mapCard);
}

export async function createCards(input: {
  count: number;
  prefix?: string;
  note?: string;
  expiresAt?: string;
  bodyLength?: number;
}): Promise<CardRecord[]> {
  await ensureTables();

  const client = await db.connect();
  const createdCards: CardRecord[] = [];
  const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
  const note = input.note?.trim() || null;

  try {
    await client.sql`BEGIN`;

    for (let index = 0; index < input.count; index += 1) {
      const code = generateCardCode(input.prefix, input.bodyLength ?? 16);
      const result = await client.sql<CardRow>`
        INSERT INTO card_keys (code, note, expires_at)
        VALUES (
          ${code},
          ${note},
          ${expiresAt}
        )
        RETURNING id, code, note, status, created_at, expires_at, redeemed_at, redeemed_by
      `;

      createdCards.push(mapCard(result.rows[0]));
    }

    await client.sql`COMMIT`;

    return createdCards;
  } catch (error) {
    await client.sql`ROLLBACK`;
    throw error;
  } finally {
    client.release();
  }
}

export async function redeemCard(input: {
  code: string;
  workosCursorSessionToken?: string;
}): Promise<
  | { success: true; card: CardRecord }
  | { success: false; reason: "not_found" | "already_redeemed" | "expired"; card?: CardRecord }
> {
  await ensureTables();

  const normalizedCode = normalizeCardCode(input.code);
  const workosCursorSessionToken = input.workosCursorSessionToken?.trim() || null;
  const updated = await sql<CardRow>`
    UPDATE card_keys
    SET
      status = 'redeemed',
      redeemed_at = NOW(),
      redeemed_by = ${workosCursorSessionToken}
    WHERE
      code = ${normalizedCode}
      AND status = 'unused'
      AND (expires_at IS NULL OR expires_at > NOW())
    RETURNING id, code, note, status, created_at, expires_at, redeemed_at, redeemed_by
  `;

  if (updated.rowCount && updated.rows[0]) {
    return {
      success: true,
      card: mapCard(updated.rows[0]),
    };
  }

  const existing = await sql<CardRow>`
    SELECT id, code, note, status, created_at, expires_at, redeemed_at, redeemed_by
    FROM card_keys
    WHERE code = ${normalizedCode}
    LIMIT 1
  `;

  if (!existing.rowCount || !existing.rows[0]) {
    return { success: false, reason: "not_found" };
  }

  const card = mapCard(existing.rows[0]);

  if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now()) {
    return { success: false, reason: "expired", card };
  }

  return { success: false, reason: "already_redeemed", card };
}
