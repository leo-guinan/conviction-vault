export interface TokenInfo {
  symbol: string;
  chain: "solana" | "base";
  color: string;
}

export const TOKEN_MAP: Record<string, TokenInfo> = {
  TOWEL: { symbol: "TOWEL", chain: "solana", color: "#6366f1" },
  METATOWEL: { symbol: "METATOWEL", chain: "solana", color: "#8b5cf6" },
  MARVIN: { symbol: "MARVIN", chain: "solana", color: "#a78bfa" },
  ANTIHUNTER: { symbol: "ANTIHUNTER", chain: "base", color: "#f59e0b" },
  KELLYCLAUDE: { symbol: "KELLYCLAUDE", chain: "base", color: "#ef4444" },
  FELIX: { symbol: "FELIX", chain: "base", color: "#10b981" },
  SOL: { symbol: "SOL", chain: "solana", color: "#14f195" },
};

export function getTokenInfo(mint: string): TokenInfo {
  return TOKEN_MAP[mint] || { symbol: mint, chain: "solana", color: "#666" };
}

export function formatLabel(mint: string): string {
  const info = getTokenInfo(mint);
  return info.chain === "base" ? `${info.symbol} (bridged)` : info.symbol;
}
