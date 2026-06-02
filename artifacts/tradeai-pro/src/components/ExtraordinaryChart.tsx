/**
 * ExtraordinaryChart — Gráfico Premium com Candlesticks Animados
 * Foco: Imersão extrema, animações profissionais, efeitos visuais extraordinários
 */
import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CandleData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  price: number;
}

interface ExtraordinaryChartProps {
  data: CandleData[];
  currentPrice: number;
  assetColor: string;
  assetSymbol: string;
  isPositive: boolean;
  priceChange: number;
}

export default function ExtraordinaryChart({
  data,
  currentPrice,
  assetColor,
  assetSymbol,
  isPositive,
  priceChange,
}: ExtraordinaryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find min/max prices
    let minPrice = Math.min(...data.map((d) => d.low));
    let maxPrice = Math.max(...data.map((d) => d.high));
    const priceRange = maxPrice - minPrice;
    minPrice -= priceRange * 0.1;
    maxPrice += priceRange * 0.1;

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "rgba(59,130,246,0.08)");
    bgGradient.addColorStop(1, "rgba(15,22,41,0.4)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw candlesticks with animation
    const candleWidth = Math.max(2, chartWidth / data.length - 2);
    const now = Date.now();

    data.forEach((candle, index) => {
      const x = padding + (chartWidth / data.length) * index + chartWidth / data.length / 2;

      // Normalize prices to canvas coordinates
      const getY = (price: number) => {
        return height - padding - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
      };

      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);

      // Animation delay based on index
      const animationDelay = (index / data.length) * 500;
      const animationProgress = Math.min(1, (now - animationDelay) / 300);

      if (animationProgress > 0) {
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? "#22c55e" : "#ef4444";

        // Draw wick (high-low line)
        ctx.strokeStyle = isGreen ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw body (open-close rectangle) with animation
        const bodyHeight = Math.abs(closeY - openY);
        const bodyTop = Math.min(openY, closeY);
        const animatedHeight = bodyHeight * animationProgress;
        const animatedTop = bodyTop + (bodyHeight - animatedHeight) / 2;

        // Candlestick body with glow
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8 + animationProgress * 0.2;
        ctx.fillRect(x - candleWidth / 2, animatedTop, candleWidth, animatedHeight);

        // Glow effect for candlestick
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 * animationProgress;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 * animationProgress;
        ctx.strokeRect(x - candleWidth / 2, animatedTop, candleWidth, animatedHeight);

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    });

    // Draw current price line with animation
    const lastCandle = data[data.length - 1];
    const lastY = height - padding - ((currentPrice - minPrice) / (maxPrice - minPrice)) * chartHeight;

    // Animated line
    ctx.strokeStyle = assetColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, lastY);
    ctx.lineTo(width - padding, lastY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw current price point with pulsing effect
    const pulseSize = 6 + Math.sin(now / 200) * 2;
    ctx.fillStyle = assetColor;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(width - padding - 10, lastY, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw outer ring
    ctx.strokeStyle = assetColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(width - padding - 10, lastY, pulseSize + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + ((maxPrice - minPrice) / 5) * i;
      const y = height - padding - (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), padding - 10, y + 4);
    }

    // Draw X-axis labels (every 12 candles)
    ctx.textAlign = "center";
    for (let i = 0; i < data.length; i += 12) {
      const x = padding + (chartWidth / data.length) * i + chartWidth / data.length / 2;
      ctx.fillText(data[i].time, x, height - 10);
    }
  }, [data, currentPrice, assetColor]);

  return (
    <div
      className="relative w-full"
      style={{
        background: "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(15,22,41,0.4) 100%)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(59,130,246,0.25)",
        boxShadow: "0 0 30px rgba(59,130,246,0.1)",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "320px",
          display: "block",
        }}
      />

      {/* Price ticker overlay */}
      <div className="absolute top-4 right-4 glass-card rounded-xl p-3 flex items-center gap-2">
        <div>
          <p className="text-xs text-white/60">{assetSymbol}</p>
          <p className="text-lg font-bold text-white font-mono">R$ {currentPrice.toFixed(2)}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isPositive ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {isPositive ? (
            <TrendingUp className={`w-4 h-4 text-green-400`} />
          ) : (
            <TrendingDown className={`w-4 h-4 text-red-400`} />
          )}
          <span className={`text-xs font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
