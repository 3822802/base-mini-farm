// Математика цены — ровно как в контракте GameHub:
//   out = msg.value * tokensPerEth / 1e18
// Один источник правды для деплой-страницы и тестов, чтобы фронт и контракт
// не разошлись в расчётах.

const ONE = 10n ** 18n;

/// Параметр tokensPerEth для конструктора Hub из «целых токенов за 1 ETH».
export function tokensPerEthParam(wholeTokensPerEth: bigint): bigint {
  return wholeTokensPerEth * ONE;
}

/// Цена NFT (в wei токена) из «целых токенов».
export function nftPriceParam(wholeTokens: bigint): bigint {
  return wholeTokens * ONE;
}

/// Сколько токенов (в wei) получит покупатель за valueWei ETH.
export function tokensOut(valueWei: bigint, perEthParam: bigint): bigint {
  return (valueWei * perEthParam) / ONE;
}
