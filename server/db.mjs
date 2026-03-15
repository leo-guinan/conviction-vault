import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'conviction-vault.db');

let db;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDb() {
  const db = await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS vaults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      creator_address TEXT NOT NULL,
      creator_stake_towel REAL NOT NULL,
      portfolio_weights TEXT NOT NULL,
      target_multiplier REAL NOT NULL,
      expiry_days INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'expired')),
      bags_fm_coin_ticker TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_id INTEGER NOT NULL REFERENCES vaults(id),
      staker_address TEXT NOT NULL,
      token_mint TEXT NOT NULL,
      token_amount REAL NOT NULL,
      usd_value_at_stake REAL NOT NULL,
      vault_shares REAL NOT NULL,
      staked_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'exited'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS yield_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_id INTEGER NOT NULL REFERENCES vaults(id),
      distribution_at TEXT NOT NULL DEFAULT (datetime('now')),
      fees_collected_usd REAL NOT NULL,
      tokens_bought TEXT NOT NULL,
      total_stakers INTEGER NOT NULL,
      tx_hashes TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS exit_penalties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_id INTEGER NOT NULL,
      staker_id INTEGER NOT NULL REFERENCES stakes(id),
      penalty_usd REAL NOT NULL,
      distributed_to_remaining_stakers TEXT,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  saveDb();
  return db;
}

// Helper: run query and return all rows as objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
  return { lastInsertRowid: lastId, changes: db.getRowsModified() };
}

// Vault queries
export function getAllVaults() {
  return queryAll('SELECT * FROM vaults WHERE status = ?', ['active']);
}

export function getVaultById(id) {
  return queryOne('SELECT * FROM vaults WHERE id = ?', [id]);
}

export function createVault(vault) {
  return runSql(
    `INSERT INTO vaults (name, creator_address, creator_stake_towel, portfolio_weights, target_multiplier, expiry_days, bags_fm_coin_ticker)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      vault.name,
      vault.creator_address,
      vault.creator_stake_towel,
      JSON.stringify(vault.portfolio_weights),
      vault.target_multiplier,
      vault.expiry_days,
      vault.bags_fm_coin_ticker || null,
    ]
  );
}

// Stake queries
export function getStakesByVault(vaultId) {
  return queryAll('SELECT * FROM stakes WHERE vault_id = ? AND status = ?', [vaultId, 'active']);
}

export function getStakeById(id) {
  return queryOne('SELECT * FROM stakes WHERE id = ?', [id]);
}

export function getStakesByAddress(address) {
  return queryAll(
    'SELECT s.*, v.name as vault_name FROM stakes s JOIN vaults v ON s.vault_id = v.id WHERE s.staker_address = ?',
    [address]
  );
}

export function createStake(stake) {
  return runSql(
    `INSERT INTO stakes (vault_id, staker_address, token_mint, token_amount, usd_value_at_stake, vault_shares)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      stake.vault_id,
      stake.staker_address,
      stake.token_mint,
      stake.token_amount,
      stake.usd_value_at_stake,
      stake.vault_shares,
    ]
  );
}

export function updateStakeStatus(id, status) {
  return runSql('UPDATE stakes SET status = ? WHERE id = ?', [status, id]);
}

// Yield distribution queries
export function getDistributionsByVault(vaultId) {
  return queryAll('SELECT * FROM yield_distributions WHERE vault_id = ? ORDER BY distribution_at DESC', [vaultId]);
}

export function createDistribution(dist) {
  return runSql(
    `INSERT INTO yield_distributions (vault_id, fees_collected_usd, tokens_bought, total_stakers, tx_hashes)
     VALUES (?, ?, ?, ?, ?)`,
    [
      dist.vault_id,
      dist.fees_collected_usd,
      JSON.stringify(dist.tokens_bought),
      dist.total_stakers,
      dist.tx_hashes ? JSON.stringify(dist.tx_hashes) : null,
    ]
  );
}

// Exit penalty queries
export function createExitPenalty(penalty) {
  return runSql(
    `INSERT INTO exit_penalties (vault_id, staker_id, penalty_usd, distributed_to_remaining_stakers)
     VALUES (?, ?, ?, ?)`,
    [
      penalty.vault_id,
      penalty.staker_id,
      penalty.penalty_usd,
      JSON.stringify(penalty.distributed_to_remaining_stakers),
    ]
  );
}

// Aggregates
export function getVaultTVL(vaultId) {
  const row = queryOne('SELECT COALESCE(SUM(usd_value_at_stake), 0) as tvl FROM stakes WHERE vault_id = ? AND status = ?', [vaultId, 'active']);
  return row ? row.tvl : 0;
}

export function getTotalShares(vaultId) {
  const row = queryOne('SELECT COALESCE(SUM(vault_shares), 0) as total_shares FROM stakes WHERE vault_id = ? AND status = ?', [vaultId, 'active']);
  return row ? row.total_shares : 0;
}
