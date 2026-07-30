"use client";

import { useMemo, useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { base } from "wagmi/chains";
import type { Abi, Address } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import artifacts from "@/lib/artifacts.json";

// Деплой-инструмент. Разворачивает 5 контрактов в правильном порядке, сам
// прокидывает адреса между шагами, связывает setHub и делает renounce токена.
// Пользователь только подписывает каждую транзакцию в кошельке.
//
// Порядок критичен: сначала 4 сателлита, потом Hub с их адресами, потом
// setHub на каждом сателлите (одноразовый и необратимый — поэтому порядок
// зашит, а не вводится руками).

type Art = { abi: Abi; bytecode: `0x${string}` };
const A = artifacts as unknown as Record<string, Art>;

type StepState = "pending" | "running" | "done" | "error";
type Step = {
  key: string;
  label: string;
  run: () => Promise<void>;
  state: StepState;
  note?: string;
};

const TOKEN_WEI = 10n ** 18n;

export default function Deploy() {
  const { isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();

  // Параметры деплоя.
  const [tokenName, setTokenName] = useState("Farm Token");
  const [tokenSymbol, setTokenSymbol] = useState("FARM");
  const [nftName, setNftName] = useState("Farm NFT");
  const [nftSymbol, setNftSymbol] = useState("FNFT");
  const [nftBaseURI, setNftBaseURI] = useState("");
  const [badgesURI, setBadgesURI] = useState("");
  // 1 млрд токенов за 1 ETH ⇒ 0.000001 ETH даёт 1000 токенов (как в baseapp2).
  const [tokensPerEth, setTokensPerEth] = useState("1000000000");
  const [nftPriceTokens, setNftPriceTokens] = useState("10"); // цена NFT в целых токенах
  const [renounceToken, setRenounceToken] = useState(true);

  // Адреса задеплоенного.
  const [addr, setAddr] = useState<Record<string, Address>>({});
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0); // форс-ререндер статусов шагов

  const say = (m: string) => setLog((l) => [...l, m]);

  async function deploy(name: string, args: unknown[]): Promise<Address> {
    if (!wallet || !publicClient) throw new Error("кошелёк недоступен");
    const hash = await wallet.deployContract({
      abi: A[name].abi,
      bytecode: A[name].bytecode,
      args,
      chain: base,
    });
    say(`${name}: транзакция ${hash.slice(0, 12)}… ждём сеть`);
    const r = await publicClient.waitForTransactionReceipt({ hash });
    if (!r.contractAddress) throw new Error(`${name}: нет адреса в квитанции`);
    setAddr((a) => ({ ...a, [name]: r.contractAddress as Address }));
    say(`${name} задеплоен: ${r.contractAddress}`);
    return r.contractAddress;
  }

  async function call(address: Address, name: string, fn: string, args: unknown[] = []) {
    if (!wallet || !publicClient) throw new Error("кошелёк недоступен");
    const hash = await wallet.writeContract({
      address,
      abi: A[name].abi,
      functionName: fn,
      args,
      chain: base,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    say(`${name}.${fn}() выполнено`);
  }

  // Список шагов пересобираем по ходу — later-шаги используют addr из state.
  const steps: Step[] = useMemo(() => {
    const done = (k: string) => (addr[k] ? "done" : "pending") as StepState;
    const perEth = (() => {
      try {
        return BigInt(tokensPerEth) * TOKEN_WEI;
      } catch {
        return 0n;
      }
    })();
    const price = (() => {
      try {
        return BigInt(nftPriceTokens) * TOKEN_WEI;
      } catch {
        return 0n;
      }
    })();

    return [
      {
        key: "GameToken",
        label: "1. Деплой GameToken",
        state: done("GameToken"),
        run: async () => void (await deploy("GameToken", [tokenName, tokenSymbol])),
      },
      {
        key: "GameNFT",
        label: "2. Деплой GameNFT",
        state: done("GameNFT"),
        run: async () => void (await deploy("GameNFT", [nftName, nftSymbol, nftBaseURI])),
      },
      {
        key: "GameBadges",
        label: "3. Деплой GameBadges",
        state: done("GameBadges"),
        run: async () => void (await deploy("GameBadges", [badgesURI])),
      },
      {
        key: "GameLeaderboard",
        label: "4. Деплой GameLeaderboard",
        state: done("GameLeaderboard"),
        run: async () => void (await deploy("GameLeaderboard", [])),
      },
      {
        key: "GameHub",
        label: "5. Деплой GameHub (связывает всё)",
        state: done("GameHub"),
        run: async () =>
          void (await deploy("GameHub", [
            addr.GameToken,
            addr.GameNFT,
            addr.GameBadges,
            addr.GameLeaderboard,
            perEth,
            price,
          ])),
      },
      {
        key: "hub:token",
        label: "6. GameToken.setHub(hub)",
        state: "pending",
        run: async () => call(addr.GameToken, "GameToken", "setHub", [addr.GameHub]),
      },
      {
        key: "hub:nft",
        label: "7. GameNFT.setHub(hub)",
        state: "pending",
        run: async () => call(addr.GameNFT, "GameNFT", "setHub", [addr.GameHub]),
      },
      {
        key: "hub:badges",
        label: "8. GameBadges.setHub(hub)",
        state: "pending",
        run: async () => call(addr.GameBadges, "GameBadges", "setHub", [addr.GameHub]),
      },
      {
        key: "hub:board",
        label: "9. GameLeaderboard.setHub(hub)",
        state: "pending",
        run: async () => call(addr.GameLeaderboard, "GameLeaderboard", "setHub", [addr.GameHub]),
      },
      ...(renounceToken
        ? [
            {
              key: "renounce:token",
              label: "10. GameToken.renounceOwnership() (владелец больше не нужен)",
              state: "pending" as StepState,
              run: async () =>
                call(addr.GameToken, "GameToken", "renounceOwnership", []),
            },
          ]
        : []),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr, tokenName, tokenSymbol, nftName, nftSymbol, nftBaseURI, badgesURI, tokensPerEth, nftPriceTokens, renounceToken, tick]);

  // Прогоняем шаги по очереди, начиная с первого невыполненного.
  async function runAll() {
    if (!isConnected || !wallet) return;
    setBusy(true);
    try {
      for (const s of steps) {
        if (s.state === "done") continue;
        say(`▶ ${s.label}`);
        await s.run();
        setTick((t) => t + 1);
      }
      say("✅ Готово. Скопируй адреса в src/lib/constants.ts");
    } catch (e) {
      say(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  const constantsSnippet =
    addr.GameHub &&
    `export const CONTRACTS = {
  token: "${addr.GameToken}",
  nft: "${addr.GameNFT}",
  badges: "${addr.GameBadges}",
  leaderboard: "${addr.GameLeaderboard}",
  hub: "${addr.GameHub}",
} as const;`;

  const input = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Деплой контрактов</h1>
        <ConnectButton />
      </header>

      <section className="grid grid-cols-2 gap-3">
        <label className="text-xs text-white/60">Имя токена
          <input className={input} value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
        </label>
        <label className="text-xs text-white/60">Символ токена
          <input className={input} value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)} />
        </label>
        <label className="text-xs text-white/60">Имя NFT
          <input className={input} value={nftName} onChange={(e) => setNftName(e.target.value)} />
        </label>
        <label className="text-xs text-white/60">Символ NFT
          <input className={input} value={nftSymbol} onChange={(e) => setNftSymbol(e.target.value)} />
        </label>
        <label className="text-xs text-white/60">Base URI метаданных NFT (можно позже)
          <input className={input} value={nftBaseURI} onChange={(e) => setNftBaseURI(e.target.value)} placeholder="ipfs://… или https://…/api/nft/" />
        </label>
        <label className="text-xs text-white/60">URI метаданных бейджей (можно позже)
          <input className={input} value={badgesURI} onChange={(e) => setBadgesURI(e.target.value)} placeholder="ipfs://…" />
        </label>
        <label className="text-xs text-white/60">Токенов за 1 ETH
          <input className={input} value={tokensPerEth} onChange={(e) => setTokensPerEth(e.target.value)} />
        </label>
        <label className="text-xs text-white/60">Цена NFT (в токенах)
          <input className={input} value={nftPriceTokens} onChange={(e) => setNftPriceTokens(e.target.value)} />
        </label>
      </section>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={renounceToken} onChange={(e) => setRenounceToken(e.target.checked)} />
        renounce владельца токена после связки (рекомендовано аудитом)
      </label>

      <ol className="flex flex-col gap-1 text-sm">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span>{s.state === "done" ? "✅" : "▫️"}</span>
            <span className={s.state === "done" ? "text-white/50 line-through" : ""}>{s.label}</span>
          </li>
        ))}
      </ol>

      <button
        onClick={runAll}
        disabled={!isConnected || busy}
        className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-black disabled:opacity-50"
      >
        {busy ? "Деплой идёт — подписывай в кошельке…" : "Задеплоить всё / продолжить"}
      </button>
      {!isConnected && <p className="text-center text-xs text-white/50">Сначала подключи кошелёк.</p>}

      {constantsSnippet && (
        <pre className="overflow-x-auto rounded-lg border border-white/15 bg-black/40 p-3 text-xs">
          {constantsSnippet}
        </pre>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/70">
        {log.length === 0 ? "Лог появится здесь." : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </main>
  );
}
