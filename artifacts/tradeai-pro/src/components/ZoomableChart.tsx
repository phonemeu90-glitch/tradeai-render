/**
 * ZoomableChart — Gráfico com Pinch-to-Zoom e Mouse Wheel
 * Implementa zoom real com gesto de pinça e scroll do mouse
 */
import { useEffect, useRef, useState } from "react";

interface CandleData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  price: number;
}

interface ZoomableChartProps {
  data: CandleData[];
  currentPrice: number;
  assetColor: string;
  assetSymbol: string;
  isPositive: boolean;
  priceChange: number;
}

export default function ZoomableChart({
  data,
  currentPrice,
  assetColor,
  assetSymbol,
  isPositive,
  priceChange,
}: ZoomableChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastX, setLastX] = useState(0);
  const touchStartRef = useRef<{ distance: number; initialZoom: number } | null>(null);

  // Handle pinch-to-zoom (mobile)
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      touchStartRef.current = { distance, initialZoom: zoomLevel };
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      setLastX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / touchStartRef.current.distance;
      const newZoom = Math.max(1, Math.min(5, touchStartRef.current.initialZoom * scale));
      setZoomLevel(newZoom);
    } else if (e.touches.length === 1 && isPanning) {
      const deltaX = e.touches[0].clientX - lastX;
      setPanX((prev) => prev + deltaX);
      setLastX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel((prev) => Math.max(1, Math.min(5, prev * delta)));
  };

  // Handle mouse pan
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 2 || e.ctrlKey) {
      setIsPanning(true);
      setLastX(e.clientX);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastX;
      setPanX((prev) => prev + deltaX);
      setLastX(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("touchstart", handleTouchStart as any);
    canvas.addEventListener("touchmove", handleTouchMove as any);
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart as any);
      canvas.removeEventListener("touchmove", handleTouchMove as any);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, lastX]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    // Clear canvas
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "rgba(59,130,246,0.08)");
    bgGradient.addColorStop(1, "rgba(15,22,41,0.4)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Save context
    ctx.save();

    // Apply zoom and pan
    ctx.translate(width / 2 + panX, height / 2);
    ctx.scale(zoomLevel, 1);
    ctx.translate(-width / 2, -height / 2);

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

    // Draw candlesticks with zoom-aware sizing
    const candleWidth = Math.max(2, (chartWidth / data.length - 2) * zoomLevel);
    const now = Date.now();

    data.forEach((candle, index) => {
      const x = padding + (chartWidth / data.length) * index + (chartWidth / data.length) / 2;

      const getY = (price: number) => {
        return height - padding - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
      };

      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);

      const animationDelay = (index / data.length) * 500;
      const animationProgress = Math.min(1, (now - animationDelay) / 300);

      if (animationProgress > 0) {
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? "#22c55e" : "#ef4444";

        // Draw wick
        ctx.strokeStyle = isGreen ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)";
        ctx.lineWidth = 1.5 * zoomLevel;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw body
        const bodyHeight = Math.abs(closeY - openY);
        const bodyTop = Math.min(openY, closeY);
        const animatedHeight = bodyHeight * animationProgress;
        const animatedTop = bodyTop + (bodyHeight - animatedHeight) / 2;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8 + animationProgress * 0.2;
        ctx.fillRect(x - candleWidth / 2, animatedTop, candleWidth, animatedHeight);

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 * animationProgress * zoomLevel;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * zoomLevel;
        ctx.globalAlpha = 0.4 * animationProgress;
        ctx.strokeRect(x - candleWidth / 2, animatedTop, candleWidth, animatedHeight);

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    });

    // Draw current price line
    const lastY = height - padding - ((currentPrice - minPrice) / (maxPrice - minPrice)) * chartHeight;

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

    // Draw current price point
    const pulseSize = 6 + Math.sin(now / 200) * 2;
    ctx.fillStyle = assetColor;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(width - padding - 10, lastY, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = assetColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(width - padding - 10, lastY, pulseSize + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Restore context
    ctx.restore();

    // Draw Y-axis labels (outside zoom/pan)
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + ((maxPrice - minPrice) / 5) * i;
      const y = height - padding - (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), padding - 10, y + 4);
    }

    // Draw zoom level indicator
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Zoom: ${zoomLevel.toFixed(1)}x`, padding + 10, padding - 10);
  }, [data, currentPrice, assetColor, zoomLevel, panX]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        background: "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(15,22,41,0.4) 100%)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(59,130,246,0.25)",
        boxShadow: "0 0 30px rgba(59,130,246,0.1)",
        cursor: isPanning ? "grabbing" : "grab",
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
          <span className={`text-xs font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Zoom info */}
      <div className="absolute bottom-4 left-4 text-xs text-white/40">
        <p>Pinça para zoom • Scroll para zoom • Arraste para mover</p>
      </div>
    </div>
  );
}
