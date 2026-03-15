import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {
  Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress, createTransferInstruction,
  createAssociatedTokenAccountInstruction, getAccount,
  TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  initDb, getAllVaults, getVaultById, getStakesByVault,
  getStakesByAddress, createStake, updateStakeStatus,
  getStakeById, getDistributionsByVault, createExitPenalty,
  getVaultTVL, getTotalShares,
} from './db.mjs';
import { calculateShares, estimateExitValue, calculateExitPenaltyDistribution } from './shares.mjs';
import { getPrice, getTokenByMint, getSupportedTokens } from './jupiter.mjs';

// --- Hot wallet setup ---
const HELIUS_RPC = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=demo';
const connection = new Connection(HELIUS_RPC, 'confirmed');

// Token-2022 pump.fun mints
const TOKEN_2022_MINTS = new Set([
  'Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump',
  'CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump',
  '91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump',
]);

function loadHotWallet() {
  const walletPath = process.env.PLATFORM_SOLANA_HOT_WALLET_PATH ||
    path.join(process.env.HOME, '.marvin/secrets/vault-hot-wallet.json');
  const raw = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(raw.secretKey));
}

async function sendTokensFromVault(toAddress, tokenMint, tokenAmount) {
  const hotWallet = loadHotWallet();
  const toPubkey = new PublicKey(toAddress);
  const tx = new Transaction();

  if (tokenMint === 'SOL' || tokenMint === 'native') {
    tx.add(SystemProgram.transfer({
      fromPubkey: hotWallet.publicKey,
      toPubkey,
      lamports: Math.round(tokenAmount * LAMPORTS_PER_SOL),
    }));
  } else {
    const mintPubkey = new PublicKey(tokenMint);
    const progId = TOKEN_2022_MINTS.has(tokenMint) ? TOKEN_2022_PROGRAM_ID : undefined;
    const sourceAta = await getAssociatedTokenAddress(mintPubkey, hotWallet.publicKey, false, progId);
    const destAta   = await getAssociatedTokenAddress(mintPubkey, toPubkey, false, progId);
    const token = getTokenByMint(tokenMint);
    const decimals = token?.decimals ?? 6;
    const rawAmount = BigInt(Math.round(tokenAmount * 10 ** decimals));

    // Create dest ATA if needed
    try {
      await getAccount(connection, destAta, 'confirmed', progId);
    } catch {
      tx.add(createAssociatedTokenAccountInstruction(
        hotWallet.publicKey, destAta, toPubkey, mintPubkey,
        progId, ASSOCIATED_TOKEN_PROGRAM_ID,
      ));
    }

    tx.add(createTransferInstruction(sourceAta, destAta, hotWallet.publicKey, rawAmount, [], progId));
  }

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = hotWallet.publicKey;
  tx.sign(hotWallet);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

const app = express();
app.use(cors());
app.use(express.json());

// Init database (async)
await initDb();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.DRY_RUN !== 'false' ? 'DRY_RUN' : 'LIVE', timestamp: new Date().toISOString() });
});

