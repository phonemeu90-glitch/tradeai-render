/**
 * Dashboard — Painel do Usuário com Integração de Autenticação
 */
import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import ExtraordinaryChart from "@/components/ExtraordinaryChart";
import DepositNotification from "@/components/DepositNotification";
import { useTrading } from "@/contexts/TradingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useChart } from "@/contexts/ChartContext";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, Zap, ArrowUpRight,
  ArrowDownRight, RefreshCw, Brain, Target, Activity, Wallet,
  Plus, Minus, Eye, EyeOff, Clock, CheckCircle2, AlertTriangle, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function generateCandleData(points: number, startPrice: number) {
  const data = [];
  let price = startPrice;
  const now = new Date();

  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    const open = price;
    const change = (Math.random() - 0.46) * price * 0.02;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * price * 0.008;
    const low = Math.min(open, close) - Math.random() * price * 0.008;
    const volume = Math.floor(Math.random() * 50000 + 10000);

    data.push({
      time: time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      open: parseFloat(open.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume,
      price: parseFloat(close.toFixed(2)),
    });

    price = close;
  }
  return data;
}

const ASSETS = [
  { symbol: "PETR4", name: "Petrobras PN", startPrice: 38.42, color: "#3b82f6" },
  { symbol: "VALE3", name: "Vale ON", startPrice: 61.80, color: "#06b6d4" },
];

