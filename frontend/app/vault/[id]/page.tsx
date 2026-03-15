"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchVault } from "@/lib/api";
import PortfolioWeightBar from "@/components/PortfolioWeightBar";
import YieldHistoryTable from "@/components/YieldHistoryTable";
import StakeModal from "@/components/StakeModal";

export default function VaultDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStakeModal, setShowStakeModal] = useState(false);

  useEffect(() => {
    fetchVault(id)
      .then(setVault)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function refreshVault() {
    try {
      const updated = await fetchVault(id);
      setVault(updated);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-400 py-12">
        <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
        Loading vault...
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
        {error || "Vault not found"}
      </div>
    );
  }

  const stakerCount = vault.stakers?.length || vault.staker_count || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">{vault.name}</h1>
        <p className="text-gray-400 text-sm">{vault.description || `Vault ID: ${vault.id}`}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "TVL", value: Number(vault.tvl || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }), color: "text-white" },
          { label: "Target Multiplier", value: `${vault.target_multiplier}x`, color: "text-indigo-400" },
          { label: "Yield Rate", value: vault.yield_rate != null ? `${(vault.yield_rate * 100).toFixed(2)}%` : "N/A", color: "text-green-400" },
          { label: "Stakers", value: stakerCount, color: "text-white" },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-mono font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Portfolio Breakdown */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Portfolio Breakdown</h2>
        <PortfolioWeightBar weights={vault.portfolio_weights || []} />
      </div>

      {/* Stake Button */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Stake</h2>
        <button
          onClick={() => setShowStakeModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Stake in this Vault
        </button>
      </div>

      {/* Yield History */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Yield History</h2>
        <YieldHistoryTable history={vault.yield_history || []} />
      </div>

      {showStakeModal && (
        <StakeModal
          vaultId={id}
          vaultName={vault.name || id}
          onClose={() => setShowStakeModal(false)}
          onStaked={refreshVault}
        />
      )}
    </div>
  );
}
