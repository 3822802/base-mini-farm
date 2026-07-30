import { NextRequest, NextResponse } from "next/server";

// Метаданные бейджей (ERC-1155). Стандарт: uri контракта содержит шаблон {id},
// который маркетплейсы заменяют на 64-символьный hex id. Поэтому сюда может
// прийти и десятичный id (1), и hex с ведущими нулями (0000…0001), возможно
// с расширением .json. Нормализуем и мапим на три бейджа.

const BADGES: Record<number, { name: string; description: string; color: string }> = {
  1: { name: "First Buy", description: "Первая покупка токена.", color: "#5fbf4a" },
  2: { name: "Collector", description: "Собрано 5 NFT.", color: "#f5d76e" },
  3: { name: "Regular", description: "7 чек-инов.", color: "#9fd8f5" },
};

function normalizeId(raw: string): number | null {
  let s = raw.replace(/\.json$/i, "");
  // hex id из ERC-1155 (64 символа с ведущими нулями)
  if (/^[0-9a-fA-F]{64}$/.test(s)) return parseInt(s, 16);
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

function svg(name: string, color: string) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <rect width="600" height="600" fill="#101018"/>
    <circle cx="300" cy="240" r="150" fill="${color}"/>
    <text x="300" y="270" font-family="system-ui" font-size="56" font-weight="900"
      fill="#101018" text-anchor="middle">★</text>
    <text x="300" y="470" font-family="system-ui" font-size="48" font-weight="800"
      fill="#fff" text-anchor="middle">${name}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(s);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const n = normalizeId(id);
  const badge = n !== null ? BADGES[n] : undefined;
  if (!badge) {
    return NextResponse.json({ error: "нет такого бейджа" }, { status: 404 });
  }

  return NextResponse.json(
    {
      name: `Badge — ${badge.name}`,
      description: badge.description,
      image: svg(badge.name, badge.color),
      attributes: [
        { trait_type: "Collection", value: "Base Mini Farm" },
        { trait_type: "Badge", value: badge.name },
      ],
    },
    {
      headers: {
        "cache-control": "public, max-age=86400, stale-while-revalidate=86400",
      },
    }
  );
}
