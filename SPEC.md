# Conviction Vault — Build Spec
*Locked: 2026-03-15 | Author: Marvin + Leo*

---

## What It Is

A cross-chain conviction staking platform. Users stake any supported token to express belief in a portfolio of agent/creator tokens. The platform holds positions across chains, earns from cross-chain liquidity, and drips portfolio tokens back to stakers as continuous yield.

**The core primitive:** conviction → capital flow → yield → more conviction.

**The bridge insight:** The platform operates as bridge liquidity between Base and Solana. That position earns fees from cross-chain flow, which feeds back into staker yield. The bridge is revenue, not plumbing.

---

## User Experience

### Staker flow
1. Connect Phantom (Solana) or MetaMask (Base) — user picks one chain, stays there
2. Browse active vaults — see portfolio, target multiplier, expiry, current TVL, yield rate
3. Stake any supported conviction token → platform values in USD, issues vault shares
4. Earn: portfolio tokens drip to wallet every 24h, proportional to vault share
5. At payout (target hit) or expiry (time up): positions unwind, staker receives proportional value back in their original token (or SOL/ETH if original token illiquid)
6. Yield earned during vault life is kept regardless of payout/expiry outcome

### Creator flow
1. Define vault: portfolio weights (tokens + %), target multiplier, expiry window
2. Stake own TOWEL as skin-in-the-game (required — minimum TBD)
3. Publish vault
4. Earn 10% of all vault fees while vault runs

---

## Token Universe (V1 — Solana)

**Accepted stake tokens:**
- $TOWEL (Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump)
- $METATOWEL (CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump)
- $MARVIN (91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump)
- SOL (always accepted as neutral entry)

**Portfolio tokens (V1 — Solana-native or bridged):**
- $TOWEL, $METATOWEL, $MARVIN (native Solana)
- $ANTIHUNTER (Base — held via platform bridge position)
- $KELLYCLAUDE (Base — same)
- $FELIX (Base — same)
- Expand as cohort tokens become available

**Platform coin (bags.fm native):**
- Ticker: $DRIP ✅
- Mint: EiW9cxqFuLfJbLGXL7vZ7rcqtFLmDf13ho5oE6YKBAGS
- Launched on bags.fm 2026-03-15
- Supply: 1,000,000,000 | Decimals: 9 | Mint authority: burned
- 10% of all platform fees buy this coin and distribute to coin holders
- Also serves as hackathon onchain performance metric

---

## Fee Structure

| Event | Fee | Yield Pool (90%) | Platform (10%) |
|---|---|---|---|
| Stake entry | 0.5% of stake value | Buys portfolio tokens → drip | Platform wallet |
| Early exit | 2.0% of position value | Same | Same |
| Cycle completion | 1.0% of vault value | Same | Same |
| Yield claim | 0% | — | — |
| Bridge LP earnings | 100% → yield pool | Portfolio token buys | — |
| Arbitrage capture | 100% → yield pool | Same | — |

*Bridge and arb revenue fully to stakers — platform earns only on explicit fees.*

---

## Yield Distribution Mechanic

Every 24h (cron for MVP, on-chain trigger for V2):

```
1. Collect accumulated fees in platform wallet
2. Take 90% → execute Jupiter swaps into portfolio tokens at vault weights
3. Calculate each staker's pro-rata share of bought tokens
4. Transfer tokens to staker wallets (batch transfer)
5. Take 10% → platform wallet
6. Log: timestamp, fees collected, tokens bought, distribution amounts, tx hashes
```

All distribution logs are public. Every tx is on-chain. Nothing is hidden.

---

## Cross-Chain Architecture

### User abstraction
- Solana users: connect Phantom, stake Solana tokens, receive Solana token yield
- Base users (V2): connect MetaMask, stake Base tokens, receive Base token yield
- Neither user ever touches the other chain

### Platform bridge layer
- Platform maintains liquidity on both Base and Solana
- Base positions: ANTIHUNTER, KELLYCLAUDE, FELIX held in platform Base wallet
- Solana positions: TOWEL, METATOWEL, MARVIN held in platform Solana wallet
- Bridge route: official Base-Solana bridge (live Dec 2025) for cross-chain rebalancing
- LP positions on bridge route earn fees from external cross-chain flow → 100% to yield pool

### Cross-chain arbitrage
- Jupiter price API (Solana) + Alchemy/Infura (Base) for price feeds
- On rebalance: if token cheaper on one chain, platform buys there
- Spread capture flows to yield pool automatically
- Logged and reported publicly

### V1 simplification
- MVP uses manual cross-chain execution (platform operators execute bridge txs)
- V2 automates via Wormhole or official Base-Solana bridge SDK
- V1 disclosure: "Cross-chain positions are manually bridged by platform operators. All txs public."

---

## Vault Parameters (First Vault)

