/**
 * ProfessionalChart — Estilo IQ Option / Quotex
 *
 * CORREÇÕES CRÍTICAS:
 * ① Scroll invertido: scrollOffset=0 = candles MAIS RECENTES (não as mais antigas)
 * ② Dados append-only em Trade.tsx → índices absolutos nunca mudam → trend line não se move
 * ③ Visual completamente renovado: paleta IQ Option, sem gradientes pesados
 *
 * NÃO ALTERAR: lógica de preço GBM, cálculo de ganho/perda, manipulação
 */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  ZoomIn, ZoomOut, RefreshCw, Maximize2, Minimize2,
  X, TrendingUp, Minus, GitBranch, BarChart2
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────
interface CandleData {
  time: string; open: number; close: number;
  high: number; low: number; volume: number; price: number;
}
interface ChartTheme {
    bgColor?: string;
    bullColor?: string;
    bearColor?: string;
    gridColor?: string;
    axisColor?: string;
  }
  interface ProfessionalChartProps {
    data: CandleData[]; currentPrice: number; assetColor: string;
    assetSymbol: string; isPositive: boolean; priceChange: number;
    entryPrice?: number; positionType?: "call" | "put"; theme?: ChartTheme;
  }
type ToolType = "cursor" | "hline" | "tline" | "fib" | "risk";
interface Drawing {
  id: string; type: ToolType;
  // idx = índice ABSOLUTO no array data completo (append-only → nunca muda)
  p1: { price: number; idx: number };
  p2?: { price: number; idx: number };
  color: string;
}

// ── Constantes de layout ────────────────────────────────────────────────────
const PAD_L = 2;
const PAD_R = 78;  // espaço para eixo Y
const PAD_T = 10;

// ── Paleta IQ Option ────────────────────────────────────────────────────────
const BULL_COLOR   = "#35c789";
const BEAR_COLOR   = "#f5555d";
const BG_COLOR     = "#070c14";
const GRID_COLOR   = "rgba(255,255,255,0.045)";
const AXIS_COLOR   = "rgba(180,190,210,0.45)";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h"];
const TOOL_COLORS: Record<ToolType, string> = {
  cursor: "#fff", hline: "#f5c542", tline: "#5b9cf6",
  fib: "#b47de3", risk: "#f97316"
};
const TOOL_LABELS: Record<ToolType, string> = {
  cursor: "✛", hline: "H-Line", tline: "Tendência", fib: "Fibonacci", risk: "R/R"
};

