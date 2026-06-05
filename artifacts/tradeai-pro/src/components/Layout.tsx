/**
 * Layout principal — Dark Glass Luxury
 * Sidebar esquerda fixa, navbar superior, área de conteúdo principal
 * Cores: fundo #0D1117, glass cards, acentos azul/ciano
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTrading } from "@/contexts/TradingContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Zap,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: TrendingUp, label: "Operar", path: "/trade" },
  { icon: Wallet, label: "Depósito", path: "/deposit" },
  { icon: Wallet, label: "Sacar", path: "/withdrawal" },
  { icon: BarChart2, label: "Histórico", path: "/history" },
  { icon: FileText, label: "Termos", path: "/terms" },
];

interface DepositNotif {
  id: string;
  method: string;
  amount: number;
  totalAmount: number;
  status: string;
  timestamp: string;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, getAccountBalance, activeAccount } = useTrading();
  const { user: authUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [deposits, setDeposits] = useState<DepositNotif[]>([]);

  useEffect(() => {
    const email = authUser?.email || user?.email;
    if (!email) return;
    const fetchDeposits = () => {
      fetch(`/api/deposits/user/${encodeURIComponent(email)}`)
        .then((r) => r.ok ? r.json() : { deposits: [] })
        .then((data) => setDeposits((data.deposits || []).slice(0, 5)))
        .catch(() => {});
    };
    fetchDeposits();
    const interval = setInterval(fetchDeposits, 5000);
    return () => clearInterval(interval);
  }, [authUser?.email, user?.email]);

  const balance = getAccountBalance(activeAccount);
  const userInitials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "JD";

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0D1117 0%, #0F1629 50%, #0D1117 100%)" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "rgba(13, 17, 23, 0.95)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
              TradeAI
            </span>
            <span className="text-xs text-blue-400 block -mt-1">Pro</span>
          </div>
          <button
            className="ml-auto lg:hidden text-white/50 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: activeAccount === "real" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #6366f1, #3b82f6)" }}
            >
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || "Trader"}</p>
              <p className={`text-xs truncate font-semibold ${activeAccount === "real" ? "text-green-400" : "text-blue-400"}`}>
                Conta {activeAccount === "real" ? "Real" : "Demo"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-white/30" />
          </div>
        </div>

        {/* Balance */}
        <div className="px-4 py-3 border-b border-white/5 space-y-2">
          {/* Saldo Atual */}
          <div className="rounded-xl p-3" style={{ background: activeAccount === "real" ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))" : "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.1))", border: activeAccount === "real" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(59,130,246,0.2)" }}>
            <p className={`text-xs mb-1 ${activeAccount === "real" ? "text-green-400/70" : "text-blue-400/70"}`}>Saldo {activeAccount === "real" ? "Real" : "Demo"}</p>
            <p className="text-xl font-bold text-white" style={{ fontFamily: "IBM Plex Mono, monospace" }}>
              R$ {(balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          {/* Bônus Info */}
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="text-xs text-white/50 mb-1">Bônus Disponível</p>
            <p className="text-lg font-bold text-green-400" style={{ fontFamily: "IBM Plex Mono, monospace" }}>
              Até R$ 4.000
            </p>
            <p className="text-xs text-green-400/60 mt-1">Depósito dobrado automaticamente</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path.split("?")[0]);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1))",
                          border: "1px solid rgba(59,130,246,0.25)",
                        }
                      : {}
                  }
                >
                  <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/70")} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5 space-y-1">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut className="w-4.5 h-4.5" />
              <span className="text-sm">Sair</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6 h-16"
          style={{
            background: "rgba(13, 17, 23, 0.8)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-xs text-white/50 hidden sm:block">Mercado Ao Vivo</span>
          </div>

          {/* Market tickers */}
          <div className="hidden md:flex items-center gap-4 ml-2">
            {[
              { name: "PETR4", price: "38.42", change: "+1.24%" },
              { name: "VALE3", price: "61.80", change: "-0.83%" },
              { name: "BTC/USD", price: "67,420", change: "+2.15%" },
            ].map((ticker) => (
              <div key={ticker.name} className="flex items-center gap-1.5 text-xs">
                <span className="text-white/40">{ticker.name}</span>
                <span className="text-white font-mono">{ticker.price}</span>
                <span className={ticker.change.startsWith("+") ? "text-green-400" : "text-red-400"}>
                  {ticker.change}
                </span>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white/60 hover:text-white hover:bg-white/5"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
              </Button>
              {notifOpen && (
                <div
                  className="absolute right-0 top-12 w-72 rounded-xl p-4 z-50"
                  style={{
                    background: "rgba(15, 22, 41, 0.98)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <p className="text-sm font-semibold text-white mb-3">Notificações</p>
                  {deposits.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-2">Nenhuma notificação</p>
                  ) : (
                    deposits.map((d) => {
                      const statusColor = d.status === "approved" ? "bg-green-400" : d.status === "rejected" ? "bg-red-400" : "bg-yellow-400";
                      const statusLabel = d.status === "approved" ? "aprovado" : d.status === "rejected" ? "rejeitado" : "em análise";
                      const methodLabel = d.method === "pix" ? "PIX" : d.method === "card" ? "Cartão" : "TED";
                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(d.timestamp).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return "agora";
                        if (mins < 60) return `${mins} min`;
                        return `${Math.floor(mins / 60)}h`;
                      })();
                      return (
                        <div key={d.id} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
                          <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", statusColor)} />
                          <div>
                            <p className="text-xs text-white/80">
                              Depósito {methodLabel} de <strong>R$ {d.totalAmount?.toFixed(2)}</strong> — {statusLabel}
                            </p>
                            <p className="text-xs text-white/30 mt-0.5">{timeAgo} atrás</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Deposit CTA */}
            <Link href="/deposit">
              <Button
                size="sm"
                className="text-xs font-semibold"
                style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none" }}
              >
                + Depositar
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
