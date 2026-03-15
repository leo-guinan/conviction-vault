"use client";

import { getTokenInfo, formatLabel } from "@/lib/tokens";

interface Weight {
  token_mint: string;
  weight: number;
}

export default function PortfolioWeightBar({ weights }: { weights: Weight[] }) {
  if (!weights || weights.length === 0) {
    return (
      <div className="w-full h-8 bg-gray-800 rounded-lg overflow-hidden">
        <div className="h-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
          No portfolio data
        </div>
      </div>
    );
  }

  const total = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <div>
      <div className="w-full h-8 bg-gray-800 rounded-lg overflow-hidden flex">
        {weights.map((w) => {
          const pct = total > 0 ? (w.weight / total) * 100 : 0;
          const info = getTokenInfo(w.token_mint);
          return (
            <div
              key={w.token_mint}
              className="h-full flex items-center justify-center text-xs font-medium text-white/90 overflow-hidden"
              style={{
                width: `${pct}%`,
                backgroundColor: info.color,
                minWidth: pct > 0 ? "2px" : 0,
              }}
              title={`${formatLabel(w.token_mint)}: ${pct.toFixed(1)}%`}
            >
              {pct > 10 && (
                <span className="truncate px-1">{info.symbol}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {weights.map((w) => {
          const pct = total > 0 ? (w.weight / total) * 100 : 0;
          const info = getTokenInfo(w.token_mint);
          return (
            <div key={w.token_mint} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: info.color }}
              />
              {formatLabel(w.token_mint)} {pct.toFixed(1)}%
            </div>
          );
        })}
      </div>
    </div>
  );
}
