"use client";

import { MarioFarm } from "@/components/MarioFarm";
import { ConnectButton } from "@/components/ConnectButton";
import { CONTRACTS } from "@/lib/constants";

export default function Home() {
  const deployed = CONTRACTS.hub !== "";
  if (deployed) return <MarioFarm />;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Base Mini Farm</h1>
        <ConnectButton />
      </header>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
        Контракты ещё не задеплоены. Открой{" "}
        <a href="/deploy" className="text-blue-400 underline">/deploy</a>.
      </div>
    </main>
  );
}
