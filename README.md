# Conviction Vault

A Solana-native cross-chain conviction staking platform. Users stake supported tokens to express belief in a portfolio of agent/creator tokens. The platform holds positions, earns from cross-chain liquidity, and drips portfolio tokens back to stakers as continuous yield.

**Core primitive:** conviction → capital flow → yield → more conviction.

See [SPEC.md](./SPEC.md) for the full build spec.

## Quick Start

```bash
# 1. Install backend dependencies
npm install

# 2. Seed the database with default vaults
npm run seed

# 3. Start the API server (port 3094)
npm start

# 4. In another terminal, install & run the frontend (port 3095)
cd frontend
npm install
npm run dev
```

The API runs at `http://localhost:3094`. The frontend runs at `http://localhost:3095`.

## DRY_RUN Mode

**DRY_RUN=true** (default) — all swaps are simulated, no real transactions are executed. Jupiter quotes are fetched but swaps are logged only.

**DRY_RUN=false** — LIVE mode. Actual Solana transactions will be executed. **Use with caution.**

Set via environment variable or `.env` file (copy `.env.example` → `.env`).

## Project Structure

```
/server        Express API + core modules
  api.mjs      Express server (port 3094)
  db.mjs       SQLite schema & queries (sql.js)
  jupiter.mjs  Jupiter Price/Quote/Swap integration
  shares.mjs   Vault share calculator
  seed.mjs     Database seed script
/scripts       One-off scripts & cron jobs
  yield-cron.mjs  Daily yield distribution (9am UTC)
/frontend      Next.js app (Tailwind CSS)
/data          SQLite database (gitignored)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Status check + mode |
| GET | `/vaults` | List all active vaults with stats |
| GET | `/vaults/:id` | Vault detail with stakers & yield history |
| POST | `/stake` | Stake into a vault |
| POST | `/exit` | Early exit with 2% penalty |
| GET | `/position/:address` | All positions for a wallet |
| GET | `/tokens` | Supported token universe |

## Token Universe

### Solana (V1 — swappable via Jupiter)
| Token | Mint |
|-------|------|
| TOWEL | `Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump` |
| METATOWEL | `CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump` |
| MARVIN | `91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump` |
| SOL | `So11111111111111111111111111111111111111112` |

### Base (tracked as external positions in V1)
| Token | Address |
|-------|---------|
| ANTIHUNTER | `0xcee38b10810abab93487ebc93a9099853476bb07` |
| KELLYCLAUDE | TBD |
| FELIX | TBD |

## Fee Structure

| Event | Fee | Yield Pool (90%) | Platform (10%) |
|-------|-----|-------------------|----------------|
| Stake entry | 0.5% | Buys portfolio tokens → drip | Platform wallet |
| Early exit | 2.0% penalty | Distributed to remaining stakers | Platform wallet |
| Cycle completion | 1.0% | Same | Same |
| Yield claim | 0% | — | — |

## Yield Distribution

Runs daily at 9am UTC via `scripts/yield-cron.mjs`:

1. Collect accumulated fees per vault
2. 90% → simulate/execute Jupiter swaps into portfolio tokens at vault weights
3. Calculate each staker's pro-rata share
4. Log distribution (transfer tokens in LIVE mode)
5. 10% → platform revenue

```bash
# Run once manually
node scripts/yield-cron.mjs --once

# Run once immediately, then continue as cron
node scripts/yield-cron.mjs --now

# Run as scheduled cron (9am UTC daily)
node scripts/yield-cron.mjs
```

## Seeded Vaults

**Vault 1: Season 1 Dominance**
- 40% ANTIHUNTER / 35% KELLYCLAUDE / 25% FELIX (Base, bridged)
- Target: 1.5x | Expiry: 30 days | Creator stake: 500 TOWEL

**Vault 2: TOWEL Thesis**
- 50% TOWEL / 30% METATOWEL / 20% MARVIN (Solana native)
- Target: 2x | Expiry: 60 days | Creator stake: 500 TOWEL

## Environment Variables

```
DRY_RUN=true                    # Simulation mode (default)
PORT=3094                       # API port
PLATFORM_SOLANA_WALLET=         # Platform Solana wallet (TBD)
PLATFORM_BASE_WALLET=           # Platform Base wallet (TBD)
```

## Platform Coin

**$DRIP** — launched on bags.fm. 10% of all platform fees buy this coin and distribute to holders.
