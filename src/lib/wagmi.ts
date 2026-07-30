import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";
import { BASE_RPC_URL } from "@/lib/constants";

// Только Base mainnet. Кошельки: Rabby/MetaMask/прочие расширения приходят
// сами через EIP-6963; здесь — то, что через 6963 не находится.
// Base Account (passkey) намеренно НЕ подключаем: он тянет CDP-SDK с
// x402-зависимостями, которые нам не нужны. По ТЗ — Rabby/MetaMask/injected.
// Приватный ключ НИКОГДА не в коде — подпись только в кошельке.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    metaMask({ dappMetadata: { name: "Base Mini Farm" } }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
