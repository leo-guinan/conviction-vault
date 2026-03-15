import 'dotenv/config';
import cron from 'node-cron';
import {
  initDb, getAllVaults, getStakesByVault,
  getDistributionsByVault, createDistribution,
} from '../server/db.mjs';
import { getQuote, getSolanaTokens, getTokenByMint } from '../server/jupiter.mjs';
import { calculateYieldAllocation } from '../server/shares.mjs';

const isDryRun = process.env.DRY_RUN !== 'false';

await initDb();

async function runYieldDistribution() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[YieldCron] Starting distribution — ${new Date().toISOString()}`);
  console.log(`[YieldCron] Mode: ${isDryRun ? 'DRY_RUN (simulation)' : 'LIVE'}`);
  console.log('='.repeat(60));

  const vaults = getAllVaults();
  if (vaults.length === 0) {
    console.log('[YieldCron] No active vaults found.');
    return;
  }

  for (const vault of vaults) {
    console.log(`\n--- Vault ${vault.id}: ${vault.name} ---`);

    const stakes = getStakesByVault(vault.id);
    if (stakes.length === 0) {
      console.log('[YieldCron] No active stakers, skipping.');
      continue;
    }

    // Calculate fees collected since last distribution
    // In MVP: fees come from entry fees (0.5%) + exit penalties already in the system
    // For now, sum up entry fees from stakes since last distribution
    const distributions = getDistributionsByVault(vault.id);
    const lastDist = distributions[0]; // most recent
    const lastDistTime = lastDist ? new Date(lastDist.distribution_at) : new Date(vault.created_at);

    const newStakes = stakes.filter((s) => new Date(s.staked_at) > lastDistTime);
    const entryFees = newStakes.reduce((sum, s) => {
      // Entry fee was 0.5% of original USD value (before net)
      // netUsd = originalUsd * 0.995, so originalUsd = netUsd / 0.995
      const originalUsd = s.usd_value_at_stake / 0.995;
      return sum + originalUsd * 0.005;
    }, 0);

    const totalFees = entryFees;
    if (totalFees <= 0) {
      console.log('[YieldCron] No new fees to distribute.');
      continue;
    }

    console.log(`[YieldCron] Fees collected: $${totalFees.toFixed(4)}`);

    // 90% → yield pool, 10% → platform
    const yieldPool = totalFees * 0.9;
    const platformRevenue = totalFees * 0.1;
    console.log(`[YieldCron] Yield pool: $${yieldPool.toFixed(4)} | Platform: $${platformRevenue.toFixed(4)}`);

    // Parse portfolio weights
    const weights = JSON.parse(vault.portfolio_weights);
    const solanaWeights = weights.filter((w) => w.chain === 'SOLANA');
    const baseWeights = weights.filter((w) => w.chain === 'BASE');

    if (baseWeights.length > 0) {
      console.log(`[YieldCron] Base tokens in portfolio (${baseWeights.map((w) => w.token).join(', ')}) — skipping swap in V1, tracking as external position`);
    }

    // Simulate swaps for Solana tokens
    const tokensBought = [];
    const solanaWeightTotal = solanaWeights.reduce((sum, w) => sum + w.weight, 0);

    for (const w of solanaWeights) {
      const normalizedWeight = solanaWeightTotal > 0 ? w.weight / solanaWeightTotal : 0;
      const allocUsd = yieldPool * normalizedWeight;

      if (allocUsd <= 0) continue;

      // Convert USD to SOL lamports for Jupiter (rough: assume SOL ~ $150 for quoting)
      const solPrice = 150;
      const solAmount = allocUsd / solPrice;
      const lamports = Math.floor(solAmount * 1e9);

      console.log(`[YieldCron] Swap $${allocUsd.toFixed(4)} → ${w.token} (${lamports} lamports SOL input)`);

      if (isDryRun) {
        const quote = await getQuote(
          'So11111111111111111111111111111111111111112',
          w.mint,
          lamports
        );

        tokensBought.push({
          mint: w.mint,
          token: w.token,
          amount: quote ? Number(quote.outAmount) / 1e9 : 0,
          usd_value: allocUsd,
          simulated: true,
          quote_details: quote ? { inAmount: quote.inAmount, outAmount: quote.outAmount } : null,
        });
      } else {
        // LIVE mode: would execute actual swap here
        console.log(`[YieldCron] LIVE swap execution for ${w.token} — not yet implemented`);
        tokensBought.push({
          mint: w.mint,
          token: w.token,
          amount: 0,
          usd_value: allocUsd,
          simulated: false,
          note: 'live execution pending implementation',
        });
      }
    }

    // For Base tokens, log as tracked position
    for (const w of baseWeights) {
      const allocUsd = yieldPool * w.weight;
      tokensBought.push({
        mint: w.mint,
        token: w.token,
        amount: 0,
        usd_value: allocUsd,
        simulated: true,
        note: 'Base chain — tracked as external position, manual bridge required in V1',
      });
    }

    // Calculate per-staker allocation
    const stakerShares = stakes.map((s) => ({
      stakeId: s.id,
      stakerAddress: s.staker_address,
      shares: s.vault_shares,
    }));

    const allocations = calculateYieldAllocation(stakerShares, tokensBought);

    // Log distribution
    createDistribution({
      vault_id: vault.id,
      fees_collected_usd: totalFees,
      tokens_bought: tokensBought,
      total_stakers: stakes.length,
      tx_hashes: isDryRun ? ['DRY_RUN_NO_TX'] : [],
    });

    // Print report
    console.log(`\n[YieldCron] Distribution Report — Vault ${vault.id}: ${vault.name}`);
    console.log(`  Fees: $${totalFees.toFixed(4)}`);
    console.log(`  Yield pool (90%): $${yieldPool.toFixed(4)}`);
    console.log(`  Platform (10%): $${platformRevenue.toFixed(4)}`);
    console.log(`  Tokens bought: ${tokensBought.length}`);
    tokensBought.forEach((t) => {
      console.log(`    ${t.token}: ${t.amount} ($${t.usd_value.toFixed(4)}) ${t.simulated ? '[SIMULATED]' : '[LIVE]'}`);
    });
    console.log(`  Staker allocations: ${allocations.length}`);
    allocations.forEach((a) => {
      console.log(`    ${a.stakerAddress}: ${a.tokens.map((t) => `${t.amount.toFixed(6)} ${tokensBought.find((tb) => tb.mint === t.mint)?.token || t.mint}`).join(', ')}`);
    });

    if (!isDryRun) {
      console.log(`[YieldCron] LIVE: Would execute transfers here`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[YieldCron] Distribution complete — ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}

// If run directly, execute once
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''));

if (process.argv.includes('--once')) {
  await runYieldDistribution();
  process.exit(0);
} else {
  // Schedule daily at 9am UTC
  console.log('[YieldCron] Scheduling daily yield distribution at 9:00 UTC...');
  cron.schedule('0 9 * * *', () => {
    runYieldDistribution().catch((err) => {
      console.error('[YieldCron] Distribution failed:', err);
    });
  });
  console.log('[YieldCron] Cron scheduled. Waiting...');

  // Also run immediately if --now flag
  if (process.argv.includes('--now')) {
    await runYieldDistribution();
  }
}