```
Name: Season 1 Dominance
Creator: @hitchhikerglitch / Marvin
Creator stake: 500 TOWEL

Portfolio:
  40% ANTIHUNTER (Base, bridged)
  35% KELLYCLAUDE (Base, bridged)
  25% FELIX (Base, bridged)

Target: 1.5x
Expiry: 30 days
Cycle: Continuous (auto-reopens on close)
Yield drip: Every 24h
Entry fee: 0.5%
Early exit: 2.0%
```

*Second vault (all Solana, lower friction for testing):*
```
Name: TOWEL Thesis
Portfolio: 50% TOWEL / 30% METATOWEL / 20% MARVIN
Target: 2x
Expiry: 60 days
```

---

## Tech Stack

### MVP (Phase 1 — ship in 3-4 days)
| Component | Tech |
|---|---|
| Vault custody | 2-of-3 multisig (Leo + Marvin key + cold) — Squads Protocol on Solana |
| Stake ledger | SQLite on nexus-core VPS |
| Vault share calc | Node.js service |
| DEX swaps | Jupiter Swap API v6 |
| Price feeds | Jupiter Price API v2 |
| Yield cron | Node.js cron on nexus-core (daily) |
| Token distribution | Solana batch transfer script |
| Frontend | Next.js + Tailwind + @solana/wallet-adapter |
| Hosting | Cloudflare Pages (frontend) + nexus-core (backend) |
| Domain | conviction.metaspn.network (or new domain) |

### Phase 2 (2-3 weeks)
| Component | Tech |
|---|---|
| Vault contract | Anchor (Rust) on Solana |
| Auto distribution | On-chain program trigger |
| Vault factory | Anyone can create vaults |
| Base integration | Viem + wagmi for Base wallet support |
| Bridge automation | Official Base-Solana bridge SDK |
| LP positions | Meteora (Solana) + Uniswap V3 (Base) |

---

## Build Phases

### Phase 1 — MVP (Days 1-4)
- [x] Squads multisig setup — vault: BCiPx7CbD3ZrcETcGTEGjTWtCwAbotNPPmdqmB9zAseq (2-of-3: Leo + Marvin + cold key CECMkQ51vZykHnQLiXocgrqRTZK5JXHjUjY2F1u2ABKh)
- [ ] bags.fm coin launch (ticker decision + 5-min launch)
- [ ] Stake intake: wallet connection + token send + ledger entry
- [ ] Jupiter integration: price feed + swap execution
- [ ] Vault share calculator
- [ ] Daily yield cron: fee collect → buy → distribute
- [ ] Frontend V1: vault view + stake UI + position tracker
- [ ] Deploy Season 1 Dominance vault
- [ ] Deploy TOWEL Thesis vault
- [ ] bags.fm hackathon application

### Phase 2 — Anchor Contract (Weeks 2-3)
- [ ] Anchor program: create_vault, stake, claim_yield, close_vault
- [ ] On-chain share accounting
- [ ] Automated fee collection + distribution
- [ ] Vault browser (multiple vaults)
- [ ] Base wallet support (MetaMask)
- [ ] Bridge LP position setup

### Phase 3 — Cross-chain automation (Month 2)
- [ ] Bridge SDK integration (automated cross-chain rebalancing)
- [ ] LP fee collection automation
- [ ] Arbitrage bot (cross-chain spread capture)
- [ ] Any-token entry (Jupiter + bridge routing from any token)
- [ ] Mobile-friendly UI

---

## bags.fm Hackathon Application

**Category:** AI Agents + Fee Sharing + DeFi

**Product traction metrics at application:**
- GitHub repo (stars, commits)
- Two live vaults with real TVL
- On-chain distribution txs (proof of yield)
- bags.fm native coin with trading volume

**Pitch:** "Conviction Vault is a cross-chain yield platform that converts belief in AI agent tokens into continuous token yield. Users stake any conviction token on their chain of choice — the platform handles cross-chain positioning, earns from bridge liquidity, and drips portfolio tokens back to stakers daily. The bridge is revenue, not infrastructure."

**Coin:** Platform coin on bags.fm earns 10% of all vault fees. Deeper integration: vault shares issued as bags.fm coin (TBD — V2).

---

## Locked Decisions (2026-03-15)

1. **Platform coin ticker** — $DRIP ✅
2. **Minimum creator stake** — 500 TOWEL ✅
3. **Yield drip cadence** — 24h for MVP ✅
4. **Early exit penalty destination** — goes to remaining stakers specifically (not general yield pool) ✅
5. **Domain** — conviction.metaspn.network ✅
6. **Wallet support in MVP** — Solana only (Base in V2) ✅

---

## What to Build First (Coding Agent Task)

Priority order:
1. Jupiter price + swap integration (Node.js module — needed for everything else)
2. Stake intake + share ledger (SQLite schema + API endpoint)
3. Daily yield cron (fee collection → buy → batch distribute)
4. Frontend V1 (vault display + stake button)
5. bags.fm coin launch script

Repo: `~/clawd/conviction-vault/`
