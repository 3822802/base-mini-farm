"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { FarmScreen } from "@/components/FarmScreen";
import { CONTRACTS } from "@/lib/constants";

// Главная. Пока контракты не задеплоены (CONTRACTS.hub пуст) — заглушка со
// ссылкой на /deploy. После заполнения адресов — боевой экран фарма.
export default function Home() {
  const deployed = CONTRACTS.hub !== "";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Base Mini Farm</h1>
        <ConnectButton />
      </header>

      {deployed ? (
        <FarmScreen />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
          Контракты ещё не задеплоены.
          <br />
          Открой{" "}
          <a href="/deploy" className="text-blue-400 underline">
            /deploy
          </a>{" "}
          — задеплой 5 контрактов и впиши адреса в constants.ts.
        </div>
      )}
    </main>
  );
}
