"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { base } from "wagmi/chains";
import { formatUnits } from "viem";
import {
  CONTRACTS,
  BUILDER_DATA_SUFFIX,
  BUY_ETH_WEI,
  GAS,
} from "@/lib/constants";
import { HUB_ABI, TOKEN_ABI, BOARD_ABI } from "@/lib/abis";

// Короткая понятная причина вместо простыни из кошелька.
function reason(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (m.includes("user rejected") || m.includes("denied")) return "отмена в кошельке";
  if (m.includes("insufficient funds")) return "не хватает ETH на газ";
  if (m.includes("chain") && m.includes("match")) return "кошелёк не в сети Base";
  if (m.includes("nothingtobuy")) return "слишком малая сумма — 0 токенов";
  return raw.slice(0, 140);
}

const hub = CONTRACTS.hub as `0x${string}`;
const token = CONTRACTS.token as `0x${string}`;
const board = CONTRACTS.leaderboard as `0x${string}`;

// Билдер-суффикс приклеиваем, только если он задан (у апки свой, новый код).
const suffix = BUILDER_DATA_SUFFIX
  ? { dataSuffix: BUILDER_DATA_SUFFIX as `0x${string}` }
  : {};

export function FarmScreen() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: nftPrice } = useReadContract({
    address: hub,
    abi: HUB_ABI,
    functionName: "nftPrice",
    query: { enabled: !!hub },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token,
    abi: TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, hub] : undefined,
    query: { enabled: !!token && !!address },
  });

  const { data: player, refetch: refetchPlayer } = useReadContract({
    address: board,
    abi: BOARD_ABI,
    functionName: "getPlayer",
    args: address ? [address] : undefined,
    query: { enabled: !!board && !!address },
  });

  const p = player as
    | {
        tokensBought: bigint;
        nftsRedeemed: bigint;
        points: bigint;
        checkins: number;
        streak: number;
      }
    | undefined;

  async function buy() {
    setBusy(true);
    setMsg(null);
    try {
      const hash = await writeContractAsync({
        address: hub,
        abi: HUB_ABI,
        functionName: "buyTokens",
        value: BUY_ETH_WEI,
        gas: GAS.buy,
        chainId: base.id,
        ...suffix,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMsg("Токен куплен ✅");
      refetchPlayer();
      refetchAllowance();
    } catch (e) {
      setMsg("Не вышло: " + reason(e));
    }
    setBusy(false);
  }

  async function redeem() {
    if (nftPrice === undefined) return;
    setBusy(true);
    setMsg(null);
    try {
      // Первый раз нужен approve хабу на цену NFT.
      if ((allowance as bigint) < (nftPrice as bigint)) {
        const ah = await writeContractAsync({
          address: token,
          abi: TOKEN_ABI,
          functionName: "approve",
          args: [hub, (nftPrice as bigint) * 100n], // запас на 100 обменов
          gas: GAS.approve,
          chainId: base.id,
          ...suffix,
        });
        await publicClient!.waitForTransactionReceipt({ hash: ah });
        await refetchAllowance();
      }
      const hash = await writeContractAsync({
        address: hub,
        abi: HUB_ABI,
        functionName: "redeemNft",
        gas: GAS.redeem,
        chainId: base.id,
        ...suffix,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMsg("NFT получена ✅");
      refetchPlayer();
      refetchAllowance();
    } catch (e) {
      setMsg("Не вышло: " + reason(e));
    }
    setBusy(false);
  }

  const locked = !isConnected || busy;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Статистика игрока */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat label="очки" value={p ? String(p.points) : "—"} />
        <Stat label="токены" value={p ? formatUnits(p.tokensBought, 18) : "—"} />
        <Stat label="NFT" value={p ? String(p.nftsRedeemed) : "—"} />
        <Stat label="стрик" value={p ? String(p.streak) : "—"} />
      </div>

      <button
        onClick={buy}
        disabled={locked}
        className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-xl font-black text-black shadow-lg disabled:opacity-50"
      >
        {busy ? "Секунду…" : "Купить токен"}
      </button>

      <button
        onClick={redeem}
        disabled={locked || nftPrice === undefined}
        className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-xl font-black text-white shadow-lg disabled:opacity-50"
      >
        {busy
          ? "Секунду…"
          : nftPrice !== undefined
          ? `Получить NFT · ${formatUnits(nftPrice as bigint, 18)} токенов`
          : "Получить NFT"}
      </button>

      <div role="status" aria-live="polite" className="min-h-5 text-center text-sm text-white/70">
        {msg}
      </div>

      {!BUILDER_DATA_SUFFIX && (
        <p className="text-center text-[11px] text-amber-400/80">
          ⚠️ Билдер-код апки не вписан — транзакции не идут в статистику.
          Заполни BUILDER_CODE/BUILDER_DATA_SUFFIX в constants.ts.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 py-2">
      <div className="truncate font-mono text-sm">{value}</div>
      <div className="text-white/50">{label}</div>
    </div>
  );
}
