"use client";

import Link from "next/link";
import PortfolioWeightBar from "./PortfolioWeightBar";

interface VaultCardProps {
  vault: {
    id: string;
    name: string;
    tvl: number;
    target_multiplier: number;
    lockup_end?: string;
    yield_rate?: number;
    portfolio_weights?: { token_mint: string; weight: number }[];
    status?: string;
  };
}

function daysRemaining(lockupEnd?: string): string {
  if (!lockupEnd) return "N/A";
  const end = new Date(lockupEnd);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Ended";
  return `${diff}d`;
}

export default function VaultCard({ vault }: VaultCardProps) {
  return (
    <Link href={`/vault/${vault.id}`} className="block">
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 hover:bg-gray-900 transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
              {vault.name}
            </h3>
            {vault.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                vault.status === "active"
                  ? "bg-green-400/10 text-green-400"
                  : "bg-gray-700 text-gray-400"
              }`}>
                {vault.status}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-mono">{daysRemaining(vault.lockup_end)} left</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">TVL</p>
            <p className="text-sm font-mono text-white">
              {Number(vault.tvl || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Target</p>
            <p className="text-sm font-mono text-indigo-400">
              {vault.target_multiplier}x
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Yield Rate</p>
            <p className="text-sm font-mono text-green-400">
              {vault.yield_rate != null ? `${(vault.yield_rate * 100).toFixed(2)}%` : "N/A"}
            </p>
          </div>
        </div>

        {vault.portfolio_weights && vault.portfolio_weights.length > 0 && (
          <PortfolioWeightBar weights={vault.portfolio_weights} />
        )}
      </div>
    </Link>
  );
}
