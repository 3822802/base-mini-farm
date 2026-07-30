// ABI берём из скомпилированных артефактов — один источник правды с контрактами.
import artifacts from "@/lib/artifacts.json";
import type { Abi } from "viem";

const A = artifacts as unknown as Record<string, { abi: Abi }>;

export const HUB_ABI = A.GameHub.abi;
export const TOKEN_ABI = A.GameToken.abi;
export const NFT_ABI = A.GameNFT.abi;
export const BADGES_ABI = A.GameBadges.abi;
export const BOARD_ABI = A.GameLeaderboard.abi;
