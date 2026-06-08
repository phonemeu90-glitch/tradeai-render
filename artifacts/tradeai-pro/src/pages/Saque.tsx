/**
 * Saque — Página de Saque Admin (sem bloqueio)
 * Acesso exclusivo via painel de administração
 */
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useTrading } from "@/contexts/TradingContext";
import {
  Wallet, Send, Banknote, CheckCircle2, Clock, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Stage = "form" | "processing" | "success";

export default function Saque() {
  const { accounts, activeAccount, setActiveAccount, getAccountBalance, withdraw } = useTrading();
  const [amount, setAmount] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState<"pix" | "ted">("pix");
  const [pixKey, setPixKey] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [countdown, setCountdown] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  useEffect(() => {
    if (activeAccount !== "real") {
      setActiveAccount("real");
    }
  }, [activeAccount, setActiveAccount]);

  const balance = getAccountBalance(activeAccount);
  const numAmount = parseFloat(amount) || 0;
  const canWithdraw = numAmount > 0 && numAmount <= balance;

  // Countdown timer após sucesso
  useEffect(() => {
    if (stage !== "success") return;
    const minutes = withdrawalMethod === "pix" ? 15 : 120;
    setCountdown(minutes * 60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, withdrawalMethod]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleWithdraw = async () => {
    if (numAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (numAmount > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (withdrawalMethod === "pix" && !pixKey.trim()) {
      toast.error("Informe sua chave PIX");
      return;
    }
    if (withdrawalMethod === "ted" && !bankAccount.trim()) {
      toast.error("Informe sua conta bancária");
      return;
    }

    setFinalAmount(numAmount);
    setStage("processing");

    await new Promise((resolve) => setTimeout(resolve, 3500));

    withdraw(activeAccount, numAmount);
    setStage("success");
  };

  // ──────────────────────────────────────────
  // TELA DE PROCESSANDO
  // ──────────────────────────────────────────
  if (stage === "processing") {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm">
            {/* Spinner animado */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Send className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                Processando Saque
              </h2>
              <p className="text-white/50 text-sm mt-2">
                Aguarde enquanto validamos sua solicitação...
              </p>
            </div>

            {/* Barra de progresso animada */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full animate-pulse"
                style={{ width: "70%" }}
              />
            </div>

            <div className="text-xs text-white/30 space-y-1">
              <p>✓ Autenticando credenciais</p>
              <p>✓ Verificando saldo disponível</p>
              <p className="animate-pulse text-blue-400">⟳ Processando transação PIX...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ──────────────────────────────────────────
  // TELA DE SUCESSO
  // ──────────────────────────────────────────
  if (stage === "success") {
    const isPix = withdrawalMethod === "pix";
    const etaLabel = isPix ? "até 15 minutos" : "até 2 dias úteis";

    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">

            {/* Ícone de sucesso com pulso */}
            <div className="text-center">
              <div className="relative mx-auto w-28 h-28">
                <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-400" />
                </div>
              </div>
            </div>

            {/* Card principal */}
            <div
              className="rounded-2xl p-6 border text-center space-y-4"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(15,25,50,0.95) 100%)",
                borderColor: "rgba(34,197,94,0.3)",
                boxShadow: "0 0 40px rgba(34,197,94,0.1)",
              }}
            >
              <div>
                <p className="text-green-400 font-bold text-lg uppercase tracking-widest text-xs mb-1">
                  Saque Aprovado
                </p>
                <p className="text-4xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                  R$ {finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  Solicitação confirmada com sucesso
                </p>
              </div>

              {/* Chave PIX / conta */}
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">
                  {isPix ? "Chave PIX de Destino" : "Conta Bancária"}
                </p>
                <p className="text-white font-mono text-sm truncate">
                  {isPix ? pixKey : bankAccount}
                </p>
              </div>

              {/* ETA com countdown */}
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">
                    Você receberá o {isPix ? "PIX" : "TED"} em <span className="text-blue-400">{etaLabel}</span>
                  </p>
                  {countdown > 0 && (
                    <p className="text-white/40 text-xs mt-0.5">
                      Tempo estimado: <span className="font-mono text-blue-300">{formatCountdown(countdown)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Protocolo de segurança */}
              <div className="text-xs text-white/30 space-y-0.5">
                <p>Protocolo: TRD-{Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                <p>Data/Hora: {new Date().toLocaleString("pt-BR")}</p>
                <p>Status: <span className="text-green-400 font-semibold">APROVADO</span></p>
              </div>
            </div>

            {/* Botão voltar */}
            <Link href="/admin">
              <Button
                className="w-full gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                variant="ghost"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao Painel Admin
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ──────────────────────────────────────────
  // FORMULÁRIO PRINCIPAL
  // ──────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin">
                <button className="text-white/40 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                Saque Admin
              </h1>
            </div>
            <p className="text-sm text-white/40">Retire seus ganhos de forma segura e rápida</p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-bold border"
            style={{
              background: "rgba(34,197,94,0.1)",
              borderColor: "rgba(34,197,94,0.3)",
              color: "#22c55e",
            }}
          >
            ✓ DESBLOQUEADO
          </div>
        </div>

        {/* Conta Real */}
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg font-semibold transition-all text-sm bg-blue-500 text-white">
            Conta Real
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* Saldo Card */}
            <div
              className="rounded-2xl p-6 border"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(6,182,212,0.05) 100%)",
                borderColor: "rgba(59,130,246,0.2)",
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

            {/* Banner desbloqueado */}
            <div
              className="rounded-2xl p-4 border flex items-start gap-3"
              style={{
                background: "rgba(34,197,94,0.05)",
                borderColor: "rgba(34,197,94,0.2)",
              }}
            >
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-semibold text-sm">✓ Saque Liberado</p>
                <p className="text-white/60 text-xs mt-1">
                  Acesso de administrador — saque disponível sem restrições.
                </p>
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-semibold">Valor do Saque (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-xs text-white/40">
                Máximo disponível: R$ {balance.toFixed(2)}
              </p>
            </div>

            {/* Método */}
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
                  >
                    <Icon className="w-5 h-5 text-white/70" />
                    <span className="text-xs font-semibold text-white">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs específicos do método */}
            {withdrawalMethod === "pix" && (
              <div className="space-y-2">
                <Label className="text-white/70 text-sm font-semibold">Chave PIX</Label>
                <Input
                  type="text"
                  placeholder="CPF, Email, Telefone ou Chave Aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
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
                />
              </div>
            )}

            {/* Botão sacar */}
            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all",
                canWithdraw
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/50"
                  : "bg-white/10 text-white/50 cursor-not-allowed"
              )}
            >
              {canWithdraw ? `Sacar R$ ${numAmount.toFixed(2)}` : "Informe um valor válido"}
            </Button>

            {/* Info */}
            <div
              className="rounded-xl p-4 text-xs text-white/60 space-y-2"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p><strong>Tempo de processamento:</strong> PIX (até 15 min), TED/DOC (até 2 dias úteis)</p>
              <p><strong>Taxa:</strong> Sem taxa de saque para contas verificadas</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="glass-card rounded-2xl p-4 space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Informações</h3>
            <div className="space-y-3 text-xs text-white/50">
              <p>Esta página é exclusiva para o painel de administração.</p>
              <p>O saque será processado automaticamente após a confirmação.</p>
              <p>Guarde o protocolo de confirmação gerado após o saque.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
