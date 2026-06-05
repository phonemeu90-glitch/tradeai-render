/*
   * BinaryOptions — Idêntico ao Trade, só com 40+ ativos OTC e picker modal
   * Lógica de entrada, manipulação, chart e contexto: INALTERADOS vs Trade.tsx
   */
  import { useState, useEffect, useCallback, useRef } from "react";
  import Layout from "@/components/Layout";
  import ProfessionalChart from "@/components/ProfessionalChart";
  import { useTrading } from "@/contexts/TradingContext";
  import { useChart } from "@/contexts/ChartContext";
  import {
    TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle,
    Activity, Search, X, ChevronDown,
  } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
  import { cn } from "@/lib/utils";
  import { toast } from "sonner";

  // Fallback local (idêntico ao Trade.tsx)
  function generatePriceData(points: number, startPrice: number) {
    const data = [];
    let price = startPrice;
    const now = new Date();
    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 1000);
      const u1 = Math.random(), u2 = Math.random();
      const noise = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
      const move = price * 0.004 * noise * 0.4;
      const open = price;
      const close = parseFloat((open + move).toFixed(4));
      const wickSize = Math.abs(move) * (0.3 + Math.random() * 0.4);
      data.push({
        time: time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        open, close,
        high: parseFloat((Math.max(open, close) + wickSize).toFixed(4)),
        low: parseFloat((Math.min(open, close) - Math.max(wickSize * 0.5, 0.0001)).toFixed(4)),
        price: close,
        volume: Math.floor(Math.random() * 80000 + 20000),
      });
      price = close;
    }
    return data;
  }

  const ASSETS = [
    // ── Forex ──────────────────────────────────────────────────────────────────
    { symbol: "EUR/USD", name: "Euro vs Dólar OTC",      startPrice: 1.0850,  color: "#3b82f6", type: "Forex" },
    { symbol: "GBP/USD", name: "Libra vs Dólar OTC",     startPrice: 1.2750,  color: "#06b6d4", type: "Forex" },
    { symbol: "USD/JPY", name: "Dólar vs Iene OTC",      startPrice: 149.85,  color: "#8b5cf6", type: "Forex" },
    { symbol: "AUD/USD", name: "Dólar Aus vs USD OTC",   startPrice: 0.6510,  color: "#f59e0b", type: "Forex" },
    { symbol: "USD/CAD", name: "Dólar vs CAD OTC",       startPrice: 1.3620,  color: "#10b981", type: "Forex" },
    { symbol: "USD/BRL", name: "Dólar vs Real OTC",      startPrice: 5.2840,  color: "#22c55e", type: "Forex" },
    { symbol: "EUR/GBP", name: "Euro vs Libra OTC",      startPrice: 0.8540,  color: "#3b82f6", type: "Forex" },
    { symbol: "EUR/JPY", name: "Euro vs Iene OTC",       startPrice: 162.45,  color: "#06b6d4", type: "Forex" },
    { symbol: "USD/CHF", name: "Dólar vs Franco OTC",    startPrice: 0.9020,  color: "#8b5cf6", type: "Forex" },
    { symbol: "GBP/JPY", name: "Libra vs Iene OTC",      startPrice: 191.35,  color: "#f59e0b", type: "Forex" },
    { symbol: "NZD/USD", name: "Dólar NZ vs USD OTC",    startPrice: 0.6090,  color: "#10b981", type: "Forex" },
    { symbol: "USD/MXN", name: "Dólar vs Peso OTC",      startPrice: 17.1500, color: "#22c55e", type: "Forex" },
    // ── Cripto ─────────────────────────────────────────────────────────────────
    { symbol: "BTC/USD", name: "Bitcoin OTC",            startPrice: 67420,   color: "#f97316", type: "Cripto" },
    { symbol: "ETH/USD", name: "Ethereum OTC",           startPrice: 3248.50, color: "#6366f1", type: "Cripto" },
    { symbol: "XRP/USD", name: "Ripple OTC",             startPrice: 0.5230,  color: "#06b6d4", type: "Cripto" },
    { symbol: "BNB/USD", name: "BNB OTC",                startPrice: 385.20,  color: "#f59e0b", type: "Cripto" },
    { symbol: "SOL/USD", name: "Solana OTC",             startPrice: 142.80,  color: "#8b5cf6", type: "Cripto" },
    { symbol: "ADA/USD", name: "Cardano OTC",            startPrice: 0.4820,  color: "#3b82f6", type: "Cripto" },
    { symbol: "DOGE/USD",name: "Dogecoin OTC",           startPrice: 0.1285,  color: "#f59e0b", type: "Cripto" },
    { symbol: "AVAX/USD",name: "Avalanche OTC",          startPrice: 38.60,   color: "#ef4444", type: "Cripto" },
    { symbol: "DOT/USD", name: "Polkadot OTC",           startPrice: 7.480,   color: "#ec4899", type: "Cripto" },
    { symbol: "LTC/USD", name: "Litecoin OTC",           startPrice: 84.30,   color: "#a3a3a3", type: "Cripto" },
    // ── Ações BR ───────────────────────────────────────────────────────────────
    { symbol: "PETR4",   name: "Petrobras OTC",          startPrice: 38.42,   color: "#22c55e", type: "Ações BR" },
    { symbol: "VALE3",   name: "Vale OTC",               startPrice: 61.80,   color: "#10b981", type: "Ações BR" },
    { symbol: "ITUB4",   name: "Itaú Unibanco OTC",      startPrice: 34.55,   color: "#06b6d4", type: "Ações BR" },
    { symbol: "BBDC4",   name: "Bradesco OTC",           startPrice: 14.92,   color: "#3b82f6", type: "Ações BR" },
    { symbol: "ABEV3",   name: "Ambev OTC",              startPrice: 11.35,   color: "#f59e0b", type: "Ações BR" },
    { symbol: "BBAS3",   name: "Banco do Brasil OTC",    startPrice: 56.80,   color: "#22c55e", type: "Ações BR" },
    { symbol: "WEGE3",   name: "WEG OTC",                startPrice: 45.20,   color: "#8b5cf6", type: "Ações BR" },
    { symbol: "RENT3",   name: "Localiza OTC",           startPrice: 92.40,   color: "#ec4899", type: "Ações BR" },
    // ── Ações US ───────────────────────────────────────────────────────────────
    { symbol: "TSLA",    name: "Tesla OTC",              startPrice: 248.50,  color: "#ef4444", type: "Ações US" },
    { symbol: "NVIDIA",  name: "NVIDIA OTC",             startPrice: 875.30,  color: "#22c55e", type: "Ações US" },
    { symbol: "AMAZON",  name: "Amazon OTC",             startPrice: 185.60,  color: "#f97316", type: "Ações US" },
    { symbol: "APPLE",   name: "Apple OTC",              startPrice: 192.40,  color: "#a3a3a3", type: "Ações US" },
    { symbol: "META",    name: "Meta OTC",               startPrice: 485.20,  color: "#3b82f6", type: "Ações US" },
    { symbol: "MSFT",    name: "Microsoft OTC",          startPrice: 415.80,  color: "#06b6d4", type: "Ações US" },
    // ── Commodities ────────────────────────────────────────────────────────────
    { symbol: "GOLD",    name: "Ouro OTC",               startPrice: 2385.50, color: "#f59e0b", type: "Commodities" },
    { symbol: "SILVER",  name: "Prata OTC",              startPrice: 28.74,   color: "#a3a3a3", type: "Commodities" },
    { symbol: "OIL/USD", name: "Petróleo WTI OTC",       startPrice: 82.40,   color: "#78716c", type: "Commodities" },
    { symbol: "COPPER",  name: "Cobre OTC",              startPrice: 4.2850,  color: "#f97316", type: "Commodities" },
    { symbol: "PLAT",    name: "Platina OTC",            startPrice: 1015.00, color: "#8b5cf6", type: "Commodities" },
  ];

  const CATEGORIES = ["Todos", "Forex", "Cripto", "Ações BR", "Ações US", "Commodities"] as const;

  const EXPIRATION_TIMES = [
    { label: "1m", value: 60 },
    { label: "5m", value: 300 },
    { label: "15m", value: 900 },
  ];

  // ── Modal de seleção de ativos ───────────────────────────────────────────────
  function AssetPicker({ open, onClose, selectedIndex, onSelect }: {
    open: boolean; onClose: () => void; selectedIndex: number; onSelect: (i: number) => void;
  }) {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>("Todos");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (open) { setSearch(""); setActiveCategory("Todos"); setTimeout(() => inputRef.current?.focus(), 80); }
    }, [open]);
    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const filtered = ASSETS.filter((a) => {
      const matchCat = activeCategory === "Todos" || a.type === activeCategory;
      const q = search.toLowerCase();
      return !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    });

    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "linear-gradient(180deg,#0d1120 0%,#080c18 100%)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 32px 64px rgba(0,0,0,0.6)", maxHeight: "80vh" }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Selecionar Ativo</h2>
              <p className="text-[11px] text-white/35 mt-0.5">{ASSETS.length} ativos OTC disponíveis</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08]">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input ref={inputRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ativo..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }} />
            </div>
          </div>
          <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  activeCategory === cat ? "text-white" : "text-white/35 hover:text-white/60")}
                style={activeCategory === cat
                  ? { background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}>
                {cat}{cat !== "Todos" && <span className="ml-1.5 text-[10px] opacity-50">{ASSETS.filter(a => a.type === cat).length}</span>}
              </button>
            ))}
          </div>
          <div className="px-5 pb-5 overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-white/25 text-sm">Nenhum ativo encontrado</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filtered.map((a) => {
                  const globalIdx = ASSETS.indexOf(a);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button key={a.symbol} onClick={() => { onSelect(globalIdx); onClose(); }}
                      className={cn("text-left p-3 rounded-xl transition-all", isSelected ? "ring-1" : "hover:bg-white/[0.05]")}
                      style={isSelected
                        ? { background: `${a.color}14`, border: `1px solid ${a.color}50` }
                        : { border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-white leading-tight">{a.symbol}</p>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />}
                      </div>
                      <p className="text-[10px] mt-0.5 font-medium text-white/50">{a.type}</p>
                      <p className="text-[10px] text-white/30 mt-1 font-mono">{a.startPrice.toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Página principal ─────────────────────────────────────────────────────────
  export default function BinaryOptions() {
    const { activeAccount, openBinaryOption, closeBinaryOption, updateOptionPrice, accounts, getAccountBalance, getManipulationFactor } = useTrading();
    const { charts } = useChart();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(() => {
      const saved = localStorage.getItem("tradeai_binary_asset");
      const idx = saved ? parseInt(saved, 10) : 0;
      return Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    });
    const [chartData, setChartData] = useState(() => {
      const saved = localStorage.getItem("tradeai_binary_asset");
      const idx = saved ? parseInt(saved, 10) : 0;
      const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
      const sym = ASSETS[safeIdx].symbol;
      try {
        const storedRaw = localStorage.getItem(`tradeai_binary_chart_v2_${sym}`);
        if (storedRaw) {
          const stored = JSON.parse(storedRaw);
          if (stored.symbol === sym && stored.data?.length > 0 && Date.now() - stored.savedAt < 600000) return stored.data;
        }
      } catch { /* ignorar */ }
      return generatePriceData(80, ASSETS[safeIdx].startPrice);
    });
    const [currentPrice, setCurrentPrice] = useState(() => {
      const saved = localStorage.getItem("tradeai_binary_asset");
      const idx = saved ? parseInt(saved, 10) : 0;
      const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
      return ASSETS[safeIdx].startPrice;
    });
    const [priceChange, setPriceChange] = useState(0);
    const [direction, setDirection] = useState<"call" | "put">("call");
    const [betAmount, setBetAmount] = useState("");
    const [expirationTime, setExpirationTime] = useState(60);

    const seededRef = useRef(false);
    const saveCounterRef = useRef(0);

    const asset = ASSETS[selectedAsset] || ASSETS[0];
    const balance = getAccountBalance(activeAccount) || 0;
    const account = accounts[activeAccount] || accounts.demo;
    const numBet = parseFloat(betAmount) || 0;
    const payout = numBet * 1.9;

    const handleSelectAsset = (idx: number) => {
      setSelectedAsset(idx);
      localStorage.setItem("tradeai_binary_asset", String(idx));
    };

    // Ao trocar ativo: restaura do localStorage ou gera fallback
    useEffect(() => {
      seededRef.current = false;
      saveCounterRef.current = 0;
      try {
        const storedRaw = localStorage.getItem(`tradeai_binary_chart_v2_${asset.symbol}`);
        if (storedRaw) {
          const stored = JSON.parse(storedRaw);
          if (stored.symbol === asset.symbol && stored.data?.length > 0 && Date.now() - stored.savedAt < 600000) {
            setChartData(stored.data);
            setCurrentPrice(stored.data[stored.data.length - 1].price);
            setPriceChange(0);
            return;
          }
        }
      } catch { /* ignorar */ }
      const fallback = generatePriceData(80, asset.startPrice);
      setChartData(fallback);
      setCurrentPrice(asset.startPrice);
      setPriceChange(0);
    }, [asset.symbol, asset.startPrice]);

    // Servidor SSE (override único)
    useEffect(() => {
      if (seededRef.current) return;
      const serverChart = charts[asset.symbol];
      if (serverChart && serverChart.data.length > 0) {
        setChartData(serverChart.data);
        setCurrentPrice(serverChart.currentPrice);
        setPriceChange(serverChart.priceChange);
        seededRef.current = true;
      }
    }, [charts, asset.symbol]);

    // ── Geração de preço com manipulação — IDÊNTICA ao Trade.tsx ─────────────
    useEffect(() => {
      const interval = setInterval(() => {
        setChartData((prev) => {
          if (!prev || prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const first = prev[0];
          const manipulation = getManipulationFactor(activeAccount, asset.symbol) || { shouldWin: false, intensity: 0 };
          const baseVolatility = 0.0010;
          const u1 = Math.random(), u2 = Math.random();
          const gaussianNoise = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
          let drift = 0;

          const activePos = account?.positions?.find(p => p.asset === asset.symbol);
          if (activePos) {
            const pos = activePos;
            const totalDuration = pos.expiresAt ? (pos.expiresAt - pos.entryTime.getTime()) : 60000;
            const timeRemaining = (pos.expiresAt || 0) - Date.now();
            const timeElapsed = totalDuration - timeRemaining;
            const progress = Math.min(1, Math.max(0, timeElapsed / totalDuration));
            const isCallType = pos.type === "call";
            const priceVsEntry = last.price - pos.entryPrice;
            const currentlyWinning = (isCallType && priceVsEntry > 0) || (!isCallType && priceVsEntry < 0);
            const shouldWin = manipulation.shouldWin;
            const targetUp = shouldWin ? isCallType : !isCallType;

            if (progress < 0.80) {
              drift = (targetUp ? 1 : -1) * manipulation.intensity * 0.000045;
            } else {
              if (currentlyWinning === shouldWin) {
                drift = (targetUp ? 1 : -1) * 0.000025;
              } else {
                const lateProgress = (progress - 0.80) / 0.20;
                drift = (targetUp ? 1 : -1) * (0.00018 + lateProgress * 0.00055);
              }
            }
          }

          const priceMove = last.price * (drift + baseVolatility * gaussianNoise * 0.4);
          const newPrice = parseFloat((last.price + priceMove).toFixed(4));
          const now = new Date();
          const wickSize = Math.abs(priceMove) * (0.3 + Math.random() * 0.4);
          const newPoint = {
            time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            open: last.price, close: newPrice,
            high: Math.max(last.price, newPrice) + wickSize,
            low: Math.min(last.price, newPrice) - Math.max(wickSize * 0.5, 0.0001),
            price: newPrice,
            volume: Math.floor(Math.random() * 80000 + 20000),
          };

          const appended = [...prev, newPoint];
          const updated = appended.length > 2000 ? appended.slice(-2000) : appended;

          saveCounterRef.current++;
          if (saveCounterRef.current % 30 === 0) {
            try {
              localStorage.setItem(`tradeai_binary_chart_v2_${asset.symbol}`, JSON.stringify({
                symbol: asset.symbol, data: updated.slice(-300), savedAt: Date.now(),
              }));
            } catch { /* ignorar */ }
          }

          setCurrentPrice(newPrice);
          if (first) setPriceChange(((newPrice - first.price) / first.price) * 100);

          if (account && account.positions) {
            account.positions.filter(p => p.asset === asset.symbol).forEach((pos) => {
              updateOptionPrice(activeAccount, pos.id, newPrice);
              if (pos.expiresAt && Date.now() >= pos.expiresAt) {
                closeBinaryOption(activeAccount, pos.id, newPrice);
                const isWin = (pos.type === "call" && newPrice > pos.entryPrice) ||
                  (pos.type === "put" && newPrice < pos.entryPrice);
                if (isWin) toast.success(`✅ VITÓRIA! Ganhou R$ ${(pos.betAmount * 0.9).toFixed(2)}`);
                else toast.error(`❌ DERROTA! Perdeu R$ ${pos.betAmount.toFixed(2)}`);
              }
            });
          }

          return updated;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [activeAccount, account, updateOptionPrice, closeBinaryOption, getManipulationFactor, asset.symbol]);

    const handleTrade = useCallback(() => {
      if (numBet <= 0) { toast.error("Informe um valor válido"); return; }
      if (numBet > balance) { toast.error("Saldo insuficiente"); return; }
      const betPercentage = (numBet / balance) * 100;
      if (betPercentage >= 60) toast.warning("⚠️ ALTO RISCO: Aposta acima de 60% do saldo!");
      openBinaryOption(
        activeAccount,
        { type: direction, asset: asset.symbol, betAmount: numBet, entryPrice: currentPrice, entryTime: new Date(), currentPrice },
        expirationTime
      );
      setBetAmount("");
      toast.success(`${direction === "call" ? "📈 CALL" : "📉 PUT"} aberto! Expira em ${expirationTime}s`);
    }, [direction, numBet, balance, activeAccount, asset.symbol, currentPrice, openBinaryOption, expirationTime]);

    const isPositive = priceChange >= 0;

    return (
      <Layout>
        <AssetPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
          selectedIndex={selectedAsset} onSelect={handleSelectAsset} />

        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Opções Binárias OTC</h1>
              <p className="text-sm text-white/40 mt-0.5">Operações com inspiração automática</p>
            </div>
          </div>

          {/* Seletor de ativo — botão que abre modal */}
          <button onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all hover:bg-white/[0.06] active:scale-[0.995] group"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${asset.color}20`, border: `1px solid ${asset.color}40` }}>
                <Activity className="w-4 h-4" style={{ color: asset.color }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white leading-tight">{asset.symbol} OTC</p>
                <p className="text-[11px] font-medium text-white/40">{asset.name} · {asset.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-mono text-white/60">{currentPrice.toFixed(4)}</p>
                <p className="text-[10px] text-white/30">{ASSETS.length} ativos disponíveis</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-300 transition-all group-hover:bg-blue-500/20"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <ChevronDown className="w-3.5 h-3.5" /> Trocar
              </div>
            </div>
          </button>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* Chart */}
            <div className="xl:col-span-3 space-y-4">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${asset.color}20` }}>
                      <Activity className="w-5 h-5" style={{ color: asset.color }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{asset.symbol} OTC</h2>
                      <p className="text-[10px] text-white/40">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white font-mono">{currentPrice.toFixed(4)}</p>
                    <p className={cn("text-sm font-semibold flex items-center justify-end gap-1", isPositive ? "text-green-400" : "text-red-400")}>
                      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <ProfessionalChart
                  data={chartData}
                  currentPrice={currentPrice}
                  assetColor={asset.color}
                  assetSymbol={`${asset.symbol} OTC`}
                  isPositive={isPositive}
                  priceChange={priceChange}
                  entryPrice={account.positions.length > 0 ? account.positions[0].entryPrice : undefined}
                  positionType={account.positions.length > 0 ? account.positions[0].type : undefined}
                />
              </div>
            </div>

            {/* Trading Panel — idêntico ao Trade.tsx */}
            <div className="glass-card rounded-2xl p-5 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setDirection("call")}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      direction === "call" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20" : "bg-white/5 text-white/40 hover:bg-white/10")}>
                    <TrendingUp className="w-4 h-4" /> CALL
                  </button>
                  <button onClick={() => setDirection("put")}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      direction === "put" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20" : "bg-white/5 text-white/40 hover:bg-white/10")}>
                    <TrendingDown className="w-4 h-4" /> PUT
                  </button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-white/40">Valor da Aposta</Label>
                  <div className="relative">
                    <Input type="number" placeholder="0.00" value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="bg-white/5 border-white/10 text-white h-12 pl-10 font-mono" />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">R$</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 50, 100, 500].map((val) => (
                      <button key={val} onClick={() => setBetAmount(Math.min(val, balance).toString())}
                        className="py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-white/60 hover:bg-white/10">
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-white/40">Expiração</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPIRATION_TIMES.map((time) => (
                      <button key={time.value} onClick={() => setExpirationTime(time.value)}
                        className={cn("py-2 rounded-lg text-xs font-bold transition-all",
                          expirationTime === time.value ? "bg-blue-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Saldo</span>
                    <span className="text-white font-bold">R$ {(balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Payout (90%)</span>
                    <span className="text-green-400 font-bold">+R$ {(payout || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Risco</span>
                    <span className={cn("font-bold", numBet > balance * 0.6 ? "text-red-400" : "text-white/60")}>
                      {numBet > balance * 0.6 ? "ALTO" : "NORMAL"}
                    </span>
                  </div>
                </div>

                <Button onClick={handleTrade}
                  className={cn("w-full h-14 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95",
                    direction === "call" ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/20" : "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20")}>
                  {direction === "call" ? "📈 CALL" : "📉 PUT"}
                </Button>
              </div>
            </div>
          </div>

          {/* Operações Abertas */}
          {account.positions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Operações Abertas ({account.positions.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {account.positions.map((pos) => {
                  const timeLeft = Math.max(0, Math.floor(((pos.expiresAt || 0) - Date.now()) / 1000));
                  return (
                    <div key={pos.id} className="p-4 rounded-xl space-y-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full animate-pulse", pos.type === "call" ? "bg-green-500" : "bg-red-500")} />
                          <span className="text-xs font-bold text-white">
                            {pos.type === "call" ? "📈 CALL" : "📉 PUT"} {pos.asset} OTC
                          </span>
                        </div>
                        <Badge className="text-[10px] bg-blue-400/10 text-blue-400 border-blue-400/20">
                          <Clock className="w-3 h-3 mr-1" /> {timeLeft}s
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-white/30 uppercase">Entrada</p>
                          <p className="text-white font-mono">R$ {pos.entryPrice.toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/30 uppercase">Atual</p>
                          <p className="text-white font-mono">R$ {pos.currentPrice.toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-xs text-white/40">Aposta: R$ {pos.betAmount.toFixed(2)}</p>
                        <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all duration-1000"
                            style={{ width: `${(timeLeft / (pos.expiresAt ? (pos.expiresAt - pos.entryTime.getTime()) / 1000 : 60)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Histórico */}
          {account.closedPositions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Histórico ({account.closedPositions.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {account.closedPositions.slice().reverse().map((pos) => (
                  <div key={pos.id} className="p-3 rounded-lg flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-3 flex-1">
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {pos.type === "call" ? "📈" : "📉"} {pos.asset} OTC
                        </p>
                        <p className="text-[10px] text-white/40">
                          R$ {pos.entryPrice.toFixed(4)} → R$ {pos.exitPrice?.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {pos.result === "win" ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-bold text-green-400">+R$ {pos.payout?.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-xs font-bold text-red-400">-R$ {pos.betAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }
  