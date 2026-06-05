/**
 * BinaryOptions — Gráfico persistente via servidor + manipulação client-side inalterada
 * Ativos com sufixo OTC. Seeding do servidor ao montar e ao trocar ativo.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { useTrading } from "@/contexts/TradingContext";
import { useChart } from "@/contexts/ChartContext";
import {
  TrendingUp, TrendingDown, Clock, Trophy, X, AlertTriangle,
  RefreshCw, Settings, Zap, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Candle {
  time: string;
  timestamp: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

interface BinaryTrade {
  id: string;
  asset: string;
  direction: "UP" | "DOWN";
  entryPrice: number;
  entryTime: number;
  expiryTime: number;
  amount: number;
  status: "open" | "won" | "lost";
  pnl: number;
  account: "real" | "demo";
  betPercentage: number;
}

const ASSETS = [
  { symbol: "EUR/USD", name: "Euro vs Dólar OTC", startPrice: 1.0850 },
  { symbol: "GBP/USD", name: "Libra vs Dólar OTC", startPrice: 1.2750 },
  { symbol: "USD/JPY", name: "Dólar vs Iene OTC", startPrice: 149.85 },
  { symbol: "AUD/USD", name: "Dólar Aus vs USD OTC", startPrice: 0.6510 },
  { symbol: "USD/CAD", name: "Dólar vs Cad OTC", startPrice: 1.3620 },
  { symbol: "USD/BRL", name: "Dólar vs Real OTC", startPrice: 5.2840 },
  { symbol: "BTC/USD", name: "Bitcoin OTC", startPrice: 67420 },
  { symbol: "ETH/USD", name: "Ethereum OTC", startPrice: 3248.50 },
  { symbol: "XRP/USD", name: "Ripple OTC", startPrice: 0.5230 },
  { symbol: "GOLD", name: "Ouro OTC", startPrice: 2385.50 },
  { symbol: "SILVER", name: "Prata OTC", startPrice: 28.74 },
  { symbol: "PETR4", name: "Petrobras OTC", startPrice: 38.42 },
  { symbol: "VALE3", name: "Vale OTC", startPrice: 61.80 },
  { symbol: "ITUB4", name: "Itaú Unibanco OTC", startPrice: 34.55 },
  { symbol: "BBDC4", name: "Bradesco OTC", startPrice: 14.92 },
  { symbol: "ABEV3", name: "Ambev OTC", startPrice: 11.35 },
  { symbol: "TSLA", name: "Tesla OTC", startPrice: 248.50 },
  { symbol: "NVIDIA", name: "NVIDIA OTC", startPrice: 875.30 },
  { symbol: "AMAZON", name: "Amazon OTC", startPrice: 185.60 },
];

const TIMEFRAMES = [
  { label: "1 Min", value: 60 },
  { label: "5 Min", value: 300 },
  { label: "15 Min", value: 900 },
];

// ── Lógica de preço: INALTERADA ─────────────────────────────────────────────
function generatePriceMovement(
  lastPrice: number,
  direction: "UP" | "DOWN",
  betPercentage: number,
  shouldGoAgainst: boolean
): number {
  // Movimento natural: ruído aleatório + viés direcional muito sutil
  const naturalVol = 0.0010;
  const noise = (Math.random() - 0.5) * lastPrice * naturalVol;

  // Viés: pequeno e proporcional — não causa estouro, só direciona
  const biasStrength = shouldGoAgainst
    ? 0.00012 + (betPercentage / 100) * 0.00010   // 0.012% a 0.022% por tick
    : 0.00006;                                      // 0.006% por tick (a favor)

  const biasDir = shouldGoAgainst
    ? (direction === "UP" ? -1 : 1)
    : (direction === "UP" ? 1 : -1);

  return parseFloat((lastPrice + noise + lastPrice * biasStrength * biasDir).toFixed(4));
}

// Fallback local (usado apenas se servidor ainda não respondeu)
function generateFallbackCandles(count: number, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const timestamp = now - i * 1000;
    const open = price;
    const change = (Math.random() - 0.48) * price * 0.008;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * price * 0.003;
    const low = Math.min(open, close) - Math.random() * price * 0.003;
    candles.push({
      time: new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      open: parseFloat(open.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
    });
    price = close;
  }
  return candles;
}

// ── Componente do gráfico Canvas — INALTERADO ────────────────────────────────
interface BinaryChartProps {
  candles: Candle[];
  currentPrice: number;
  entryPrice?: number;
  direction?: "UP" | "DOWN";
}

function BinaryChart({ candles, currentPrice, entryPrice, direction }: BinaryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    if (!W || !H) return;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const PAD_L = 8, PAD_R = 72, PAD_T = 12, PAD_B = 24;
    const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
    const visible = candles.slice(-50);

    let minP = Math.min(...visible.map(c => c.low));
    let maxP = Math.max(...visible.map(c => c.high));
    if (entryPrice) { minP = Math.min(minP, entryPrice); maxP = Math.max(maxP, entryPrice); }
    if (currentPrice) { minP = Math.min(minP, currentPrice); maxP = Math.max(maxP, currentPrice); }
    const rng = maxP - minP || 1;
    minP -= rng * 0.08; maxP += rng * 0.08;

    const getY = (p: number) => PAD_T + chartH - ((p - minP) / (maxP - minP)) * chartH;
    const getX = (i: number) => PAD_L + (i + 0.5) * (chartW / visible.length);

    ctx.fillStyle = "#080c18";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(W - PAD_R, PAD_T, PAD_R, chartH);

    const gridN = 5;
    for (let i = 0; i <= gridN; i++) {
      const y = PAD_T + (chartH / gridN) * i;
      const p = maxP - ((maxP - minP) / gridN) * i;
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
      ctx.fillStyle = "rgba(130,140,160,0.55)";
      ctx.font = "9.5px 'SF Mono', Consolas, monospace"; ctx.textAlign = "right";
      ctx.fillText(p.toFixed(4), W - 6, y + 3.5);
    }

    const colN = 6;
    for (let c = 1; c < colN; c++) {
      const x = PAD_L + (chartW / colN) * c;
      ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + chartH); ctx.stroke();
    }

    const cW = Math.max(1.5, chartW / visible.length);
    const bW = Math.max(1, cW * 0.6);

    visible.forEach((c, i) => {
      const x = getX(i), oY = getY(c.open), cY = getY(c.close), hY = getY(c.high), lY = getY(c.low);
      const isG = c.close >= c.open, isLast = i === visible.length - 1;
      ctx.save();
      ctx.strokeStyle = isG ? "rgba(0,185,122,0.7)" : "rgba(224,53,53,0.7)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke();
      const bTop = Math.min(oY, cY), bH = Math.max(Math.abs(cY - oY), 1);
      const g = ctx.createLinearGradient(0, bTop, 0, bTop + bH);
      if (isG) { g.addColorStop(0, isLast ? "#00d094" : "#00b87a"); g.addColorStop(1, isLast ? "#008c64" : "#006e48"); }
      else { g.addColorStop(0, isLast ? "#ff4d4d" : "#e03535"); g.addColorStop(1, isLast ? "#c01010" : "#a01010"); }
      ctx.fillStyle = g;
      if (bH > 2) { ctx.beginPath(); ctx.roundRect(x - bW / 2, bTop, bW, bH, Math.min(1.5, bW * 0.15)); ctx.fill(); }
      else ctx.fillRect(x - bW / 2, bTop, bW, bH);
      if (isLast) { ctx.shadowColor = isG ? "#00d094" : "#ff4d4d"; ctx.shadowBlur = 8; ctx.strokeStyle = isG ? "#00d094" : "#ff4d4d"; ctx.lineWidth = 0.5; ctx.stroke(); }
      ctx.restore();
    });

    if (entryPrice && entryPrice >= minP && entryPrice <= maxP) {
      const eY = getY(entryPrice), eC = direction === "UP" ? "#22c55e" : "#f97316";
      const eLabel = direction === "UP" ? "▲ ENTRADA" : "▼ ENTRADA";
      ctx.save(); ctx.strokeStyle = eC; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(PAD_L, eY); ctx.lineTo(W - PAD_R, eY); ctx.stroke();
      ctx.setLineDash([]); ctx.font = "bold 9px 'SF Mono', monospace";
      const em = ctx.measureText(eLabel);
      ctx.fillStyle = `${eC}20`; ctx.strokeStyle = eC; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD_L + 4, eY - 9, em.width + 14, 18, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = eC; ctx.textAlign = "left"; ctx.fillText(eLabel, PAD_L + 11, eY + 4);
      ctx.restore();
    }

    const lastY = Math.max(PAD_T + 1, Math.min(PAD_T + chartH - 1, getY(currentPrice)));
    const isUp = visible.length > 1 && currentPrice >= visible[visible.length - 2].close;
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(PAD_L, lastY); ctx.lineTo(W - PAD_R, lastY); ctx.stroke(); ctx.setLineDash([]);
    const pulse = 3 + Math.sin(Date.now() / 300) * 1, dotX = W - PAD_R - 6;
    const dotCol = isUp ? "#00d094" : "#ff4d4d";
    ctx.fillStyle = dotCol; ctx.shadowColor = dotCol; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(dotX, lastY, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.arc(dotX, lastY, pulse + 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const pText = currentPrice.toFixed(4); ctx.font = "bold 10px 'SF Mono', Consolas, monospace";
    const pm = ctx.measureText(pText), bdgW = pm.width + 16, bdgH = 19, bdgX = W - PAD_R + 2;
    const bdgY = Math.max(PAD_T, Math.min(PAD_T + chartH - bdgH, lastY - bdgH / 2));
    ctx.fillStyle = isUp ? "rgba(0,208,148,0.15)" : "rgba(255,77,77,0.15)"; ctx.strokeStyle = dotCol; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bdgX, bdgY, bdgW, bdgH, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dotCol; ctx.textAlign = "left"; ctx.fillText(pText, bdgX + 8, bdgY + bdgH / 2 + 3.5);
    ctx.restore();

    ctx.fillStyle = "rgba(110,120,140,0.5)"; ctx.font = "8.5px 'SF Mono', Consolas, monospace"; ctx.textAlign = "center";
    const xStep = Math.max(1, Math.floor(visible.length / 6));
    for (let i = 0; i < visible.length; i += xStep) ctx.fillText(visible[i].time, getX(i), H - 6);
  }, [candles, currentPrice, entryPrice, direction]);

  useEffect(() => {
    let raf: number;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "280px" }} />;
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function BinaryOptions() {
  const { activeAccount, withdraw, depositFunds, accounts } = useTrading();
  const { charts } = useChart();

  // Persiste ativo selecionado entre refreshes e login/logout
  const [selectedAsset, setSelectedAsset] = useState(() => {
    const saved = localStorage.getItem("tradeai_binary_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
  });
  const [candles, setCandles] = useState<Candle[]>(() => {
    const saved = localStorage.getItem("tradeai_binary_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    return generateFallbackCandles(60, ASSETS[safeIdx].startPrice);
  });
  const [currentPrice, setCurrentPrice] = useState(() => {
    const saved = localStorage.getItem("tradeai_binary_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    return ASSETS[safeIdx].startPrice;
  });
  const [amount, setAmount] = useState("");
  const [timeframe, setTimeframe] = useState<number>(60);
  const [balance, setBalance] = useState(accounts[activeAccount].balance);
  const [trades, setTrades] = useState<BinaryTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<BinaryTrade[]>([]);

  const tradesRef = useRef<BinaryTrade[]>([]);
  const currentPriceRef = useRef(currentPrice);
  const seededRef = useRef(false);

  const asset = ASSETS[selectedAsset];
  const numAmount = parseFloat(amount) || 0;
  const currentTrade = trades.length > 0 && trades[trades.length - 1].status === "open" ? trades[trades.length - 1] : null;

  useEffect(() => { setBalance(accounts[activeAccount].balance); }, [accounts, activeAccount]);
  useEffect(() => { tradesRef.current = trades; }, [trades]);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);

  // Ao trocar ativo: reseta seed flag, mostra fallback e busca IMEDIATAMENTE do servidor
  useEffect(() => {
    seededRef.current = false;
    const fallback = generateFallbackCandles(60, asset.startPrice);
    setCandles(fallback);
    setCurrentPrice(asset.startPrice);
    currentPriceRef.current = asset.startPrice;

    // Busca direta do servidor para este ativo — não espera o ChartContext global
    fetch(`/api/charts/history/${encodeURIComponent(asset.symbol)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data || !data.candles || data.candles.length === 0) return;
        if (seededRef.current) return; // já foi semeado por outra via
        const serverCandles: Candle[] = data.candles.map((c: any) => ({
          time: c.time,
          timestamp: c.timestamp ?? Date.now(),
          open: c.open,
          close: c.close,
          high: c.high,
          low: c.low,
        }));
        const last = serverCandles[serverCandles.length - 1];
        setCandles(serverCandles.slice(-60));
        setCurrentPrice(last.close);
        currentPriceRef.current = last.close;
        seededRef.current = true;
      })
      .catch(() => {});
  }, [asset.symbol, asset.startPrice]);

  // Quando dados do ChartContext chegam (SSE contínuo): override se ainda não foi semeado
  useEffect(() => {
    if (seededRef.current) return;
    const serverChart = charts[asset.symbol];
    if (serverChart && serverChart.data.length > 0) {
      const serverCandles = serverChart.data.map((c) => ({
        time: c.time,
        timestamp: c.timestamp ?? Date.now(),
        open: c.open,
        close: c.close,
        high: c.high,
        low: c.low,
      }));
      setCandles(serverCandles.slice(-60));
      setCurrentPrice(serverChart.currentPrice);
      currentPriceRef.current = serverChart.currentPrice;
      seededRef.current = true;
    }
  }, [charts, asset.symbol]);

  // ── Lógica de atualização de preço: INALTERADA ───────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prevCandles) => {
        const lastCandle = prevCandles[prevCandles.length - 1];
        let newClose = lastCandle.close;

        if (currentTrade) {
          const shouldGoAgainst = currentTrade.betPercentage >= 50;
          newClose = generatePriceMovement(lastCandle.close, currentTrade.direction, currentTrade.betPercentage, shouldGoAgainst);
        } else {
          const change = (Math.random() - 0.5) * lastCandle.close * 0.008;
          newClose = parseFloat((lastCandle.close + change).toFixed(4));
        }

        const newHigh = Math.max(lastCandle.close, newClose) + Math.random() * Math.abs(newClose - lastCandle.close) * 0.5;
        const newLow = Math.min(lastCandle.close, newClose) - Math.random() * Math.abs(newClose - lastCandle.close) * 0.5;

        const newCandle: Candle = {
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          open: lastCandle.close,
          close: newClose,
          high: parseFloat(newHigh.toFixed(4)),
          low: parseFloat(newLow.toFixed(4)),
        };

        setCurrentPrice(newClose);
        currentPriceRef.current = newClose;
        // APPEND-ONLY para persistência visual (limita a 200 candles)
        const appended = [...prevCandles, newCandle];
        return appended.length > 200 ? appended.slice(-200) : appended;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTrade]);

  // ── Lógica de expiração de trade: INALTERADA ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const openTrades = tradesRef.current.filter(t => t.status === "open");
      openTrades.forEach((trade) => {
        if (now >= trade.expiryTime) {
          const finalPrice = currentPriceRef.current;
          const won = (trade.direction === "UP" && finalPrice > trade.entryPrice) ||
            (trade.direction === "DOWN" && finalPrice < trade.entryPrice);
          if (won) {
            depositFunds(trade.account, trade.amount * 2);
            setBalance((prev) => prev + trade.amount * 2);
            toast.success(`🎉 Vitória! +R$ ${(trade.amount * 2).toFixed(2)}`);
          } else {
            toast.error(`❌ Derrota! -R$ ${trade.amount.toFixed(2)}`);
          }
          setTrades((prevTrades) => {
            const updated = prevTrades.filter(t => t.id !== trade.id);
            setClosedTrades((prev) => [...prev, { ...trade, status: won ? "won" : "lost", pnl: won ? trade.amount : -trade.amount }]);
            return updated;
          });
        }
      });
    }, 100);
    return () => clearInterval(interval);
  }, [depositFunds]);

  // ── Lógica de abertura de trade: INALTERADA ──────────────────────────────
  const handleTrade = (direction: "UP" | "DOWN") => {
    if (!amount || numAmount <= 0) { toast.error("Informe um valor de aposta válido"); return; }
    if (numAmount > balance) { toast.error(`Saldo insuficiente. Você tem R$ ${balance.toFixed(2)}`); return; }
    if (currentTrade) { toast.error("Você já tem uma operação aberta"); return; }

    const betPercentage = (numAmount / accounts[activeAccount].initialBalance) * 100;
    const success = withdraw(activeAccount, numAmount);
    if (!success) { toast.error("Falha ao debitar saldo"); return; }

    setBalance((prev) => prev - numAmount);
    const now = Date.now();
    const newTrade: BinaryTrade = {
      id: `trade_${now}`,
      asset: asset.symbol,
      direction,
      entryPrice: currentPrice,
      entryTime: now,
      expiryTime: now + timeframe * 1000,
      amount: numAmount,
      status: "open",
      pnl: 0,
      account: activeAccount,
      betPercentage,
    };
    setTrades((prev) => [...prev, newTrade]);
    setAmount("");

    if (betPercentage >= 90) toast.warning(`⚠️ ALL-IN! ${betPercentage.toFixed(0)}% — gráfico vai FORTEMENTE contra!`);
    else if (betPercentage >= 50) toast.warning(`⚠️ Aposta grande: ${betPercentage.toFixed(0)}% — gráfico vai contra!`);
    else if (betPercentage >= 10) toast.info(`📊 Aposta média: ${betPercentage.toFixed(0)}%`);
    else toast.success(`✅ Aposta pequena: ${betPercentage.toFixed(0)}% — a favor!`);
  };

  const shouldShowAgainstIndicator = currentTrade && currentTrade.betPercentage >= 50;
  const timeRemaining = currentTrade ? Math.max(0, Math.ceil((currentTrade.expiryTime - Date.now()) / 1000)) : 0;

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Opções Binárias OTC</h1>
            <p className="text-xs text-white/35 mt-0.5">Gráfico persistente · Manipulação inteligente</p>
          </div>
          {currentTrade && (
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border",
              shouldShowAgainstIndicator
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-green-500/10 border-green-500/30 text-green-400")}>
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", shouldShowAgainstIndicator ? "bg-red-400" : "bg-green-400")} />
              {shouldShowAgainstIndicator ? "Gráfico contra você" : "Gráfico a seu favor"}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Lista de ativos */}
          <div className="rounded-2xl p-4 space-y-1.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">Ativos OTC</h3>
            {ASSETS.map((a, i) => (
              <button key={i} onClick={() => { setSelectedAsset(i); localStorage.setItem("tradeai_binary_asset", String(i)); }}
                className={cn("w-full text-left p-3 rounded-xl transition-all",
                  selectedAsset === i ? "border" : "hover:bg-white/[0.04] border border-transparent")}
                style={selectedAsset === i ? { background: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.35)" } : {}}>
                <p className="text-sm font-semibold text-white">{a.symbol} OTC</p>
                <p className="text-[11px] text-white/35">{a.name}</p>
              </button>
            ))}
          </div>

          {/* Gráfico Canvas */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{asset.symbol} OTC</span>
                <span className="text-xs font-mono text-white/50">{currentPrice.toFixed(4)}</span>
              </div>
              {currentTrade && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span className={cn("text-xs font-bold font-mono", timeRemaining <= 10 ? "text-red-400 animate-pulse" : "text-white/60")}>
                    {timeRemaining}s
                  </span>
                </div>
              )}
            </div>
            <BinaryChart candles={candles} currentPrice={currentPrice}
              entryPrice={currentTrade?.entryPrice} direction={currentTrade?.direction} />
          </div>

          {/* Painel de operação */}
          <div className="rounded-2xl p-4 space-y-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Saldo</p>
              <p className="text-2xl font-bold text-green-400 font-mono">R$ {balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Expiração</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TIMEFRAMES.map((tf) => (
                  <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                    className={cn("py-2 rounded-lg text-xs font-semibold transition-all border",
                      timeframe === tf.value ? "text-blue-300 border-blue-500/40" : "text-white/35 border-white/[0.08] hover:text-white/60 hover:bg-white/[0.05]")}
                    style={timeframe === tf.value ? { background: "rgba(59,130,246,0.2)" } : {}}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Valor (R$)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="font-mono" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 25, 50, 100].map((v) => (
                <button key={v} onClick={() => setAmount(Math.min(v, balance).toString())}
                  className="py-1.5 rounded-lg text-[10px] font-semibold text-white/50 transition-all hover:text-white/80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {v}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => handleTrade("UP")} disabled={!!currentTrade}
                className={cn("py-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1",
                  currentTrade ? "opacity-40 cursor-not-allowed" : "hover:scale-105 active:scale-95")}
                style={{ background: currentTrade ? "rgba(34,197,94,0.1)" : "linear-gradient(135deg, #22c55e, #16a34a)", border: "1px solid rgba(34,197,94,0.4)" }}>
                <TrendingUp className="w-5 h-5" />
                <span>SUBIR</span>
              </button>
              <button onClick={() => handleTrade("DOWN")} disabled={!!currentTrade}
                className={cn("py-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1",
                  currentTrade ? "opacity-40 cursor-not-allowed" : "hover:scale-105 active:scale-95")}
                style={{ background: currentTrade ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg, #ef4444, #dc2626)", border: "1px solid rgba(239,68,68,0.4)" }}>
                <TrendingDown className="w-5 h-5" />
                <span>CAIR</span>
              </button>
            </div>

            {currentTrade && (
              <div className="p-3 rounded-xl space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Entrada</span>
                  <span className="text-white font-mono">{currentTrade.entryPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Direção</span>
                  <span className={currentTrade.direction === "UP" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {currentTrade.direction === "UP" ? "▲ SUBIR" : "▼ CAIR"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Expira em</span>
                  <span className={cn("font-mono font-bold", timeRemaining <= 10 ? "text-red-400 animate-pulse" : "text-white")}>
                    {timeRemaining}s
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                  <div className="bg-blue-500 h-full transition-all duration-1000"
                    style={{ width: `${(timeRemaining / timeframe) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Histórico */}
        {closedTrades.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="text-sm font-bold text-white mb-3">Histórico ({closedTrades.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {closedTrades.slice().reverse().map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {t.direction === "UP" ? "▲" : "▼"} {t.asset} OTC
                    </p>
                    <p className="text-[10px] text-white/40">{t.amount.toFixed(2)} · {t.entryPrice.toFixed(4)}</p>
                  </div>
                  <span className={cn("text-xs font-bold", t.status === "won" ? "text-green-400" : "text-red-400")}>
                    {t.status === "won" ? `+R$ ${(t.amount).toFixed(2)}` : `-R$ ${t.amount.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
