"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { base } from "wagmi/chains";
import { formatUnits } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { Hero } from "@/components/Hero";
import {
  CONTRACTS,
  BUILDER_DATA_SUFFIX,
  BUY_ETH_WEI,
  GAS,
} from "@/lib/constants";
import { HUB_ABI, TOKEN_ABI, BOARD_ABI } from "@/lib/abis";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const HERO_W = 48;
const RUN_MS = 600;
const suffix = BUILDER_DATA_SUFFIX
  ? { dataSuffix: BUILDER_DATA_SUFFIX as `0x${string}` }
  : {};

const hub = CONTRACTS.hub as `0x${string}`;
const token = CONTRACTS.token as `0x${string}`;
const board = CONTRACTS.leaderboard as `0x${string}`;

function reason(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (m.includes("user rejected") || m.includes("denied")) return "отмена в кошельке";
  if (m.includes("insufficient funds")) return "не хватает ETH на газ";
  if (m.includes("chain") && m.includes("match")) return "кошелёк не в сети Base";
  return raw.slice(0, 120);
}

const BOXES = [
  { key: "token", label: "ТОКЕН" },
  { key: "nft", label: "НФТ" },
  { key: "lead", label: "ЛИДЕР" },
] as const;

export function MarioFarm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const sceneRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [heroLeft, setHeroLeft] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [phase, setPhase] = useState<"idle" | "run" | "jump" | "busy">("idle");
  const [hit, setHit] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  // Ставим человечка в центр при загрузке и ресайзе. requestAnimationFrame —
  // чтобы измерять ширину ПОСЛЕ раскладки (на маунте она бывает ещё 0).
  useEffect(() => {
    const centre = () => {
      const w = sceneRef.current?.clientWidth ?? 0;
      if (w > 0) setHeroLeft(w / 2 - HERO_W / 2);
    };
    const id = requestAnimationFrame(centre);
    window.addEventListener("resize", centre);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", centre);
    };
  }, []);

  const { data: nftPrice } = useReadContract({
    address: hub, abi: HUB_ABI, functionName: "nftPrice", query: { enabled: !!hub },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token, abi: TOKEN_ABI, functionName: "allowance",
    args: address ? [address, hub] : undefined,
    query: { enabled: !!token && !!address },
  });
  const { data: player, refetch: refetchPlayer } = useReadContract({
    address: board, abi: BOARD_ABI, functionName: "getPlayer",
    args: address ? [address] : undefined,
    query: { enabled: !!board && !!address },
  });
  const p = player as
    | { tokensBought: bigint; nftsRedeemed: bigint; points: bigint; checkins: number; streak: number }
    | undefined;

  // ── Контрактные действия ────────────────────────────────────────────────
  async function buy() {
    const hash = await writeContractAsync({
      address: hub, abi: HUB_ABI, functionName: "buyTokens",
      value: BUY_ETH_WEI, gas: GAS.buy, chainId: base.id, ...suffix,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    refetchPlayer(); refetchAllowance();
  }
  async function redeem() {
    if (nftPrice === undefined) throw new Error("цена не загрузилась");
    if ((allowance as bigint) < (nftPrice as bigint)) {
      const ah = await writeContractAsync({
        address: token, abi: TOKEN_ABI, functionName: "approve",
        args: [hub, (nftPrice as bigint) * 100n], gas: GAS.approve, chainId: base.id, ...suffix,
      });
      await publicClient!.waitForTransactionReceipt({ hash: ah });
      await refetchAllowance();
    }
    const hash = await writeContractAsync({
      address: hub, abi: HUB_ABI, functionName: "redeemNft",
      gas: GAS.redeem, chainId: base.id, ...suffix,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    refetchPlayer();
  }

  // ── Анимация: подбежать → прыгнуть → ударить ящик → действие ────────────
  async function activate(i: number) {
    if (phase !== "idle" || !isConnected) return;
    setMsg(null);

    // Подбегаем к центру ящика.
    const boxEl = boxRefs.current[i];
    const scene = sceneRef.current;
    if (boxEl && scene) {
      const target = boxEl.offsetLeft + boxEl.offsetWidth / 2 - HERO_W / 2;
      setFacingLeft(target < heroLeft);
      setPhase("run");
      setHeroLeft(target);
      await wait(RUN_MS);
    }

    // Прыжок и удар.
    setPhase("jump");
    await wait(230); // подъём до верхней точки
    setHit(i);
    await wait(120);
    setPhase("busy");
    await wait(280); // приземление

    // Открываем действие.
    try {
      if (i === 0) { await buy(); setMsg("Токен куплен!"); }
      else if (i === 1) { await redeem(); setMsg("NFT получена!"); }
      else { setShowBoard(true); }
    } catch (e) {
      setMsg("Не вышло: " + reason(e));
    } finally {
      setHit(null);
      setPhase("idle");
    }
  }

  const heroCls = `hero ${phase === "run" ? "hero-run" : ""} ${
    phase === "jump" ? "hero-jump" : ""
  } ${facingLeft ? "face-left" : ""}`;

  return (
    <div className="sky relative flex h-[100dvh] w-full flex-col overflow-hidden">
      {/* облака */}
      <span className="cloud" style={{ top: "12%", left: "10%" }} />
      <span className="cloud" style={{ top: "20%", right: "14%" }} />

      {/* шапка */}
      <header className="relative z-10 flex items-center justify-between p-4">
        <h1 className="text-sm text-white [text-shadow:2px_2px_0_#000]">BASE&nbsp;MINI&nbsp;FARM</h1>
        <ConnectButton />
      </header>

      {/* статус */}
      <div className="relative z-10 h-6 text-center text-[10px] text-white [text-shadow:1px_1px_0_#000]">
        {phase === "busy" ? "ПОДПИШИ В КОШЕЛЬКЕ…" : msg}
      </div>

      {/* сцена */}
      <div ref={sceneRef} className="relative flex-1">
        {/* ящики */}
        <div className="absolute left-0 right-0 top-[18%] flex items-start justify-around px-4">
          {BOXES.map((b, i) => (
            <button
              key={b.key}
              ref={(el) => { boxRefs.current[i] = el; }}
              onClick={() => activate(i)}
              disabled={phase !== "idle" || !isConnected}
              className={`qbox relative flex h-16 w-16 items-center justify-center rounded text-[9px] font-bold disabled:opacity-80 ${
                hit === i ? "qbox-hit" : ""
              }`}
            >
              {hit === i && <span className="coin" style={{ left: "50%", marginLeft: -11, top: -6 }} />}
              {b.label}
            </button>
          ))}
        </div>

        {/* человечек стоит на полу сцены */}
        <div className={heroCls} style={{ left: heroLeft, bottom: 0 }}>
          <Hero />
        </div>
      </div>

      {/* пол */}
      <div className="ground relative z-10 h-14 w-full" />

      {!isConnected && (
        <div className="absolute inset-x-0 bottom-16 z-20 text-center text-[10px] text-white [text-shadow:1px_1px_0_#000]">
          ПОДКЛЮЧИ КОШЕЛЁК, ЧТОБЫ ИГРАТЬ
        </div>
      )}

      {!BUILDER_DATA_SUFFIX && (
        <div className="absolute inset-x-0 bottom-16 z-20 text-center text-[8px] text-amber-200 [text-shadow:1px_1px_0_#000]">
          билдер-код не вписан — транзакции не идут в статистику
        </div>
      )}

      {/* панель лидерборда */}
      {showBoard && (
        <div
          onClick={() => setShowBoard(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Лидерборд"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[280px] rounded-xl border-4 border-black bg-[#f7b500] p-4 text-[#3a2a00]">
            <p className="mb-3 text-center text-xs font-black">ТВОЯ СТАТИСТИКА</p>
            <Row k="Очки" v={p ? String(p.points) : "—"} />
            <Row k="Токены" v={p ? formatUnits(p.tokensBought, 18) : "—"} />
            <Row k="NFT" v={p ? String(p.nftsRedeemed) : "—"} />
            <Row k="Чек-ины" v={p ? String(p.checkins) : "—"} />
            <Row k="Стрик" v={p ? String(p.streak) : "—"} />
            <button onClick={() => setShowBoard(false)} className="mt-3 w-full rounded border-2 border-black bg-white/60 py-1.5 text-[10px] font-bold">
              ЗАКРЫТЬ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-black/20 py-1 text-[10px]">
      <span>{k}</span>
      <span className="font-mono font-bold">{v}</span>
    </div>
  );
}
