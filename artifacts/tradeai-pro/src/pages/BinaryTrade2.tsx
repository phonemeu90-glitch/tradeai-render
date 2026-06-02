/**
 * BinaryTrade — REESCRITA COM TIMER FUNCIONAL E SALDO SINCRONIZADO
 * Timer encerra automaticamente, saldo atualiza corretamente
 */
import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { useTrading } from "@/contexts/TradingContext";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line
} from "recharts";
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
  { symbol: "EUR/USD", name: "Euro vs Dólar", startPrice: 1.0850 },
  { symbol: "GBP/USD", name: "Libra vs Dólar", startPrice: 1.2750 },
  { symbol: "BTC/USD", name: "Bitcoin", startPrice: 67420 },
  { symbol: "GOLD", name: "Ouro", startPrice: 2385.50 },
  { symbol: "PETR4", name: "Petrobras", startPrice: 28.45 },
];

const TIMEFRAMES = [
  { label: "1 Min", value: 60 },
  { label: "5 Min", value: 300 },
  { label: "15 Min", value: 900 },
];

function generatePriceMovement(
  lastPrice: number,
  direction: "UP" | "DOWN",
  betPercentage: number,
  shouldGoAgainst: boolean
): number {
  let volatility = 0.008;

  if (betPercentage >= 90) {
    volatility = 0.04;
  } else if (betPercentage >= 50) {
    volatility = 0.028;
  } else if (betPercentage >= 10) {
    volatility = 0.012;
  } else {
    volatility = 0.006;
  }

  // Gerar magnitude aleatória (sempre positiva)
  const magnitude = Math.random() * lastPrice * volatility;

  // Determinar direção DETERMINÍSTICA baseado em shouldGoAgainst
  let change = 0;

  if (shouldGoAgainst) {
    // Aposta grande: ir CONTRA
    if (direction === "UP") {
      // Usuário apostou em ALTA, preço DESCE
      change = -magnitude;
    } else {
      // Usuário apostou em BAIXA, preço SOBE
      change = magnitude;
    }
  } else {
    // Aposta pequena: ir A FAVOR
    if (direction === "UP") {
      // Usuário apostou em ALTA, preço SOBE
      change = magnitude;
    } else {
      // Usuário apostou em BAIXA, preço DESCE
      change = -magnitude;
    }
  }

  const newPrice = lastPrice + change;
  return parseFloat(newPrice.toFixed(2));
}

function generateInitialCandles(count: number, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const timestamp = now - i * 60 * 1000;
    const time = new Date(timestamp);
    const open = price;
    const change = (Math.random() - 0.48) * price * 0.015;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * price * 0.008;
    const low = Math.min(open, close) - Math.random() * price * 0.008;

    candles.push({
      time: time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      open: parseFloat(open.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
    });

    price = close;
  }
  return candles;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg p-2 text-xs" style={{ background: "rgba(15,22,41,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="text-white/60">{data.time}</p>
        <p className="text-white font-mono">O: {data.open} | C: {data.close}</p>
        <p className="text-white font-mono">H: {data.high} | L: {data.low}</p>
      </div>
    );
  }
  return null;
};

