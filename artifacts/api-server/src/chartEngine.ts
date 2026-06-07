import { EventEmitter } from "events";

  export interface ServerCandle {
    time: string;
    timestamp: number;
    open: number;
    close: number;
    high: number;
    low: number;
    price: number;
    volume: number;
  }

  interface AssetState {
    symbol: string;
    startPrice: number;
    currentPrice: number;
    history: ServerCandle[];
  }

  const MAX_HISTORY = 500;
  const BASE_VOLATILITY = 0.004;

  /*
   * Volatilidade natural: clustering (períodos calmos/voláteis) + spikes ocasionais.
   * Cada candle tem seu próprio fator de volatilidade derivado do PRNG —
   * nunca toca na lógica de manipulação de trades, apenas no ruído do gráfico.
   */

  /*
   * ── PRNG DETERMINÍSTICO ────────────────────────────────────────────────────
   * Mesma lógica do fallback do cliente (Trade.tsx).
   * seed = hash(symbol + ":" + hourBucket) → mesmo símbolo + mesma hora = mesmo gráfico.
   * Isso garante que reinicializações do servidor (Render free tier) ou
   * navegações entre páginas NÃO causem saltos no gráfico.
   */
  function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h >>> 0;
  }

  function mulberry32(seed: number): () => number {
    let s = seed;
    return (): number => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussianSeeded(rng: () => number): number {
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ── Todos os 40 ativos do cliente ──────────────────────────────────────────
  const ASSET_SEEDS: { symbol: string; startPrice: number }[] = [
    // Forex
    { symbol: "EUR/USD",  startPrice: 1.0850   },
    { symbol: "GBP/USD",  startPrice: 1.2750   },
    { symbol: "USD/JPY",  startPrice: 149.85   },
    { symbol: "AUD/USD",  startPrice: 0.6510   },
    { symbol: "USD/CAD",  startPrice: 1.3620   },
    { symbol: "USD/BRL",  startPrice: 5.2840   },
    { symbol: "EUR/GBP",  startPrice: 0.8540   },
    { symbol: "EUR/JPY",  startPrice: 162.45   },
    { symbol: "USD/CHF",  startPrice: 0.9020   },
    { symbol: "GBP/JPY",  startPrice: 191.35   },
    { symbol: "NZD/USD",  startPrice: 0.6090   },
    { symbol: "USD/MXN",  startPrice: 17.150   },
    // Cripto
    { symbol: "BTC/USD",  startPrice: 67420    },
    { symbol: "ETH/USD",  startPrice: 3248.50  },
    { symbol: "XRP/USD",  startPrice: 0.5230   },
    { symbol: "BNB/USD",  startPrice: 385.20   },
    { symbol: "SOL/USD",  startPrice: 142.80   },
    { symbol: "ADA/USD",  startPrice: 0.4820   },
    { symbol: "DOGE/USD", startPrice: 0.1285   },
    { symbol: "AVAX/USD", startPrice: 38.60    },
    { symbol: "DOT/USD",  startPrice: 7.480    },
    { symbol: "LTC/USD",  startPrice: 84.30    },
    // Ações BR
    { symbol: "PETR4",    startPrice: 38.42    },
    { symbol: "VALE3",    startPrice: 61.80    },
    { symbol: "ITUB4",    startPrice: 34.55    },
    { symbol: "BBDC4",    startPrice: 14.92    },
    { symbol: "ABEV3",    startPrice: 11.35    },
    { symbol: "BBAS3",    startPrice: 56.80    },
    { symbol: "WEGE3",    startPrice: 45.20    },
    { symbol: "RENT3",    startPrice: 92.40    },
    // Ações US
    { symbol: "TSLA",     startPrice: 248.50   },
    { symbol: "NVIDIA",   startPrice: 875.30   },
    { symbol: "AMAZON",   startPrice: 185.60   },
    { symbol: "APPLE",    startPrice: 192.40   },
    { symbol: "META",     startPrice: 485.20   },
    { symbol: "MSFT",     startPrice: 415.80   },
    // Commodities
    { symbol: "GOLD",     startPrice: 2385.50  },
    { symbol: "SILVER",   startPrice: 28.74    },
    { symbol: "OIL/USD",  startPrice: 82.40    },
    { symbol: "COPPER",   startPrice: 4.2850   },
    { symbol: "PLAT",     startPrice: 1015.00  },
  ];

  export const chartEmitter = new EventEmitter();
  chartEmitter.setMaxListeners(2000);

  /*
   * seedHistory — gera histórico determinístico.
   * seed = hash(symbol + ":" + hourBucket)
   * → mesma hora = mesma sequência de candles = mesmo gráfico após reinício do servidor.
   */
  function seedHistory(symbol: string, startPrice: number, count: number): ServerCandle[] {
    const hourBucket = Math.floor(Date.now() / 3600000);
    const rng = mulberry32(hashStr(symbol + ":" + hourBucket));
    const history: ServerCandle[] = [];
    let price = startPrice;
    const now = Date.now();

    for (let i = count; i >= 0; i--) {
      const timestamp = now - i * 1000;
      const noise    = gaussianSeeded(rng);
      const wickVal  = rng();
      const volVal   = rng();
      const volScale = rng();   // clustering: 0 = calmo, 1 = volátil
      const spikeRaw = rng();   // spike ocasional

      const isSpike    = spikeRaw < 0.04;
      const spikeMult  = isSpike ? (2.4 + rng() * 1.6) : 1.0;
      const effectiveFactor = 0.4 * (0.15 + volScale * 1.7) * spikeMult;

      const move = price * BASE_VOLATILITY * noise * effectiveFactor;
      const open = price;
      const close = parseFloat((open + move).toFixed(4));
      const wickSize = Math.abs(move) * (0.3 + wickVal * 0.5);

      history.push({
        time: new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        timestamp,
        open,
        close,
        high: parseFloat((Math.max(open, close) + wickSize).toFixed(4)),
        low:  parseFloat((Math.min(open, close) - Math.max(wickSize * 0.5, 0.0001)).toFixed(4)),
        price: close,
        volume: Math.floor(volVal * 80000 + 20000),
      });
      price = close;
    }
    return history;
  }

  /*
   * nextCandleSeeded — gera o próximo candle com noise determinístico.
   * seed = hash(symbol + ":" + floor(timestamp / 1000))
   * → o mesmo segundo sempre produz o mesmo ruído, independente de reinícios.
   */
  function nextCandleSeeded(symbol: string, last: ServerCandle, timestamp: number): ServerCandle {
    const rng = mulberry32(hashStr(symbol + ":" + Math.floor(timestamp / 1000)));
    const noise    = gaussianSeeded(rng);
    const wickVal  = rng();
    const volVal   = rng();
    const volScale = rng();   // clustering de volatilidade
    const spikeRaw = rng();   // spike ocasional (~4%)

    const isSpike   = spikeRaw < 0.04;
    const spikeMult = isSpike ? (2.4 + rng() * 1.6) : 1.0;
    const effectiveFactor = 0.4 * (0.15 + volScale * 1.7) * spikeMult;

    const move  = last.price * BASE_VOLATILITY * noise * effectiveFactor;
    const open  = last.close;
    const close = parseFloat((open + move).toFixed(4));
    const wickSize = Math.abs(move) * (0.3 + wickVal * 0.5);

    return {
      time: new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      open,
      close,
      high: parseFloat((Math.max(open, close) + wickSize).toFixed(4)),
      low:  parseFloat((Math.min(open, close) - Math.max(wickSize * 0.5, 0.0001)).toFixed(4)),
      price: close,
      volume: Math.floor(volVal * 80000 + 20000),
    };
  }

  const assets: Map<string, AssetState> = new Map();

  for (const seed of ASSET_SEEDS) {
    const history = seedHistory(seed.symbol, seed.startPrice, 100);
    assets.set(seed.symbol, {
      symbol: seed.symbol,
      startPrice: seed.startPrice,
      currentPrice: history[history.length - 1].price,
      history,
    });
  }

  setInterval(() => {
    const now = Date.now();
    for (const asset of assets.values()) {
      const last = asset.history[asset.history.length - 1];
      const candle = nextCandleSeeded(asset.symbol, last, now);
      asset.history.push(candle);
      if (asset.history.length > MAX_HISTORY) {
        asset.history.shift();
      }
      asset.currentPrice = candle.price;
      chartEmitter.emit("candle", { symbol: asset.symbol, candle });
    }
  }, 1000);

  export function getAssetHistory(symbol: string): ServerCandle[] | null {
    const asset = assets.get(symbol);
    return asset ? [...asset.history] : null;
  }

  export function getAllHistory(): Record<string, { candles: ServerCandle[]; currentPrice: number }> {
    const result: Record<string, { candles: ServerCandle[]; currentPrice: number }> = {};
    for (const [symbol, asset] of assets.entries()) {
      result[symbol] = { candles: [...asset.history], currentPrice: asset.currentPrice };
    }
    return result;
  }
  