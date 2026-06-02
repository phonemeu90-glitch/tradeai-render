/**
 * Auth — Login e Cadastro com Design Premium
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Auth() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          toast.error("Preencha todos os campos");
          return;
        }
        await login(email, password);
        toast.success("Login realizado com sucesso!");
        setLocation("/dashboard");
      } else {
        if (!email || !name || !password || !confirmPassword) {
          toast.error("Preencha todos os campos");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("As senhas não coincidem");
          return;
        }
        if (password.length < 6) {
          toast.error("A senha deve ter no mínimo 6 caracteres");
          return;
        }
        if (!acceptedTerms) {
          toast.error("Você precisa aceitar os Termos e Condições para continuar");
          return;
        }
        await register(email, name, password);
        toast.success("Cadastro realizado com sucesso!");
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0a0f23 0%, #1a2a4a 50%, #0f1a35 100%)" }}
    >
      {/* Fundo com efeito */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card Principal */}
        <div
          className="rounded-2xl p-8 backdrop-blur-xl border border-white/10 shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,25,50,0.95) 0%, rgba(20,35,60,0.92) 100%)",
            boxShadow:
              "0 0 60px rgba(59,130,246,0.1), inset 0 0 40px rgba(59,130,246,0.05)",
          }}
        >
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-2xl font-bold text-white">🚀</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">TradeAI Pro</h1>
            <p className="text-white/40 text-sm">Opções Binárias Profissional</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => {
                setIsLogin(true);
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setAcceptedTerms(false);
              }}
              className={cn(
                "flex-1 py-2 rounded-lg font-semibold transition-all text-sm",
                isLogin
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              <LogIn className="w-4 h-4 inline mr-2" /> Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setEmail("");
                setName("");
                setPassword("");
                setConfirmPassword("");
                setAcceptedTerms(false);
              }}
              className={cn(
                "flex-1 py-2 rounded-lg font-semibold transition-all text-sm",
                !isLogin
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              <UserPlus className="w-4 h-4 inline mr-2" /> Cadastro
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm font-semibold">Email</Label>
              <Input
                type="email"
                inputMode="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg focus:border-blue-500 focus:bg-white/10"
              />
            </div>

            {/* Nome (apenas cadastro) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-white/80 text-sm font-semibold">Nome Completo</Label>
                <Input
                  type="text"
                  inputMode="text"
                  placeholder="Seu Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg focus:border-blue-500 focus:bg-white/10"
                />
              </div>
            )}

            {/* Senha */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm font-semibold">Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg focus:border-blue-500 focus:bg-white/10"
              />
            </div>

            {/* Confirmar Senha (apenas cadastro) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-white/80 text-sm font-semibold">Confirmar Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg focus:border-blue-500 focus:bg-white/10"
                />
              </div>
            )}

            {/* Checkbox Termos (apenas cadastro) */}
            {!isLogin && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      acceptedTerms
                        ? "bg-blue-500 border-blue-500"
                        : "border-white/30 bg-white/5 group-hover:border-blue-400"
                    )}
                  >
                    {acceptedTerms && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-white/60 leading-relaxed">
                  Li e aceito os{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Termos e Condições
                  </a>{" "}
                  da plataforma TradeAI Pro
                </span>
              </label>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {isLogin
                  ? "Faça login para acessar sua conta e continuar operando."
                  : "Crie sua conta e comece a operar com R$ 1.000 em demo!"}
              </span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || (!isLogin && !acceptedTerms)}
              className={cn(
                "w-full h-11 rounded-lg font-bold text-base text-white shadow-lg transition-all active:scale-95",
                !isLogin && !acceptedTerms
                  ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 shadow-blue-500/10 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/30"
              )}
            >
              {isLoading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 rounded-lg bg-white/3 border border-white/5 text-xs text-white/60 text-center">
            <p className="mb-2">🎓 <strong>Modo Demo:</strong></p>
            <p>Comece com R$ 1.000 em dinheiro virtual para praticar sem risco!</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          © 2026 TradeAI Pro. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
