import { Router, type Request, type Response } from "express";
import {
  getUsers, findUserByEmail, findUserById, createUser, updateUser,
  updateBalance, updatePnL, recordTransaction, getUserTransactions,
  getGlobalStats, createDeposit, getUserDeposits, getPendingDeposits,
  getAllPendingDeposits, updateDeposit, deleteUser,
} from "../db.js";

const router = Router();

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: "Campos obrigatórios faltando" });
    const newUser = await createUser(email, name, password);
    res.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name,
      demoBalance: newUser.demoBalance, realBalance: newUser.realBalance,
      demoPnL: newUser.demoPnL, realPnL: newUser.realPnL, isAdmin: newUser.isAdmin } });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });
    const user = await findUserByEmail(email);
    if (!user || user.password !== password) return res.status(401).json({ error: "Email ou senha incorretos" });
    await updateUser(user.id, { lastLogin: new Date().toISOString() });
    res.json({ user: { id: user.id, email: user.email, name: user.name,
      demoBalance: user.demoBalance, realBalance: user.realBalance,
      demoPnL: user.demoPnL, realPnL: user.realPnL, isAdmin: user.isAdmin } });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const user = await findUserById(req.params.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ user: { id: user.id, email: user.email, name: user.name,
      demoBalance: user.demoBalance ?? 0, realBalance: user.realBalance ?? 0,
      demoPnL: user.demoPnL ?? 0, realPnL: user.realPnL ?? 0,
      totalWins: user.totalWins ?? 0, totalLosses: user.totalLosses ?? 0,
      isAdmin: user.isAdmin, createdAt: user.createdAt, lastLogin: user.lastLogin } });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/users/:userId/balance", async (req: Request, res: Response) => {
  try {
    const { type, amount } = req.body;
    const updated = await updateBalance(req.params.userId, type, amount);
    if (!updated) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ balance: updated[type === "demo" ? "demoBalance" : "realBalance"] });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/users/:userId/pnl", async (req: Request, res: Response) => {
  try {
    const { type, amount } = req.body;
    const updated = await updatePnL(req.params.userId, type, amount);
    if (!updated) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ pnl: updated[type === "demo" ? "demoPnL" : "realPnL"] });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const { userId, type, accountType, asset, betAmount, entryPrice, exitPrice, result, payout } = req.body;
    if (!accountType || (accountType !== "demo" && accountType !== "real"))
      return res.status(400).json({ error: "accountType é obrigatório (demo ou real)" });
    const transaction = await recordTransaction({ userId, type, accountType, asset, betAmount,
      entryPrice, exitPrice, result, payout,
      createdAt: new Date().toISOString(), closedAt: new Date().toISOString() });
    res.json({ transaction });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/users/:userId/transactions", async (req: Request, res: Response) => {
  try {
    const transactions = await getUserTransactions(req.params.userId);
    res.json({ transactions });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/admin/users", async (_req: Request, res: Response) => {
  try {
    const users = await getUsers();
    res.json({ users: users.map((u) => ({ id: u.id, email: u.email, name: u.name,
      demoBalance: u.demoBalance, realBalance: u.realBalance, demoPnL: u.demoPnL, realPnL: u.realPnL,
      totalWins: u.totalWins, totalLosses: u.totalLosses, createdAt: u.createdAt,
      lastLogin: u.lastLogin, isAdmin: u.isAdmin })) });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/admin/stats", async (_req: Request, res: Response) => {
  try { res.json(await getGlobalStats()); }
  catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.delete("/admin/users/:userId", async (req: Request, res: Response) => {
  try {
    const success = await deleteUser(req.params.userId);
    if (!success) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ success: true });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/deposits", async (req: Request, res: Response) => {
  try {
    const { userEmail, method, amount, bonus, totalAmount, cardData, status } = req.body;
    if (!userEmail || !method || !amount) return res.status(400).json({ error: "Campos obrigatórios faltando" });
    const deposit = await createDeposit({ userId: userEmail, userEmail, method, amount, bonus,
      totalAmount, cardData, status: status || "pending", timestamp: new Date().toISOString() });
    res.json(deposit);
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/deposits/pending/:userEmail", async (req: Request, res: Response) => {
  try { res.json(await getPendingDeposits(decodeURIComponent(req.params.userEmail))); }
  catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/deposits/user/:userEmail", async (req: Request, res: Response) => {
  try { res.json({ deposits: await getUserDeposits(decodeURIComponent(req.params.userEmail)) }); }
  catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/cards/user/:userEmail", async (req: Request, res: Response) => {
  try {
    const deposits = await getUserDeposits(decodeURIComponent(req.params.userEmail));
    const cards = deposits.filter((d) => d.method === "card" && d.cardData)
      .map((d) => ({ ...(d.cardData as object), depositId: d.id, status: d.status, timestamp: d.timestamp }));
    res.json({ cards });
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.get("/admin/deposits/pending", async (_req: Request, res: Response) => {
  try { res.json(await getAllPendingDeposits()); }
  catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/admin/deposits/:depositId/approve", async (req: Request, res: Response) => {
  try {
    const deposit = await updateDeposit(req.params.depositId, {
      status: "approved", approvedBy: "admin", approvedAt: new Date().toISOString() });
    if (!deposit) return res.status(404).json({ error: "Depósito não encontrado" });
    const user = await findUserByEmail(deposit.userEmail);
    if (user) await updateBalance(user.id, "real", (user.realBalance || 0) + deposit.totalAmount);
    res.json(deposit);
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

router.post("/admin/deposits/:depositId/reject", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const deposit = await updateDeposit(req.params.depositId, {
      status: "rejected", rejectedReason: reason || "Rejeitado pelo administrador" });
    if (!deposit) return res.status(404).json({ error: "Depósito não encontrado" });
    res.json(deposit);
  } catch (err: unknown) { res.status(400).json({ error: (err as Error).message }); }
});

export default router;
