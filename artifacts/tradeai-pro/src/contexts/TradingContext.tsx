/*
 * TradingContext — Opções Binárias com Sincronização Real com Backend e AuthContext
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { useAuth } from "./AuthContext";

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
    setAccounts((prev) => {
      const positions = prev[account].positions;
      const position = positions.find((p) => p.id === optionId);
      if (!position || !user) return prev;

      const result = (position.type === "call" && exitPrice > position.entryPrice) || 
                     (position.type === "put" && exitPrice < position.entryPrice) ? "win" : "loss";
      
      // Lógica de Perda Justa:
      // Se ganhar, recebe o payout total (aposta + lucro).
      // Se perder, o payout é 0, o que significa que o valor apostado (já debitado ao abrir a ordem) não volta.
      // A perda real é exatamente o valor apostado (betAmount).
      const payout = result === "win" ? position.betAmount * (1 + PAYOUT_PERCENTAGE) : 0;
      const pnlChange = result === "win" ? payout - position.betAmount : -position.betAmount;

      const closedPosition = { ...position, status: "closed" as const, exitPrice, exitTime: new Date(), result, payout };

      // 1. Persistir no servidor (Transação + Saldo + PnL)
      const currentBalance = account === "real" ? user.realBalance : user.demoBalance;
      const currentPnL = account === "real" ? user.realPnL : user.demoPnL;

      // Salvar transação localmente no histórico
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

      // Atualizar saldo e PnL localmente
      updateBalance(account, currentBalance + payout);
      updatePnL(account, currentPnL + pnlChange);

      // 2. Atualizar estado local
      return {
        ...prev,
        [account]: {
          ...prev[account],
          balance: prev[account].balance + payout,
          totalPnL: prev[account].totalPnL + pnlChange,
          positions: positions.filter((p) => p.id !== optionId),
          closedPositions: [...prev[account].closedPositions, closedPosition],
        },
      };
    });
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
