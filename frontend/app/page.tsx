"use client";

import { useEffect, useState } from "react";
import { fetchVaults } from "@/lib/api";
import VaultCard from "@/components/VaultCard";

export default function HomePage() {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVaults()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.vaults || [];
        setVaults(list.filter((v: any) => v.status === "active" || !v.status));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Active Vaults</h1>
        <p className="text-gray-400">
          Stake into diversified conviction portfolios and earn yield.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 py-12">
          <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
          Loading vaults...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          Failed to load vaults: {error}
        </div>
      )}

      {!loading && !error && vaults.length === 0 && (
        <p className="text-gray-500 py-12">No active vaults found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vaults.map((vault) => (
          <VaultCard key={vault.id} vault={vault} />
        ))}
      </div>
    </div>
  );
}
