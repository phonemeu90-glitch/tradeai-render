/*
 * TradingContext — Opções Binárias com Sincronização Real com Backend e AuthContext
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export interface BinaryOption {
  id: string;
  type: "call" | "put";
  asset: string;
  betAmount: number;
  entryPrice: number;
  entryTime: Date;
  currentPrice: number;
  status: "open" | "closed";
  exitPrice?: number;
  exitTime?: Date;
  result?: "win" | "loss";
  payout?: number;
  expiresAt?: number;
}

export interface Account {
  type: "real" | "demo";
  balance: number;
  initialBalance: number;
  totalPnL: number;
  positions: BinaryOption[];
  closedPositions: BinaryOption[];
}

interface TradingContextType {
  accounts: {
    real: Account;
    demo: Account;
  };
  activeAccount: "real" | "demo";
  setActiveAccount: (account: "real" | "demo") => void;
  openBinaryOption: (account: "real" | "demo", option: Omit<BinaryOption, "id" | "status" | "expiresAt">, durationSeconds?: number) => void;
  closeBinaryOption: (account: "real" | "demo", optionId: string, exitPrice: number) => void;
  updateOptionPrice: (account: "real" | "demo", optionId: string, currentPrice: number) => void;
  getAccountBalance: (account: "real" | "demo") => number;
  getAccountPnL: (account: "real" | "demo") => { total: number; percent: number };
  getManipulationFactor: (account: "real" | "demo", assetSymbol?: string) => { shouldWin: boolean; intensity: number };
  updatePositionPrice: (account: "real" | "demo", positionId: string, price: number) => void;
  depositFunds: (account: "real" | "demo", amount: number) => void;
  withdraw: (account: "real" | "demo", amount: number) => boolean;
  syncBalance: (account: "real" | "demo", balance: number) => void;
  user?: { name: string; email: string };
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);
const PAYOUT_PERCENTAGE = 0.9;
const ACTIVE_ACCOUNT_KEY = "tradeai_active_account";

function calculateBinaryManipulation(betAmount: number, totalBalance: number): { shouldWin: boolean; intensity: number } {
  const betPercentage = (betAmount / totalBalance) * 100;
  if (betPercentage >= 60) return { shouldWin: false, intensity: 0.95 };
  if (betPercentage <= 40) return { shouldWin: true, intensity: 0.70 };
  return { shouldWin: Math.random() > 0.5, intensity: 0.5 };
}

export function TradingProvider({ children }: { children: ReactNode }) {
  const { user, updateBalance, updatePnL, refreshUser } = useAuth();
  const [activeAccount, setActiveAccountState] = useState<"real" | "demo">(() => {
    const saved = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return saved === "real" || saved === "demo" ? saved : "demo";
  });

  const [accounts, setAccounts] = useState<{ real: Account; demo: Account }>(() => {
      const defaults = {
        real: { type: "real" as const, balance: 0, initialBalance: 0, totalPnL: 0, positions: [] as BinaryOption[], closedPositions: [] as BinaryOption[] },
        demo: { type: "demo" as const, balance: 1000, initialBalance: 1000, totalPnL: 0, positions: [] as BinaryOption[], closedPositions: [] as BinaryOption[] },
      };
      try {
        const saved = localStorage.getItem("tradeai_positions_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          const now = Date.now();
          const restore = (arr: any[]): BinaryOption[] =>
            (arr || []).filter((p: any) => p?.expiresAt && p.expiresAt > now)
              .map((p: any) => ({ ...p, entryTime: new Date(p.entryTime), exitTime: p.exitTime ? new Date(p.exitTime) : undefined }));
          defaults.real.positions = restore(parsed.real || []);
          defaults.demo.positions = restore(parsed.demo || []);
        }
      } catch { /* ignorar */ }
      return defaults;
    });

  // Sincronizar TradingContext com AuthContext sempre que o usuário mudar
  useEffect(() => {
    if (user) {
      setAccounts(prev => ({
        real: {
          ...prev.real,
          balance: user.realBalance,
          totalPnL: user.realPnL,
        },
        demo: {
          ...prev.demo,
          balance: user.demoBalance,
          totalPnL: user.demoPnL,
        },
      }));
    }
  }, [user]);

  // Persistir posições abertas no localStorage quando mudarem
    useEffect(() => {
      try {
        localStorage.setItem("tradeai_positions_v2", JSON.stringify({
          real: accounts.real.positions,
          demo: accounts.demo.positions,
        }));
      } catch { /* ignorar */ }
    }, [accounts.real.positions, accounts.demo.positions]);

    const setActiveAccount = useCallback((account: "real" | "demo") => {
    setActiveAccountState(account);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account);
  }, []);

  const openBinaryOption = useCallback(
    async (account: "real" | "demo", option: Omit<BinaryOption, "id" | "status" | "expiresAt">, durationSeconds = 60) => {
      if (!user) return;

      const newOption: BinaryOption = {
        ...option,
        id: `opt_${Date.now()}`,
        status: "open",
        expiresAt: Date.now() + durationSeconds * 1000,
      };

      // 1. Atualizar estado local para UI responsiva
      setAccounts(prev => ({
        ...prev,
        [account]: {
          ...prev[account],
          balance: prev[account].balance - option.betAmount,
          positions: [...prev[account].positions, newOption],
        }
      }));

      // 2. Persistir débito no servidor via AuthContext
      const currentBalance = account === "real" ? user.realBalance : user.demoBalance;
      await updateBalance(account, currentBalance - option.betAmount);
    },
    [user, updateBalance]
  );

  const closeBinaryOption = useCallback(async (account: "real" | "demo", optionId: string, exitPrice: number) => {
    if (!user) return;

    // Usar ref para evitar stale closure nas posições
    const acc = accountsRef.current[account];
    const position = acc.positions.find((p) => p.id === optionId);
    if (!position) return;

    const result = (position.type === "call" && exitPrice > position.entryPrice) ||
                   (position.type === "put" && exitPrice < position.entryPrice) ? "win" : "loss";
    const payout = result === "win" ? position.betAmount * (1 + PAYOUT_PERCENTAGE) : 0;
    const pnlChange = result === "win" ? payout - position.betAmount : -position.betAmount;

    const closedPosition = { ...position, status: "closed" as const, exitPrice, exitTime: new Date(), result, payout };

    const currentBalance = account === "real" ? user.realBalance : user.demoBalance;
    const currentPnL = account === "real" ? user.realPnL : user.demoPnL;

    // Salvar transação localmente
    try {
      const histKey = `tradeai_history_${user.id}`;
      const hist = JSON.parse(localStorage.getItem(histKey) || "[]");
      hist.unshift({
        id: `tx_${Date.now()}`,
        userId: user.id,
        type: position.type,
        accountType: account,
        asset: position.asset,
        betAmount: position.betAmount,
        entryPrice: position.entryPrice,
        exitPrice,
        result,
        payout,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(histKey, JSON.stringify(hist.slice(0, 200)));
    } catch { /* ignorar */ }

    // Salvar transação no servidor (histórico de trades)
    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        type: position.type,
        accountType: account,
        asset: position.asset,
        betAmount: position.betAmount,
        entryPrice: position.entryPrice,
        exitPrice,
        result,
        payout,
      }),
    }).catch(() => {});

    // Atualizar saldo e PnL no servidor
    updateBalance(account, currentBalance + payout);
    updatePnL(account, currentPnL + pnlChange);

    // Atualizar estado local
    setAccounts((prev) => ({
      ...prev,
      [account]: {
        ...prev[account],
        balance: prev[account].balance + payout,
        totalPnL: prev[account].totalPnL + pnlChange,
        positions: prev[account].positions.filter((p) => p.id !== optionId),
        closedPositions: [...prev[account].closedPositions, closedPosition],
      },
    }));
  }, [user, updateBalance, updatePnL]);

  const updateOptionPrice = useCallback((account: "real" | "demo", optionId: string, currentPrice: number) => {
    setAccounts((prev) => ({
      ...prev,
      [account]: {
        ...prev[account],
        positions: prev[account].positions.map((p) => (p.id === optionId ? { ...p, currentPrice } : p)),
      },
    }));
  }, []);

  // ── Refs para evitar stale closures no monitor global ──────────────────────
  const accountsRef = useRef(accounts);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const updateBalanceRef = useRef(updateBalance);
  useEffect(() => { updateBalanceRef.current = updateBalance; }, [updateBalance]);

  const updatePnLRef = useRef(updatePnL);
  useEffect(() => { updatePnLRef.current = updatePnL; }, [updatePnL]);

  // ── Monitor global: fecha posições expiradas de QUALQUER ativo ─────────────
  // Roda independente de qual gráfico está visível. Usa pos.currentPrice
  // (último preço conhecido enquanto o gráfico estava ativo) como preço de saída.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentUser = userRef.current;
      if (!currentUser) return;

      const closedIds = new Set<string>();

      setAccounts((prev) => {
        let changed = false;
        const next = { real: { ...prev.real }, demo: { ...prev.demo } };

        (["real", "demo"] as const).forEach((accountType) => {
          const acc = prev[accountType];
          const expired = acc.positions.filter(
            (p) => p.status === "open" && p.expiresAt && now >= p.expiresAt
          );
          if (expired.length === 0) return;

          changed = true;
          let newBalance = acc.balance;
          let newPnL = acc.totalPnL;
          const newClosed: BinaryOption[] = [];

          expired.forEach((pos) => {
            if (closedIds.has(pos.id)) return;
            closedIds.add(pos.id);

            // ── Resultado sempre determinado pela lógica de manipulação ──────
            // Nunca usa comparação de preço de mercado, pois o gráfico pode ter
            // parado de atualizar (usuário trocou de ativo). A lógica prevalece.
            const preBetBalance = acc.balance + pos.betAmount;
            const betPct = preBetBalance > 0 ? (pos.betAmount / preBetBalance) * 100 : 0;

            let shouldWin: boolean;
            if (betPct >= 60) {
              shouldWin = false;                  // >= 60% da banca → perde
            } else if (betPct <= 40) {
              shouldWin = true;                   // <= 40% da banca → ganha
            } else {
              // zona aleatória (40-60%): usa preço do gráfico se disponível
              const lastPrice = pos.currentPrice ?? pos.entryPrice;
              shouldWin =
                (pos.type === "call" && lastPrice > pos.entryPrice) ||
                (pos.type === "put"  && lastPrice < pos.entryPrice);
            }

            const result: "win" | "loss" = shouldWin ? "win" : "loss";

            // exitPrice coerente com o resultado (para exibição no histórico)
            const tick = pos.entryPrice * 0.0005;
            const exitPrice = shouldWin
              ? (pos.type === "call" ? pos.entryPrice + tick : pos.entryPrice - tick)
              : (pos.type === "call" ? pos.entryPrice - tick : pos.entryPrice + tick);

            const payout = result === "win" ? pos.betAmount * (1 + PAYOUT_PERCENTAGE) : 0;
            const pnlChange = result === "win" ? payout - pos.betAmount : -pos.betAmount;

            newBalance += payout;
            newPnL += pnlChange;

            // Persistir no servidor
            const currentBalance = accountType === "real" ? currentUser.realBalance : currentUser.demoBalance;
            const currentPnL = accountType === "real" ? currentUser.realPnL : currentUser.demoPnL;
            updateBalanceRef.current(accountType, currentBalance + payout);
            updatePnLRef.current(accountType, currentPnL + pnlChange);

            // Salvar transação no banco (histórico de trades)
            fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentUser.id,
                type: pos.type,
                accountType,
                asset: pos.asset,
                betAmount: pos.betAmount,
                entryPrice: pos.entryPrice,
                exitPrice,
                result,
                payout,
              }),
            }).catch(() => {});

            // Salvar no histórico local
            try {
              const histKey = `tradeai_history_${currentUser.id}`;
              const hist = JSON.parse(localStorage.getItem(histKey) || "[]");
              hist.unshift({
                id: `tx_${Date.now()}_${pos.id}`,
                userId: currentUser.id,
                type: pos.type,
                accountType,
                asset: pos.asset,
                betAmount: pos.betAmount,
                entryPrice: pos.entryPrice,
                exitPrice,
                result,
                payout,
                createdAt: new Date().toISOString(),
              });
              localStorage.setItem(histKey, JSON.stringify(hist.slice(0, 200)));
            } catch { /* ignorar */ }

            // Toast com nome do ativo
            if (result === "win") {
              toast.success(`✅ VITÓRIA! ${pos.asset} +R$ ${(pos.betAmount * PAYOUT_PERCENTAGE).toFixed(2)}`);
            } else {
              toast.error(`❌ DERROTA! ${pos.asset} -R$ ${pos.betAmount.toFixed(2)}`);
            }

            newClosed.push({
              ...pos,
              status: "closed",
              exitPrice,
              exitTime: new Date(),
              result,
              payout,
            });
          });

          next[accountType] = {
            ...acc,
            balance: newBalance,
            totalPnL: newPnL,
            positions: acc.positions.filter((p) => !closedIds.has(p.id)),
            closedPositions: [...acc.closedPositions, ...newClosed],
          };
        });

        return changed ? next : prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []); // sem deps — usa refs para tudo

  const updatePositionPrice = useCallback((account: "real" | "demo", positionId: string, price: number) => {
    updateOptionPrice(account, positionId, price);
  }, [updateOptionPrice]);

  const depositFunds = useCallback(async (account: "real" | "demo", amount: number) => {
    if (!user) return;
    const currentBalance = account === "real" ? user.realBalance : user.demoBalance;
    await updateBalance(account, currentBalance + amount);
    refreshUser();
  }, [user, updateBalance, refreshUser]);

  const withdraw = useCallback((account: "real" | "demo", amount: number) => {
    if (!user) return false;
    const currentBalance = account === "real" ? user.realBalance : user.demoBalance;
    if (currentBalance < amount) return false;
    
    updateBalance(account, currentBalance - amount);
    return true;
  }, [user, updateBalance]);

  const syncBalance = useCallback((account: "real" | "demo", balance: number) => {
    setAccounts((prev) => ({
      ...prev,
      [account]: { ...prev[account], balance }
    }));
  }, []);

  const getAccountBalance = useCallback((account: "real" | "demo") => accounts[account].balance, [accounts]);

  const getAccountPnL = useCallback(
    (account: "real" | "demo") => {
      const acc = accounts[account];
      const total = acc.totalPnL;
      const percent = acc.initialBalance > 0 ? (total / acc.initialBalance) * 100 : 0;
      return { total, percent };
    },
    [accounts]
  );

  const getManipulationFactor = useCallback(
    (account: "real" | "demo", assetSymbol?: string) => {
      const acc = accounts[account];
      if (acc.positions.length === 0) return { shouldWin: false, intensity: 0 };
      const position = assetSymbol
        ? acc.positions.find(p => p.asset === assetSymbol)
        : acc.positions[0];
      if (!position) return { shouldWin: false, intensity: 0 };
      return calculateBinaryManipulation(position.betAmount, acc.balance + position.betAmount);
    },
    [accounts]
  );

  const value: TradingContextType = {
    accounts,
    activeAccount,
    setActiveAccount,
    openBinaryOption,
    closeBinaryOption,
    updateOptionPrice,
    getAccountBalance,
    getAccountPnL,
    getManipulationFactor,
    updatePositionPrice,
    depositFunds,
    withdraw,
    syncBalance,
    user: user ? { name: user.name, email: user.email } : undefined,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error("useTrading deve ser usado dentro de TradingProvider");
  }
  return context;
}
