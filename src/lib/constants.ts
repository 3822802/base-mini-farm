// ─────────────────────────────────────────────────────────────
// Реквизиты base-mini-farm. Единый источник — не хардкодить по месту.
// ─────────────────────────────────────────────────────────────

export const BASE_CHAIN_ID = 8453 as const;
export const BASE_RPC_URL = "https://mainnet.base.org" as const;

// Билдер-код ЭТОЙ апки (base-mini-farm) — из её кабинета Base.dev.
// НЕ bc_892znyoo (это код baseapp2). Суффикс кодирует именно этот код —
// проверено: первые байты = hex("bc_b21e0p17"), байт длины 0x0b = 11.
export const BUILDER_CODE = "bc_b21e0p17" as string;
export const BUILDER_DATA_SUFFIX =
  "0x62635f62323165307031370b0080218021802180218021802180218021" as `0x${string}` | "";

// Адреса задеплоенных контрактов (Base mainnet).
export const CONTRACTS = {
  token: "0x0bfcffbb981d0e7ea0b07f1beaa1bc4aa40570e9" as `0x${string}` | "",
  nft: "0x8f33e2647b57b82194018eaf3df0a48d69675492" as `0x${string}` | "",
  badges: "0xaebe8a33b6cfa55c91a1c94698b82f85d3baf508" as `0x${string}` | "",
  leaderboard: "0x005944a6a88fc7c6b323298e47a1f6f671835db1" as `0x${string}` | "",
  hub: "0x6673a974af085cd3e343d12481dd21eaff7bb2f9" as `0x${string}` | "",
} as const;

// Сумма одной покупки токена — микро, чтобы касание стоило доли цента.
export const BUY_ETH_WEI = 10n ** 12n; // 0.000001 ETH

// Явные лимиты газа для действий (кошельки иногда занижают на цепочках L2).
export const GAS = {
  buy: 300_000n,
  approve: 80_000n,
  redeem: 400_000n, // burn + mint NFT + mint badge + запись в лидерборд
} as const;
