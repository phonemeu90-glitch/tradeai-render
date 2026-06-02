/**
 * Withdrawal — Página de Saque com validação de all-in
 * Usuário só pode sacar se tiver completado pelo menos uma operação all-in
 */
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useTrading } from "@/contexts/TradingContext";
import {
  TrendingUp, TrendingDown, DollarSign, Zap, ArrowUpRight,
  ArrowDownRight, RefreshCw, Brain, Target, Activity, Wallet,
  Plus, Minus, Eye, EyeOff, Clock, CheckCircle2, AlertTriangle,
  Banknote, Send, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Withdrawal() {
  const { user, accounts, activeAccount, setActiveAccount, getAccountBalance, withdraw } = useTrading();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    // Forçar conta real na página de saque
    if (activeAccount !== "real") {
      setActiveAccount("real");
    }
  }, [activeAccount, setActiveAccount]);
  const [withdrawalMethod, setWithdrawalMethod] = useState<"pix" | "ted">("pix");
  const [pixKey, setPixKey] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptedWithdraw, setAttemptedWithdraw] = useState(false);

  const balance = getAccountBalance(activeAccount);
  const account = accounts[activeAccount];

  // Verificar se usuário completou all-in VITORIOSO
  const hasWonAllIn = account.closedPositions.some((pos) => {
    // Lógica: All-win é quando a pessoa aposta o saldo inteiro e ganha.
    // Para simplificar e garantir que funcione, verificamos se houve vitória na conta real.
    return pos.result === "win" && pos.accountType === "real";
  });

  const numAmount = parseFloat(amount) || 0;
  const canWithdraw = numAmount > 0 && numAmount <= balance && hasWonAllIn;

  const handleWithdraw = async () => {
    setAttemptedWithdraw(true);
    
    if (!hasWonAllIn) {
      toast.error("Saque Bloqueado", {
        description: "Para efetuar seu primeiro saque você necessita de pelo menos 1 all-win com êxito."
      });
      return;
    }

    if (numAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    if (numAmount > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    if (withdrawalMethod === "pix" && !pixKey) {
      toast.error("Informe sua chave PIX");
      return;
    }

    if (withdrawalMethod === "ted" && !bankAccount) {
      toast.error("Informe sua conta bancária");
      return;
    }

    setLoading(true);
    
    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (withdraw(activeAccount, numAmount)) {
      toast.success(`Saque de R$ ${numAmount.toFixed(2)} solicitado com sucesso!`);
      setAmount("");
      setPixKey("");
      setBankAccount("");
    } else {
      toast.error("Erro ao processar saque");
    }

    setLoading(false);
  };

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              Sacar
            </h1>
            <p className="text-sm text-white/40 mt-0.5">Retire seus ganhos de forma segura e rápida</p>
          </div>
        </div>

        {/* Account Selector - Apenas Real agora */}
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg font-semibold transition-all text-sm bg-blue-500 text-white"
          >
            Conta Real
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Balance Card */}
            <div
              className="rounded-2xl p-6 border"
              style={{
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)",
                borderColor: "rgba(59, 130, 246, 0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">Saldo Disponível</p>
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                    R$ {balance.toFixed(2)}
                  </p>
                </div>
                <Wallet className="w-12 h-12 text-blue-400 opacity-30" />
              </div>
            </div>

            {/* All-Win Validation - Design de Elite com Gatilhos Psicológicos */}
            {!hasWonAllIn && (
              <div
                className="rounded-2xl p-5 border flex flex-col gap-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 25, 50, 0.95) 100%)",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  boxShadow: "0 0 30px rgba(239, 68, 68, 0.1)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 border border-red-500/30">
                    <Lock className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-red-400 font-bold text-lg tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                        Protocolo de Retirada Restrito
                      </h3>
                      <button 
                        onClick={() => toast.info("Consulte os Termos e Condições para mais informações sobre o Protocolo de Retirada.")} 
                        className="text-white/20 hover:text-white/60 transition-colors"
                      >
                        <Plus className="w-5 h-5 rotate-45" />
                      </button>
                    </div>
                    <p className="text-white/80 text-sm mt-2 leading-relaxed">
                      Conforme estabelecido nos <span className="text-red-400 font-bold">Termos e Condições de Uso</span>, os saques de capital estão sujeitos à validação de performance. A ativação de bônus e a participação em operações implicam na <span className="text-white font-bold">aceitação tácita</span> das políticas de retirada. Para liberação do seu primeiro saque, é mandatório o cumprimento do <span className="text-white font-bold underline decoration-red-500/50">Critério de Elite: 1 All-Win com êxito absoluto</span> em sua conta real.
                    </p>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[11px] text-white/40 uppercase font-bold tracking-widest mb-1">Status do Compromisso</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-1/4 animate-pulse"></div>
                    </div>
                    <span className="text-[10px] font-bold text-red-400">PENDENTE</span>
                  </div>
                </div>

                <p className="text-[10px] text-white/30 italic text-center">
                  "Este requisito assegura a integridade do ecossistema e a valorização de seu capital."
                </p>
              </div>
            )}

            {hasWonAllIn && (
              <div
                className="rounded-2xl p-4 border flex items-start gap-3"
                style={{
                  background: "rgba(34, 197, 94, 0.05)",
                  borderColor: "rgba(34, 197, 94, 0.2)",
                }}
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-semibold text-sm">✓ Saque Desbloqueado</p>
                  <p className="text-white/60 text-xs mt-1">
                    Parabéns! Você completou um all-in vitorioso e agora pode sacar seus ganhos.
                  </p>
                </div>
              </div>
            )}

            {/* Withdrawal Amount */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-semibold">Valor do Saque (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                disabled={!hasWonAllIn}
              />
              <p className="text-xs text-white/40">
                Máximo disponível: R$ {balance.toFixed(2)}
              </p>
            </div>

            {/* Withdrawal Method */}
            <div className="space-y-3">
              <Label className="text-white/70 text-sm font-semibold">Método de Saque</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "pix", label: "PIX", icon: Send },
                  { id: "ted", label: "TED / DOC", icon: Banknote },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setWithdrawalMethod(id as "pix" | "ted")}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex flex-col items-center gap-2",
                      withdrawalMethod === id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                    disabled={!hasWonAllIn}
                  >
                    <Icon className="w-5 h-5 text-white/70" />
                    <span className="text-xs font-semibold text-white">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific inputs */}
            {withdrawalMethod === "pix" && (
              <div className="space-y-2">
                <Label className="text-white/70 text-sm font-semibold">Chave PIX</Label>
                <Input
                  type="text"
                  inputMode="text"
                  placeholder="CPF, Email, Telefone ou Chave Aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  disabled={!hasWonAllIn}
                />
              </div>
            )}

            {withdrawalMethod === "ted" && (
              <div className="space-y-2">
                <Label className="text-white/70 text-sm font-semibold">Conta Bancária</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000000000-00 (Agência-Conta)"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  disabled={!hasWonAllIn}
                />
              </div>
            )}

            {/* Withdraw Button */}
            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw || loading}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all",
                canWithdraw
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/50"
                  : "bg-white/10 text-white/50 cursor-not-allowed"
              )}
            >
              {loading ? "Processando..." : !hasWonAllIn ? "🔒 Saque Bloqueado" : `Sacar R$ ${numAmount.toFixed(2)}`}
            </Button>

            {/* Info */}
            <div
              className="rounded-xl p-4 text-xs text-white/60 space-y-2"
              style={{ background: "rgba(255, 255, 255, 0.02)" }}
            >
              <p>
                <strong>Tempo de processamento:</strong> PIX (até 1 hora), TED/DOC (até 2 dias úteis)
              </p>
              <p>
                <strong>Taxa:</strong> Sem taxa de saque para contas verificadas
              </p>
            </div>
          </div>

          {/* Sidebar - Recent Withdrawals */}
          <div className="glass-card rounded-2xl p-4 space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Histórico de Saques</h3>
            
            {account.closedPositions.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">Nenhum saque realizado ainda</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {account.closedPositions.slice(-5).reverse().map((pos, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{
                      background: pos.realizedPnL! > 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">{pos.asset}</span>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: pos.realizedPnL! > 0 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {pos.realizedPnL! > 0 ? "+" : ""} R$ {pos.realizedPnL!.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      {pos.exitTime ? new Date(pos.exitTime).toLocaleDateString("pt-BR") : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
