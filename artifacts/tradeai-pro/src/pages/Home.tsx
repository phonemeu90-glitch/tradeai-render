/**
 * Landing Page — Dark Glass Luxury
 * Hero com imagem de fundo, seções de features, bônus, CTA
 * Fluxo unificado para /auth
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Zap, TrendingUp, Brain, Shield, ArrowRight, Star,
  BarChart2, Users, DollarSign, ChevronDown, Play,
  CheckCircle2, Award, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATS = [
  { value: "R$ 2.4B+", label: "Volume negociado", icon: BarChart2, display: "R$ 2.4B+" },
  { value: "47.000+", label: "Traders ativos", icon: Users, display: "47.000+" },
  { value: "94.7%", label: "Taxa de satisfação", icon: Star, display: "94.7%" },
  { value: "24/7", label: "Suporte disponível", icon: Globe, display: "24/7" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "IA de Alta Precisão",
    desc: "Nossa inteligência artificial analisa milhares de variáveis em tempo real para identificar as melhores oportunidades de mercado.",
    color: "#8b5cf6",
  },
  {
    icon: Zap,
    title: "Bônus de 100%",
    desc: "Deposite entre R$ 50 e R$ 4.000 e receba o dobro para operar. O maior bônus do mercado, aplicado automaticamente.",
    color: "#f59e0b",
  },
  {
    icon: TrendingUp,
    title: "Gráficos Avançados",
    desc: "Visualize o mercado com gráficos de candlestick, indicadores técnicos e análises em tempo real integradas à IA.",
    color: "#22c55e",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    desc: "Plataforma protegida com criptografia SSL 256-bit, autenticação em dois fatores e monitoramento 24/7.",
    color: "#3b82f6",
  },
];

const TESTIMONIALS = [
  { name: "Carlos M.", role: "Day Trader", text: "Comecei com R$ 500 e com o bônus operei com R$ 1.000. A IA me ajudou a triplicar meu capital em 3 semanas!", rating: 5 },
  { name: "Ana P.", role: "Investidora", text: "Interface incrível, gráficos precisos e o suporte é excelente. Melhor plataforma que já usei.", rating: 5 },
  { name: "Roberto S.", role: "Trader Profissional", text: "Os sinais da IA são impressionantes. Taxa de acerto acima de 80% nas minhas operações.", rating: 5 },
];

function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString("pt-BR")}{suffix}</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0D1117 0%, #0F1629 50%, #0D1117 100%)" }}>
      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,17,23,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              TradeAI <span className="gradient-text">Pro</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {["Recursos", "Bônus", "Como funciona", "Depoimentos"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="text-sm text-white/60 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5 text-sm">
                Entrar
              </Button>
            </Link>
            <Link href="/auth">
              <Button
                size="sm"
                className="text-sm font-semibold gap-1.5"
                style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none" }}
              >
                Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663488564680/j9k5MhyvqaGkboCqExKd8C/hero-bg-KSmZxS2dDCuxm9BDXAFWFb.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
          }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 60%, #0D1117 100%)" }} />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
                background: i % 3 === 0 ? "#3b82f6" : i % 3 === 1 ? "#06b6d4" : "#8b5cf6",
                left: Math.random() * 100 + "%",
                top: Math.random() * 100 + "%",
                opacity: Math.random() * 0.4 + 0.1,
                animation: `float ${Math.random() * 15 + 10}s ease-in-out infinite`,
                animationDelay: Math.random() * 8 + "s",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Badge
            className="mb-6 text-sm px-4 py-1.5 gap-2"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
            Plataforma com IA em Tempo Real
          </Badge>

          <h1
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Opere com{" "}
            <span className="gradient-text">Inteligência</span>
            <br />
            Artificial
          </h1>

          <p className="text-lg sm:text-xl text-white/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            A plataforma de trading mais avançada do Brasil. IA que analisa o mercado 24/7,
            gráficos em tempo real e{" "}
            <strong className="text-yellow-400">100% de bônus</strong> no seu primeiro depósito.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/auth">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-bold gap-2"
                style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none", boxShadow: "0 0 40px rgba(59,130,246,0.3)" }}
              >
                <Zap className="w-5 h-5" />
                Começar com Bônus de 100%
              </Button>
            </Link>
            <Link href="/auth">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-bold border-white/20 text-white hover:bg-white/5"
              >
                <Play className="w-5 h-5" />
                Ver Demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-8 border-t border-white/10">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <Icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{stat.display}</p>
                  <p className="text-xs text-white/40 mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Por que escolher TradeAI Pro?
          </h2>
          <p className="text-white/40 text-center mb-16 max-w-2xl mx-auto">
            Recursos profissionais desenvolvidos para traders sérios
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass-card rounded-2xl p-6 hover:border-white/20 transition-all group"
                  style={{ borderColor: feature.color + "30" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ background: feature.color + "20", color: feature.color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-20 px-4 bg-white/3">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            O que dizem nossos traders
          </h2>
          <p className="text-white/40 text-center mb-16 max-w-2xl mx-auto">
            Histórias reais de sucesso na plataforma
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial) => (
              <div key={testimonial.name} className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/80 mb-4 leading-relaxed">"{testimonial.text}"</p>
                <div>
                  <p className="text-white font-semibold">{testimonial.name}</p>
                  <p className="text-white/40 text-sm">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Pronto para começar?
          </h2>
          <p className="text-white/60 mb-8 max-w-2xl mx-auto">
            Crie sua conta em segundos e receba R$ 1.000 em saldo demo para praticar sem risco
          </p>

          <Link href="/auth">
            <Button
              size="lg"
              className="h-14 px-12 text-base font-bold gap-2"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none", boxShadow: "0 0 40px rgba(59,130,246,0.3)" }}
            >
              <Zap className="w-5 h-5" />
              Abrir Conta Agora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-white/40 text-sm">
          <p>© 2026 TradeAI Pro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
