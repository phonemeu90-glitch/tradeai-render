/**
 * Página de Termos de Uso — Dark Glass Luxury
 * Inclui regra de all-in obrigatório para saque do bônus
 * Aceite com checkbox e confirmação
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import {
  FileText, CheckCircle2, AlertTriangle, Shield, Zap,
  ChevronDown, ChevronUp, DollarSign, TrendingUp,
  ArrowRight, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "wouter";

const SECTIONS = [
  {
    id: "acceptance",
    icon: FileText,
    title: "Aceitação dos Termos",
    color: "#06b6d4",
    content: [
      "Ao criar uma conta ou realizar qualquer depósito na plataforma TradeAI Pro, o usuário declara expressamente ter lido, compreendido e concordado integralmente com todos os termos e condições aqui estabelecidos.",
      "O simples ato de efetuar um depósito constitui consentimento irrevogável a estas políticas, incluindo as condições de bônus e as regras de saque vigentes na data da operação.",
      "Caso o usuário não concorde com qualquer disposição destes termos, deverá abster-se de utilizar os serviços da plataforma e solicitar o encerramento de sua conta.",
      "A TradeAI Pro reserva-se o direito de atualizar estes termos a qualquer momento, sendo o usuário notificado por e-mail ou mensagem na plataforma.",
    ],
  },
  {
    id: "bonus",
    icon: Zap,
    title: "Programa de Bônus de Boas-vindas",
    color: "#f59e0b",
    content: [
      "Ao realizar seu primeiro depósito na plataforma TradeAI Pro, o usuário receberá automaticamente um bônus equivalente a 100% (cem por cento) do valor depositado.",
      "O valor mínimo para participar do programa de bônus é de R$ 50,00 (cinquenta reais) e o valor máximo é de R$ 4.000,00 (quatro mil reais).",
      "Exemplo: um depósito de R$ 4.000,00 resultará em um saldo total de R$ 8.000,00 disponível para operações.",
      "O bônus é creditado automaticamente após a confirmação do depósito pelo administrador e não possui prazo de expiração enquanto o usuário mantiver conta ativa.",
      "A condição de All-Win Vitorioso para saques é obrigatória para todos os usuários da plataforma, independentemente do valor depositado.",
    ],
  },
  {
    id: "allin",
    icon: TrendingUp,
    title: "Condição de Saque — All-Win Vitorioso Obrigatório",
    color: "#ef4444",
    badge: "OBRIGATÓRIO",
    content: [
      "Para que qualquer saque seja liberado — incluindo o capital original depositado e o bônus recebido — é OBRIGATÓRIO que o usuário realize ao menos uma (1) operação ALL-WIN vitoriosa em sua conta real.",
      "Entende-se por ALL-WIN Vitorioso: uma operação em que o usuário aloca 100% (cem por cento) do saldo disponível em conta e encerra a operação com resultado positivo (ganho).",
      "Operações encerradas com resultado negativo (perda) não satisfazem este critério, mesmo que o saldo utilizado tenha sido de 100%.",
      "Esta condição aplica-se a TODOS os usuários da plataforma, sem exceção. Não existe opção de isenção. O simples ato de criar uma conta constitui aceitação integral desta regra.",
      "A TradeAI Pro não se responsabiliza por perdas financeiras decorrentes de operações realizadas com o objetivo de cumprir este critério. A decisão é exclusiva e voluntária do usuário.",
      "O cumprimento desta condição é verificado automaticamente pelo sistema. Após o all-win vitorioso, os saques são desbloqueados sem necessidade de solicitação adicional.",
    ],
  },
  {
    id: "withdraw",
    icon: DollarSign,
    title: "Política de Saques",
    color: "#22c55e",
    content: [
      "Saques são processados em até 24 (vinte e quatro) horas úteis após a solicitação, sujeito à validação interna.",
      "O valor mínimo para saque é de R$ 50,00 (cinquenta reais). Não há valor máximo por solicitação.",
      "Saques são realizados exclusivamente via PIX ou TED/DOC para a chave ou conta bancária informada pelo usuário.",
      "A TradeAI Pro reserva-se o direito de solicitar documentos comprobatórios de identidade (KYC) antes de processar saques acima de R$ 500,00.",
      "Saques realizados sem o cumprimento das condições previstas nestes termos poderão ser cancelados e revertidos sem aviso prévio.",
    ],
  },
  {
    id: "risk",
    icon: AlertTriangle,
    title: "Aviso de Risco",
    color: "#f97316",
    content: [
      "Operações em ativos financeiros e derivativos envolvem riscos elevados, incluindo a possibilidade de perda total do capital investido.",
      "O desempenho passado não garante resultados futuros. Os sinais, análises e sugestões fornecidos pela IA são meramente informativos e não constituem recomendação de investimento.",
      "O usuário deve avaliar cuidadosamente sua situação financeira, objetivos e tolerância ao risco antes de operar. Recomenda-se não investir recursos essenciais ao sustento.",
      "A TradeAI Pro não garante lucros e não é responsável por perdas decorrentes de operações realizadas na plataforma.",
    ],
  },
  {
    id: "privacy",
    icon: Shield,
    title: "Privacidade e Segurança",
    color: "#3b82f6",
    content: [
      "Todos os dados pessoais são coletados e tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).",
      "As transações financeiras e os dados de acesso são protegidos por criptografia SSL de 256 bits.",
      "A TradeAI Pro não compartilha dados pessoais com terceiros sem o consentimento expresso do usuário, salvo obrigação legal.",
      "O usuário pode solicitar a exclusão de seus dados pessoais a qualquer momento mediante contato com o suporte da plataforma.",
    ],
  },
];

export default function Terms() {
  const [expanded, setExpanded] = useState<string[]>(["acceptance", "allin"]);
  const [accepted, setAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!accepted) {
      toast.error("Você precisa confirmar que leu os termos para continuar");
      return;
    }
    setConfirmed(true);
    toast.success("Termos reconhecidos. All-Win vitorioso obrigatório para saques.", { duration: 5000 });
  };

  return (
    <Layout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                Termos de Uso
              </h1>
              <p className="text-xs text-white/40">Última atualização: 02 de junho de 2026</p>
            </div>
          </div>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">
            Leia atentamente os termos abaixo antes de utilizar a plataforma TradeAI Pro.
            A aceitação destes termos é obrigatória para o uso dos serviços.
          </p>
        </div>

        {/* Confirmed banner */}
        {confirmed && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.07))",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-green-400" />
            <div className="flex-1">
              <p className="font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                Termos reconhecidos com sucesso!
              </p>
              <p className="text-sm text-white/60 mt-0.5">
                Você está ciente das condições da plataforma. Para sacar, complete 1 All-Win vitorioso.
              </p>
            </div>
            <Link href="/deposit">
              <Button
                size="sm"
                className="gap-2 text-xs font-semibold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none" }}
              >
                Depositar <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* All-in highlight card */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.06))",
            border: "1px solid rgba(239,68,68,0.35)",
            boxShadow: "0 0 24px rgba(239,68,68,0.07)",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-400 mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
                IMPORTANTE — Condição Obrigatória para Todo Usuário
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Ao criar uma conta na TradeAI Pro, <strong className="text-white">independentemente de qualquer opção</strong>,
                o usuário concorda automaticamente que, para realizar o <strong className="text-white">primeiro saque</strong>,
                é obrigatório concluir ao menos <strong className="text-red-300">1 (uma) operação ALL-WIN vitoriosa</strong> —
                alocar 100% do saldo em uma operação e <strong className="text-red-300">vencer</strong>.
                Não há opção de isenção. Quem não concordar, não deve criar conta.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 text-xs text-white/70 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Criar conta <strong className="text-white">= aceitar</strong> a condição de All-Win</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <XCircle className="w-3.5 h-3.5 text-white/40" />
                  <span>Não concorda → <strong className="text-white/60">não crie conta</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3 mb-6">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/3 transition-all"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${section.color}20`, border: `1px solid ${section.color}30` }}
                >
                  <section.icon className="w-4.5 h-4.5" style={{ color: section.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{section.title}</span>
                    {section.badge && (
                      <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                {expanded.includes(section.id)
                  ? <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                }
              </button>

              {expanded.includes(section.id) && (
                <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                  {section.content.map((paragraph, i) => (
                    <div key={i} className="flex gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                        style={{ background: `${section.color}20`, color: section.color }}
                      >
                        {i + 1}
                      </div>
                      <p className="text-sm text-white/65 leading-relaxed">{paragraph}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Acceptance section */}
        {!confirmed && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              Confirmar Leitura dos Termos
            </h3>

            <div
              className="p-4 rounded-xl"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
            >
              <p className="text-xs text-white/60 leading-relaxed">
                <strong className="text-red-400">Atenção:</strong> Ao criar uma conta nesta plataforma, você concorda automaticamente com todos os termos acima, sem exceção.
                A condição de <strong className="text-white">All-Win vitorioso</strong> para o primeiro saque é válida para <strong className="text-white">todos os usuários</strong>.
                Não existe opção de isenção. Se não concordar, não crie conta.
              </p>
            </div>

            {/* Terms checkbox */}
            <div
              className="flex items-start gap-3 p-4 rounded-xl cursor-pointer hover:bg-white/3 transition-all"
              style={{
                background: accepted ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${accepted ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}
              onClick={() => setAccepted(!accepted)}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{ background: accepted ? "#3b82f6" : "transparent", border: accepted ? "none" : "2px solid rgba(255,255,255,0.25)" }}
              >
                {accepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Li e compreendi todos os <strong className="text-white">Termos de Uso</strong> da TradeAI Pro.
                Estou ciente de que ao criar minha conta <strong className="text-white">aceito automaticamente</strong> todas as condições,
                incluindo a obrigatoriedade do <strong className="text-red-400">All-Win vitorioso</strong> para realizar o primeiro saque.
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!accepted}
              className="w-full h-12 font-bold text-sm gap-2"
              style={{
                background: accepted ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : undefined,
                border: "none",
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Leitura dos Termos
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
