import { NextRequest, NextResponse } from "next/server";

// Метаданные NFT (ERC-721). tokenURI контракта = baseURI + tokenId (десятичный),
// то есть сюда приходит id вида .../api/nft/1. Картинку генерируем инлайном
// (data-URI SVG), чтобы не зависеть от внешних файлов и хостинга арта.
//
// baseURI на контракте меняется через setBaseURI (владельца NFT мы сохранили),
// так что позже можно переключить на IPFS с фиксированным CID.

function svg(id: string) {
  const hue = (Number(id) * 47) % 360;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <rect width="600" height="600" fill="hsl(${hue},70%,18%)"/>
    <circle cx="300" cy="250" r="140" fill="hsl(${hue},70%,50%)"/>
    <text x="300" y="270" font-family="system-ui" font-size="120" font-weight="900"
      fill="#fff" text-anchor="middle">#${id}</text>
    <text x="300" y="470" font-family="system-ui" font-size="44" font-weight="700"
      fill="#fff" text-anchor="middle" opacity="0.9">Base Mini Farm</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(s);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "нет такого NFT" }, { status: 404 });
  }

  return NextResponse.json(
    {
      name: `Farm NFT #${id}`,
      description: "Награда в Base Mini Farm за обмен токенов.",
      image: svg(id),
      attributes: [{ trait_type: "Collection", value: "Base Mini Farm" }],
    },
    {
      headers: {
        "cache-control": "public, max-age=86400, stale-while-revalidate=86400",
      },
    }
  );
}
