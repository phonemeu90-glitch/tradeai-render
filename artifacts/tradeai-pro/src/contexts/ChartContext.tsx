/*
 * ChartContext — Estado global de gráficos com PERSISTÊNCIA no servidor
 * O servidor gera candles continuamente. O cliente busca o histórico ao montar
 * e se inscreve no SSE para atualizações em tempo real.
 * A lógica de manipulação nos componentes de trade permanece inalterada.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

export interface CandleData {
  time: string;
  timestamp?: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  price: number;
}

export interface AssetChart {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  data: CandleData[];
  lastUpdate: string;
}

interface ChartContextType {
  charts: Record<string, AssetChart>;
  connected: boolean;
  getChart: (symbol: string) => AssetChart | undefined;
  updatePrice: (symbol: string, newPrice: number) => void;
  updateChartData: (symbol: string, data: CandleData[]) => void;
  fetchHistory: (symbol: string) => Promise<void>;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export function ChartProvider({ children }: { children: ReactNode }) {
  const [charts, setCharts] = useState<Record<string, AssetChart>>({});
  const [connected, setConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  // Busca o histórico de todos os ativos do servidor ao montar
  useEffect(() => {
    fetch("/api/charts/history")
      .then((r) => r.json())
      .then((data: Record<string, { candles: CandleData[]; currentPrice: number }>) => {
        setCharts((prev) => {
          const next = { ...prev };
          for (const [symbol, { candles, currentPrice }] of Object.entries(data)) {
            if (candles.length === 0) continue;
            fetchedRef.current.add(symbol);
            const first = candles[0];
            const last = candles[candles.length - 1];
            const priceChange = first.price > 0 ? ((last.price - first.price) / first.price) * 100 : 0;
            next[symbol] = {
              symbol,
              currentPrice,
              priceChange,
              data: candles,
              lastUpdate: new Date().toISOString(),
            };
          }
          return next;
        });
      })
      .catch(() => {
        // Servidor pode não estar pronto ainda — tenta de novo em 3s
        setTimeout(() => {
          fetch("/api/charts/history")
            .then((r) => r.json())
            .then((data: Record<string, { candles: CandleData[]; currentPrice: number }>) => {
              setCharts((prev) => {
                const next = { ...prev };
                for (const [symbol, { candles, currentPrice }] of Object.entries(data)) {
                  if (candles.length === 0) continue;
                  fetchedRef.current.add(symbol);
                  const first = candles[0];
                  const last = candles[candles.length - 1];
                  const priceChange = first.price > 0 ? ((last.price - first.price) / first.price) * 100 : 0;
                  next[symbol] = {
                    symbol,
                    currentPrice,
                    priceChange,
                    data: candles,
                    lastUpdate: new Date().toISOString(),
                  };
                }
                return next;
              });
            })
            .catch(() => {});
        }, 3000);
      });
  }, []);

  // SSE para atualizações em tempo real (afeta principalmente Dashboard e preços de outros ativos)
  useEffect(() => {
    const sse = new EventSource("/api/charts/stream");
    sseRef.current = sse;

    sse.onopen = () => setConnected(true);

    sse.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          symbol?: string;
          candle?: CandleData;
        };
        if (msg.type === "candle" && msg.symbol && msg.candle) {
          const { symbol, candle } = msg;
          setCharts((prev) => {
            const chart = prev[symbol];
            if (!chart) return prev;
            const prevData = chart.data;
            const appended = [...prevData, candle];
            const trimmed = appended.length > 500 ? appended.slice(-500) : appended;
            const first = trimmed[0];
            const priceChange = first && first.price > 0
              ? ((candle.price - first.price) / first.price) * 100
              : chart.priceChange;
            return {
              ...prev,
              [symbol]: {
                ...chart,
                currentPrice: candle.price,
                priceChange,
                data: trimmed,
                lastUpdate: new Date().toISOString(),
              },
            };
          });
        }
      } catch {
        // Ignora mensagens malformadas
      }
    };

    sse.onerror = () => {
      setConnected(false);
      sse.close();
      // Reconecta após 5s
      setTimeout(() => {
        sseRef.current = null;
      }, 5000);
    };

    return () => {
      sse.close();
    };
  }, []);

  // Busca histórico de um ativo específico sob demanda
  const fetchHistory = useCallback(async (symbol: string) => {
    if (fetchedRef.current.has(symbol)) return;
    try {
      const r = await fetch(`/api/charts/history/${encodeURIComponent(symbol)}`);
      if (!r.ok) return;
      const data = (await r.json()) as { symbol: string; candles: CandleData[] };
      if (!data.candles || data.candles.length === 0) return;
      fetchedRef.current.add(symbol);
      setCharts((prev) => {
        const candles = data.candles;
        const first = candles[0];
        const last = candles[candles.length - 1];
        const priceChange = first.price > 0 ? ((last.price - first.price) / first.price) * 100 : 0;
        return {
          ...prev,
          [symbol]: {
            symbol,
            currentPrice: last.price,
            priceChange,
            data: candles,
            lastUpdate: new Date().toISOString(),
          },
        };
      });
    } catch {
      // Falha silenciosa
    }
  }, []);

  const getChart = useCallback((symbol: string) => charts[symbol], [charts]);

  const updatePrice = useCallback((symbol: string, newPrice: number) => {
    setCharts((prev) => {
      const chart = prev[symbol];
      if (!chart) return prev;
      return {
        ...prev,
        [symbol]: {
          ...chart,
          currentPrice: newPrice,
          priceChange: newPrice - chart.currentPrice,
          lastUpdate: new Date().toISOString(),
        },
      };
    });
  }, []);

  const updateChartData = useCallback((symbol: string, data: CandleData[]) => {
    setCharts((prev) => {
      const chart = prev[symbol];
      const currentPrice = data.length > 0 ? data[data.length - 1].price : (chart?.currentPrice ?? 0);
      const first = data[0];
      const priceChange = first && first.price > 0
        ? ((currentPrice - first.price) / first.price) * 100
        : (chart?.priceChange ?? 0);
      return {
        ...prev,
        [symbol]: {
          symbol,
          currentPrice,
          priceChange,
          data,
          lastUpdate: new Date().toISOString(),
        },
      };
    });
  }, []);

  return (
    <ChartContext.Provider value={{ charts, connected, getChart, updatePrice, updateChartData, fetchHistory }}>
      {children}
    </ChartContext.Provider>
  );
}

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) throw new Error("useChart deve ser usado dentro de ChartProvider");
  return context;
}
