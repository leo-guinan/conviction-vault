"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchVault, stake } from "@/lib/api";
import { getWallet } from "@/lib/wallet";
import { TOKEN_MAP, formatLabel } from "@/lib/tokens";
import PortfolioWeightBar from "@/components/PortfolioWeightBar";
import YieldHistoryTable from "@/components/YieldHistoryTable";

export default function VaultDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stake form
  const [selectedToken, setSelectedToken] = useState("SOL");
  const [amount, setAmount] = useState("");
  const [staking, setStaking] = useState(false);
  const [stakeMsg, setStakeMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchVault(id)
      .then(setVault)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStake() {
    const wallet = getWallet();
    if (!wallet) {
      setStakeMsg("Connect your wallet first.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setStakeMsg("Enter a valid amount.");
      return;
    }
    setStaking(true);
    setStakeMsg(null);
    try {
      await stake({
        vault_id: id,
        staker_address: wallet,
        token_mint: selectedToken,
        token_amount: Number(amount),
      });
      setStakeMsg("Stake submitted successfully!");
      setAmount("");
      // Refresh vault data
      const updated = await fetchVault(id);
      setVault(updated);
    } catch {
      setStakeMsg("Stake failed. Please try again.");
    } finally {
      setStaking(false);
    }
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

      {/* Stake Form */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Stake</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            {Object.keys(TOKEN_MAP).map((t) => (
              <option key={t} value={t}>{formatLabel(t)}</option>
            ))}
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 flex-1"
          />
          <button
            onClick={handleStake}
            disabled={staking}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {staking ? "Staking..." : "Stake"}
          </button>
        </div>
        {stakeMsg && (
          <p className={`text-sm mt-3 ${stakeMsg.includes("success") ? "text-green-400" : "text-amber-400"}`}>
            {stakeMsg}
          </p>
        )}
      </div>

      {/* Yield History */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Yield History</h2>
        <YieldHistoryTable history={vault.yield_history || []} />
      </div>
    </div>
  );
}
