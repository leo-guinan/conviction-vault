import { initDb, createVault } from './db.mjs';

console.log('[Seed] Initializing database...');
await initDb();

console.log('[Seed] Creating Vault 1: Season 1 Dominance...');
createVault({
  name: 'Season 1 Dominance',
  creator_address: 'CREATOR_WALLET_TBD',
  creator_stake_towel: 500,
  portfolio_weights: [
    { token: 'ANTIHUNTER', mint: '0xcee38b10810abab93487ebc93a9099853476bb07', weight: 0.40, chain: 'BASE' },
    { token: 'KELLYCLAUDE', mint: 'BASE_KELLYCLAUDE_ADDRESS_TBD', weight: 0.35, chain: 'BASE' },
    { token: 'FELIX', mint: 'BASE_FELIX_ADDRESS_TBD', weight: 0.25, chain: 'BASE' },
  ],
  target_multiplier: 1.5,
  expiry_days: 30,
  bags_fm_coin_ticker: '$DRIP',
});

console.log('[Seed] Creating Vault 2: TOWEL Thesis...');
createVault({
  name: 'TOWEL Thesis',
  creator_address: 'CREATOR_WALLET_TBD',
  creator_stake_towel: 500,
  portfolio_weights: [
    { token: 'TOWEL', mint: 'Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump', weight: 0.50, chain: 'SOLANA' },
    { token: 'METATOWEL', mint: 'CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump', weight: 0.30, chain: 'SOLANA' },
    { token: 'MARVIN', mint: '91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump', weight: 0.20, chain: 'SOLANA' },
  ],
  target_multiplier: 2.0,
  expiry_days: 60,
  bags_fm_coin_ticker: '$DRIP',
});

console.log('[Seed] Done. Two vaults created.');