export default function BinaryTrade() {
  const { activeAccount, withdraw, deposit, accounts } = useTrading();
  const [selectedAsset, setSelectedAsset] = useState(0);
  const [candles, setCandles] = useState<Candle[]>(() => generateInitialCandles(60, ASSETS[0].startPrice));
  const [currentPrice, setCurrentPrice] = useState(ASSETS[0].startPrice);
  const [amount, setAmount] = useState("");
  const [timeframe, setTimeframe] = useState<number>(60);
  const [balance, setBalance] = useState(accounts[activeAccount].balance);
  const [trades, setTrades] = useState<BinaryTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<BinaryTrade[]>([]);

  // Refs para evitar closure problems
  const tradesRef = useRef<BinaryTrade[]>([]);
  const currentPriceRef = useRef(currentPrice);

  const asset = ASSETS[selectedAsset];
  const numAmount = parseFloat(amount) || 0;
  const currentTrade = trades.length > 0 && trades[trades.length - 1].status === "open" ? trades[trades.length - 1] : null;

  // Sincronizar balance com TradingContext
  useEffect(() => {
    setBalance(accounts[activeAccount].balance);
  }, [accounts, activeAccount]);

  // Manter refs atualizadas
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  // LOOP 1: ATUALIZAR GRÁFICO A CADA SEGUNDO
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prevCandles) => {
        const lastCandle = prevCandles[prevCandles.length - 1];
        let newClose = lastCandle.close;

        // Se há trade aberta, gerar preço inteligente
        if (currentTrade) {
          const shouldGoAgainst = currentTrade.betPercentage >= 50;
          newClose = generatePriceMovement(
            lastCandle.close,
            currentTrade.direction,
            currentTrade.betPercentage,
            shouldGoAgainst
          );
        } else {
          // Sem trade: gerar preço aleatório normal
          const change = (Math.random() - 0.5) * lastCandle.close * 0.01;
          newClose = parseFloat((lastCandle.close + change).toFixed(2));
        }

        const newHigh = Math.max(lastCandle.close, newClose) + Math.random() * 0.3;
        const newLow = Math.min(lastCandle.close, newClose) - Math.random() * 0.3;

        const newCandle: Candle = {
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          open: lastCandle.close,
          close: newClose,
          high: parseFloat(newHigh.toFixed(2)),
          low: parseFloat(newLow.toFixed(2)),
        };

        setCurrentPrice(newClose);
        currentPriceRef.current = newClose;
        return [...prevCandles.slice(1), newCandle];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTrade]);

  // LOOP 2: VERIFICAR TRADES EXPIRADOS A CADA 100MS
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const openTrades = tradesRef.current.filter(t => t.status === "open");

      openTrades.forEach((trade) => {
        // Se tempo expirou
        if (now >= trade.expiryTime) {
          // Usar preço ATUAL do ref (não closure)
          const finalPrice = currentPriceRef.current;
          
          // Determinar resultado
          const won = (trade.direction === "UP" && finalPrice > trade.entryPrice) ||
                     (trade.direction === "DOWN" && finalPrice < trade.entryPrice);

          // Atualizar saldo IMEDIATAMENTE
          if (won) {
            // Ganhou: Retorna DOBRO
            deposit(trade.account, trade.amount * 2);
            setBalance((prev) => prev + trade.amount * 2);
            toast.success(`🎉 Vitória! +R$ ${(trade.amount * 2).toFixed(2)}`);
          } else {
            // Perdeu: Retorna ZERO (já foi debitado)
            toast.error(`❌ Derrota! -R$ ${trade.amount.toFixed(2)}`);
          }

          // Remover trade aberta e adicionar ao histórico
          setTrades((prevTrades) => {
            const updated = prevTrades.filter(t => t.id !== trade.id);
            
            const closedTrade: BinaryTrade = {
              ...trade,
              status: won ? "won" : "lost",
              pnl: won ? trade.amount : -trade.amount,
            };

            setClosedTrades((prev) => [...prev, closedTrade]);
            return updated;
          });
        }
      });
    }, 100); // Verificar a cada 100ms para ser MUITO responsivo

    return () => clearInterval(interval);
  }, [deposit]);

  const handleTrade = (direction: "UP" | "DOWN") => {
    // Validações
    if (!amount || numAmount <= 0) {
      toast.error("Informe um valor de aposta válido");
      return;
    }

    if (numAmount > balance) {
      toast.error(`Saldo insuficiente. Você tem R$ ${balance.toFixed(2)}`);
      return;
    }

    // Se há trade aberta, não permitir nova
    if (currentTrade) {
      toast.error("Você já tem uma operação aberta");
      return;
    }

    // Calcular percentual da aposta
    const betPercentage = (numAmount / accounts[activeAccount].initialBalance) * 100;

    // Debitar saldo IMEDIATAMENTE
    const success = withdraw(activeAccount, numAmount);
    if (!success) {
      toast.error("Falha ao debitar saldo");
      return;
    }

    // Atualizar saldo local IMEDIATAMENTE
    setBalance((prev) => prev - numAmount);

    const now = Date.now();
    const expiryTime = now + (timeframe * 1000);

    const newTrade: BinaryTrade = {
      id: `trade_${now}`,
      asset: asset.symbol,
      direction,
      entryPrice: currentPrice,
      entryTime: now,
      expiryTime,
      amount: numAmount,
      status: "open",
      pnl: 0,
      account: activeAccount,
      betPercentage,
    };

    setTrades((prev) => [...prev, newTrade]);
    setAmount("");

    // Mostrar aviso conforme tamanho da aposta
    if (betPercentage >= 90) {
      toast.warning(`⚠️ ALL-IN! ${betPercentage.toFixed(0)}% - Gráfico vai FORTEMENTE contra!`);
    } else if (betPercentage >= 50) {
      toast.warning(`⚠️ Aposta grande: ${betPercentage.toFixed(0)}% - Gráfico vai contra!`);
    } else if (betPercentage >= 10) {
      toast.info(`📊 Aposta média: ${betPercentage.toFixed(0)}%`);
    } else {
      toast.success(`✅ Aposta pequena: ${betPercentage.toFixed(0)}% - Gráfico a seu favor!`);
    }
  };

  const shouldShowAgainstIndicator = currentTrade && currentTrade.betPercentage >= 50;

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Opções Binárias
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Timer funcional, saldo sincronizado</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Asset selector */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Ativos</h3>
            {ASSETS.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedAsset(i);
                  setCandles(generateInitialCandles(60, a.startPrice));
                  setCurrentPrice(a.startPrice);
                }}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all",
                  selectedAsset === i
                    ? "bg-blue-500/20 border border-blue-500/50"
                    : "bg-white/5 border border-white/10 hover:bg-white/10"
                )}
              >
                <p className="text-sm font-semibold text-white">{a.symbol}</p>
                <p className="text-xs text-white/40">{a.name}</p>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={candles}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" style={{ fontSize: "12px" }} />
                <YAxis stroke="rgba(255,255,255,0.2)" style={{ fontSize: "12px" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="open" fill="rgba(59,130,246,0.3)" />
                <Bar dataKey="close" fill="rgba(34,197,94,0.3)" />
                <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-white/60">Preço: R$ {currentPrice.toFixed(2)}</p>
              {shouldShowAgainstIndicator && (
                <p className="text-xs font-bold text-red-400">🔴 Gráfico contra você</p>
              )}
              {currentTrade && !shouldShowAgainstIndicator && (
                <p className="text-xs font-bold text-green-400">🟢 Gráfico a seu favor</p>
              )}
            </div>
          </div>

          {/* Trade panel */}
          <div className="glass-card rounded-2xl p-4 space-y-4">
            <div>
              <Label className="text-xs text-white/60 mb-1">Saldo Atual</Label>
              <div className="text-2xl font-bold text-green-400">R$ {balance.toFixed(2)}</div>
            </div>

            <div>
              <Label className="text-xs text-white/60 mb-1">Timeframe</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-semibold transition-all",
                      timeframe === tf.value
                        ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                        : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-white/60 mb-1">Valor (R$)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10 text-white"
                disabled={currentTrade !== null}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleTrade("UP")}
                disabled={currentTrade !== null}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 disabled:opacity-50"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                ALTA
              </Button>
              <Button
                onClick={() => handleTrade("DOWN")}
                disabled={currentTrade !== null}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 disabled:opacity-50"
              >
                <TrendingDown className="w-4 h-4 mr-1" />
                BAIXA
              </Button>
            </div>
          </div>
        </div>

        {/* Open trade */}
        {currentTrade && (
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Operação Aberta</h3>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/60 mb-1">Ativo</p>
                  <p className="text-sm font-bold text-white">{currentTrade.asset}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Direção</p>
                  <Badge className={cn("text-xs", currentTrade.direction === "UP" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300")}>
                    {currentTrade.direction}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Aposta</p>
                  <p className="text-sm font-bold text-white">R$ {currentTrade.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Entrada</p>
                  <p className="text-sm text-white">R$ {currentTrade.entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Tempo Restante</p>
                  <p className={cn("text-sm font-bold", Math.ceil((currentTrade.expiryTime - Date.now()) / 1000) <= 10 ? "text-red-400 animate-pulse" : "text-white")}>
                    {Math.max(0, Math.ceil((currentTrade.expiryTime - Date.now()) / 1000))}s
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">P&L Esperado</p>
                  <p className={cn("text-sm font-bold", (currentTrade.direction === "UP" && currentPrice > currentTrade.entryPrice) || (currentTrade.direction === "DOWN" && currentPrice < currentTrade.entryPrice) ? "text-green-400" : "text-red-400")}>
                    {(currentTrade.direction === "UP" && currentPrice > currentTrade.entryPrice) || (currentTrade.direction === "DOWN" && currentPrice < currentTrade.entryPrice) ? "+" : "-"}R$ {currentTrade.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Closed trades */}
        {closedTrades.length > 0 && (
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Histórico ({closedTrades.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {closedTrades.map((trade) => (
                <div key={trade.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{trade.asset} {trade.direction}</p>
                    <p className="text-xs text-white/40">R$ {trade.amount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", trade.status === "won" ? "text-green-400" : "text-red-400")}>
                      {trade.status === "won" ? "+" : "-"}R$ {Math.abs(trade.pnl).toFixed(2)}
                    </p>
                    <Badge className={cn("text-xs", trade.status === "won" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300")}>
                      {trade.status === "won" ? "Vitória" : "Derrota"}
                    </Badge>
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
