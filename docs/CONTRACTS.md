# Контракты (Base mainnet)

Компилятор: **solc 0.8.28**, EVM **cancun**, оптимизатор **выключен**, лицензия **MIT**.

| # | Контракт | Назначение | Адрес | Basescan | Верификация |
|---|---|---|---|---|---|
| 1 | **GameToken** | ERC-20, минтит хаб за оплату ETH | `0x0bfcffbb981d0e7ea0b07f1beaa1bc4aa40570e9` | [открыть](https://basescan.org/address/0x0bfcffbb981d0e7ea0b07f1beaa1bc4aa40570e9) | [verify](https://basescan.org/verifyContract?a=0x0bfcffbb981d0e7ea0b07f1beaa1bc4aa40570e9) |
| 2 | **GameNFT** | ERC-721, награда за токены | `0x8f33e2647b57b82194018eaf3df0a48d69675492` | [открыть](https://basescan.org/address/0x8f33e2647b57b82194018eaf3df0a48d69675492) | [verify](https://basescan.org/verifyContract?a=0x8f33e2647b57b82194018eaf3df0a48d69675492) |
| 3 | **GameBadges** | ERC-1155, ачивки за вехи | `0xaebe8a33b6cfa55c91a1c94698b82f85d3baf508` | [открыть](https://basescan.org/address/0xaebe8a33b6cfa55c91a1c94698b82f85d3baf508) | [verify](https://basescan.org/verifyContract?a=0xaebe8a33b6cfa55c91a1c94698b82f85d3baf508) |
| 4 | **GameLeaderboard** | учёт активности игроков | `0x005944a6a88fc7c6b323298e47a1f6f671835db1` | [открыть](https://basescan.org/address/0x005944a6a88fc7c6b323298e47a1f6f671835db1) | [verify](https://basescan.org/verifyContract?a=0x005944a6a88fc7c6b323298e47a1f6f671835db1) |
| 5 | **GameHub** | роутер: одна подпись = несколько действий | `0x6673a974af085cd3e343d12481dd21eaff7bb2f9` | [открыть](https://basescan.org/address/0x6673a974af085cd3e343d12481dd21eaff7bb2f9) | [verify](https://basescan.org/verifyContract?a=0x6673a974af085cd3e343d12481dd21eaff7bb2f9) |

Состояние ончейн (проверено): все `setHub` сделаны, Hub указывает на верные
сателлиты, цена NFT = 10 токенов, 1 ETH = 1 000 000 000 токенов (0.000001 ETH → 1000),
владелец токена renounce.

## Код для вставки (src/lib/constants.ts)

```ts
export const CONTRACTS = {
  token: "0x0bfcffbb981d0e7ea0b07f1beaa1bc4aa40570e9",
  nft: "0x8f33e2647b57b82194018eaf3df0a48d69675492",
  badges: "0xaebe8a33b6cfa55c91a1c94698b82f85d3baf508",
  leaderboard: "0x005944a6a88fc7c6b323298e47a1f6f671835db1",
  hub: "0x6673a974af085cd3e343d12481dd21eaff7bb2f9",
} as const;
```

## Верификация исходников на Basescan

Пока **не** верифицированы. Настройки для формы Verify & Publish (Standard-Json-Input):
компилятор `v0.8.28`, оптимизатор `No`, лицензия `MIT`. Standard-JSON и
аргументы конструктора можно выгрузить из `scripts/build-artifacts.js` /
исходников — по запросу подготовлю готовые файлы, как делали раньше.
