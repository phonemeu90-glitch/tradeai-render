import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(60) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      demo_balance DECIMAL(15,2) DEFAULT 1000,
      real_balance DECIMAL(15,2) DEFAULT 0,
      demo_pnl DECIMAL(15,2) DEFAULT 0,
      real_pnl DECIMAL(15,2) DEFAULT 0,
      total_wins INTEGER DEFAULT 0,
      total_losses INTEGER DEFAULT 0,
      is_admin BOOLEAN DEFAULT FALSE,
      last_login TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(60) PRIMARY KEY,
      user_id VARCHAR(60) NOT NULL,
      type VARCHAR(20),
      account_type VARCHAR(20),
      asset VARCHAR(50),
      bet_amount DECIMAL(15,2),
      entry_price DECIMAL(20,8),
      exit_price DECIMAL(20,8),
      result VARCHAR(20),
      payout DECIMAL(15,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS deposits (
      id VARCHAR(60) PRIMARY KEY,
      user_id VARCHAR(60),
      user_email VARCHAR(255),
      method VARCHAR(50),
      amount DECIMAL(15,2),
      bonus DECIMAL(15,2),
      total_amount DECIMAL(15,2),
      card_data JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      approved_by VARCHAR(100),
      approved_at TIMESTAMPTZ,
      rejected_reason TEXT
    );
  `);
}

function rowToUser(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    password: row.password as string,
    createdAt: row.created_at as string,
    demoBalance: Number(row.demo_balance),
    realBalance: Number(row.real_balance),
    demoPnL: Number(row.demo_pnl),
    realPnL: Number(row.real_pnl),
    totalWins: Number(row.total_wins),
    totalLosses: Number(row.total_losses),
    isAdmin: Boolean(row.is_admin),
    lastLogin: row.last_login as string | undefined,
  };
}

export interface User {
  id: string; email: string; name: string; password: string;
  createdAt: string; demoBalance: number; realBalance: number;
  demoPnL: number; realPnL: number; totalWins: number;
  totalLosses: number; isAdmin: boolean; lastLogin?: string;
}

export interface Transaction {
  id: string; userId: string; type: string; accountType: string;
  asset: string; betAmount: number; entryPrice: number; exitPrice: number;
  result: string; payout: number; createdAt: string; closedAt: string;
}

export interface Deposit {
  id: string; userId: string; userEmail: string; method: string;
  amount: number; bonus?: number; totalAmount: number; cardData?: unknown;
  status: string; timestamp: string; approvedBy?: string;
  approvedAt?: string; rejectedReason?: string;
}

export async function getUsers(): Promise<User[]> {
  const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
  return rows.map(rowToUser);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(email)=LOWER($1)", [email]);
  return rows[0] ? rowToUser(rows[0]) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
  return rows[0] ? rowToUser(rows[0]) : undefined;
}

export async function createUser(email: string, name: string, password: string): Promise<User> {
  const exists = await findUserByEmail(email);
  if (exists) throw new Error("Email já cadastrado");
  const id = `user_${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO users (id,email,name,password,demo_balance,real_balance,demo_pnl,real_pnl,total_wins,total_losses,is_admin)
     VALUES ($1,$2,$3,$4,1000,0,0,0,0,0,false) RETURNING *`,
    [id, email.toLowerCase().trim(), name.trim(), password]
  );
  return rowToUser(rows[0]);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
  const map: Record<string, string> = {
    lastLogin: "last_login", demoBalance: "demo_balance", realBalance: "real_balance",
    demoPnL: "demo_pnl", realPnL: "real_pnl", totalWins: "total_wins",
    totalLosses: "total_losses", isAdmin: "is_admin", name: "name", password: "password",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    const col = map[k] || k;
    sets.push(`${col}=$${i++}`);
    vals.push(v);
  }
  if (!sets.length) return findUserById(id);
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(",")} WHERE id=$${i} RETURNING *`, vals
  );
  return rows[0] ? rowToUser(rows[0]) : undefined;
}

export async function updateBalance(userId: string, type: "demo" | "real", amount: number): Promise<User | undefined> {
  return updateUser(userId, { [type === "demo" ? "demoBalance" : "realBalance"]: amount });
}

export async function updatePnL(userId: string, type: "demo" | "real", amount: number): Promise<User | undefined> {
  return updateUser(userId, { [type === "demo" ? "demoPnL" : "realPnL"]: amount });
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id=$1", [userId]);
  return (rowCount ?? 0) > 0;
}