export default function Dashboard() {
  const { user, logout, updateBalance, updatePnL } = useAuth();
  const { accounts, activeAccount, setActiveAccount, getAccountPnL, updatePositionPrice, syncBalance } = useTrading();
  const { updateChartData, updatePrice } = useChart();
  const [, setLocation] = useLocation();
  const [selectedAsset, setSelectedAsset] = useState(0);
  const [chartData, setChartData] = useState(() => generateCandleData(80, ASSETS[0].startPrice));
  const [currentPrice, setCurrentPrice] = useState(ASSETS[0].startPrice);
  const [priceChange, setPriceChange] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [depositNotification, setDepositNotification] = useState<any>(null);
  const [rejectedNotifications, setRejectedNotifications] = useState<Map<string, any>>(new Map());

  const { refreshUser } = useAuth();

  // Carregar notificacao de deposito do usuario consultando a API
  useEffect(() => {
    if (user?.email) {
      // Consultar a API para verificar depósitos pendentes
      fetch(`/api/deposits/pending/${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((deposits) => {
          if (deposits && deposits.length > 0) {
            // Há depósitos pendentes
            const deposit = deposits[0];
            const notification = {
              id: deposit.id,
              type: "pending",
              message: `Deposito de R$ ${deposit.totalAmount.toFixed(2)} em analise`,
              timestamp: new Date(deposit.timestamp).getTime(),
              userEmail: user.email,
            };
            setDepositNotification(notification);
          } else {
            // Nenhum depósito pendente
            setDepositNotification(null);
          }
        })
        .catch((e) => console.error("Erro ao carregar depositos:", e));
    }
  }, [user?.email]);

  // Sincronizar notificacoes a cada 5 segundos (polling)
  useEffect(() => {
    if (!user?.email) return;

    const interval = setInterval(() => {
      // Buscar TODOS os depositos do usuario (pendentes, aprovados, rejeitados)
      fetch(`/api/deposits/user/${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((allDeposits) => {
          // Verificar se ha depositos pendentes
          const pending = allDeposits.find((d: any) => d.status === "pending");
          if (pending) {
            const notification = {
              id: pending.id,
              type: "pending",
              message: `Deposito de R$ ${pending.totalAmount.toFixed(2)} em analise`,
              timestamp: new Date(pending.timestamp).getTime(),
              userEmail: user.email,
            };
            setDepositNotification(notification);
          } else {
            setDepositNotification(null);
          }
          
          // Verificar se ha depositos rejeitados que ainda nao foram fechados
          const dismissed = JSON.parse(localStorage.getItem(`dismissed_rejections_${user.email}`) || "[]");
          const rejected = allDeposits.filter((d: any) => d.status === "rejected" && !dismissed.includes(d.id));
          const newRejectedMap = new Map();
          
          rejected.forEach((deposit: any) => {
            newRejectedMap.set(deposit.id, {
              id: deposit.id,
              type: "rejected",
              message: `Seu deposito de R$ ${deposit.amount.toFixed(2)} foi rejeitado`,
              reason: deposit.rejectedReason || "Rejeitado pelo administrador",
              timestamp: new Date(deposit.timestamp).getTime(),
              userEmail: user.email,
            });
          });
          
          setRejectedNotifications(newRejectedMap);
        })
        .catch((e) => console.error("Erro ao sincronizar depositos:", e));
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.email, rejectedNotifications]);

  // Sincronizar dados ao montar
  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, [user, refreshUser]);

  const asset = ASSETS[selectedAsset] || ASSETS[0];
  const account = accounts[activeAccount] || accounts.demo;
  const pnl = getAccountPnL(activeAccount) || { total: 0, percent: 0 };

  // Sincronizar saldo entre Contextos (Auth -> Trading)
  // Isso garante que se o admin aprovar um depósito, o TradingContext receba o novo valor
  useEffect(() => {
    if (user) {
      const authBalance = activeAccount === "demo" ? user.demoBalance : user.realBalance;
      if (account && authBalance !== account.balance) {
        // Se o saldo do Auth for diferente do Trading, confiamos no Auth (que vem do servidor)
        syncBalance(activeAccount, authBalance);
        
        // Remover notificacao de analise quando o saldo mudar (indica aprovacao)
        if (depositNotification?.type === "pending") {
          localStorage.removeItem(`deposit_notification_${user.email}`);
          setDepositNotification(null);
        }
      }
    }
  }, [user, activeAccount, account?.balance, syncBalance, depositNotification?.type, user?.email]);

  // Sincronizar P&L com AuthContext
  useEffect(() => {
    if (user) {
      updatePnL(activeAccount, pnl.total);
    }
  }, [pnl, activeAccount, user, updatePnL]);

  const refreshData = useCallback(() => {
    const newData = generateCandleData(80, asset.startPrice);
    setChartData(newData);
    const last = newData[newData.length - 1];
    const first = newData[0];
    setCurrentPrice(last.price);
    setPriceChange(((last.price - first.price) / first.price) * 100);
    updateChartData(asset.symbol, newData);
    updatePrice(asset.symbol, last.price);
  }, [asset.startPrice, asset.symbol, updateChartData, updatePrice]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      setChartData((prev) => {
        if (!prev || prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.46) * last.price * 0.004;
        const newPrice = parseFloat((last.price + change).toFixed(2));
        const now = new Date();
        const newPoint = {
          time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          open: last.price, close: newPrice,
          high: Math.max(last.price, newPrice) + Math.random() * 0.3,
          low: Math.min(last.price, newPrice) - Math.random() * 0.3,
          price: newPrice,
          volume: Math.floor(Math.random() * 80000 + 20000),
        };
        const updated = [...prev.slice(1), newPoint];
        setCurrentPrice(newPrice);
        if (updated[0]) {
          setPriceChange(((newPrice - updated[0].price) / updated[0].price) * 100);
        }
        // APENAS updateChartData - evita conflito de estado
        updateChartData(asset.symbol, updated);

        if (account && account.positions) {
          account.positions.forEach((pos) => {
            updatePositionPrice(activeAccount, pos.id, newPrice);
          });
        }

        return updated;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [refreshData, asset.symbol, updateChartData, activeAccount, account?.positions, updatePositionPrice]);

  const isPositive = priceChange >= 0;
  const balance = activeAccount === "demo" ? user?.demoBalance || 0 : user?.realBalance || 0;

  const handleLogout = () => {
    logout();
    setLocation("/auth");
    toast.success("Deslogado com sucesso");
  };

  const handleDismissNotification = (id: string) => {
    // Remover notificacao de rejeição quando o usuário clicar no X
    const newRejectedMap = new Map(rejectedNotifications);
    newRejectedMap.delete(id);
    setRejectedNotifications(newRejectedMap);
    
    // Salvar no localStorage para persistir a decisão do usuário
    if (user?.email) {
      const dismissedIds = JSON.parse(localStorage.getItem(`dismissed_rejections_${user.email}`) || "[]");
      if (!dismissedIds.includes(id)) {
        dismissedIds.push(id);
        localStorage.setItem(`dismissed_rejections_${user.email}`, JSON.stringify(dismissedIds));
      }
    }
  };

  return (
    <Layout>
      {/* Notificação de Depósito em Análise (Azul) */}
      <DepositNotification
        notification={depositNotification}
        currentUserEmail={user?.email}
        onDismiss={handleDismissNotification}
      />
      
      {/* Notificações de Rejeição (Vermelhas com X) */}
      {Array.from(rejectedNotifications.values()).map((notification) => (
        <DepositNotification
          key={notification.id}
          notification={notification}
          currentUserEmail={user?.email}
          onDismiss={handleDismissNotification}
        />
      ))}
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              Bem-vindo, {user?.name || "Trader"}!
            </h1>
            <p className="text-sm text-white/40 mt-0.5">Sua conta {activeAccount === "demo" ? "Demo" : "Real"} está ativa</p>
          </div>
          <div className="flex gap-2">
            {user?.isAdmin && (
              <Link href="/admin">
                <Button className="gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30" variant="ghost">
                  🔐 Admin
                </Button>
              </Link>
            )}
            <Button
              onClick={handleLogout}
              className="gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
              variant="ghost"
            >
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>

        {/* Account Selector */}
        <div className="flex gap-2">
          {["demo", "real"].map((acc) => (
            <button
              key={acc}
              onClick={() => setActiveAccount(acc as "demo" | "real")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                activeAccount === acc
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-white/40 hover:text-white/70 border border-white/10"
              )}
            >
              {acc === "demo" ? "📚 Conta Demo" : "💰 Conta Real"}
            </button>
          ))}
        </div>

        {/* Saldos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Saldo Disponível */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/50 uppercase">Saldo Disponível</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/40 hover:text-white/70"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-2xl font-bold text-white font-mono">
              {showBalance ? `R$ ${(balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "••••••"}
            </p>
            <p className="text-xs text-white/40 mt-1">Conta {activeAccount}</p>
          </div>

          {/* P&L Total */}
          <div className="glass-card rounded-2xl p-5">
            <span className="text-xs font-semibold text-white/50 uppercase">P&L Total</span>
            <p className={cn("text-2xl font-bold font-mono mt-2", pnl.total >= 0 ? "text-green-400" : "text-red-400")}>
              {(pnl?.total || 0) >= 0 ? "+" : ""}{(pnl?.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className={cn("text-xs mt-1", pnl.percent >= 0 ? "text-green-400/60" : "text-red-400/60")}>
              {pnl.percent >= 0 ? "+" : ""}{pnl.percent.toFixed(2)}%
            </p>
          </div>

          {/* Posições Abertas */}
          <div className="glass-card rounded-2xl p-5">
            <span className="text-xs font-semibold text-white/50 uppercase">Posições Abertas</span>
            <p className="text-2xl font-bold text-white font-mono mt-2">{account.positions.length}</p>
            <p className="text-xs text-white/40 mt-1">
              {account.positions.length === 0 ? "Nenhuma operação" : account.positions.length + " ativa(s)"}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                {asset.symbol}
              </h2>
              <p className="text-xs text-white/40">{asset.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white font-mono">R$ {currentPrice.toFixed(2)}</p>
              <p className={cn("text-sm font-semibold flex items-center justify-end gap-1", isPositive ? "text-green-400" : "text-red-400")}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
              </p>
            </div>
          </div>

          <ExtraordinaryChart
            data={chartData}
            currentPrice={currentPrice}
            assetColor={asset.color}
            assetSymbol={asset.symbol}
            isPositive={isPositive}
            priceChange={priceChange}
          />

          <div className="flex gap-3 mt-4">
            <Link href="/trade" className="flex-1">
              <Button className="w-full gap-2 font-semibold" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", cursor: "pointer" }}>
                <TrendingUp className="w-4 h-4" />
                Operar
              </Button>
            </Link>
            <Link href="/deposit" className="flex-1">
              <Button variant="outline" className="w-full gap-2 font-semibold border-white/10 text-white hover:bg-white/5" style={{ cursor: "pointer" }}>
                <Plus className="w-4 h-4" />
                Depositar
              </Button>
            </Link>
          </div>
        </div>

        {/* Posições Abertas */}
        {account.positions.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: "Sora, sans-serif" }}>
              Posições Abertas ({account.positions.length})
            </h3>
            <div className="space-y-2">
              {account.positions.map((pos) => (
                <div key={pos.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/3 transition-all" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", pos.type === "call" ? "bg-green-500/20" : "bg-red-500/20")}>
                    {pos.type === "call" ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{pos.asset}</p>
                    <p className="text-xs text-white/40">R$ {pos.betAmount.toFixed(2)} @ R$ {pos.entryPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico */}
        {account.closedPositions.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: "Sora, sans-serif" }}>
              Histórico ({account.closedPositions.length})
            </h3>
            <div className="space-y-2">
              {account.closedPositions.slice(-5).map((pos) => (
                <div key={pos.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <CheckCircle2 className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{pos.asset} - {pos.type === "call" ? "CALL" : "PUT"}</p>
                    <p className="text-xs text-white/40">R$ {pos.entryPrice.toFixed(2)} → R$ {pos.exitPrice?.toFixed(2)}</p>
                  </div>
                  <p className={cn("text-sm font-bold", pos.result === "win" ? "text-green-400" : "text-red-400")}>
                    {pos.result === "win" ? "✅" : "❌"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
