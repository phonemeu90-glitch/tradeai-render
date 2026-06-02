/**
 * TradeTimer — Componente de timer visual para operações
 * Exibe countdown com barra de progresso e indicadores visuais
 */
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeTimerProps {
  expiryTime: Date;
  totalTime?: number;
  onExpire?: () => void;
  compact?: boolean;
}

export default function TradeTimer({ expiryTime, totalTime = 60, onExpire, compact = false }: TradeTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.ceil((expiryTime.getTime() - now.getTime()) / 1000));
      
      setTimeLeft(remaining);
      setProgress(((totalTime - remaining) / totalTime) * 100);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiryTime, totalTime, onExpire]);

  const isWarning = timeLeft <= 10;
  const isCritical = timeLeft <= 3;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Clock className={cn(
          "w-4 h-4",
          isCritical ? "text-red-500 animate-pulse" : isWarning ? "text-orange-400" : "text-white/60"
        )} />
        <span className={cn(
          "text-sm font-mono font-bold",
          isCritical ? "text-red-500" : isWarning ? "text-orange-400" : "text-white/70"
        )}>
          {timeLeft}s
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60 font-semibold">Tempo restante</span>
        <span className={cn(
          "text-sm font-bold font-mono",
          isCritical ? "text-red-500" : isWarning ? "text-orange-400" : "text-green-400"
        )}>
          {timeLeft}s
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: isCritical
              ? "linear-gradient(90deg, #ef4444, #dc2626)"
              : isWarning
              ? "linear-gradient(90deg, #f97316, #ea580c)"
              : "linear-gradient(90deg, #22c55e, #16a34a)",
            boxShadow: isCritical
              ? "0 0 10px rgba(239, 68, 68, 0.5)"
              : isWarning
              ? "0 0 10px rgba(249, 115, 22, 0.5)"
              : "0 0 10px rgba(34, 197, 94, 0.5)",
          }}
        />
      </div>

      {/* Pulse indicator when critical */}
      {isCritical && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Operação expirando em breve</span>
        </div>
      )}
    </div>
  );
}