// ── Indicadores ─────────────────────────────────────────────────────────────
function calcMA(data: CandleData[], period: number) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.close, 0) / period;
  });
}
function calcBB(data: CandleData[], period = 20, mult = 2) {
  const ma = calcMA(data, period);
  return data.map((_, i) => {
    if (ma[i] === null) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = ma[i] as number;
    const std = Math.sqrt(slice.reduce((s, d) => s + (d.close - mean) ** 2, 0) / period);
    return { upper: mean + mult * std, mid: mean, lower: mean - mult * std };
  });
}
function calcRSI(data: CandleData[], period = 14) {
  const rsi: (number | null)[] = Array(data.length).fill(null);
  if (data.length < period + 1) return rsi;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  rsi[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
    rsi[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return rsi;
}

function calcEMA(data: CandleData[], period: number) {
    const k = 2 / (period + 1);
    const ema: (number | null)[] = Array(data.length).fill(null);
    let prev = 0, started = false;
    for (let i = 0; i < data.length; i++) {
      if (!started) {
        if (i < period - 1) continue;
        prev = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
        ema[i] = prev; started = true;
      } else {
        prev = data[i].close * k + prev * (1 - k);
        ema[i] = prev;
      }
    }
    return ema;
  }

  // ── Componente principal ────────────────────────────────────────────────────
export default function ProfessionalChart({
    data, currentPrice, assetColor, assetSymbol,
    isPositive, priceChange, entryPrice, positionType, theme,
  }: ProfessionalChartProps) {
    // Shadow module-level constants with per-asset theme overrides
    const BG_COLOR    = theme?.bgColor    ?? "#070c14";
    const BULL_COLOR  = theme?.bullColor  ?? "#35c789";
    const BEAR_COLOR  = theme?.bearColor  ?? "#f5555d";
    const GRID_COLOR  = theme?.gridColor  ?? "rgba(255,255,255,0.045)";
    const AXIS_COLOR  = theme?.axisColor  ?? "rgba(180,190,210,0.45)";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalRef  = useRef<HTMLCanvasElement>(null);

  const [zoomLevel,    setZoomLevel]    = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);  // 0 = ver candles mais recentes
  const [timeframe,    setTimeframe]    = useState("1m");
  const [showMA,  setShowMA]  = useState(true);
  const [showBB,  setShowBB]  = useState(false);
  const [showVol, setShowVol] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [drawingState, setDrawingState] = useState<{
    active: boolean;
    p1?: { price: number; idx: number };
    preview?: { x: number; y: number };
  }>({ active: false });
  const [crosshair, setCrosshair] = useState({ x: 0, y: 0, visible: false });
  const [hoverCandle, setHoverCandle] = useState<(CandleData & { x: number; y: number }) | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const TF_ZOOM: Record<string, number> = { "1m": 1, "5m": 2, "15m": 3, "30m": 4, "1h": 5 };
  const handleZoomIn  = () => setZoomLevel(p => Math.min(p + 0.5, 8));
  const handleZoomOut = () => setZoomLevel(p => Math.max(p - 0.5, 0.3));
  const handleReset   = () => { setZoomLevel(1); setScrollOffset(0); };
  const handleTimeframe = (tf: string) => { setTimeframe(tf); setZoomLevel(TF_ZOOM[tf]); setScrollOffset(0); };

  // ── ① SCROLL INVERTIDO: scrollOffset=0 = candles mais recentes à direita ──
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalCandles = data.length;
    // Quantas candles mostrar (mais zoom = menos candles = mais detalhe)
    const visible = Math.max(8, Math.round(totalCandles / zoomLevel));

    // end: onde termina a janela visível (em termos de índice no array)
    // scrollOffset=0 → end = totalCandles (ver até o final, as mais recentes)
    // scrollOffset=N → end = totalCandles - N (ir N candles para o passado)
    const end   = Math.max(visible, totalCandles - Math.max(0, scrollOffset));
    const start = Math.max(0, end - visible);
    const vd    = data.slice(start, end);

    if (!vd.length) return null;

    let minP = Math.min(...vd.map(d => d.low));
    let maxP = Math.max(...vd.map(d => d.high));
    if (currentPrice) { minP = Math.min(minP, currentPrice); maxP = Math.max(maxP, currentPrice); }
    if (entryPrice)   { minP = Math.min(minP, entryPrice);   maxP = Math.max(maxP, entryPrice); }

    const rng = (maxP - minP) || 0.01;
    minP -= rng * 0.08;
    maxP += rng * 0.08;

    const bbFull  = calcBB(data, 20);
      const bbSlice = bbFull.slice(start, end);
      if (showBB) {
        bbSlice.forEach(b => {
          if (!b) return;
          minP = Math.min(minP, b.lower); maxP = Math.max(maxP, b.upper);
        });
      }
      const ema9Slice  = calcEMA(data, 9).slice(start, end);
      const ema21Slice = calcEMA(data, 21).slice(start, end);

    return {
      visibleData: vd,
      startIndex: start,
      minPrice: minP, maxPrice: maxP,
      maSlice:  calcMA(data, 20).slice(start, end),
      bbSlice,
      ema9Slice, ema21Slice,
      rsiSlice: calcRSI(data, 14).slice(start, end),
    };
  }, [data, zoomLevel, scrollOffset, currentPrice, entryPrice, showBB, showEMA]);

  // ── Renderização do canvas ────────────────────────────────────────────────
  const drawChart = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !canvas.offsetWidth || !canvas.offsetHeight || !chartData) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const volH = showVol ? 52  : 0;
    const rsiH = showRSI ? 64  : 0;
    const PAD_B = 22 + volH + rsiH;
    const mainH = H - PAD_T - PAD_B;
    const chartW = W - PAD_L - PAD_R;

    const { visibleData: vd, startIndex, minPrice, maxPrice,
            maSlice, bbSlice, ema9Slice, ema21Slice, rsiSlice } = chartData;

    const getY = (p: number) =>
      PAD_T + mainH - ((p - minPrice) / (maxPrice - minPrice)) * mainH;
    const getX = (i: number) =>
      PAD_L + (i + 0.5) * (chartW / vd.length);

    // ── Fundo ───────────────────────────────────────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // ── Faixa do eixo Y (direita) ────────────────────────────────────────
    ctx.fillStyle = "rgba(10,14,26,0.7)";
    ctx.fillRect(W - PAD_R, 0, PAD_R, H);

    // Divisória vertical sutil
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - PAD_R, PAD_T); ctx.lineTo(W - PAD_R, H - PAD_B); ctx.stroke();

    // ── Grid horizontal + labels Y ───────────────────────────────────────
    const gridRows = 6;
    for (let r = 0; r <= gridRows; r++) {
      const y = PAD_T + (mainH / gridRows) * r;
      const p = maxPrice - ((maxPrice - minPrice) / gridRows) * r;

      ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();

      ctx.fillStyle = AXIS_COLOR;
      ctx.font = "10px 'SF Mono', Consolas, monospace";
      ctx.textAlign = "right";
      ctx.fillText(p.toFixed(2), W - 6, y + 3.5);
    }

    // ── Grid vertical (tempo) – muito sutil ──────────────────────────────
    const colN = Math.min(8, vd.length);
    for (let c = 1; c < colN; c++) {
      const x = PAD_L + (chartW / colN) * c;
      ctx.strokeStyle = "rgba(255,255,255,0.02)"; ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + mainH); ctx.stroke();
    }

    // ── Bollinger Bands ───────────────────────────────────────────────────
    if (showBB) {
      // Area fill
      ctx.save();
      ctx.beginPath();
      let firstBB = true;
      bbSlice.forEach((b, i) => {
        if (!b) return;
        if (firstBB) { ctx.moveTo(getX(i), getY(b.upper)); firstBB = false; }
        else ctx.lineTo(getX(i), getY(b.upper));
      });
      [...bbSlice].reverse().forEach((b, ri) => {
        if (!b) return;
        ctx.lineTo(getX(bbSlice.length - 1 - ri), getY(b.lower));
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(180,120,255,0.04)"; ctx.fill();

      (["upper", "lower"] as const).forEach(key => {
        ctx.beginPath();
        let fst = true;
        bbSlice.forEach((b, i) => {
          if (!b) return;
          if (fst) { ctx.moveTo(getX(i), getY(b[key])); fst = false; }
          else ctx.lineTo(getX(i), getY(b[key]));
        });
        ctx.strokeStyle = "rgba(180,120,255,0.5)"; ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      });

      // Middle
      ctx.beginPath(); let fstM = true;
      bbSlice.forEach((b, i) => {
        if (!b) return;
        if (fstM) { ctx.moveTo(getX(i), getY(b.mid)); fstM = false; }
        else ctx.lineTo(getX(i), getY(b.mid));
      });
      ctx.strokeStyle = "rgba(180,120,255,0.6)"; ctx.lineWidth = 1;
      ctx.setLineDash([]); ctx.stroke();
      ctx.restore();
    }

    // ── MA20 ──────────────────────────────────────────────────────────────
    if (showMA && !showBB) {
      ctx.save();
      ctx.beginPath(); let fstMA = true;
      maSlice.forEach((v, i) => {
        if (v === null) return;
        if (fstMA) { ctx.moveTo(getX(i), getY(v)); fstMA = false; }
        else ctx.lineTo(getX(i), getY(v));
      });
      ctx.strokeStyle = "#f5a623"; ctx.lineWidth = 1.5;
      ctx.setLineDash([]); ctx.stroke();
      ctx.restore();
    }

    // ── EMA 9 e EMA 21 ──────────────────────────────────────────────────────
      if (showEMA) {
        [{ slice: ema9Slice, color: "#00e5ff", label: "EMA9" }, { slice: ema21Slice, color: "#ff9800", label: "EMA21" }].forEach(({ slice, color, label }) => {
          ctx.save();
          ctx.beginPath(); let fstE = true;
          slice.forEach((v, i) => {
            if (v === null) return;
            if (fstE) { ctx.moveTo(getX(i), getY(v)); fstE = false; }
            else ctx.lineTo(getX(i), getY(v));
          });
          ctx.strokeStyle = color; ctx.lineWidth = 1.3;
          ctx.shadowColor = color; ctx.shadowBlur = 4;
          ctx.setLineDash([]); ctx.stroke();
          ctx.shadowBlur = 0;
          // Label no eixo Y
          const lastEMAVal = slice.filter(v => v !== null).at(-1);
          if (lastEMAVal !== null && lastEMAVal !== undefined) {
            const ey = getY(lastEMAVal);
            ctx.font = "8px 'SF Mono', monospace";
            ctx.fillStyle = color; ctx.textAlign = "left";
            ctx.fillText(label, W - PAD_R + 3, ey + 3);
          }
          ctx.restore();
        });
      }

          // ── Candlesticks — estilo IQ Option (sólido, sem gradiente) ──────────
    const cW  = chartW / vd.length;
    const bW  = Math.max(1, cW * 0.65);  // largura do corpo

    vd.forEach((c, i) => {
      const x   = getX(i);
      const oY  = getY(c.open), cY = getY(c.close);
      const hY  = getY(c.high), lY = getY(c.low);
      const isG = c.close >= c.open;
      const isLast = (i === vd.length - 1);

      const colBody = isG ? BULL_COLOR : BEAR_COLOR;
      const colWick = isG ? "rgba(53,199,137,0.65)" : "rgba(245,85,93,0.65)";

      ctx.save();

      // Pavio (wick)
      ctx.strokeStyle = colWick;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, hY);
      ctx.lineTo(x, lY);
      ctx.stroke();

      // Corpo
      const bTop = Math.min(oY, cY);
      const bH   = Math.max(Math.abs(cY - oY), 1.5);

      ctx.fillStyle = colBody;

      if (bH > 2 && bW > 4) {
        ctx.beginPath();
        ctx.roundRect(x - bW / 2, bTop, bW, bH, 1);
        ctx.fill();
      } else {
        ctx.fillRect(x - bW / 2, bTop, bW, bH);
      }

      // Última candle: leve destaque de borda
      if (isLast) {
        ctx.strokeStyle = colBody;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.6;
        if (bH > 2 && bW > 4) {
          ctx.beginPath(); ctx.roundRect(x - bW / 2, bTop, bW, bH, 1); ctx.stroke();
        }
      }

      ctx.restore();
    });

    // ── Linha de preço atual ─────────────────────────────────────────────
    const curCol = isPositive ? BULL_COLOR : BEAR_COLOR;
    const lastY  = Math.max(PAD_T + 2, Math.min(PAD_T + mainH - 2, getY(currentPrice)));

    // Linha tracejada
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(PAD_L, lastY); ctx.lineTo(W - PAD_R, lastY); ctx.stroke();
    ctx.setLineDash([]);

    // Pulsação no início do eixo Y
    const t   = Date.now() / 400;
    const pRad = 3 + Math.sin(t) * 1.2;
    const dotX = W - PAD_R - 5;
    ctx.fillStyle = curCol;
    ctx.shadowColor = curCol; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(dotX, lastY, pRad, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.arc(dotX, lastY, pRad + 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Badge de preço no eixo Y (estilo IQ Option: retângulo colorido)
    ctx.font = "bold 10.5px 'SF Mono', Consolas, monospace";
    const pTxt = currentPrice.toFixed(2);
    const pM   = ctx.measureText(pTxt);
    const bdgW = pM.width + 18;
    const bdgH = 20;
    const bdgX = W - PAD_R + 1;
    const bdgY = Math.max(PAD_T, Math.min(PAD_T + mainH - bdgH, lastY - bdgH / 2));

    ctx.fillStyle = curCol;
    ctx.beginPath(); ctx.roundRect(bdgX, bdgY, bdgW, bdgH, 3); ctx.fill();
    ctx.fillStyle = "#000"; ctx.textAlign = "left";
    ctx.fillText(pTxt, bdgX + 9, bdgY + bdgH / 2 + 3.5);
    ctx.restore();

    // ── Linha de entrada (CALL/PUT) ──────────────────────────────────────
    if (entryPrice && entryPrice >= minPrice && entryPrice <= maxPrice) {
      const eY  = getY(entryPrice);
      const eC  = positionType === "call" ? BULL_COLOR : "#f97316";
      const eLb = positionType === "call" ? "▲ ENTRADA" : "▼ ENTRADA";

      ctx.save();
      ctx.strokeStyle = eC; ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(PAD_L, eY); ctx.lineTo(W - PAD_R, eY); ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "bold 9px 'SF Mono', monospace";
      const ew = ctx.measureText(eLb).width + 16;
      ctx.fillStyle = `${eC}22`; ctx.strokeStyle = eC; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD_L + 4, eY - 10, ew, 20, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = eC; ctx.textAlign = "left";
      ctx.fillText(eLb, PAD_L + 12, eY + 4);
      ctx.restore();
    }

    // ── ② DESENHOS (trend line usa índices absolutos → não se move) ──────
    drawings.forEach(d => {

      if (d.type === "hline") {
        if (d.p1.price < minPrice || d.p1.price > maxPrice) return;
        const y = getY(d.p1.price);
        ctx.save();
        ctx.strokeStyle = d.color; ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "9.5px 'SF Mono', monospace";
        ctx.fillStyle = d.color; ctx.textAlign = "right";
        ctx.fillText(d.p1.price.toFixed(2), W - PAD_R - 4, y - 4);
        ctx.restore();
      }

      if (d.type === "tline" && d.p2) {
        // Converter índices absolutos → relativos ao slice visível
        const rel1 = d.p1.idx - startIndex;
        const rel2 = d.p2.idx - startIndex;

        // Coordenadas dos pontos âncora (podem estar fora da área visível)
        const x1 = getX(rel1), y1 = getY(d.p1.price);
        const x2 = getX(rel2), y2 = getY(d.p2.price);

        const dx = x2 - x1, dy = y2 - y1;
        const xMin = PAD_L, xMax = W - PAD_R;

        // Extrapolação para limites do gráfico
        let lx1 = xMin, ly1 = y1, lx2 = xMax, ly2 = y2;
        if (dx !== 0) {
          const slope = dy / dx;
          ly1 = y1 + slope * (xMin - x1);
          ly2 = y1 + slope * (xMax - x1);
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(PAD_L, PAD_T, chartW, mainH);
        ctx.clip();

        ctx.strokeStyle = d.color; ctx.lineWidth = 1.5;
        ctx.shadowColor = d.color; ctx.shadowBlur = 6;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Marcadores nos pontos âncora se visíveis
        if (rel1 >= 0 && rel1 < vd.length) {
          ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        if (rel2 >= 0 && rel2 < vd.length) {
          ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }

      if (d.type === "fib" && d.p2) {
        const hi = Math.max(d.p1.price, d.p2.price);
        const lo = Math.min(d.p1.price, d.p2.price);
        const rng = hi - lo;
        const lvls = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const cols = ["#ef4444", "#f97316", "#f5c542", "#22c55e", "#60a5fa", "#a78bfa", "#ef4444"];
        lvls.forEach((lv, li) => {
          const p = hi - rng * lv;
          if (p < minPrice || p > maxPrice) return;
          const y = getY(p);
          ctx.save();
          ctx.strokeStyle = cols[li]; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.font = "9px 'SF Mono', monospace"; ctx.fillStyle = cols[li]; ctx.textAlign = "right";
          ctx.fillText(`${(lv * 100).toFixed(1)}% ${p.toFixed(2)}`, W - PAD_R - 4, y - 2);
          ctx.restore();
        });
      }

      if (d.type === "risk" && d.p2) {
        const entry  = d.p1.price, target = d.p2.price;
        const stop   = entry - (target - entry) * 0.5;
        const eY = getY(entry), tY = getY(target), sY = getY(stop);

        ctx.save();
        const pg = ctx.createLinearGradient(0, Math.min(eY, tY), 0, Math.max(eY, tY));
        pg.addColorStop(0, "rgba(34,197,94,0.1)"); pg.addColorStop(1, "rgba(34,197,94,0.02)");
        ctx.fillStyle = pg;
        ctx.fillRect(PAD_L, Math.min(eY, tY), chartW, Math.abs(tY - eY));

        const rg = ctx.createLinearGradient(0, Math.min(eY, sY), 0, Math.max(eY, sY));
        rg.addColorStop(0, "rgba(239,68,68,0.02)"); rg.addColorStop(1, "rgba(239,68,68,0.1)");
        ctx.fillStyle = rg;
        ctx.fillRect(PAD_L, Math.min(eY, sY), chartW, Math.abs(sY - eY));

        [
          [eY, "#f5c542", `Entrada ${entry.toFixed(2)}`],
          [tY, BULL_COLOR, `Alvo ${target.toFixed(2)}`],
          [sY, BEAR_COLOR, `Stop ${stop.toFixed(2)}`],
        ].forEach(([y, c, lbl]) => {
          ctx.strokeStyle = c as string; ctx.lineWidth = 1;
          ctx.setLineDash([5, 3]);
          ctx.beginPath(); ctx.moveTo(PAD_L, y as number); ctx.lineTo(W - PAD_R, y as number); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = "bold 9px 'SF Mono', monospace";
          ctx.fillStyle = c as string; ctx.textAlign = "left";
          ctx.fillText(lbl as string, PAD_L + 6, (y as number) - 3);
        });

        const rr = Math.abs(target - entry) / Math.abs(entry - stop);
        ctx.font = "bold 11px 'SF Mono', monospace";
        ctx.fillStyle = rr >= 2 ? BULL_COLOR : "#f5c542"; ctx.textAlign = "right";
        ctx.fillText(`R:R ${rr.toFixed(1)}:1`, W - PAD_R - 6, Math.min(eY, tY) - 6);
        ctx.restore();
      }
    });

    // ── Preview de desenho ────────────────────────────────────────────────
    if (drawingState.active && drawingState.p1 && drawingState.preview && activeTool !== "cursor") {
      const rel1 = drawingState.p1.idx - startIndex;
      const px1  = getX(rel1), py1 = getY(drawingState.p1.price);
      ctx.save();
      ctx.strokeStyle = TOOL_COLORS[activeTool]; ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px1, py1);
      ctx.lineTo(drawingState.preview.x, drawingState.preview.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = TOOL_COLORS[activeTool]; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(px1, py1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── Crosshair ──────────────────────────────────────────────────────────
    if (crosshair.visible) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(crosshair.x, PAD_T); ctx.lineTo(crosshair.x, PAD_T + mainH);
      ctx.moveTo(PAD_L, crosshair.y); ctx.lineTo(W - PAD_R, crosshair.y);
      ctx.stroke(); ctx.setLineDash([]);

      // Badge de preço do cursor no eixo Y
      const cp = minPrice + ((PAD_T + mainH - crosshair.y) / mainH) * (maxPrice - minPrice);
      ctx.font = "10px 'SF Mono', monospace";
      const cm = ctx.measureText(cp.toFixed(2));
      const cW2 = cm.width + 14, cH = 18;
      const cY  = Math.max(PAD_T, Math.min(PAD_T + mainH - cH, crosshair.y - cH / 2));
      ctx.fillStyle = "rgba(25,30,50,0.95)";
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(W - PAD_R + 2, cY, cW2, cH, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(200,210,230,0.9)"; ctx.textAlign = "left";
      ctx.fillText(cp.toFixed(2), W - PAD_R + 9, cY + cH / 2 + 3.5);
      ctx.restore();
    }

    // ── Eixo X (tempo) ─────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = AXIS_COLOR;
    ctx.font = "9px 'SF Mono', Consolas, monospace";
    ctx.textAlign = "center";
    const xStep = Math.max(1, Math.floor(vd.length / 8));
    for (let i = 0; i < vd.length; i += xStep) {
      ctx.fillText(vd[i].time, getX(i), PAD_T + mainH + 14);
    }
    ctx.restore();

    // ── Volume ──────────────────────────────────────────────────────────────
    if (showVol && volH > 0) {
      const vBase  = H - PAD_B + 4;
      const maxVol = Math.max(...vd.map(d => d.volume));

      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(PAD_L, vBase, chartW, volH - 6);

      ctx.fillStyle = AXIS_COLOR;
      ctx.font = "8px 'SF Mono', monospace"; ctx.textAlign = "left";
      ctx.fillText("VOL", PAD_L + 4, vBase + 8);

      vd.forEach((c, i) => {
        const x  = getX(i);
        const vh = Math.max(2, (c.volume / maxVol) * (volH - 12));
        ctx.fillStyle = c.close >= c.open
          ? "rgba(53,199,137,0.45)"
          : "rgba(245,85,93,0.45)";
        ctx.fillRect(x - bW / 2, vBase + (volH - 12) - vh, bW, vh);
      });
    }

    // ── RSI ─────────────────────────────────────────────────────────────────
    if (showRSI && rsiH > 0) {
      const rBase = H - rsiH;
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(PAD_L, rBase, chartW, rsiH - 4);

      [[70, "rgba(245,85,93,0.22)"], [50, "rgba(255,255,255,0.07)"], [30, "rgba(53,199,137,0.22)"]].forEach(([lv, c]) => {
        const y = rBase + ((100 - (lv as number)) / 100) * (rsiH - 4);
        ctx.strokeStyle = c as string; ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = AXIS_COLOR; ctx.font = "7.5px 'SF Mono', monospace"; ctx.textAlign = "left";
        ctx.fillText(String(lv), PAD_L + 3, y - 2);
      });

      ctx.beginPath(); let rF = true;
      rsiSlice.forEach((v, i) => {
        if (v === null) return;
        const y = rBase + ((100 - v) / 100) * (rsiH - 4);
        if (rF) { ctx.moveTo(getX(i), y); rF = false; }
        else ctx.lineTo(getX(i), y);
      });
      const lastRSI = rsiSlice.filter(Boolean).at(-1);
      const rC = lastRSI && lastRSI > 70 ? BEAR_COLOR : lastRSI && lastRSI < 30 ? BULL_COLOR : "#9b7fe8";
      ctx.strokeStyle = rC; ctx.lineWidth = 1.5;
      ctx.shadowColor = rC; ctx.shadowBlur = 4;
      ctx.stroke(); ctx.shadowBlur = 0;

      ctx.fillStyle = AXIS_COLOR; ctx.font = "8px 'SF Mono', monospace"; ctx.textAlign = "left";
      ctx.fillText(`RSI(14) ${lastRSI?.toFixed(1) ?? "--"}`, PAD_L + 4, rBase + 10);
    }

    // ── Tooltip OHLCV ────────────────────────────────────────────────────────
    if (hoverCandle && crosshair.visible) {
      const { open, close, high, low, volume, time, x: hx, y: hy } = hoverCandle;
      const isG = close >= open;
      const lines = [
        time,
        `O: ${open.toFixed(2)}`,
        `H: ${high.toFixed(2)}`,
        `L: ${low.toFixed(2)}`,
        `C: ${close.toFixed(2)}`,
        `V: ${(volume / 1000).toFixed(0)}K`,
      ];
      ctx.save();
      ctx.font = "10px 'SF Mono', Consolas, monospace";
      const mxW = Math.max(...lines.map(l => ctx.measureText(l).width));
      const ttW = mxW + 20, ttH = lines.length * 14 + 14;
      let ttX = hx + 12;
      let ttY = Math.max(PAD_T + 4, Math.min(PAD_T + mainH - ttH - 4, hy - ttH / 2));
      if (ttX + ttW > W - PAD_R - 4) ttX = hx - ttW - 12;

      ctx.fillStyle = "rgba(8,12,22,0.96)";
      ctx.strokeStyle = isG ? `${BULL_COLOR}55` : `${BEAR_COLOR}55`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(ttX, ttY, ttW, ttH, 5); ctx.fill(); ctx.stroke();

      lines.forEach((l, li) => {
        ctx.fillStyle = li === 0 ? AXIS_COLOR
          : li === 2 ? BULL_COLOR
          : li === 3 ? BEAR_COLOR
          : li === 4 ? (isG ? BULL_COLOR : BEAR_COLOR)
          : "rgba(210,220,240,0.85)";
        ctx.textAlign = "left";
        ctx.fillText(l, ttX + 10, ttY + 12 + li * 14);
      });
      ctx.restore();
    }
  }, [chartData, currentPrice, assetColor, entryPrice, positionType,
      showMA, showBB, showVol, showRSI, showEMA, crosshair, hoverCandle, drawings,
      drawingState, activeTool, isPositive]);

  useEffect(() => { const rafId = requestAnimationFrame(() => drawChart(canvasRef.current)); return () => cancelAnimationFrame(rafId); }, [drawChart]);
  useEffect(() => { if (isExpanded) drawChart(modalRef.current); }, [isExpanded, drawChart]);

  // ── Mouse helpers ─────────────────────────────────────────────────────────
  const getPriceAndIdx = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartData) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = e.currentTarget.offsetWidth, H = e.currentTarget.offsetHeight;
    const volH = showVol ? 52 : 0, rsiH = showRSI ? 64 : 0;
    const PAD_B = 22 + volH + rsiH;
    const mainH = H - PAD_T - PAD_B;
    const chartW = W - PAD_L - PAD_R;
    const { visibleData: vd, startIndex, minPrice, maxPrice } = chartData;
    const price  = minPrice + ((PAD_T + mainH - my) / mainH) * (maxPrice - minPrice);
    const idxF   = (mx - PAD_L) / (chartW / vd.length) - 0.5;
    const relIdx = Math.max(0, Math.min(vd.length - 1, Math.round(idxF)));
    const absIdx = startIndex + relIdx;  // índice ABSOLUTO e estável
    return { price, idx: absIdx, relIdx, mx, my };
  }, [chartData, showVol, showRSI]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartData) return;
    const info = getPriceAndIdx(e);
    if (!info) return;
    setCrosshair({ x: info.mx, y: info.my, visible: true });
    const candle = chartData.visibleData[info.relIdx];
    if (candle) setHoverCandle({ ...candle, x: info.mx, y: info.my });
    if (drawingState.active && drawingState.p1)
      setDrawingState(p => ({ ...p, preview: { x: info.mx, y: info.my } }));
  }, [chartData, drawingState, getPriceAndIdx]);

  const handleMouseLeave = () => {
    setCrosshair(p => ({ ...p, visible: false }));
    setHoverCandle(null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "cursor") return;
    const info = getPriceAndIdx(e);
    if (!info) return;
    const { price, idx } = info;  // idx = absoluto

    if (!drawingState.active) {
      if (activeTool === "hline") {
        setDrawings(p => [...p, { id: Date.now().toString(), type: "hline", p1: { price, idx }, color: TOOL_COLORS.hline }]);
        return;
      }
      setDrawingState({ active: true, p1: { price, idx } });
    } else {
      if (drawingState.p1)
        setDrawings(p => [...p, { id: Date.now().toString(), type: activeTool, p1: drawingState.p1!, p2: { price, idx }, color: TOOL_COLORS[activeTool] }]);
      setDrawingState({ active: false });
    }
  }, [activeTool, drawingState, getPriceAndIdx]);

  // ③ Scroll: scroll para baixo = ver passado; scroll para cima = ver presente
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;  // +1 = vai para o passado
    setScrollOffset(p => Math.max(0, Math.min(p + dir * 3, Math.max(0, (data?.length || 0) - 8))));
  };

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const tbBtn = (active: boolean, col = "blue") =>
    `px-2.5 py-1 rounded text-[10px] font-bold transition-all border ${
      active
        ? `text-${col}-300 border-${col}-500/40`
        : "text-white/30 border-white/[0.07] hover:text-white/55 hover:bg-white/[0.05]"
    }`;

  const Toolbar = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex flex-wrap items-center gap-1 ${compact ? "mb-1" : "mb-2"}`}>
      <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => handleTimeframe(tf)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              timeframe === tf ? "text-white" : "text-white/30 hover:text-white/55"
            }`}
            style={timeframe === tf ? { background: assetColor || "#3b82f6" } : {}}>
            {tf}
          </button>
        ))}
      </div>

      <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.08)" }} />

      <button onClick={() => setShowMA(p => !p)} className={tbBtn(showMA, "yellow")} style={showMA ? { background: "rgba(245,166,35,0.12)" } : {}}>MA</button>
      <button onClick={() => setShowBB(p => !p)} className={tbBtn(showBB, "purple")} style={showBB ? { background: "rgba(180,120,255,0.12)" } : {}}>BB</button>
      <button onClick={() => setShowVol(p => !p)} className={tbBtn(showVol, "cyan")} style={showVol ? { background: "rgba(0,200,220,0.1)" } : {}}>VOL</button>
      <button onClick={() => setShowRSI(p => !p)} className={tbBtn(showRSI, "violet")} style={showRSI ? { background: "rgba(155,126,232,0.12)" } : {}}>RSI</button>
        <button onClick={() => setShowEMA(p => !p)} className={tbBtn(showEMA, "cyan")} style={showEMA ? { background: "rgba(0,229,255,0.1)" } : {}}>EMA</button>

      <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.08)" }} />

      {(["cursor", "hline", "tline", "fib", "risk"] as ToolType[]).map(t => (
        <button key={t}
          onClick={() => { setActiveTool(t); setDrawingState({ active: false }); }}
          className={tbBtn(activeTool === t, "blue")}
          style={activeTool === t ? { background: "rgba(91,156,246,0.15)", color: "#5b9cf6", borderColor: "rgba(91,156,246,0.4)" } : {}}>
          {TOOL_LABELS[t]}
        </button>
      ))}

      {drawings.length > 0 && (
        <button onClick={() => setDrawings([])}
          className="p-1 rounded text-red-400/50 hover:text-red-400 transition-all" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <X className="w-3 h-3" />
        </button>
      )}

      <div className="flex gap-0.5 ml-auto">
        {[
          { icon: <ZoomIn className="w-3 h-3" />, fn: handleZoomIn, title: "Zoom +" },
          { icon: <ZoomOut className="w-3 h-3" />, fn: handleZoomOut, title: "Zoom -" },
          { icon: <RefreshCw className="w-3 h-3" />, fn: handleReset, title: "Reset" },
        ].map((b, i) => (
          <button key={i} onClick={b.fn} title={b.title}
            className="p-1.5 rounded text-white/25 hover:text-white/55 transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {b.icon}
          </button>
        ))}
        <button onClick={() => setIsExpanded(p => !p)} title="Expandir"
          className="p-1.5 rounded transition-all"
          style={{ background: "rgba(91,156,246,0.12)", border: "1px solid rgba(91,156,246,0.3)", color: "#5b9cf6" }}>
          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );

  const heightPx = 360 + (showVol ? 52 : 0) + (showRSI ? 64 : 0);
  const activePanelNote = [showMA && !showBB && "MA(20)", showBB && "BB(20)", showRSI && "RSI(14)"].filter(Boolean).join(" · ");

  const canvasProps = {
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onWheel: handleWheel,
    style: { display: "block", cursor: "crosshair" } as React.CSSProperties,
  };

  return (
    <>
      <div className="w-full space-y-1.5">
        <Toolbar />

        <div className="flex items-center gap-2 px-0.5 text-[10px] font-mono" style={{ color: "rgba(160,175,200,0.45)" }}>
          <span style={{ color: "rgba(200,210,230,0.6)", fontWeight: 600 }}>{assetSymbol}</span>
          <span style={{ color: isPositive ? BULL_COLOR : BEAR_COLOR }}>
            {isPositive ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}%
          </span>
          {activePanelNote && <span style={{ color: "rgba(245,166,35,0.55)" }}>{activePanelNote}</span>}
          {activeTool !== "cursor" && (
            <span style={{ color: "#5b9cf6" }}>
              ✏ {TOOL_LABELS[activeTool]}{drawingState.active ? " — 2º clique" : " — 1º clique"}
            </span>
          )}
          <span className="ml-auto">↕ Scroll: navegar no tempo</span>
        </div>

        <div className="relative w-full rounded-xl overflow-hidden"
          style={{ background: BG_COLOR, border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>
          <canvas ref={canvasRef} {...canvasProps} className="w-full" style={{ ...canvasProps.style, height: `${heightPx}px` }} />
        </div>

        {activeTool !== "cursor" && (
          <p className="text-center text-[10px]" style={{ color: "rgba(91,156,246,0.6)" }}>
            {drawingState.active ? "✓ 1º ponto fixado — clique no 2º ponto para finalizar" : `Clique no gráfico para iniciar a ${TOOL_LABELS[activeTool]}`}
          </p>
        )}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(5,8,18,0.99)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                style={{ background: `${assetColor}20`, border: `1px solid ${assetColor}35` }}>
                {assetSymbol.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{assetSymbol}</p>
                <p className="text-[10px]" style={{ color: "rgba(160,175,200,0.4)" }}>Gráfico Expandido</p>
              </div>
              <div className="ml-4 font-mono">
                <span className="text-xl font-bold text-white">{currentPrice.toFixed(2)}</span>
                <span className="ml-2 text-sm font-semibold" style={{ color: isPositive ? BULL_COLOR : BEAR_COLOR }}>
                  {isPositive ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            </div>
            <button onClick={() => setIsExpanded(false)}
              className="p-2 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(200,210,230,0.6)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 pt-3">
            <Toolbar compact />
          </div>

          <div className="flex-1 px-5 pb-5 min-h-0">
            <div className="w-full h-full rounded-xl overflow-hidden"
              style={{ background: BG_COLOR, border: "1px solid rgba(255,255,255,0.06)" }}>
              <canvas ref={modalRef} {...canvasProps} className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
