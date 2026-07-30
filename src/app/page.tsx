"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { CONTRACTS } from "@/lib/constants";

// Главная. Пока контракты не задеплоены (CONTRACTS.hub пуст) — показываем
// заглушку и ссылку на деплой-страницу. Боевые кнопки появятся после деплоя.
export default function Home() {
  const deployed = CONTRACTS.hub !== "";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Base Mini Farm</h1>
        <ConnectButton />
      </header>

      {!deployed ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
          Контракты ещё не задеплоены.
          <br />
          Открой{" "}
          <a href="/deploy" className="text-blue-400 underline">
            /deploy
          </a>{" "}
          — задеплой 5 контрактов и впиши адреса.
        </div>
      ) : (
        <div className="grid flex-1 grid-rows-2 gap-4">
          <button className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-xl font-black text-black shadow-lg">
            Купить токен
          </button>
          <button className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-xl font-black text-white shadow-lg">
            Получить NFT
          </button>
        </div>
      )}
    </main>
  );
}
