/**
 * DepositNotification — Sistema de Notificações de Depósito
 * Mostra status de análise, rejeição e sucesso
 */
import React, { useState, useEffect } from "react";
import { X, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DepositNotificationData {
  id: string;
  type: "pending" | "rejected" | "approved";
  message: string;
  reason?: string;
  timestamp: number;
  userEmail: string;
}

interface DepositNotificationProps {
  notification: DepositNotificationData | null;
  currentUserEmail: string | undefined;
  onDismiss: (id: string) => void;
}

export default function DepositNotification({
  notification,
  currentUserEmail,
  onDismiss,
}: DepositNotificationProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Atualizar timer a cada segundo
  useEffect(() => {
    if (!notification || notification.type !== "pending") return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - notification.timestamp) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [notification]);

  // Não mostrar notificação se não for para o usuário atual
  if (!notification || notification.userEmail !== currentUserEmail) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Notificação de Análise (Azul) - Posicionada na parte inferior
  if (notification.type === "pending") {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2">
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white text-sm">Depósito em Análise</h3>
              <p className="text-xs text-white/70 mt-1">
                Seu depósito está sendo verificado. Tempo decorrido: <span className="font-mono text-blue-300">{formatTime(timeElapsed)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Notificação de Rejeição (Vermelha com X para fechar) - Posicionada na parte inferior
  if (notification.type === "rejected") {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2">
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white text-sm">Depósito Rejeitado</h3>
              <p className="text-xs text-white/70 mt-1">
                {notification.reason || "Seu depósito foi rejeitado."}
              </p>
              <p className="text-xs text-red-300/80 mt-2">
                {notification.reason === "timeout"
                  ? "⏰ O prazo de 30 minutos para pagamento expirou."
                  : notification.reason === "payment_failed"
                  ? "❌ O pagamento não foi efetuado corretamente."
                  : "Motivo: " + notification.reason}
              </p>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-white/50 hover:text-white transition-colors flex-shrink-0"
              aria-label="Fechar notificação"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Notificação de Aprovação (Verde) - Posicionada na parte inferior
  if (notification.type === "approved") {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2">
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white text-sm">Depósito Aprovado! ✅</h3>
              <p className="text-xs text-white/70 mt-1">
                Seu saldo foi creditado com sucesso. Você já pode começar a operar!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
