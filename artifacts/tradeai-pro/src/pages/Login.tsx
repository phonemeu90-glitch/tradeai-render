/**
 * Página de Login — Dark Glass Luxury
 * Fundo com imagem hero, card de vidro centralizado
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Zap, ArrowRight, Lock, Mail, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTrading } from "@/contexts/TradingContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { setUser } = useTrading();
  const [showPass, setShowPass] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (isRegister && !form.name) {
      toast.error("Digite seu nome completo");
      return;
    }

    if (isRegister && !termsAccepted) {
      toast.error("Você precisa aceitar os Termos de Uso para criar sua conta");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const newUser = {
        id: `user_${Date.now()}`,
        name: form.name || "Usuário",
        email: form.email,
        createdAt: new Date(),
      };
      
      setUser(newUser);
      setLoading(false);
      toast.success(isRegister ? `Bem-vindo, ${newUser.name}! Sua conta demo está pronta com R$ 1.000.` : `Bem-vindo de volta, ${newUser.name}!`);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0D1117 0%, #0F1629 60%, #0D1117 100%)" }}
    >
      {/* Background hero image */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663488564680/j9k5MhyvqaGkboCqExKd8C/hero-bg-KSmZxS2dDCuxm9BDXAFWFb.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)" }} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: Math.random() * 4 + 2 + "px",
              height: Math.random() * 4 + 2 + "px",
              background: i % 2 === 0 ? "#3b82f6" : "#06b6d4",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animation: `float ${Math.random() * 10 + 8}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + "s",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", boxShadow: "0 0 30px rgba(59,130,246,0.4)" }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              TradeAI <span className="gradient-text">Pro</span>
            </h1>
            <p className="text-xs text-white/40">Plataforma de Trading com IA</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
            {isRegister ? "Criar Conta" : "Entrar na Plataforma"}
          </h2>
          <p className="text-sm text-white/40 mb-6">
            {isRegister ? "Cadastre-se e ganhe 100% de bônus no primeiro depósito" : "Acesse sua conta e comece a operar"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Nome completo</Label>
                <Input
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isRegister && (
              <div className="text-right">
                <button type="button" className="text-xs text-blue-400 hover:text-blue-300">
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {isRegister && (
              <div
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all select-none"
                style={{ background: termsAccepted ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${termsAccepted ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}` }}
                onClick={() => setTermsAccepted(!termsAccepted)}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                  style={{ background: termsAccepted ? "#3b82f6" : "transparent", border: termsAccepted ? "none" : "2px solid rgba(255,255,255,0.25)" }}
                >
                  {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Ao criar minha conta, <strong className="text-white">aceito automaticamente</strong> os{" "}
                  <Link href="/terms" onClick={e => e.stopPropagation()}>
                    <span className="text-blue-400 font-semibold hover:text-blue-300 underline underline-offset-2">
                      Termos de Uso
                    </span>
                  </Link>{" "}
                  da TradeAI Pro e estou ciente de que o{" "}
                  <strong className="text-red-400">All-Win vitorioso é obrigatório</strong>{" "}
                  para realizar qualquer saque.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (isRegister && !termsAccepted)}
              className="w-full h-11 font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isRegister ? "Criar Conta Grátis" : "Entrar"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Demo Account Info */}
          <div
            className="mt-6 p-3 rounded-lg text-xs text-white/60"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <div className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p>
                Após o cadastro, você terá <strong>R$ 1.000</strong> em conta demo para praticar.
              </p>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              {isRegister ? "Já tem conta? " : "Não tem conta? "}
              <span className="text-blue-400 font-medium">
                {isRegister ? "Entrar" : "Criar conta grátis"}
              </span>
            </button>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-4">
          <Link href="/">
            <span className="text-xs text-white/30 hover:text-white/60 transition-colors">
              ← Voltar ao início
            </span>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
