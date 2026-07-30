"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { base } from "wagmi/chains";

function short(a: string) {
  return `${a.slice(0, 5)}…${a.slice(-3)}`;
}

// Понятные подписи для коннекторов, чьё имя ничего не говорит.
const LABELS: Record<string, string> = {
  metaMaskSDK: "MetaMask",
  injected: "Браузерный кошелёк",
};

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const btn =
    "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10";

  if (isConnected && address) {
    if (chainId !== base.id) {
      return (
        <button onClick={() => switchChain({ chainId: base.id })} className={`${btn} !border-red-500/50 text-red-300`}>
          Не та сеть · включить Base
        </button>
      );
    }
    return (
      <button onClick={() => disconnect()} className={`${btn} font-mono`}>
        {short(address)}
      </button>
    );
  }

  // Расширения из EIP-6963 первыми, затем явные варианты; injected — только
  // если 6963 ничего не нашёл (иначе дублирует найденный кошелёк).
  const discovered = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const seen = new Set(discovered.map((c) => c.name.toLowerCase()));
  const order = ["metaMaskSDK", "injected", "baseAccount"];
  const explicit = order
    .map((id) => connectors.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => c.id === "injected" || !seen.has(c.name.toLowerCase()));
  const list = [...discovered, ...explicit];

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={isPending} className={`${btn} disabled:opacity-60`}>
        {isPending ? "Подключение…" : "Подключить кошелёк"}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Выбор кошелька"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px] rounded-2xl border border-white/15 bg-[#15151f] p-4">
            <p className="mb-3 text-sm text-white/70">Чем подключиться?</p>
            <div className="flex flex-col gap-2">
              {list.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => {
                    connect({ connector: c, chainId: base.id });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left text-sm hover:bg-white/10"
                >
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="h-5 w-5" />
                  ) : (
                    <span className="h-5 w-5 rounded bg-white/10" />
                  )}
                  {LABELS[c.id] ?? c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
