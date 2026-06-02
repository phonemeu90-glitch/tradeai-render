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

const ASSET_SEEDS: { symbol: string; startPrice: number }[] = [
  { symbol: "PETR4", startPrice: 38.42 },
  { symbol: "VALE3", startPrice: 61.80 },
  { symbol: "ITUB4", startPrice: 34.55 },
  { symbol: "EUR/USD", startPrice: 1.0850 },
  { symbol: "GBP/USD", startPrice: 1.2750 },
  { symbol: "BTC/USD", startPrice: 67420 },
  { symbol: "GOLD", startPrice: 2385.50 },
];

export const chartEmitter = new EventEmitter();
chartEmitter.setMaxListeners(2000);

function gaussianNoise(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

function nextCandle(last: ServerCandle): ServerCandle {
  const noise = gaussianNoise();
  const move = last.price * BASE_VOLATILITY * noise * 0.4;
  const open = last.close;
  const close = parseFloat((open + move).toFixed(4));
  const wickSize = Math.abs(move) * (0.3 + Math.random() * 0.4);
  const now = Date.now();
  return {
    time: new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    timestamp: now,
    open,
    close,
    high: parseFloat((Math.max(open, close) + wickSize).toFixed(4)),
    low: parseFloat((Math.min(open, close) - Math.max(wickSize * 0.5, 0.0001)).toFixed(4)),
    price: close,
    volume: Math.floor(Math.random() * 80000 + 20000),
  };
}

function seedHistory(startPrice: number, count: number): ServerCandle[] {
  const history: ServerCandle[] = [];
  let price = startPrice;
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const timestamp = now - i * 1000;
    const noise = gaussianNoise();
    const move = price * BASE_VOLATILITY * noise * 0.4;
    const open = price;
    const close = parseFloat((open + move).toFixed(4));
    const wickSize = Math.abs(move) * (0.3 + Math.random() * 0.4);
    history.push({
      time: new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      open,
      close,
      high: parseFloat((Math.max(open, close) + wickSize).toFixed(4)),
      low: parseFloat((Math.min(open, close) - Math.max(wickSize * 0.5, 0.0001)).toFixed(4)),
      price: close,
      volume: Math.floor(Math.random() * 80000 + 20000),
    });
    price = close;
  }
  return history;
}

const assets: Map<string, AssetState> = new Map();

for (const seed of ASSET_SEEDS) {
  const history = seedHistory(seed.startPrice, 100);
  assets.set(seed.symbol, {
    symbol: seed.symbol,
    startPrice: seed.startPrice,
    currentPrice: history[history.length - 1].price,
    history,
  });
}

setInterval(() => {
  for (const asset of assets.values()) {
    const last = asset.history[asset.history.length - 1];
    const candle = nextCandle(last);
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
