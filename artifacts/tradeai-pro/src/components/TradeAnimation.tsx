/**
 * TradeAnimation — Animações profissionais de compra/venda
 */
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, TrendingUp, TrendingDown } from "lucide-react";

interface TradeAnimationProps {
  type: "buy" | "sell";
  asset: string;
  quantity: number;
  price: number;
  isVisible: boolean;
  onComplete?: () => void;
}

export default function TradeAnimation({
  type,
  asset,
  quantity,
  price,
  isVisible,
  onComplete,
}: TradeAnimationProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStage(0);
      return;
    }

    const timings = [300, 600, 900];
    const timeouts = timings.map((timing, i) =>
      setTimeout(() => setStage(i + 1), timing)
    );

    const finalTimeout = setTimeout(() => {
      onComplete?.();
    }, 1500);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const isBuy = type === "buy";
  const bgColor = isBuy ? "from-green-500/20 to-green-600/10" : "from-red-500/20 to-red-600/10";
  const borderColor = isBuy ? "border-green-500/50" : "border-red-500/50";
  const textColor = isBuy ? "text-green-400" : "text-red-400";
  const Icon = isBuy ? TrendingUp : TrendingDown;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{
          opacity: stage >= 1 ? 1 : 0,
          transition: "opacity 300ms ease-out",
        }}
      />

      {/* Main animation card */}
      <div
        className={`relative bg-gradient-to-br ${bgColor} border ${borderColor} rounded-2xl p-8 max-w-md w-full mx-4`}
        style={{
          transform: stage >= 1 ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
          opacity: stage >= 1 ? 1 : 0,
          transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Icon animation */}
        <div className="flex justify-center mb-4">
          <div
            className="relative"
            style={{
              transform: stage >= 2 ? "scale(1) rotate(0deg)" : "scale(0) rotate(-180deg)",
              opacity: stage >= 2 ? 1 : 0,
              transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <Icon className={`w-16 h-16 ${textColor}`} strokeWidth={1.5} />
            <div
              className={`absolute inset-0 rounded-full border-2 ${textColor}`}
              style={{
                animation: "pulse 1s ease-in-out infinite",
                opacity: 0.5,
              }}
            />
          </div>
        </div>

        {/* Text content */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-white">
            {isBuy ? "Compra" : "Venda"} Executada
          </h3>
          <p className={`text-sm font-semibold ${textColor}`}>
            {quantity} {asset} @ R$ {price.toFixed(2)}
          </p>
          <p className="text-xs text-white/60">
            Total: R$ {(quantity * price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Success checkmark */}
        <div
          className="flex justify-center mt-6"
          style={{
            transform: stage >= 3 ? "scale(1)" : "scale(0)",
            opacity: stage >= 3 ? 1 : 0,
            transition: "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <CheckCircle2 className={`w-8 h-8 ${textColor}`} />
        </div>
      </div>

      {/* Floating particles */}
      {stage >= 1 &&
        [...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isBuy ? "#22c55e" : "#ef4444",
              opacity: 0,
              animation: `float-up ${1 + i * 0.1}s ease-out forwards`,
              animationDelay: `${stage >= 2 ? i * 50 : 0}ms`,
            }}
          />
        ))}

      <style>{`
        @keyframes float-up {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + ${Math.random() * 100 - 50}px), calc(-50% - 100px)) scale(0);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
