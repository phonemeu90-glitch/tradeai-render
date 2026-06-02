/**
 * History — Histórico de Transações do Usuário
 * Exibe todas as operações de trade realizadas
 */
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  TrendingUp, TrendingDown, Clock, Calendar, 
  ArrowUpRight, ArrowDownRight, Activity, Search,
  Filter, Download, ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "call" | "put";
  accountType: "demo" | "real";
  asset: string;
  betAmount: number;
  entryPrice: number;
  exitPrice: number;
  result: "win" | "loss";
  payout: number;
  createdAt: string;
}

export default function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/users/${user.id}/transactions`)
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data.transactions || []);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Erro ao carregar histórico:", err);
          setIsLoading(false);
        });
    }
  }, [user?.id]);

  const filteredTransactions = transactions
    .filter((tx) => {
      const matchesSearch = tx.asset.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === "all" || tx.result === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              Histórico de Operações
            </h1>
            <p className="text-sm text-white/40 mt-1">Acompanhe seu desempenho e transações passadas</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar ativo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-10"
              />
            </div>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 h-10">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            onClick={() => setFilter("all")}
            variant={filter === "all" ? "default" : "outline"}
            className={cn(
              "rounded-full px-6 h-9 text-xs font-semibold transition-all",
              filter === "all" ? "bg-blue-500 text-white" : "border-white/10 text-white/60 hover:text-white"
            )}
          >
            Todos
          </Button>
          <Button
            onClick={() => setFilter("win")}
            variant={filter === "win" ? "default" : "outline"}
            className={cn(
              "rounded-full px-6 h-9 text-xs font-semibold transition-all",
              filter === "win" ? "bg-green-500 text-white" : "border-white/10 text-white/60 hover:text-white"
            )}
          >
            Vitórias
          </Button>
          <Button
            onClick={() => setFilter("loss")}
            variant={filter === "loss" ? "default" : "outline"}
            className={cn(
              "rounded-full px-6 h-9 text-xs font-semibold transition-all",
              filter === "loss" ? "bg-red-500 text-white" : "border-white/10 text-white/60 hover:text-white"
            )}
          >
            Derrotas
          </Button>
        </div>

        {/* Transactions List */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Ativo / Tipo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Data / Hora</th>
                  <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Investimento</th>
                  <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Preço Entrada/Saída</th>
                  <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Resultado</th>
                  <th className="py-4 px-6 text-xs font-semibold text-white/40 uppercase tracking-wider">Lucro/Perda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Activity className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                      <p className="text-white/40 text-sm">Carregando transações...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/60 font-semibold">Nenhuma transação encontrada</p>
                      <p className="text-white/30 text-sm mt-1">Comece a operar para ver seu histórico aqui.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            tx.type === "call" ? "bg-green-500/10" : "bg-red-500/10"
                          )}>
                            {tx.type === "call" ? (
                              <TrendingUp className={cn("w-5 h-5", tx.type === "call" ? "text-green-400" : "text-red-400")} />
                            ) : (
                              <TrendingDown className={cn("w-5 h-5", tx.type === "call" ? "text-green-400" : "text-red-400")} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{tx.asset}</p>
                            <p className="text-[10px] text-white/40 uppercase font-semibold tracking-wider">
                              {tx.type === "call" ? "Compra (Call)" : "Venda (Put)"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80">
                            {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-xs text-white/30">
                            {new Date(tx.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-white">
                          R$ {tx.betAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <Badge variant="outline" className="ml-2 text-[10px] border-white/10 text-white/40">
                          {tx.accountType}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-white/40">{tx.entryPrice.toFixed(2)}</span>
                          <ChevronRight className="w-3 h-3 text-white/20" />
                          <span className="text-white">{tx.exitPrice.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          tx.result === "win" ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-red-500/20 text-red-400 border-red-500/20"
                        )}>
                          {tx.result === "win" ? "Vitória" : "Derrota"}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-sm font-bold font-mono",
                            tx.result === "win" ? "text-green-400" : "text-red-400"
                          )}>
                            {tx.result === "win" ? "+" : "-"} R$ {Math.abs(tx.result === "win" ? tx.payout - tx.betAmount : tx.betAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-white/20">
                            {tx.result === "win" ? "90% Payout" : "100% Perda"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        {!isLoading && transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <p className="text-xs font-semibold text-white/40 uppercase mb-2">Total Operado</p>
              <p className="text-2xl font-bold text-white font-mono">
                R$ {transactions.reduce((sum, tx) => sum + tx.betAmount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <p className="text-xs font-semibold text-white/40 uppercase mb-2">Taxa de Acerto</p>
              <p className="text-2xl font-bold text-green-400 font-mono">
                {((transactions.filter(tx => tx.result === "win").length / transactions.length) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <p className="text-xs font-semibold text-white/40 uppercase mb-2">Resultado Líquido</p>
              {(() => {
                const totalPnL = transactions.reduce((sum, tx) => {
                  return sum + (tx.result === "win" ? tx.payout - tx.betAmount : -tx.betAmount);
                }, 0);
                return (
                  <p className={cn("text-2xl font-bold font-mono", totalPnL >= 0 ? "text-green-400" : "text-red-400")}>
                    {totalPnL >= 0 ? "+" : "-"} R$ {Math.abs(totalPnL).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
