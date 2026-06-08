/**
 * AdminDashboard — Painel de Administração Premium
 * Gerenciamento de usuários, contas e métricas em tempo real
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  Users, TrendingUp, TrendingDown, DollarSign, Activity,
  Settings, LogOut, Search, Trash2, Edit, Eye, EyeOff, BarChart3, Banknote
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  totalDemoPnL: number;
  totalRealPnL: number;
  totalDemoBalance: number;
  totalRealBalance: number;
}

export default function AdminDashboard() {
  const { user, logout, getAllUsers } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalDemoPnL: 0,
    totalRealPnL: 0,
    totalDemoBalance: 0,
    totalRealBalance: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!user?.isAdmin) {
      setLocation("/");
      return;
    }

    const allUsers = getAllUsers();
    setUsers(allUsers);

    // Calcular estatísticas
    const newStats: UserStats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u: any) => u.lastLogin).length,
      totalDemoPnL: allUsers.reduce((sum: number, u: any) => sum + (u.demoPnL || 0), 0),
      totalRealPnL: allUsers.reduce((sum: number, u: any) => sum + (u.realPnL || 0), 0),
      totalDemoBalance: allUsers.reduce((sum: number, u: any) => sum + (u.demoBalance || 0), 0),
      totalRealBalance: allUsers.reduce((sum: number, u: any) => sum + (u.realBalance || 0), 0),
    };
    setStats(newStats);
  }, [user, getAllUsers, setLocation]);

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    setLocation("/auth");
    toast.success("Deslogado com sucesso");
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Tem certeza que deseja deletar este usuário?")) {
      const updatedUsers = users.filter((u) => u.id !== userId);
      localStorage.setItem("tradeai_users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      toast.success("Usuário deletado");
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              🔐 Painel de Administração
            </h1>
            <p className="text-sm text-white/40 mt-1">Bem-vindo, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/saque">
              <Button
                className="gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                variant="ghost"
              >
                <Banknote className="w-4 h-4" /> Saque Admin
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              className="gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
              variant="ghost"
            >
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total de Usuários */}
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase">Total de Usuários</span>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-xs text-blue-400">
              {stats.activeUsers} ativos hoje
            </p>
          </div>

          {/* Demo P&L Total */}
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase">Demo P&L Total</span>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stats.totalDemoPnL >= 0 ? "bg-green-500/20" : "bg-red-500/20")}>
                {stats.totalDemoPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
              </div>
            </div>
                    <p className={cn("text-3xl font-bold", (stats.totalDemoPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                      {(stats.totalDemoPnL || 0) >= 0 ? "+" : ""}R$ {(stats.totalDemoPnL || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-white/40">Saldo total: R$ {(stats.totalDemoBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Real P&L Total */}
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase">Real P&L Total</span>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stats.totalRealPnL >= 0 ? "bg-green-500/20" : "bg-red-500/20")}>
                {stats.totalRealPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
              </div>
            </div>
                    <p className={cn("text-3xl font-bold", (stats.totalRealPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                      {(stats.totalRealPnL || 0) >= 0 ? "+" : ""}R$ {(stats.totalRealPnL || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-white/40">Saldo total: R$ {(stats.totalRealBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Gerenciamento de Usuários */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              👥 Gerenciamento de Usuários
            </h2>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{filteredUsers.length} usuários</Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Tabela de Usuários */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Nome</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Saldo Demo</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Saldo Real</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Demo P&L</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Real P&L</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">Último Acesso</th>
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
                              <span className="text-white font-mono">R$ {(u.realBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={cn("font-mono", (u.demoPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                                {(u.demoPnL || 0) >= 0 ? "+" : ""}R$ {(u.demoPnL || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={cn("font-mono", (u.realPnL || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                                {(u.realPnL || 0) >= 0 ? "+" : ""}R$ {(u.realPnL || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                    <td className="py-3 px-4 text-white/40 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("pt-BR") : "Nunca"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
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

        {/* Info Box */}
        <div className="glass-card rounded-2xl p-6 bg-blue-500/10 border border-blue-500/20">
          <div className="flex gap-4">
            <Activity className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold mb-1">Sistema em Tempo Real</h3>
              <p className="text-white/60 text-sm">
                Este painel atualiza automaticamente os dados de todos os usuários. Os saldos e P&L são sincronizados em tempo real conforme as operações são executadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
