import { getStakesByVault, getStakeById, getVaultById, getTotalShares, getVaultTVL } from './db.mjs';
import { getPrice, getTokenByMint } from './jupiter.mjs';

const ENTRY_FEE_RATE = 0.005; // 0.5%
const EXIT_PENALTY_RATE = 0.02; // 2%

export function calculateShares(usdValue, vault) {
  const totalShares = getTotalShares(vault.id);
  const tvl = getVaultTVL(vault.id);

  // Apply entry fee
  const netUsd = usdValue * (1 - ENTRY_FEE_RATE);
  const entryFee = usdValue * ENTRY_FEE_RATE;

  if (totalShares === 0 || tvl === 0) {
    // First staker: 1 share per USD
    return { shares: netUsd, entryFee, netUsd };
  }

  // Proportional shares based on current TVL
  const sharePrice = tvl / totalShares;
  const shares = netUsd / sharePrice;
  return { shares, entryFee, netUsd };
}

export function getStakerShare(stakeId, vault) {
  const stake = getStakeById(stakeId);
  if (!stake || stake.status !== 'active') return 0;

  const totalShares = getTotalShares(vault.id);
  if (totalShares === 0) return 0;

  return stake.vault_shares / totalShares;
}

export function calculateYieldAllocation(stakerShares, tokensToDistribute) {
  // stakerShares: [{stakeId, shares}]
  // tokensToDistribute: [{mint, amount, usd_value}]
  const totalShares = stakerShares.reduce((sum, s) => sum + s.shares, 0);
  if (totalShares === 0) return [];

  return stakerShares.map((staker) => {
    const proportion = staker.shares / totalShares;
    return {
      stakeId: staker.stakeId,
      stakerAddress: staker.stakerAddress,
      tokens: tokensToDistribute.map((t) => ({
        mint: t.mint,
        amount: t.amount * proportion,
        usd_value: t.usd_value * proportion,
      })),
    };
  });
}

export async function estimateExitValue(stakeId) {
  const stake = getStakeById(stakeId);
  if (!stake) return null;

  const vault = getVaultById(stake.vault_id);
  if (!vault) return null;

  const stakerPct = getStakerShare(stakeId, vault);
  const tvl = getVaultTVL(vault.id);
  const currentValue = tvl * stakerPct;
  const penalty = currentValue * EXIT_PENALTY_RATE;
  const payout = currentValue - penalty;

  return {
    stakeId,
    vaultId: vault.id,
    originalUsd: stake.usd_value_at_stake,
    currentUsd: currentValue,
    exitPenalty: penalty,
    estimatedPayout: payout,
    stakerPct,
  };
}

export function calculateExitPenaltyDistribution(penaltyUsd, vaultId, exitingStakeId) {
  const stakes = getStakesByVault(vaultId).filter((s) => s.id !== exitingStakeId);
  const totalShares = stakes.reduce((sum, s) => sum + s.vault_shares, 0);

  if (totalShares === 0) return [];

  return stakes.map((s) => ({
    stakeId: s.id,
    stakerAddress: s.staker_address,
    penaltyShare: (s.vault_shares / totalShares) * penaltyUsd,
  }));
}