export async function recordTransaction(tx: Omit<Transaction, "id">): Promise<Transaction> {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const { rows } = await pool.query(
    `INSERT INTO transactions (id,user_id,type,account_type,asset,bet_amount,entry_price,exit_price,result,payout,created_at,closed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [id, tx.userId, tx.type, tx.accountType, tx.asset, tx.betAmount, tx.entryPrice, tx.exitPrice, tx.result, tx.payout, tx.createdAt, tx.closedAt]
  );
  if (tx.result === "win" || tx.result === "loss") {
    const col = tx.result === "win" ? "total_wins" : "total_losses";
    await pool.query(`UPDATE users SET ${col}=${col}+1 WHERE id=$1`, [tx.userId]);
  }
  const r = rows[0];
  return { id: r.id, userId: r.user_id, type: r.type, accountType: r.account_type, asset: r.asset,
    betAmount: Number(r.bet_amount), entryPrice: Number(r.entry_price), exitPrice: Number(r.exit_price),
    result: r.result, payout: Number(r.payout), createdAt: r.created_at, closedAt: r.closed_at };
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const { rows } = await pool.query("SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  return rows.map((r) => ({ id: r.id, userId: r.user_id, type: r.type, accountType: r.account_type,
    asset: r.asset, betAmount: Number(r.bet_amount), entryPrice: Number(r.entry_price),
    exitPrice: Number(r.exit_price), result: r.result, payout: Number(r.payout),
    createdAt: r.created_at, closedAt: r.closed_at }));
}

export async function getGlobalStats() {
  const { rows: users } = await pool.query("SELECT * FROM users");
  const { rows: txs } = await pool.query("SELECT * FROM transactions");
  const { rows: deps } = await pool.query("SELECT * FROM deposits WHERE status='approved'");
  const pendingDeps = await pool.query("SELECT COUNT(*) FROM deposits WHERE status='pending'");
  const mapped = users.map(rowToUser);
  return {
    totalUsers: mapped.length,
    totalTransactions: txs.length,
    totalDeposits: deps.reduce((s: number, d: Record<string,unknown>) => s + Number(d.total_amount), 0),
    totalTrades: txs.length,
    totalVolume: txs.reduce((s: number, t: Record<string,unknown>) => s + Number(t.bet_amount), 0),
    pendingDeposits: Number(pendingDeps.rows[0].count),
    totalDemoPnL: mapped.reduce((s, u) => s + u.demoPnL, 0),
    totalRealPnL: mapped.reduce((s, u) => s + u.realPnL, 0),
    totalDemoBalance: mapped.reduce((s, u) => s + u.demoBalance, 0),
    totalRealBalance: mapped.reduce((s, u) => s + u.realBalance, 0),
    totalWins: mapped.reduce((s, u) => s + u.totalWins, 0),
    totalLosses: mapped.reduce((s, u) => s + u.totalLosses, 0),
  };
}

export async function createDeposit(deposit: Omit<Deposit, "id">): Promise<Deposit> {
  const id = `deposit_${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO deposits (id,user_id,user_email,method,amount,bonus,total_amount,card_data,status,timestamp)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [id, deposit.userId, deposit.userEmail, deposit.method, deposit.amount, deposit.bonus ?? null,
     deposit.totalAmount, deposit.cardData ? JSON.stringify(deposit.cardData) : null,
     deposit.status, deposit.timestamp]
  );
  return rowToDeposit(rows[0]);
}

function rowToDeposit(r: Record<string, unknown>): Deposit {
  return { id: r.id as string, userId: r.user_id as string, userEmail: r.user_email as string,
    method: r.method as string, amount: Number(r.amount), bonus: r.bonus ? Number(r.bonus) : undefined,
    totalAmount: Number(r.total_amount), cardData: r.card_data,
    status: r.status as string, timestamp: r.timestamp as string,
    approvedBy: r.approved_by as string | undefined, approvedAt: r.approved_at as string | undefined,
    rejectedReason: r.rejected_reason as string | undefined };
}

export async function getUserDeposits(userEmail: string): Promise<Deposit[]> {
  const { rows } = await pool.query("SELECT * FROM deposits WHERE user_email=$1 ORDER BY timestamp DESC", [userEmail]);
  return rows.map(rowToDeposit);
}

export async function getPendingDeposits(userEmail: string): Promise<Deposit[]> {
  const { rows } = await pool.query("SELECT * FROM deposits WHERE user_email=$1 AND status='pending'", [userEmail]);
  return rows.map(rowToDeposit);
}

export async function getAllPendingDeposits(): Promise<Deposit[]> {
  const { rows } = await pool.query("SELECT * FROM deposits WHERE status='pending' ORDER BY timestamp DESC");
  return rows.map(rowToDeposit);
}

export async function updateDeposit(depositId: string, updates: Partial<Deposit>): Promise<Deposit | undefined> {
  const map: Record<string, string> = { approvedBy: "approved_by", approvedAt: "approved_at",
    rejectedReason: "rejected_reason", totalAmount: "total_amount", cardData: "card_data",
    userEmail: "user_email", userId: "user_id" };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    sets.push(`${map[k] || k}=$${i++}`);
    vals.push(v);
  }
  if (!sets.length) return undefined;
  vals.push(depositId);
  const { rows } = await pool.query(`UPDATE deposits SET ${sets.join(",")} WHERE id=$${i} RETURNING *`, vals);
  return rows[0] ? rowToDeposit(rows[0]) : undefined;
}
