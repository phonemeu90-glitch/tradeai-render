/**
 * Dashboard — Painel do Usuário com Animação de Trade
 */
import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import DepositNotification from "@/components/DepositNotification";
import { useTrading } from "@/contexts/TradingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, Plus, Eye, EyeOff, CheckCircle2, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Animação de Trade ────────────────────────────────────────────────────────
function TradeAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pricesRef = useRef<number[]>([]);
  const frameRef = useRef<number>(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TICKERS = [
    { symbol: "EUR/USD OTC", price: 1.0850, color: "#3b82f6" },
    { symbol: "BTC/USD OTC", price: 67420, color: "#f59e0b" },
    { symbol: "GOLD OTC",    price: 2385.5, color: "#eab308" },
    { symbol: "PETR4 OTC",   price: 38.42,  color: "#22c55e" },
    { symbol: "ETH/USD OTC", price: 3248.5, color: "#8b5cf6" },
  ];
  const [tickIdx, setTickIdx] = useState(0);
  const [livePrice, setLivePrice] = useState(TICKERS[0].price);
  const [dir, setDir] = useState<"up" | "down">("up");

  useEffect(() => {
    const t = setInterval(() => {
      setTickIdx((i) => (i + 1) % TICKERS.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setLivePrice(TICKERS[tickIdx].price);
    pricesRef.current = [];
  }, [tickIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const color = TICKERS[tickIdx].color;

    if (pricesRef.current.length === 0) {
      let p = TICKERS[tickIdx].price;
      for (let i = 0; i < 80; i++) {
        p = p + (Math.random() - 0.48) * p * 0.003;
        pricesRef.current.push(p);
      }
    }

    const draw = () => {
      const last = pricesRef.current[pricesRef.current.length - 1];
      const change = (Math.random() - 0.48) * last * 0.003;
      const next = last + change;
      pricesRef.current.push(next);
      if (pricesRef.current.length > 100) pricesRef.current.shift();

      setLivePrice(parseFloat(next.toFixed(next > 100 ? 2 : 4)));
      setDir(next >= last ? "up" : "down");

      ctx.clearRect(0, 0, W, H);

      const pts = pricesRef.current;
      const min = Math.min(...pts);
      const max = Math.max(...pts);
      const range = max - min || 1;
      const pad = 16;

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, color + "40");
      grad.addColorStop(1, color + "00");

      ctx.beginPath();
      pts.forEach((v, i) => {
        const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
        const y = H - pad - ((v - min) / range) * (H - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      const lastX = pad + ((pts.length - 1) / (pts.length - 1)) * (W - pad * 2);
      const lastY = H - pad - ((pts[pts.length - 1] - min) / range) * (H - pad * 2);
      ctx.lineTo(lastX, H - pad);
      ctx.lineTo(pad, H - pad);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      pts.forEach((v, i) => {
        const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
        const y = H - pad - ((v - min) / range) * (H - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
      ctx.fillStyle = color + "33";
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [tickIdx]);

  const ticker = TICKERS[tickIdx];

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: ticker.color }} />
          <span className="text-sm font-bold text-white">{ticker.symbol}</span>
          <span className="text-[10px] text-white/30 uppercase tracking-widest">AO VIVO</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold font-mono"
            style={{ color: ticker.color }}
          >
            {livePrice > 100
              ? livePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
              : livePrice.toFixed(4)}
          </span>
          <span className={cn("text-xs font-bold flex items-center gap-0.5", dir === "up" ? "text-green-400" : "text-red-400")}>
            {dir === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={140}
        className="w-full"
        style={{ display: "block" }}
      />

      <div className="px-5 pb-4 pt-2 flex gap-2 overflow-x-auto scrollbar-none">
        {TICKERS.map((t, i) => (
          <button
            key={t.symbol}
            onClick={() => setTickIdx(i)}
            className={cn(
              "flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border",
              tickIdx === i
                ? "text-white border-transparent"
                : "text-white/40 border-white/[0.07] hover:text-white/70"
            )}
            style={tickIdx === i ? { background: t.color + "22", borderColor: t.color + "55", color: t.color } : {}}
          >
            {t.symbol.replace(" OTC", "")}
          </button>
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 80% 50%, " + ticker.color + "08 0%, transparent 70%)"
      }} />
    </div>
  );
}

// ── Dashboard Principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout, updatePnL } = useAuth();
  const { accounts, activeAccount, setActiveAccount, getAccountPnL, syncBalance } = useTrading();
  const [, setLocation] = useLocation();
  const [showBalance, setShowBalance] = useState(true);
  const [depositNotification, setDepositNotification] = useState<any>(null);
  const [rejectedNotifications, setRejectedNotifications] = useState<Map<string, any>>(new Map());

  const { refreshUser } = useAuth();

  useEffect(() => {
    if (user) refreshUser();
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/deposits/pending/${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((deposits) => {
          if (deposits && deposits.length > 0) {
            const deposit = deposits[0];
            setDepositNotification({
              id: deposit.id,
              type: "pending",
              message: `Deposito de R$ ${deposit.totalAmount.toFixed(2)} em analise`,
              timestamp: new Date(deposit.timestamp).getTime(),
              userEmail: user.email,
            });
          } else {
            setDepositNotification(null);
          }
        })
        .catch(() => {});
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const interval = setInterval(() => {
      fetch(`/api/deposits/user/${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((allDeposits) => {
          const pending = allDeposits.find((d: any) => d.status === "pending");
          if (pending) {
            setDepositNotification({
              id: pending.id,
              type: "pending",
              message: `Deposito de R$ ${pending.totalAmount.toFixed(2)} em analise`,
              timestamp: new Date(pending.timestamp).getTime(),
              userEmail: user.email,
            });
          } else {
            setDepositNotification(null);
          }
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
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      const authBalance = activeAccount === "demo" ? user.demoBalance : user.realBalance;
      const account = accounts[activeAccount];
      if (account && authBalance !== account.balance) {
        syncBalance(activeAccount, authBalance);
        if (depositNotification?.type === "pending") {
          localStorage.removeItem(`deposit_notification_${user.email}`);
          setDepositNotification(null);
        }
      }
    }
  }, [user, activeAccount, accounts, syncBalance, depositNotification?.type, user?.email]);

  const account = accounts[activeAccount] || accounts.demo;
  const pnl = getAccountPnL(activeAccount) || { total: 0, percent: 0 };

  useEffect(() => {
    if (user) updatePnL(activeAccount, pnl.total);
  }, [pnl.total, activeAccount, user]);

  const balance = activeAccount === "demo" ? user?.demoBalance || 0 : user?.realBalance || 0;

  const handleLogout = () => {
    logout();
    setLocation("/auth");
    toast.success("Deslogado com sucesso");
  };

  const handleDemoReset = async () => {
    if (!user) return;
    try {
      await Promise.all([
        fetch(`/api/users/${user.id}/balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "demo", amount: 10000 }),
        }),
        fetch(`/api/users/${user.id}/pnl`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "demo", amount: 0 }),
        }),
      ]);
      syncBalance("demo", 10000);
      refreshUser();
      toast.success("+R$ 10.000,00 adicionados à conta demo!");
    } catch {
      toast.error("Erro ao renovar conta demo");
    }
  };

  const handleDismissNotification = (id: string) => {
    const newRejectedMap = new Map(rejectedNotifications);
    newRejectedMap.delete(id);
    setRejectedNotifications(newRejectedMap);
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
      <DepositNotification
        notification={depositNotification}
        currentUserEmail={user?.email}
        onDismiss={handleDismissNotification}
      />
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
        <div className="flex gap-2 flex-wrap items-center">
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
          {activeAccount === "demo" && (
            <button
              onClick={handleDemoReset}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 transition-all"
              title="Renovar saldo da conta demo para R$ 1.000,00"
            >
              🔄 Renovar Demo
            </button>
          )}
        </div>

        {/* Saldos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/50 uppercase">Saldo Disponível</span>
              <button onClick={() => setShowBalance(!showBalance)} className="text-white/40 hover:text-white/70">
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-2xl font-bold text-white font-mono">
              {showBalance ? `R$ ${(balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "••••••"}
            </p>
            <p className="text-xs text-white/40 mt-1">Conta {activeAccount}</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <span className="text-xs font-semibold text-white/50 uppercase">P&L Total</span>
            <p className={cn("text-2xl font-bold font-mono mt-2", pnl.total >= 0 ? "text-green-400" : "text-red-400")}>
              {pnl.total >= 0 ? "+" : ""}{pnl.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className={cn("text-xs mt-1", pnl.percent >= 0 ? "text-green-400/60" : "text-red-400/60")}>
              {pnl.percent >= 0 ? "+" : ""}{pnl.percent.toFixed(2)}%
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <span className="text-xs font-semibold text-white/50 uppercase">Posições Abertas</span>
            <p className="text-2xl font-bold text-white font-mono mt-2">{account.positions.length}</p>
            <p className="text-xs text-white/40 mt-1">
              {account.positions.length === 0 ? "Nenhuma operação" : account.positions.length + " ativa(s)"}
            </p>
          </div>
        </div>

        {/* Animação de Trade ao vivo */}
        <TradeAnimation />

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Link href="/trade" className="flex-1">
            <Button className="w-full gap-2 font-semibold" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", cursor: "pointer" }}>
              <TrendingUp className="w-4 h-4" />
              Operar Agora
            </Button>
          </Link>
          <Link href="/deposit" className="flex-1">
            <Button variant="outline" className="w-full gap-2 font-semibold border-white/10 text-white hover:bg-white/5" style={{ cursor: "pointer" }}>
              <Plus className="w-4 h-4" />
              Depositar
            </Button>
          </Link>
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
