// ─────────────────────────────────────────────────────────────
// Реквизиты base-mini-farm. Единый источник — не хардкодить по месту.
// ─────────────────────────────────────────────────────────────

export const BASE_CHAIN_ID = 8453 as const;
export const BASE_RPC_URL = "https://mainnet.base.org" as const;

// ⚠️ БИЛДЕР-КОД У ЭТОЙ АПКИ СВОЙ, НОВЫЙ.
// НЕ использовать bc_892znyoo (это код baseapp2). Взять код и data suffix
// из кабинета Base.dev именно для base-mini-farm и вписать сюда.
// Пока пусто — атрибуция не приклеивается (транзакции проходят, но в статистику
// апки не идут). Тест sanity-check в constants.test.ts не даст вписать
// суффикс, не совпадающий с кодом.
export const BUILDER_CODE = "" as string;
export const BUILDER_DATA_SUFFIX = "" as `0x${string}` | "";

// Адреса контрактов — заполняются деплой-страницей после деплоя.
// Пусто = апка знает, что контракты ещё не задеплоены, и блокирует кнопки.
export const CONTRACTS = {
  token: "" as `0x${string}` | "",
  nft: "" as `0x${string}` | "",
  badges: "" as `0x${string}` | "",
  leaderboard: "" as `0x${string}` | "",
  hub: "" as `0x${string}` | "",
} as const;

// Сумма одной покупки токена — микро, чтобы касание стоило доли цента.
export const BUY_ETH_WEI = 10n ** 12n; // 0.000001 ETH

// Явные лимиты газа для действий (кошельки иногда занижают на цепочках L2).
export const GAS = {
  buy: 300_000n,
  approve: 80_000n,
  redeem: 400_000n, // burn + mint NFT + mint badge + запись в лидерборд
} as const;
