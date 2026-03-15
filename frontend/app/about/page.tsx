export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-white mb-6">About Conviction Vault</h1>
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
        <p className="text-gray-300 leading-relaxed">
          Conviction Vault is a decentralized staking protocol that enables users to
          express long-term conviction in curated crypto portfolios. Stakers deposit
          tokens into vaults managed by portfolio strategies spanning Solana-native and
          bridged Base assets. Each vault targets a specific return multiplier over a
          defined lockup period, distributing yield to participants proportionally based
          on their share of the vault. The protocol rewards patient capital — those who
          maintain their stake through the full lockup period benefit from compounding
          yield distributions, while early exits forfeit a portion of accrued returns.
          Conviction Vault aligns incentives between long-term holders and portfolio
          performance, creating a mechanism for communities to collectively back the
          tokens they believe in most.
        </p>
      </div>
    </div>
  );
}
