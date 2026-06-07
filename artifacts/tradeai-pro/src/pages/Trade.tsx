/*
 * Trade — Opções Binárias Profissional (IQ Option Style)
 * 40 ativos OTC com gráficos distintos por tema visual.
 * Lógica de preço, manipulação, chart e contexto: INALTERADOS.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import ProfessionalChart from "@/components/ProfessionalChart";
import { useTrading } from "@/contexts/TradingContext";
import { useChart } from "@/contexts/ChartContext";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle,
  Activity, Search, X, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Fallback local — idêntico ao original
// PRNG com semente — mesmo símbolo + mesma hora = mesmo gráfico inicial (não muda ao atualizar)
  function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h >>> 0;
  }
  function mulberry32(seed: number) {
    let s = seed;
    return () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function generatePriceData(points: number, startPrice: number, symbol = "default") {
    const data = [];
    let price = startPrice;
    const now = new Date();
    const hourBucket = Math.floor(Date.now() / 3600000);
    const rng = mulberry32(hashStr(symbol + ":" + hourBucket));
    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 1000);
      const u1 = Math.max(rng(), 1e-10), u2 = rng();
      const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const move = price * 0.004 * noise * 0.4;
      const open = price;
      const close = parseFloat((open + move).toFixed(4));
      const wickSize = Math.abs(move) * (0.3 + rng() * 0.4);
      data.push({
        time: time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        open, close,
        high: parseFloat((Math.max(open, close) + wickSize).toFixed(4)),
        low: parseFloat((Math.min(open, close) - Math.max(wickSize * 0.5, 0.0001)).toFixed(4)),
        price: close,
        volume: Math.floor(rng() * 80000 + 20000),
      });
      price = close;
    }
    return data;
  }

// ── 40 ativos OTC — cada um com tema visual distinto ─────────────────────────
const ASSETS = [
  // ── Forex ──────────────────────────────────────────────────────────────────
  { symbol: "EUR/USD", name: "Euro vs Dólar OTC",     startPrice: 1.0850,  color: "#3b82f6", type: "Forex",
    theme: { bgColor: "#04060e", bullColor: "#00d37f", bearColor: "#ff3d57", gridColor: "rgba(0,211,127,0.04)", axisColor: "rgba(160,200,255,0.45)" } },
  { symbol: "GBP/USD", name: "Libra vs Dólar OTC",    startPrice: 1.2750,  color: "#06b6d4", type: "Forex",
    theme: { bgColor: "#04080e", bullColor: "#26c6da", bearColor: "#ef5350", gridColor: "rgba(38,198,218,0.04)", axisColor: "rgba(150,220,240,0.45)" } },
  { symbol: "USD/JPY", name: "Dólar vs Iene OTC",     startPrice: 149.85,  color: "#8b5cf6", type: "Forex",
    theme: { bgColor: "#06040e", bullColor: "#ab47bc", bearColor: "#ff5252", gridColor: "rgba(171,71,188,0.04)", axisColor: "rgba(200,160,240,0.45)" } },
  { symbol: "AUD/USD", name: "Dólar Aus vs USD OTC",  startPrice: 0.6510,  color: "#f59e0b", type: "Forex",
    theme: { bgColor: "#080600", bullColor: "#26a69a", bearColor: "#ff5722", gridColor: "rgba(38,166,154,0.04)", axisColor: "rgba(200,210,160,0.45)" } },
  { symbol: "USD/CAD", name: "Dólar vs CAD OTC",      startPrice: 1.3620,  color: "#10b981", type: "Forex",
    theme: { bgColor: "#040a06", bullColor: "#66bb6a", bearColor: "#e53935", gridColor: "rgba(102,187,106,0.04)", axisColor: "rgba(160,220,180,0.45)" } },
  { symbol: "USD/BRL", name: "Dólar vs Real OTC",     startPrice: 5.2840,  color: "#22c55e", type: "Forex",
    theme: { bgColor: "#040c06", bullColor: "#43a047", bearColor: "#c62828", gridColor: "rgba(67,160,71,0.04)", axisColor: "rgba(160,230,170,0.45)" } },
  { symbol: "EUR/GBP", name: "Euro vs Libra OTC",     startPrice: 0.8540,  color: "#0ea5e9", type: "Forex",
    theme: { bgColor: "#040810", bullColor: "#29b6f6", bearColor: "#f44336", gridColor: "rgba(41,182,246,0.04)", axisColor: "rgba(140,200,250,0.45)" } },
  { symbol: "EUR/JPY", name: "Euro vs Iene OTC",      startPrice: 162.45,  color: "#7c3aed", type: "Forex",
    theme: { bgColor: "#060410", bullColor: "#7e57c2", bearColor: "#ff4081", gridColor: "rgba(126,87,194,0.04)", axisColor: "rgba(190,170,240,0.45)" } },
  { symbol: "USD/CHF", name: "Dólar vs Franco OTC",   startPrice: 0.9020,  color: "#d97706", type: "Forex",
    theme: { bgColor: "#0a0700", bullColor: "#ffa726", bearColor: "#ef5350", gridColor: "rgba(255,167,38,0.04)", axisColor: "rgba(240,200,140,0.45)" } },
  { symbol: "GBP/JPY", name: "Libra vs Iene OTC",     startPrice: 191.35,  color: "#6366f1", type: "Forex",
    theme: { bgColor: "#05060e", bullColor: "#5c6bc0", bearColor: "#ff5252", gridColor: "rgba(92,107,192,0.04)", axisColor: "rgba(180,185,240,0.45)" } },
  { symbol: "NZD/USD", name: "Dólar NZ vs USD OTC",   startPrice: 0.6090,  color: "#14b8a6", type: "Forex",
    theme: { bgColor: "#040b0a", bullColor: "#00bcd4", bearColor: "#ff3d57", gridColor: "rgba(0,188,212,0.04)", axisColor: "rgba(140,220,220,0.45)" } },
  { symbol: "USD/MXN", name: "Dólar vs Peso OTC",     startPrice: 17.150,  color: "#84cc16", type: "Forex",
    theme: { bgColor: "#060900", bullColor: "#8bc34a", bearColor: "#ff5722", gridColor: "rgba(139,195,74,0.04)", axisColor: "rgba(190,220,140,0.45)" } },
  // ── Cripto ─────────────────────────────────────────────────────────────────
  { symbol: "BTC/USD", name: "Bitcoin OTC",            startPrice: 67420,   color: "#f97316", type: "Cripto",
    theme: { bgColor: "#0e0800", bullColor: "#ff9800", bearColor: "#f44336", gridColor: "rgba(255,152,0,0.05)", axisColor: "rgba(240,200,140,0.45)" } },
  { symbol: "ETH/USD", name: "Ethereum OTC",           startPrice: 3248.50, color: "#6366f1", type: "Cripto",
    theme: { bgColor: "#06040e", bullColor: "#7c4dff", bearColor: "#ff5252", gridColor: "rgba(124,77,255,0.05)", axisColor: "rgba(190,170,250,0.45)" } },
  { symbol: "XRP/USD", name: "Ripple OTC",             startPrice: 0.5230,  color: "#06b6d4", type: "Cripto",
    theme: { bgColor: "#00080e", bullColor: "#00e5ff", bearColor: "#f44336", gridColor: "rgba(0,229,255,0.04)", axisColor: "rgba(140,220,250,0.45)" } },
  { symbol: "BNB/USD", name: "BNB OTC",                startPrice: 385.20,  color: "#f59e0b", type: "Cripto",
    theme: { bgColor: "#0e0c00", bullColor: "#f9a825", bearColor: "#e53935", gridColor: "rgba(249,168,37,0.05)", axisColor: "rgba(250,220,140,0.45)" } },
  { symbol: "SOL/USD", name: "Solana OTC",             startPrice: 142.80,  color: "#9333ea", type: "Cripto",
    theme: { bgColor: "#080010", bullColor: "#9c27b0", bearColor: "#ff3d57", gridColor: "rgba(156,39,176,0.05)", axisColor: "rgba(210,140,250,0.45)" } },
  { symbol: "ADA/USD", name: "Cardano OTC",            startPrice: 0.4820,  color: "#3b82f6", type: "Cripto",
    theme: { bgColor: "#00040e", bullColor: "#1565c0", bearColor: "#ff5252", gridColor: "rgba(21,101,192,0.05)", axisColor: "rgba(140,170,240,0.45)" } },
  { symbol: "DOGE/USD",name: "Dogecoin OTC",           startPrice: 0.1285,  color: "#eab308", type: "Cripto",
    theme: { bgColor: "#0e0e00", bullColor: "#c6a700", bearColor: "#f44336", gridColor: "rgba(198,167,0,0.05)", axisColor: "rgba(240,230,130,0.45)" } },
  { symbol: "AVAX/USD",name: "Avalanche OTC",          startPrice: 38.60,   color: "#ef4444", type: "Cripto",
    theme: { bgColor: "#0e0000", bullColor: "#ff1744", bearColor: "#b71c1c", gridColor: "rgba(255,23,68,0.05)", axisColor: "rgba(250,150,150,0.45)" } },
  { symbol: "DOT/USD", name: "Polkadot OTC",           startPrice: 7.480,   color: "#ec4899", type: "Cripto",
    theme: { bgColor: "#0e0010", bullColor: "#e91e63", bearColor: "#880e4f", gridColor: "rgba(233,30,99,0.05)", axisColor: "rgba(240,150,200,0.45)" } },
  { symbol: "LTC/USD", name: "Litecoin OTC",           startPrice: 84.30,   color: "#9ca3af", type: "Cripto",
    theme: { bgColor: "#080808", bullColor: "#9e9e9e", bearColor: "#f44336", gridColor: "rgba(158,158,158,0.04)", axisColor: "rgba(200,210,210,0.45)" } },
  // ── Ações BR ───────────────────────────────────────────────────────────────
  { symbol: "PETR4",   name: "Petrobras OTC",          startPrice: 38.42,   color: "#22c55e", type: "Ações BR",
    theme: { bgColor: "#000e06", bullColor: "#00c853", bearColor: "#ff1744", gridColor: "rgba(0,200,83,0.05)", axisColor: "rgba(150,240,180,0.45)" } },
  { symbol: "VALE3",   name: "Vale OTC",               startPrice: 61.80,   color: "#10b981", type: "Ações BR",
    theme: { bgColor: "#000e08", bullColor: "#00e676", bearColor: "#ff3d57", gridColor: "rgba(0,230,118,0.05)", axisColor: "rgba(150,250,190,0.45)" } },
  { symbol: "ITUB4",   name: "Itaú Unibanco OTC",      startPrice: 34.55,   color: "#3b82f6", type: "Ações BR",
    theme: { bgColor: "#00040e", bullColor: "#2979ff", bearColor: "#ff1744", gridColor: "rgba(41,121,255,0.05)", axisColor: "rgba(150,190,255,0.45)" } },
  { symbol: "BBDC4",   name: "Bradesco OTC",           startPrice: 14.92,   color: "#0ea5e9", type: "Ações BR",
    theme: { bgColor: "#00060e", bullColor: "#0091ea", bearColor: "#f44336", gridColor: "rgba(0,145,234,0.05)", axisColor: "rgba(140,210,250,0.45)" } },
  { symbol: "ABEV3",   name: "Ambev OTC",              startPrice: 11.35,   color: "#f59e0b", type: "Ações BR",
    theme: { bgColor: "#0e0c00", bullColor: "#ffd600", bearColor: "#ff3d00", gridColor: "rgba(255,214,0,0.05)", axisColor: "rgba(250,230,130,0.45)" } },
  { symbol: "BBAS3",   name: "Banco do Brasil OTC",    startPrice: 56.80,   color: "#84cc16", type: "Ações BR",
    theme: { bgColor: "#040e00", bullColor: "#1de9b6", bearColor: "#ff5252", gridColor: "rgba(29,233,182,0.05)", axisColor: "rgba(170,250,220,0.45)" } },
  { symbol: "WEGE3",   name: "WEG OTC",                startPrice: 45.20,   color: "#7c3aed", type: "Ações BR",
    theme: { bgColor: "#06000e", bullColor: "#651fff", bearColor: "#ff1744", gridColor: "rgba(101,31,255,0.05)", axisColor: "rgba(180,150,255,0.45)" } },
  { symbol: "RENT3",   name: "Localiza OTC",           startPrice: 92.40,   color: "#d946ef", type: "Ações BR",
    theme: { bgColor: "#0e000e", bullColor: "#d500f9", bearColor: "#f44336", gridColor: "rgba(213,0,249,0.05)", axisColor: "rgba(230,140,255,0.45)" } },
  // ── Ações US ───────────────────────────────────────────────────────────────
  { symbol: "TSLA",    name: "Tesla OTC",              startPrice: 248.50,  color: "#ef4444", type: "Ações US",
    theme: { bgColor: "#0e0200", bullColor: "#ff3d00", bearColor: "#b71c1c", gridColor: "rgba(255,61,0,0.05)", axisColor: "rgba(250,170,150,0.45)" } },
  { symbol: "NVIDIA",  name: "NVIDIA OTC",             startPrice: 875.30,  color: "#22c55e", type: "Ações US",
    theme: { bgColor: "#020e00", bullColor: "#76ff03", bearColor: "#f44336", gridColor: "rgba(118,255,3,0.04)", axisColor: "rgba(200,255,160,0.45)" } },
  { symbol: "AMAZON",  name: "Amazon OTC",             startPrice: 185.60,  color: "#f97316", type: "Ações US",
    theme: { bgColor: "#0e0600", bullColor: "#ff6d00", bearColor: "#e53935", gridColor: "rgba(255,109,0,0.05)", axisColor: "rgba(250,200,150,0.45)" } },
  { symbol: "APPLE",   name: "Apple OTC",              startPrice: 192.40,  color: "#d1d5db", type: "Ações US",
    theme: { bgColor: "#080808", bullColor: "#e0e0e0", bearColor: "#ef5350", gridColor: "rgba(220,220,220,0.04)", axisColor: "rgba(220,225,235,0.45)" } },
  { symbol: "META",    name: "Meta OTC",               startPrice: 485.20,  color: "#3b82f6", type: "Ações US",
    theme: { bgColor: "#02040e", bullColor: "#448aff", bearColor: "#ff1744", gridColor: "rgba(68,138,255,0.05)", axisColor: "rgba(160,190,255,0.45)" } },
  { symbol: "MSFT",    name: "Microsoft OTC",          startPrice: 415.80,  color: "#60a5fa", type: "Ações US",
    theme: { bgColor: "#02060e", bullColor: "#40c4ff", bearColor: "#ff5252", gridColor: "rgba(64,196,255,0.05)", axisColor: "rgba(150,220,250,0.45)" } },
  // ── Commodities ────────────────────────────────────────────────────────────
  { symbol: "GOLD",    name: "Ouro OTC",               startPrice: 2385.50, color: "#f59e0b", type: "Commodities",
    theme: { bgColor: "#0e0e02", bullColor: "#ffd700", bearColor: "#ff5722", gridColor: "rgba(255,215,0,0.05)", axisColor: "rgba(250,230,130,0.45)" } },
  { symbol: "SILVER",  name: "Prata OTC",              startPrice: 28.74,   color: "#9ca3af", type: "Commodities",
    theme: { bgColor: "#0a0a0b", bullColor: "#bdbdbd", bearColor: "#f44336", gridColor: "rgba(189,189,189,0.04)", axisColor: "rgba(220,225,230,0.45)" } },
  { symbol: "OIL/USD", name: "Petróleo WTI OTC",       startPrice: 82.40,   color: "#78716c", type: "Commodities",
    theme: { bgColor: "#0a0800", bullColor: "#a1887f", bearColor: "#795548", gridColor: "rgba(161,136,127,0.04)", axisColor: "rgba(210,190,175,0.45)" } },
  { symbol: "COPPER",  name: "Cobre OTC",              startPrice: 4.2850,  color: "#f97316", type: "Commodities",
    theme: { bgColor: "#0e0600", bullColor: "#bf360c", bearColor: "#d32f2f", gridColor: "rgba(191,54,12,0.05)", axisColor: "rgba(240,180,150,0.45)" } },
  { symbol: "PLAT",    name: "Platina OTC",            startPrice: 1015.00, color: "#8b5cf6", type: "Commodities",
    theme: { bgColor: "#060410", bullColor: "#9575cd", bearColor: "#e53935", gridColor: "rgba(149,117,205,0.05)", axisColor: "rgba(200,180,240,0.45)" } },
] as const;

type AssetType = (typeof ASSETS)[number];

const CATEGORIES = ["Todos", "Forex", "Cripto", "Ações BR", "Ações US", "Commodities"] as const;

const EXPIRATION_TIMES = [
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "15m", value: 900 },
];

// ── Modal de seleção de ativos ────────────────────────────────────────────────
function AssetPicker({ open, onClose, selectedIndex, onSelect }: {
  open: boolean; onClose: () => void; selectedIndex: number; onSelect: (i: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");

  const filtered = ASSETS.map((a, i) => ({ ...a, idx: i })).filter(a => {
    const matchCat = cat === "Todos" || a.type === cat;
    const matchSearch = !search || a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-3xl lg:rounded-2xl overflow-hidden"
        style={{ background: "rgba(10,14,26,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Selecionar Ativo OTC</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Buscar ativo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex gap-1.5 px-3 py-2 border-b border-white/5 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={cat === c ? { background: "#3b82f6", color: "#fff" } : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(a => (
            <button key={a.idx} onClick={() => { onSelect(a.idx); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-white/5"
              style={selectedIndex === a.idx
                ? { background: `${a.color}18`, border: `1px solid ${a.color}35` }
                : { border: "1px solid transparent" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `${a.color}25`, border: `1px solid ${a.color}45` }}>
                {a.symbol.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{a.symbol} OTC</p>
                <p className="text-[10px] text-white/40 truncate">{a.name}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                {a.type}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-white/30 py-8">Nenhum ativo encontrado</p>}
        </div>
      </div>
    </div>
  );
}

export default function Trade() {
  const { activeAccount, openBinaryOption, closeBinaryOption, updateOptionPrice, accounts, getAccountBalance, getManipulationFactor } = useTrading();
  const { charts } = useChart();

  const [selectedAsset, setSelectedAsset] = useState(() => {
    const saved = localStorage.getItem("tradeai_trade_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chartData, setChartData] = useState(() => {
    const saved = localStorage.getItem("tradeai_trade_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    const sym = ASSETS[safeIdx].symbol;
    try {
      const storedRaw = localStorage.getItem(`tradeai_chart_v2_${sym}`);
      if (storedRaw) {
        const stored = JSON.parse(storedRaw);
        if (stored.symbol === sym && stored.data?.length > 0 && Date.now() - stored.savedAt < 3600000) return stored.data;
      }
    } catch { /* ignorar */ }
    return generatePriceData(80, ASSETS[safeIdx].startPrice, ASSETS[safeIdx].symbol);
  });
  const [currentPrice, setCurrentPrice] = useState(() => {
    const saved = localStorage.getItem("tradeai_trade_asset");
    const idx = saved ? parseInt(saved, 10) : 0;
    const safeIdx = Number.isNaN(idx) || idx >= ASSETS.length ? 0 : idx;
    return ASSETS[safeIdx].startPrice;
  });
  const [priceChange, setPriceChange] = useState(0);
  const [direction, setDirection] = useState<"call" | "put">("call");
  const [betAmount, setBetAmount] = useState("");
  const [expirationTime, setExpirationTime] = useState(60);

  const seededRef = useRef(false);
  const saveCounterRef = useRef(0);

  const asset = ASSETS[selectedAsset] || ASSETS[0];
  const balance = getAccountBalance(activeAccount) || 0;
  const account = accounts[activeAccount] || accounts.demo;
  const numBet = parseFloat(betAmount) || 0;
  const payout = numBet * 1.9;

  useEffect(() => {
    seededRef.current = false;
    saveCounterRef.current = 0;
    try {
      const storedRaw = localStorage.getItem(`tradeai_chart_v2_${asset.symbol}`);
      if (storedRaw) {
        const stored = JSON.parse(storedRaw);
        if (stored.symbol === asset.symbol && stored.data?.length > 0 && Date.now() - stored.savedAt < 3600000) {
          setChartData(stored.data);
          setCurrentPrice(stored.data[stored.data.length - 1].price);
          setPriceChange(0);
          return;
        }
      }
    } catch { /* ignorar */ }
    const fallback = generatePriceData(80, asset.startPrice, asset.symbol);
    setChartData(fallback);
    setCurrentPrice(asset.startPrice);
    setPriceChange(0);
  }, [asset.symbol, asset.startPrice]);

  useEffect(() => {
    if (seededRef.current) return;
    // Não sobrescrever dados manipulados com random walk do servidor durante posição ativa
    const hasActivePos = account?.positions?.some(p => p.asset === asset.symbol);
    if (hasActivePos) { seededRef.current = true; return; }
    const serverChart = charts[asset.symbol];
    if (serverChart && serverChart.data.length > 0) {
      setChartData(serverChart.data);
      setCurrentPrice(serverChart.currentPrice);
      setPriceChange(serverChart.priceChange);
      seededRef.current = true;
    }
  }, [charts, asset.symbol, account]);

  // ── Intervalo de geração de preço com manipulação — LÓGICA INALTERADA ──────
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prev) => {
        if (!prev || prev.length === 0) return prev;

        const last = prev[prev.length - 1];
        const first = prev[0];
        const manipulation = getManipulationFactor(activeAccount, asset.symbol) || { shouldWin: false, intensity: 0 };

        const activePos = account?.positions?.find(p => p.asset === asset.symbol);
        // Ruído reduzido quando há posição ativa para o drift dominar
        const baseVolatility = activePos ? 0.00055 : 0.0010;
        const u1 = Math.random();
        const u2 = Math.random();
        const gaussianNoise = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
        let drift = 0;
          let effectiveNoise = gaussianNoise;

        if (activePos) {
          const pos = activePos;
          const totalDuration = pos.expiresAt ? (pos.expiresAt - pos.entryTime.getTime()) : 60000;
          const timeRemaining = (pos.expiresAt || 0) - Date.now();
          const timeElapsed = totalDuration - timeRemaining;
          const progress = Math.min(1, Math.max(0, timeElapsed / totalDuration));

          const isCallType = pos.type === "call";
          const priceVsEntry = last.price - pos.entryPrice;
          const currentlyWinning = (isCallType && priceVsEntry > 0) || (!isCallType && priceVsEntry < 0);
          const shouldWin = manipulation.shouldWin;
          const targetUp = shouldWin ? isCallType : !isCallType;

          // Drift calibrado para superar o ruído: noise ≈ price*0.00022 por tick
          if (progress < 0.65) {
            // Fase 1: tendência na direção certa com recuos naturais
            drift = (targetUp ? 1 : -1) * manipulation.intensity * 0.00035;
          } else if (progress < 0.80) {
            // Fase 2: aceleração — preço já deve estar do lado certo
            drift = (targetUp ? 1 : -1) * manipulation.intensity * 0.00065;
          } else {
            if (currentlyWinning === shouldWin) {
              // Fase 3 ganhando: manter posição
              drift = (targetUp ? 1 : -1) * 0.00022;
              // Finalzinho (progress>85%): amortecer ruído contra a direção
              if (progress > 0.85) {
                if (targetUp  && effectiveNoise < 0) effectiveNoise *= 0.10;
                if (!targetUp && effectiveNoise > 0) effectiveNoise *= 0.10;
              }
            } else {
              // Fase 3 perdendo: empurrão forte para cruzar linha de entrada
              const lateProgress = (progress - 0.80) / 0.20;
              drift = (targetUp ? 1 : -1) * (0.00150 + lateProgress * 0.00400);
            }
          }
        }

        const priceMove = last.price * (drift + baseVolatility * effectiveNoise * 0.4);
        const newPrice = parseFloat((last.price + priceMove).toFixed(4));
        const now = new Date();
        const wickSize = Math.abs(priceMove) * (0.3 + Math.random() * 0.4);
        const newPoint = {
          time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          open: last.price, close: newPrice,
          high: Math.max(last.price, newPrice) + wickSize,
          low: Math.min(last.price, newPrice) - Math.max(wickSize * 0.5, 0.0001),
          price: newPrice,
          volume: Math.floor(Math.random() * 80000 + 20000),
        };

        const appended = [...prev, newPoint];
        const updated = appended.length > 2000 ? appended.slice(-2000) : appended;

        saveCounterRef.current++;
        if (saveCounterRef.current % 5 === 0) {
          try {
            localStorage.setItem(`tradeai_chart_v2_${asset.symbol}`, JSON.stringify({
              symbol: asset.symbol, data: updated.slice(-300), savedAt: Date.now(),
            }));
          } catch { /* ignorar */ }
        }

        setCurrentPrice(newPrice);
        if (first) setPriceChange(((newPrice - first.price) / first.price) * 100);

        // Apenas atualiza o preço atual das posições deste ativo.
        // O fechamento é feito pelo monitor global no TradingContext.
        if (account && account.positions) {
          account.positions
            .filter(p => p.asset === asset.symbol)
            .forEach(pos => updateOptionPrice(activeAccount, pos.id, newPrice));
        }

        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAccount, account, updateOptionPrice, getManipulationFactor, asset.symbol]);

  const handleTrade = useCallback(() => {
    if (numBet <= 0) { toast.error("Informe um valor válido"); return; }
    if (numBet > balance) { toast.error("Saldo insuficiente"); return; }
    const betPercentage = (numBet / balance) * 100;
    if (betPercentage >= 60) toast.warning("⚠️ ALTO RISCO: Aposta acima de 60% do saldo!");
    openBinaryOption(
      activeAccount,
      { type: direction, asset: asset.symbol, betAmount: numBet, entryPrice: currentPrice, entryTime: new Date(), currentPrice },
      expirationTime
    );
    setBetAmount("");
    toast.success(`${direction === "call" ? "📈 CALL" : "📉 PUT"} aberto! Expira em ${expirationTime}s`);
  }, [direction, numBet, balance, activeAccount, asset.symbol, currentPrice, openBinaryOption, expirationTime]);

  const isPositive = priceChange >= 0;
  const openPos = account?.positions?.filter(p => p.asset === asset.symbol) ?? [];

  return (
    <Layout>
      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIndex={selectedAsset}
        onSelect={i => { setSelectedAsset(i); localStorage.setItem("tradeai_trade_asset", String(i)); }}
      />

      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Operar Agora</h1>
            <p className="text-sm text-white/40 mt-0.5">40 ativos OTC disponíveis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Asset Selector — botão compacto + modal picker */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ativo Selecionado</h3>

            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-90 active:scale-95"
              style={{ background: `${asset.color}15`, border: `1px solid ${asset.color}30` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: `${asset.color}25`, border: `1px solid ${asset.color}45` }}>
                {asset.symbol.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-white truncate">{asset.symbol} OTC</p>
                <p className="text-[10px] text-white/50 truncate">{asset.name}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
            </button>

            <div className="text-center py-1">
              <p className="text-2xl font-bold text-white font-mono">
                {currentPrice > 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}
              </p>
              <p className={cn("text-sm font-semibold flex items-center justify-center gap-1 mt-0.5", isPositive ? "text-green-400" : "text-red-400")}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
              </p>
            </div>

            <div className="space-y-1 text-xs text-white/40">
              <div className="flex justify-between"><span>Tipo</span><span className="text-white/70">{asset.type}</span></div>
              <div className="flex justify-between"><span>Retorno</span><span className="text-green-400 font-semibold">+90%</span></div>
              {account.positions.length > 0 && (
                <div className="flex justify-between"><span>Posições</span><span className="text-yellow-400 font-semibold">{account.positions.length} abertas</span></div>
              )}
            </div>

            {/* Acesso rápido — primeiros 8 ativos */}
            <div>
              <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">Acesso Rápido</p>
              <div className="grid grid-cols-4 gap-1">
                {ASSETS.slice(0, 8).map((a, i) => (
                  <button key={i}
                    onClick={() => { setSelectedAsset(i); localStorage.setItem("tradeai_trade_asset", String(i)); }}
                    className="p-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all"
                    style={selectedAsset === i
                      ? { background: `${a.color}30`, border: `1px solid ${a.color}50`, color: a.color }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                    {a.symbol.split("/")[0].substring(0, 4)}
                  </button>
                ))}
              </div>
              <button onClick={() => setPickerOpen(true)}
                className="w-full mt-2 text-[10px] text-white/30 hover:text-blue-400 transition-all text-center py-1">
                Ver todos os 40 ativos →
              </button>
            </div>
          </div>

          {/* Gráfico */}
          <div className="xl:col-span-2 space-y-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${asset.color}20` }}>
                    <Activity className="w-5 h-5" style={{ color: asset.color }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{asset.symbol} OTC</h2>
                    <p className="text-[10px] text-white/40">{asset.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white font-mono">
                    {currentPrice > 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}
                  </p>
                  <p className={cn("text-sm font-semibold flex items-center justify-end gap-1", isPositive ? "text-green-400" : "text-red-400")}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                  </p>
                </div>
              </div>

              <ProfessionalChart
                key={asset.symbol}
                data={chartData}
                currentPrice={currentPrice}
                assetColor={asset.color}
                assetSymbol={`${asset.symbol} OTC`}
                isPositive={isPositive}
                priceChange={priceChange}
                entryPrice={openPos[0]?.entryPrice}
                positionType={openPos[0]?.type}
                theme={asset.theme}
              />
            </div>
          </div>

          {/* Painel de operação */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Realizar Operação</h3>

              {/* Direção CALL / PUT */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDirection("call")}
                  className="p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={direction === "call"
                    ? { background: "linear-gradient(135deg,#16a34a,#15803d)", border: "1px solid rgba(34,197,94,0.4)", color: "#fff" }
                    : { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "rgba(34,197,94,0.7)" }}>
                  <TrendingUp className="w-4 h-4" /> CALL
                </button>
                <button onClick={() => setDirection("put")}
                  className="p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={direction === "put"
                    ? { background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "1px solid rgba(239,68,68,0.4)", color: "#fff" }
                    : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.7)" }}>
                  <TrendingDown className="w-4 h-4" /> PUT
                </button>
              </div>

              {/* Expiração */}
              <div>
                <Label className="text-xs text-white/50 mb-2 block">Expiração</Label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPIRATION_TIMES.map(t => (
                    <button key={t.value} onClick={() => setExpirationTime(t.value)}
                      className="p-2 rounded-lg text-xs font-semibold transition-all"
                      style={expirationTime === t.value
                        ? { background: "#3b82f6", color: "#fff" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor de entrada */}
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Valor da Entrada</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono"
                />
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span className="text-white/30">Saldo: R$ {balance.toFixed(2)}</span>
                  <span className="text-green-400">Retorno: R$ {payout.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[10, 25, 50, 100].map(v => (
                    <button key={v} onClick={() => setBetAmount(String(v))}
                      className="py-1 rounded text-[10px] font-semibold transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      R${v}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleTrade}
                disabled={numBet <= 0 || numBet > balance}
                className="w-full font-bold text-sm py-3"
                style={{ background: direction === "call" ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none" }}>
                {direction === "call" ? "📈 COMPRAR CALL" : "📉 VENDER PUT"} — {asset.symbol} OTC
              </Button>
            </div>

            {/* Posições abertas — todos os ativos */}
            {account.positions.length > 0 && (
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
                  Posições Abertas ({account.positions.length})
                </h3>
                <div className="space-y-2">
                  {account.positions.map(pos => {
                    const timeLeft = pos.expiresAt ? Math.max(0, Math.ceil((pos.expiresAt - Date.now()) / 1000)) : 0;
                    return (
                      <div key={pos.id} className="p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{pos.asset}</span>
                          <Badge variant="outline"
                            className={cn("text-[10px]", pos.type === "call" ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400")}>
                            {pos.type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40">
                          <span>Entrada: {pos.entryPrice.toFixed(4)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeLeft}s</span>
                        </div>
                        <div className="flex justify-between text-[10px] mt-0.5">
                          <span className="text-white/40">Aposta: R$ {pos.betAmount.toFixed(2)}</span>
                          <span className="text-green-400">+R$ {(pos.betAmount * 0.9).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Histórico rápido */}
            {(account?.closedPositions?.length ?? 0) > 0 && (
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Últimos Resultados</h3>
                {[...(account?.closedPositions ?? [])].slice(-3).reverse().map(pos => (
                  <div key={pos.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    {pos.result === "win"
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">{pos.asset} {pos.type.toUpperCase()}</p>
                      <p className="text-[10px] text-white/30">{pos.entryPrice.toFixed(4)} → {pos.exitPrice?.toFixed(4)}</p>
                    </div>
                    <span className={cn("text-xs font-bold", pos.result === "win" ? "text-green-400" : "text-red-400")}>
                      {pos.result === "win" ? `+R$ ${(pos.betAmount * 0.9).toFixed(2)}` : `-R$ ${pos.betAmount.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
