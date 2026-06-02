/*
 * Trade — Opções Binárias Profissional (IQ Option Style)
 * Gráfico persistente: seeding do servidor, manipulação client-side inalterada.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import ProfessionalChart from "@/components/ProfessionalChart";
import { useTrading } from "@/contexts/TradingContext";
import { useChart } from "@/contexts/ChartContext";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Fallback local (usado apenas se o servidor ainda não respondeu)
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
  { symbol: "PETR4", name: "Petrobras OTC", startPrice: 38.42, color: "#3b82f6", type: "Ação" },
  { symbol: "VALE3", name: "Vale OTC", startPrice: 61.80, color: "#06b6d4", type: "Ação" },
  { symbol: "ITUB4", name: "Itaú OTC", startPrice: 34.55, color: "#8b5cf6", type: "Ação" },
];

const EXPIRATION_TIMES = [
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "15m", value: 900 },
];

export default function Trade() {
  const { activeAccount, openBinaryOption, closeBinaryOption, updateOptionPrice, accounts, getAccountBalance, getManipulationFactor } = useTrading();
  const { charts } = useChart();

  // Persiste ativo selecionado entre refreshes e login/logout
  const [selectedAsset, setSelectedAsset] = useState(() => {
    const saved = localStorage.getItem("tradeai_trade_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
  });
  const [chartData, setChartData] = useState(() => {
    const saved = localStorage.getItem("tradeai_trade_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    return generatePriceData(80, ASSETS[safeIdx].startPrice);
  });
  const [currentPrice, setCurrentPrice] = useState(() => {
    const saved = localStorage.getItem("tradeai_trade_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    return ASSETS[safeIdx].startPrice;
  });
  const [priceChange, setPriceChange] = useState(0);
  const [direction, setDirection] = useState<"call" | "put">("call");
  const [betAmount, setBetAmount] = useState("");
  const [expirationTime, setExpirationTime] = useState(60);

  const seededRef = useRef(false);

  const asset = ASSETS[selectedAsset] || ASSETS[0];
  const balance = getAccountBalance(activeAccount) || 0;
  const account = accounts[activeAccount] || accounts.demo;
  const numBet = parseFloat(betAmount) || 0;
  const payout = numBet * 1.9;

  // Ao trocar ativo: reseta state e flag de seed
  useEffect(() => {
    seededRef.current = false;
    const fallback = generatePriceData(80, asset.startPrice);
    setChartData(fallback);
    setCurrentPrice(asset.startPrice);
    setPriceChange(0);
  }, [asset.symbol, asset.startPrice]);

  // Quando dados do servidor chegam: override com histórico persistente (apenas 1x por ativo)
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

  // ── Intervalo de geração de preço com manipulação — LÓGICA INALTERADA ──────
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prev) => {
        if (!prev || prev.length === 0) return prev;

        const last = prev[prev.length - 1];
        const first = prev[0];
        const manipulation = getManipulationFactor(activeAccount) || { shouldWin: false, intensity: 0 };

        const baseVolatility = 0.0010;
        const u1 = Math.random();
        const u2 = Math.random();
        const gaussianNoise = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
        let drift = 0;

        if (account && account.positions && account.positions.length > 0) {
          const pos = account.positions[0];
          const totalDuration = pos.expiresAt ? (pos.expiresAt - pos.entryTime.getTime()) : 60000;
          const timeRemaining = (pos.expiresAt || 0) - Date.now();
          const timeElapsed = totalDuration - timeRemaining;
          const progress = Math.min(1, Math.max(0, timeElapsed / totalDuration));

          // Lógica natural: leve viés durante o trade + correção suave só no final se necessário
          const isCallType = pos.type === "call";
          const priceVsEntry = last.price - pos.entryPrice;
          const currentlyWinning = (isCallType && priceVsEntry > 0) || (!isCallType && priceVsEntry < 0);
          const shouldWin = manipulation.shouldWin;
          const targetUp = shouldWin ? isCallType : !isCallType;

          if (progress < 0.80) {
            // Primeiros 80%: viés levíssimo, parece mercado natural
            drift = (targetUp ? 1 : -1) * manipulation.intensity * 0.000045;
          } else {
            // Últimos 20%: verifica se já está do lado certo
            if (currentlyWinning === shouldWin) {
              // Já no lado correto — mantém com micro-drift
              drift = (targetUp ? 1 : -1) * 0.000025;
            } else {
              // No lado errado — correção proporcional ao tempo restante
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

        setCurrentPrice(newPrice);
        if (first) {
          setPriceChange(((newPrice - first.price) / first.price) * 100);
        }

        if (account && account.positions) {
          account.positions.forEach((pos) => {
            updateOptionPrice(activeAccount, pos.id, newPrice);
            if (pos.expiresAt && Date.now() >= pos.expiresAt) {
              closeBinaryOption(activeAccount, pos.id, newPrice);
              const isWin = (pos.type === "call" && newPrice > pos.entryPrice) ||
                (pos.type === "put" && newPrice < pos.entryPrice);
              if (isWin) {
                toast.success(`✅ VITÓRIA! Ganhou R$ ${(pos.betAmount * 0.9).toFixed(2)}`);
              } else {
                toast.error(`❌ DERROTA! Perdeu R$ ${pos.betAmount.toFixed(2)}`);
              }
            }
          });
        }

        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAccount, account, updateOptionPrice, closeBinaryOption, getManipulationFactor]);

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
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Opções Binárias</h1>
            <p className="text-sm text-white/40 mt-0.5">Operações com expiração automática</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Asset Selector */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Ativos</h3>
            {ASSETS.map((a, i) => (
              <button
                key={i}
                onClick={() => { setSelectedAsset(i); localStorage.setItem("tradeai_trade_asset", String(i)); }}
                className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left", selectedAsset === i ? "border" : "hover:bg-white/5")}
                style={selectedAsset === i ? { background: `${a.color}15`, border: `1px solid ${a.color}35` } : {}}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: `${a.color}25`, border: `1px solid ${a.color}45` }}>
                  {a.symbol.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{a.symbol} OTC</p>
                  <p className="text-[10px] text-white/40 truncate">{a.name}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="xl:col-span-2 space-y-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{asset.symbol} OTC</h2>
                    <p className="text-[10px] text-white/40">{asset.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white font-mono">R$ {currentPrice.toFixed(2)}</p>
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

          {/* Trading Panel */}
          <div className="glass-card rounded-2xl p-5 space-y-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setDirection("call")}
                  className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    direction === "call" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20" : "bg-white/5 text-white/40 hover:bg-white/10")}
                >
                  <TrendingUp className="w-4 h-4" /> CALL
                </button>
                <button
                  onClick={() => setDirection("put")}
                  className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    direction === "put" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20" : "bg-white/5 text-white/40 hover:bg-white/10")}
                >
                  <TrendingDown className="w-4 h-4" /> PUT
                </button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/40">Valor da Aposta</Label>
                <div className="relative">
                  <Input
                    type="number" placeholder="0.00" value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-12 pl-10 font-mono"
                  />
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

              <Button
                onClick={handleTrade}
                className={cn("w-full h-14 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95",
                  direction === "call" ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/20" : "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20")}>
                {direction === "call" ? "📈 CALL" : "📉 PUT"}
              </Button>
            </div>
          </div>
        </div>

        {/* Open Positions */}
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
                        <p className="text-white font-mono">R$ {pos.entryPrice.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 uppercase">Atual</p>
                        <p className="text-white font-mono">R$ {pos.currentPrice.toFixed(2)}</p>
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

        {/* Closed Positions */}
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
                        R$ {pos.entryPrice.toFixed(2)} → R$ {pos.exitPrice?.toFixed(2)}
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
