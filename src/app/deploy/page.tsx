"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { base } from "wagmi/chains";
import { zeroAddress, type Abi, type Address } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { tokensPerEthParam, nftPriceParam } from "@/lib/pricing";
import artifacts from "@/lib/artifacts.json";

// Деплой-инструмент. Разворачивает 5 контрактов, сам прокидывает адреса между
// шагами, связывает setHub и делает renounce токена. Пользователь только
// подписывает каждую транзакцию.
//
// ВАЖНО: адреса ведём в ЛОКАЛЬНОМ аккумуляторе внутри runAll, а не берём из
// React-состояния в замыканиях — иначе setHub видел бы устаревший (пустой)
// адрес Hub и ревертил ZeroHub. Порядок деплоя зашит: setHub одноразовый.
// Прогон возобновляемый: уже задеплоенное и уже связанное пропускается.

type Art = { abi: Abi; bytecode: `0x${string}` };
const A = artifacts as unknown as Record<string, Art>;

// Порядок сателлитов для деплоя и связки.
const SATS = ["GameToken", "GameNFT", "GameBadges", "GameLeaderboard"] as const;

export default function Deploy() {
  const { isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();

  const [tokenName, setTokenName] = useState("Farm Token");
  const [tokenSymbol, setTokenSymbol] = useState("FARM");
  const [nftName, setNftName] = useState("Farm NFT");
  const [nftSymbol, setNftSymbol] = useState("FNFT");
  const [nftBaseURI, setNftBaseURI] = useState("");
  const [badgesURI, setBadgesURI] = useState("");
  const [tokensPerEth, setTokensPerEth] = useState("1000000000");
  const [nftPriceTokens, setNftPriceTokens] = useState("10");
  const [renounceToken, setRenounceToken] = useState(true);

  const [addr, setAddr] = useState<Record<string, Address>>({});
  const [doneWiring, setDoneWiring] = useState<Record<string, boolean>>({});
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const say = (m: string) => setLog((l) => [...l, m]);

  async function deployOne(name: string, args: unknown[]): Promise<Address> {
    const hash = await wallet!.deployContract({
      abi: A[name].abi,
      bytecode: A[name].bytecode,
      args,
      chain: base,
    });
    say(`${name}: ${hash.slice(0, 12)}… ждём сеть`);
    const r = await publicClient!.waitForTransactionReceipt({ hash });
    if (!r.contractAddress) throw new Error(`${name}: нет адреса в квитанции`);
    setAddr((a) => ({ ...a, [name]: r.contractAddress as Address }));
    say(`✅ ${name}: ${r.contractAddress}`);
    return r.contractAddress;
  }

  async function callOne(address: Address, name: string, fn: string, args: unknown[] = []) {
    const hash = await wallet!.writeContract({
      address,
      abi: A[name].abi,
      functionName: fn,
      args,
      chain: base,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    say(`✅ ${name}.${fn}()`);
  }

  async function runAll() {
    if (!isConnected || !wallet || !publicClient) return;
    setBusy(true);
    try {
      // Локальный аккумулятор: старт из уже задеплоенного (возобновление).
      const d: Record<string, Address> = { ...addr };
      const done = { ...doneWiring };

      const perEth = tokensPerEthParam(BigInt(tokensPerEth));
      const price = nftPriceParam(BigInt(nftPriceTokens));

      // 1–4: сателлиты
      const satArgs: Record<string, unknown[]> = {
        GameToken: [tokenName, tokenSymbol],
        GameNFT: [nftName, nftSymbol, nftBaseURI],
        GameBadges: [badgesURI],
        GameLeaderboard: [],
      };
      for (const name of SATS) {
        if (!d[name]) {
          say(`▶ Деплой ${name}`);
          d[name] = await deployOne(name, satArgs[name]);
        }
      }

      // 5: Hub с адресами сателлитов
      if (!d.GameHub) {
        say("▶ Деплой GameHub");
        d.GameHub = await deployOne("GameHub", [
          d.GameToken,
          d.GameNFT,
          d.GameBadges,
          d.GameLeaderboard,
          perEth,
          price,
        ]);
      }

      // 6–9: setHub на каждом сателлите (используем локальный d.GameHub!).
      // Идемпотентно: если хаб уже прописан ончейн — пропускаем (возобновление).
      for (const name of SATS) {
        const key = `wire:${name}`;
        if (done[key]) continue;
        const current = (await publicClient.readContract({
          address: d[name],
          abi: A[name].abi,
          functionName: "hub",
        })) as Address;
        if (current !== zeroAddress) {
          say(`↷ ${name}: хаб уже прописан, пропускаю`);
        } else {
          say(`▶ ${name}.setHub(hub)`);
          await callOne(d[name], name, "setHub", [d.GameHub]);
        }
        done[key] = true;
        setDoneWiring({ ...done });
      }

      // 10: renounce токена. Идемпотентно: если владелец уже нулевой — пропуск.
      if (renounceToken && !done["renounce:token"]) {
        const owner = (await publicClient.readContract({
          address: d.GameToken,
          abi: A.GameToken.abi,
          functionName: "owner",
        })) as Address;
        if (owner === zeroAddress) {
          say("↷ токен уже без владельца, пропускаю renounce");
        } else {
          say("▶ GameToken.renounceOwnership()");
          await callOne(d.GameToken, "GameToken", "renounceOwnership", []);
        }
        done["renounce:token"] = true;
        setDoneWiring({ ...done });
      }

      say("✅ Готово. Скопируй адреса ниже в src/lib/constants.ts");
    } catch (e) {
      say(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  // Список для отображения (без замыканий — просто статусы).
  const rows: { label: string; done: boolean }[] = [
    ...SATS.map((n, i) => ({ label: `${i + 1}. Деплой ${n}`, done: !!addr[n] })),
    { label: "5. Деплой GameHub (связывает всё)", done: !!addr.GameHub },
    ...SATS.map((n, i) => ({ label: `${6 + i}. ${n}.setHub(hub)`, done: !!doneWiring[`wire:${n}`] })),
    ...(renounceToken
      ? [{ label: "10. GameToken.renounceOwnership()", done: !!doneWiring["renounce:token"] }]
      : []),
  ];

  const snippet =
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
        <Field label="Имя токена" v={tokenName} on={setTokenName} c={input} />
        <Field label="Символ токена" v={tokenSymbol} on={setTokenSymbol} c={input} />
        <Field label="Имя NFT" v={nftName} on={setNftName} c={input} />
        <Field label="Символ NFT" v={nftSymbol} on={setNftSymbol} c={input} />
        <Field label="Base URI NFT (можно позже)" v={nftBaseURI} on={setNftBaseURI} c={input} ph="ipfs://… или https://…/api/nft/" />
        <Field label="URI бейджей (можно позже)" v={badgesURI} on={setBadgesURI} c={input} ph="ipfs://…" />
        <Field label="Токенов за 1 ETH" v={tokensPerEth} on={setTokensPerEth} c={input} />
        <Field label="Цена NFT (в токенах)" v={nftPriceTokens} on={setNftPriceTokens} c={input} />
      </section>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={renounceToken} onChange={(e) => setRenounceToken(e.target.checked)} />
        renounce владельца токена после связки (рекомендовано аудитом)
      </label>

      {/* Возобновление: если контракты уже задеплоены — вставь адреса, и деплой
          их пропустит, выполнив только связку setHub и renounce. */}
      <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <summary className="cursor-pointer text-sm text-amber-300">
          Возобновить (контракты уже задеплоены — вставь адреса)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {(["GameToken", "GameNFT", "GameBadges", "GameLeaderboard", "GameHub"] as const).map((n) => (
            <label key={n} className="text-xs text-white/60">
              {n}
              <input
                className={input}
                value={addr[n] ?? ""}
                onChange={(e) =>
                  setAddr((a) => {
                    const v = e.target.value.trim();
                    const next = { ...a };
                    if (v) next[n] = v as Address;
                    else delete next[n];
                    return next;
                  })
                }
                placeholder="0x…"
              />
            </label>
          ))}
        </div>
      </details>

      <ol className="flex flex-col gap-1 text-sm">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <span>{r.done ? "✅" : "▫️"}</span>
            <span className={r.done ? "text-white/50 line-through" : ""}>{r.label}</span>
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

      {snippet && (
        <pre className="overflow-x-auto rounded-lg border border-white/15 bg-black/40 p-3 text-xs">{snippet}</pre>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/70">
        {log.length === 0 ? "Лог появится здесь." : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </main>
  );
}

function Field({
  label,
  v,
  on,
  c,
  ph,
}: {
  label: string;
  v: string;
  on: (s: string) => void;
  c: string;
  ph?: string;
}) {
  return (
    <label className="text-xs text-white/60">
      {label}
      <input className={c} value={v} onChange={(e) => on(e.target.value)} placeholder={ph} />
    </label>
  );
}