// List all active vaults with stats
app.get('/vaults', (req, res) => {
  try {
    const vaults = getAllVaults();
    const enriched = vaults.map((v) => {
      const tvl = getVaultTVL(v.id);
      const totalShares = getTotalShares(v.id);
      const stakers = getStakesByVault(v.id);
      const distributions = getDistributionsByVault(v.id);
      const createdAt = new Date(v.created_at);
      const expiresAt = new Date(createdAt.getTime() + v.expiry_days * 86400000);
      const daysRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));

      return {
        ...v,
        portfolio_weights: JSON.parse(v.portfolio_weights),
        tvl,
        total_shares: totalShares,
        staker_count: stakers.length,
        distribution_count: distributions.length,
        days_remaining: daysRemaining,
        expires_at: expiresAt.toISOString(),
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single vault detail
app.get('/vaults/:id', (req, res) => {
  try {
    const vault = getVaultById(Number(req.params.id));
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const tvl = getVaultTVL(vault.id);
    const totalShares = getTotalShares(vault.id);
    const stakers = getStakesByVault(vault.id);
    const distributions = getDistributionsByVault(vault.id);
    const createdAt = new Date(vault.created_at);
    const expiresAt = new Date(createdAt.getTime() + vault.expiry_days * 86400000);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));

    res.json({
      ...vault,
      portfolio_weights: JSON.parse(vault.portfolio_weights),
      tvl,
      total_shares: totalShares,
      stakers: stakers.map((s) => ({
        ...s,
        share_pct: totalShares > 0 ? ((s.vault_shares / totalShares) * 100).toFixed(2) + '%' : '0%',
      })),
      yield_history: distributions.map((d) => ({
        ...d,
        tokens_bought: JSON.parse(d.tokens_bought),
        tx_hashes: d.tx_hashes ? JSON.parse(d.tx_hashes) : [],
      })),
      days_remaining: daysRemaining,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stake into a vault
app.post('/stake', async (req, res) => {
  try {
    const { vault_id, staker_address, token_mint, token_amount } = req.body;

    if (!vault_id || !staker_address || !token_mint || !token_amount) {
      return res.status(400).json({ error: 'Missing required fields: vault_id, staker_address, token_mint, token_amount' });
    }

    const vault = getVaultById(vault_id);
    if (!vault) return res.status(404).json({ error: 'Vault not found' });
    if (vault.status !== 'active') return res.status(400).json({ error: 'Vault is not active' });

    const token = getTokenByMint(token_mint);
    if (!token) return res.status(400).json({ error: 'Unsupported token' });
    if (token.chain !== 'SOLANA') return res.status(400).json({ error: 'Only Solana tokens accepted in V1' });

    // Get price
    const priceData = await getPrice(token_mint);
    if (!priceData) return res.status(500).json({ error: 'Could not fetch token price' });

    const usdValue = token_amount * priceData.priceUsd;
    const { shares, entryFee, netUsd } = calculateShares(usdValue, vault);

    const result = createStake({
      vault_id,
      staker_address,
      token_mint,
      token_amount,
      usd_value_at_stake: netUsd,
      vault_shares: shares,
    });

    res.json({
      stake_id: result.lastInsertRowid,
      vault_id,
      vault_shares: shares,
      usd_value: usdValue,
      entry_fee: entryFee,
      net_usd: netUsd,
      token_price: priceData.priceUsd,
      mode: process.env.DRY_RUN !== 'false' ? 'DRY_RUN' : 'LIVE',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exit a stake
app.post('/exit', async (req, res) => {
  try {
    const { stake_id, staker_address } = req.body;

    if (!stake_id || !staker_address) {
      return res.status(400).json({ error: 'Missing required fields: stake_id, staker_address' });
    }

    const stake = getStakeById(stake_id);
    if (!stake) return res.status(404).json({ error: 'Stake not found' });
    if (stake.staker_address !== staker_address) return res.status(403).json({ error: 'Not your stake' });
    if (stake.status !== 'active') return res.status(400).json({ error: 'Stake already exited' });

    const exitEstimate = await estimateExitValue(stake_id);
    if (!exitEstimate) return res.status(500).json({ error: 'Could not estimate exit value' });

    // returnAmount is staked tokens minus exit penalty (penalty stays in vault for remaining stakers)
    const returnTokens = exitEstimate.returnTokens ?? stake.token_amount * (1 - (exitEstimate.exitPenaltyPct ?? 0.05));

    // Record penalty distribution to remaining stakers
    const penaltyDistribution = calculateExitPenaltyDistribution(
      exitEstimate.exitPenalty,
      stake.vault_id,
      stake_id,
    );

    createExitPenalty({
      vault_id: stake.vault_id,
      staker_id: stake_id,
      penalty_usd: exitEstimate.exitPenalty,
      distributed_to_remaining_stakers: penaltyDistribution,
    });

    let txSignature = null;

    if (process.env.DRY_RUN !== 'false') {
      // Dry run — mark exited but don't send tokens
      console.log(`[DRY_RUN] Would return ${returnTokens} of ${stake.token_mint} to ${staker_address}`);
    } else {
      // Live — send tokens back on-chain
      txSignature = await sendTokensFromVault(staker_address, stake.token_mint, returnTokens);
      console.log(`[EXIT] Returned ${returnTokens} ${stake.token_mint} to ${staker_address} — tx: ${txSignature}`);
    }

    updateStakeStatus(stake_id, 'exited');

    res.json({
      ...exitEstimate,
      return_tokens: returnTokens,
      token_mint: stake.token_mint,
      penalty_distributed_to: penaltyDistribution.length,
      tx_signature: txSignature,
      solscan: txSignature ? `https://solscan.io/tx/${txSignature}` : null,
      mode: process.env.DRY_RUN !== 'false' ? 'DRY_RUN' : 'LIVE',
    });
  } catch (err) {
    console.error('[EXIT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// Get positions for a wallet
app.get('/position/:staker_address', (req, res) => {
  try {
    const stakes = getStakesByAddress(req.params.staker_address);
    res.json(stakes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supported tokens
app.get('/tokens', (req, res) => {
  res.json(getSupportedTokens());
});

// Balance proxy — server-side RPC, no CORS issues for client
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const SPL_TOKENS = {
  TOWEL:     { mint: 'Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump', decimals: 6 },
  METATOWEL: { mint: 'CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump', decimals: 6 },
  MARVIN:    { mint: '91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump', decimals: 6 },
};

async function rpc(method, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (json.error) {
        const msg = json.error.message || JSON.stringify(json.error);
        if (attempt < retries && (msg.includes('Too many') || msg.includes('429') || msg.includes('rate'))) {
          await new Promise(r => setTimeout(r, 300 * attempt));
          continue;
        }
        throw new Error(msg);
      }
      return json.result;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
}

app.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  try {
    // SOL balance
    const solResult = await rpc('getBalance', [address, { commitment: 'confirmed' }]);
    const sol = (solResult?.value ?? 0) / 1e9;

    // Query both classic SPL and Token-2022 program accounts
    const TOKEN_PROGRAM    = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    const TOKEN_2022       = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

    const [splResult, t22Result] = await Promise.all([
      rpc('getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
      rpc('getTokenAccountsByOwner', [address, { programId: TOKEN_2022 },    { encoding: 'jsonParsed', commitment: 'confirmed' }]),
    ]);

    const tokenAccounts = [
      ...(splResult?.value ?? []),
      ...(t22Result?.value ?? []),
    ];

    const balances = { SOL: sol };

    for (const [symbol, { mint, decimals }] of Object.entries(SPL_TOKENS)) {
      const acct = tokenAccounts.find(
        (a) => a.account?.data?.parsed?.info?.mint === mint
      );
      const raw = acct?.account?.data?.parsed?.info?.tokenAmount?.amount ?? '0';
      balances[symbol] = Number(raw) / 10 ** decimals;
    }

    res.json({ address, balances });
  } catch (err) {
    console.error('[balance]', err.message);
    res.status(502).json({ error: 'Failed to fetch balance', detail: err.message });
  }
});

// --- Admin: sweep accumulated fees to Squads treasury ---
app.post('/admin/sweep', async (req, res) => {
  try {
    const { admin_key, token_mint, amount } = req.body;
    if (admin_key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!token_mint || !amount) {
      return res.status(400).json({ error: 'Missing token_mint or amount' });
    }
    const squadsTreasury = process.env.SQUADS_TREASURY;
    if (!squadsTreasury) {
      return res.status(500).json({ error: 'SQUADS_TREASURY not configured' });
    }

    const txSig = await sendTokensFromVault(squadsTreasury, token_mint, amount);
    console.log(`[SWEEP] Sent ${amount} ${token_mint} to Squads treasury — tx: ${txSig}`);

    res.json({
      swept: amount,
      token_mint,
      to: squadsTreasury,
      tx_signature: txSig,
      solscan: `https://solscan.io/tx/${txSig}`,
    });
  } catch (err) {
    console.error('[SWEEP ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3094;
app.listen(PORT, () => {
  console.log(`[ConvictionVault] API running on port ${PORT}`);
  console.log(`[ConvictionVault] Hot wallet: ${process.env.PLATFORM_SOLANA_WALLET}`);
  console.log(`[ConvictionVault] Squads treasury: ${process.env.SQUADS_TREASURY}`);
  console.log(`[ConvictionVault] Mode: ${process.env.DRY_RUN !== 'false' ? 'DRY_RUN' : 'LIVE'}`);
});
