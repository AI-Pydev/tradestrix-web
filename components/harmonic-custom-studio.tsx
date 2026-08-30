"use client";

import { HarmonicCandleWaveChart } from "@/components/harmonic-candle-wave-chart";
import {
  createHarmonicPaperTrade,
  CustomSymbolAnalysisResponse,
  CustomWaveEvaluationResponse,
  evaluateHarmonicSandboxWave,
  fetchCustomHarmonicAnalysis,
} from "@/lib/harmonic-pattern-api";
import { useEffect, useMemo, useState } from "react";

interface HarmonicCustomStudioProps {
  onPaperTradeSuccess?: () => void;
  onOpenPatternModal?: (pattern: any) => void;
  onOpenPredictiveModal?: (prediction: any) => void;
}

interface InstrumentOption {
  label: string;
  name: string;
  instrument_key: string;
  kind: "index" | "stock" | "commodity";
}

interface PivotPointMeta {
  price: number;
  time?: string;
  type?: string;
  isPredicted?: boolean;
}

interface HarmonicPatternCheatsheet {
  name: string;
  bRetracement: string; // AB/XA
  bIdeal: string;
  cPullback: string; // BC/AB
  cIdeal: string;
  dProjection: string; // CD/BC
  dIdeal: string;
  dRetracement: string; // XD/XA
  dRetracementIdeal: string;
  keyRule: string;
}

const HARMONIC_STANDARDS_CHEATSHEET: HarmonicPatternCheatsheet[] = [
  {
    name: "Gartley (222)",
    bRetracement: "0.618 (0.59 – 0.64)",
    bIdeal: "0.618",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "1.130 – 1.618",
    dIdeal: "1.272",
    dRetracement: "0.786",
    dRetracementIdeal: "0.786",
    keyRule: "Strict 0.618 B-point retracement and strict 0.786 D-point PRZ completion.",
  },
  {
    name: "Bat",
    bRetracement: "0.382 – 0.500",
    bIdeal: "0.382 / 0.500",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "1.618 – 2.618",
    dIdeal: "2.000",
    dRetracement: "0.886",
    dRetracementIdeal: "0.886",
    keyRule: "Shallow B-point (≤0.50) with deep, precise 0.886 D-point retracement.",
  },
  {
    name: "Alternate Bat",
    bRetracement: "0.382",
    bIdeal: "0.382",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "2.000 – 3.618",
    dIdeal: "2.618",
    dRetracement: "1.130",
    dRetracementIdeal: "1.130",
    keyRule: "Strict 0.382 B-point with 1.130 D extension surpassing Point X.",
  },
  {
    name: "Butterfly",
    bRetracement: "0.786",
    bIdeal: "0.786",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "1.618 – 2.618",
    dIdeal: "2.000",
    dRetracement: "1.272 – 1.618",
    dRetracementIdeal: "1.272",
    keyRule: "Deep 0.786 B-point with mandatory 1.272-1.618 D extension beyond X.",
  },
  {
    name: "Crab",
    bRetracement: "0.382 – 0.618",
    bIdeal: "0.618",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "2.240 – 3.618",
    dIdeal: "2.618 / 3.140",
    dRetracement: "1.618",
    dRetracementIdeal: "1.618",
    keyRule: "Extreme 1.618 XA extension with sharp 2.24-3.618 CD projection.",
  },
  {
    name: "Deep Crab",
    bRetracement: "0.886",
    bIdeal: "0.886",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "2.240 – 3.618",
    dIdeal: "2.618",
    dRetracement: "1.618",
    dRetracementIdeal: "1.618",
    keyRule: "Deep 0.886 B-point with extreme 1.618 D extension.",
  },
  {
    name: "Shark",
    bRetracement: "0.500 – 0.886",
    bIdeal: "0.618",
    cPullback: "1.130 – 1.618",
    cIdeal: "1.272",
    dProjection: "1.618 – 2.240",
    dIdeal: "2.000",
    dRetracement: "0.886 – 1.130",
    dRetracementIdeal: "1.000",
    keyRule: "C point extends beyond A (1.13-1.618) with 0.886-1.13 D point.",
  },
  {
    name: "Cypher",
    bRetracement: "0.382 – 0.618",
    bIdeal: "0.500",
    cPullback: "1.272 – 2.000",
    cIdeal: "1.414",
    dProjection: "1.272 – 2.000",
    dIdeal: "1.618",
    dRetracement: "0.786 (of XC)",
    dRetracementIdeal: "0.786",
    keyRule: "C extends beyond A (1.272-1.414 of XA) with D touching 0.786 of XC.",
  },
  {
    name: "AB=CD",
    bRetracement: "0.382 – 0.886",
    bIdeal: "0.618",
    cPullback: "0.382 – 0.886",
    cIdeal: "0.618",
    dProjection: "1.130 – 2.618",
    dIdeal: "1.618",
    dRetracement: "CD = 1.0 * AB",
    dRetracementIdeal: "1.000",
    keyRule: "Equal leg length (|CD| = |AB|) and proportional time symmetry.",
  },
];

const DEFAULT_CATALOG: InstrumentOption[] = [
  // Major Indices
  { label: "NIFTY 50", name: "NIFTY 50 Index", instrument_key: "NSE_INDEX|Nifty 50", kind: "index" },
  { label: "BANKNIFTY", name: "Nifty Bank Index", instrument_key: "NSE_INDEX|Nifty Bank", kind: "index" },
  { label: "FINNIFTY", name: "Nifty Financial Services", instrument_key: "NSE_INDEX|Nifty Fin Service", kind: "index" },
  { label: "MIDCPNIFTY", name: "Nifty Midcap Select", instrument_key: "NSE_INDEX|NIFTY MID SELECT", kind: "index" },

  // Top Stocks
  { label: "VEDL", name: "Vedanta Limited", instrument_key: "NSE_EQ|INE205A01025", kind: "stock" },
  { label: "TATAMOTORS", name: "Tata Motors Limited", instrument_key: "NSE_EQ|INE155A01022", kind: "stock" },
  { label: "BHARTIARTL", name: "Bharti Airtel Limited", instrument_key: "NSE_EQ|INE397D01024", kind: "stock" },
  { label: "RELIANCE", name: "Reliance Industries Ltd", instrument_key: "NSE_EQ|INE002A01018", kind: "stock" },
  { label: "HDFCBANK", name: "HDFC Bank Limited", instrument_key: "NSE_EQ|INE040A01034", kind: "stock" },
  { label: "ICICIBANK", name: "ICICI Bank Limited", instrument_key: "NSE_EQ|INE090A01021", kind: "stock" },
  { label: "INFY", name: "Infosys Limited", instrument_key: "NSE_EQ|INE009A01021", kind: "stock" },
  { label: "TCS", name: "Tata Consultancy Services", instrument_key: "NSE_EQ|INE467B01029", kind: "stock" },
  { label: "SBIN", name: "State Bank of India", instrument_key: "NSE_EQ|INE062A01020", kind: "stock" },
  { label: "ITC", name: "ITC Limited", instrument_key: "NSE_EQ|INE154A01025", kind: "stock" },
  { label: "LT", name: "Larsen & Toubro Ltd", instrument_key: "NSE_EQ|INE018A01030", kind: "stock" },
  { label: "AXISBANK", name: "Axis Bank Limited", instrument_key: "NSE_EQ|INE238A01034", kind: "stock" },
  { label: "KOTAKBANK", name: "Kotak Mahindra Bank", instrument_key: "NSE_EQ|INE237A01028", kind: "stock" },
  { label: "BAJFINANCE", name: "Bajaj Finance Limited", instrument_key: "NSE_EQ|INE296A01024", kind: "stock" },
  { label: "MARUTI", name: "Maruti Suzuki India", instrument_key: "NSE_EQ|INE585B01010", kind: "stock" },
  { label: "TATASTEEL", name: "Tata Steel Limited", instrument_key: "NSE_EQ|INE081A01020", kind: "stock" },
  { label: "HINDALCO", name: "Hindalco Industries", instrument_key: "NSE_EQ|INE038A01020", kind: "stock" },
  { label: "ADANIENT", name: "Adani Enterprises", instrument_key: "NSE_EQ|INE423A01024", kind: "stock" },
  { label: "ADANIPORTS", name: "Adani Ports & SEZ", instrument_key: "NSE_EQ|INE742F01042", kind: "stock" },

  // MCX Commodities
  { label: "GOLD", name: "MCX Gold Futures", instrument_key: "MCX_FO|GOLD", kind: "commodity" },
  { label: "SILVER", name: "MCX Silver Futures", instrument_key: "MCX_FO|SILVER", kind: "commodity" },
  { label: "CRUDEOIL", name: "MCX Crude Oil", instrument_key: "MCX_FO|CRUDEOIL", kind: "commodity" },
];

const PRESET_POPULAR = [
  { label: "VEDL", name: "Vedanta Ltd" },
  { label: "BHARTIARTL", name: "Bharti Airtel" },
  { label: "TATAMOTORS", name: "Tata Motors Ltd" },
  { label: "RELIANCE", name: "Reliance Ind" },
  { label: "HDFCBANK", name: "HDFC Bank" },
  { label: "NIFTY 50", name: "NIFTY 50" },
  { label: "BANKNIFTY", name: "Nifty Bank" },
];

// Harmonic timeframe standards (1m removed to eliminate high-frequency noise)
const TIMEFRAMES = [
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "1d",
  "1w",
  "1M",
];

export function HarmonicCustomStudio({
  onPaperTradeSuccess,
  onOpenPatternModal,
  onOpenPredictiveModal,
}: HarmonicCustomStudioProps) {
  const [studioMode, setStudioMode] = useState<"sandbox" | "symbol_scanner">(
    "sandbox"
  );

  // --- Instrument Catalog State ---
  const [catalog, setCatalog] = useState<InstrumentOption[]>(DEFAULT_CATALOG);
  const [symbolSearchFilter, setSymbolSearchFilter] = useState("");

  // Load backend catalog if available
  useEffect(() => {
    fetch("/api/v1/instruments/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data.stocks || data.indices)) {
          const combined: InstrumentOption[] = [
            ...(data.indices || []).map((i: any) => ({
              label: i.label || i.symbol || "INDEX",
              name: i.label || i.symbol || "Index",
              instrument_key: i.instrument_key,
              kind: "index" as const,
            })),
            ...(data.stocks || []).map((s: any) => ({
              label: s.label || s.trading_symbol || s.symbol || "STOCK",
              name: s.label || s.trading_symbol || "Stock",
              instrument_key: s.instrument_key,
              kind: "stock" as const,
            })),
            ...(data.commodities || []).map((c: any) => ({
              label: c.label || c.symbol || "COMMODITY",
              name: c.label || c.symbol || "Commodity",
              instrument_key: c.instrument_key,
              kind: "commodity" as const,
            })),
          ];
          if (combined.length > 0) {
            setCatalog(combined);
          }
        }
      })
      .catch(() => {
        // Fallback to default catalog seamlessly
      });
  }, []);

  // Filtered catalog options
  const filteredCatalog = useMemo(() => {
    if (!symbolSearchFilter.trim()) return catalog;
    const q = symbolSearchFilter.toLowerCase();
    return catalog.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.instrument_key.toLowerCase().includes(q)
    );
  }, [catalog, symbolSearchFilter]);

  // Grouped options for select box
  const catalogGroups = useMemo(() => {
    return {
      indices: filteredCatalog.filter((i) => i.kind === "index"),
      stocks: filteredCatalog.filter((i) => i.kind === "stock"),
      commodities: filteredCatalog.filter((i) => i.kind === "commodity"),
    };
  }, [filteredCatalog]);

  // --- Mode A: Custom Symbol Scanner State ---
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState(
    "NSE_EQ|INE205A01025" // VEDL default
  );
  const [scannerTf, setScannerTf] = useState("1d");
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerData, setScannerData] =
    useState<CustomSymbolAnalysisResponse | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // --- Mode B: Interactive Sandbox State ---
  const [xPrice, setXPrice] = useState<number>(358.0);
  const [aPrice, setAPrice] = useState<number>(251.0);
  const [bPrice, setBPrice] = useState<number>(287.0);
  const [cPrice, setCPrice] = useState<number>(260.0);
  const [dPrice, setDPrice] = useState<string>("");
  const [cmpPrice, setCmpPrice] = useState<number>(288.0);
  const [sandboxSymbol, setSandboxSymbol] = useState("VEDL");
  const [sandboxInstKey, setSandboxInstKey] = useState("NSE_EQ|INE205A01025");
  const [sandboxTf, setSandboxTf] = useState("1d");
  const [sandboxDirection, setSandboxDirection] = useState<
    "AUTO" | "BULLISH" | "BEARISH"
  >("AUTO");

  // Detailed pivot metadata for X, A, B, C, D
  const [pivotsMeta, setPivotsMeta] = useState<{
    x?: PivotPointMeta;
    a?: PivotPointMeta;
    b?: PivotPointMeta;
    c?: PivotPointMeta;
    d?: PivotPointMeta;
  }>({});

  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResult, setSandboxResult] =
    useState<CustomWaveEvaluationResponse | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [paperTradeMsg, setPaperTradeMsg] = useState<string | null>(null);
  const [isLiveSynced, setIsLiveSynced] = useState(false);
  const [liveSyncTime, setLiveSyncTime] = useState<string | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState<
    "cheatsheet" | "why_harmonics" | "patterns_detail" | "playbook"
  >("cheatsheet");
  const [waveDisplayMode, setWaveDisplayMode] = useState<
    "dual" | "forming" | "targets"
  >("dual");
  const [sandboxCandles, setSandboxCandles] = useState<
    Array<{
      time: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
    }>
  >([]);

  // Auto-fetch live market pivots and auto-fill coordinates dynamically
  const handleAutoFetchLivePivots = async (
    targetKey: string,
    targetTf: string,
    symbolLabelHint?: string
  ) => {
    setSandboxLoading(true);
    setSandboxError(null);
    setPaperTradeMsg(null);
    try {
      const data = await fetchCustomHarmonicAnalysis(targetKey, targetTf);
      if (data && data.current_price) {
        const liveCmp = Number(data.current_price.toFixed(2));
        setCmpPrice(liveCmp);
        if (data.candles && data.candles.length > 0) {
          setSandboxCandles(data.candles);
        }

        let newX = xPrice;
        let newA = aPrice;
        let newB = bPrice;
        let newC = cPrice;
        let newD = "";
        let newDir: "AUTO" | "BULLISH" | "BEARISH" = "AUTO";

        let xMeta: PivotPointMeta = { price: newX };
        let aMeta: PivotPointMeta = { price: newA };
        let bMeta: PivotPointMeta = { price: newB };
        let cMeta: PivotPointMeta = { price: newC };
        let dMeta: PivotPointMeta | undefined = undefined;

        if (data.predictions && data.predictions.length > 0) {
          const p = data.predictions[0];
          newX = Number(p.x.price.toFixed(2));
          newA = Number(p.a.price.toFixed(2));
          newB = Number(p.b.price.toFixed(2));
          newC = Number(p.c.price.toFixed(2));
          newD = "";
          newDir = "AUTO"; // default auto detect wave

          xMeta = { price: newX, time: p.x.time, type: "Swing Anchor" };
          aMeta = { price: newA, time: p.a.time, type: "Leg 1 Peak/Trough" };
          bMeta = { price: newB, time: p.b.time, type: "Retracement Pivot" };
          cMeta = { price: newC, time: p.c.time, type: "Pullback Pivot" };
          dMeta = {
            price: Number(p.predicted_d_mid.toFixed(2)),
            type: "Predicted PRZ Target",
            isPredicted: true,
          };
        } else if (data.patterns && data.patterns.length > 0) {
          const pat = data.patterns[0];
          newX = Number(pat.x.price.toFixed(2));
          newA = Number(pat.a.price.toFixed(2));
          newB = Number(pat.b.price.toFixed(2));
          newC = Number(pat.c.price.toFixed(2));
          newD = pat.d ? String(Number(pat.d.price.toFixed(2))) : "";
          newDir = "AUTO";

          xMeta = { price: newX, time: pat.x.time, type: "Swing Anchor" };
          aMeta = { price: newA, time: pat.a.time, type: "Leg 1 Peak/Trough" };
          bMeta = { price: newB, time: pat.b.time, type: "Retracement Pivot" };
          cMeta = { price: newC, time: pat.c.time, type: "Pullback Pivot" };
          if (pat.d) {
            dMeta = {
              price: Number(pat.d.price.toFixed(2)),
              time: pat.d.time,
              type: "Completed PRZ Reversal",
              isPredicted: false,
            };
          }
        } else if (data.pivots && data.pivots.length >= 4) {
          // Take 4 most recent ZigZag pivots
          const recent = data.pivots.slice(-4);
          newX = Number(recent[0].price.toFixed(2));
          newA = Number(recent[1].price.toFixed(2));
          newB = Number(recent[2].price.toFixed(2));
          newC = Number(recent[3].price.toFixed(2));
          newD = "";
          newDir = "AUTO";

          xMeta = { price: newX, time: recent[0].time, type: recent[0].type || "Anchor" };
          aMeta = { price: newA, time: recent[1].time, type: recent[1].type || "Leg 1" };
          bMeta = { price: newB, time: recent[2].time, type: recent[2].type || "Leg 2" };
          cMeta = { price: newC, time: recent[3].time, type: recent[3].type || "Leg 3" };
        }

        setXPrice(newX);
        setAPrice(newA);
        setBPrice(newB);
        setCPrice(newC);
        setDPrice(newD);
        setSandboxDirection(newDir);
        setPivotsMeta({ x: xMeta, a: aMeta, b: bMeta, c: cMeta, d: dMeta });
        setIsLiveSynced(true);
        setLiveSyncTime(new Date().toLocaleTimeString());

        // Immediately evaluate wave with new prices
        const res = await evaluateHarmonicSandboxWave({
          x_price: newX,
          a_price: newA,
          b_price: newB,
          c_price: newC,
          d_price: newD !== "" ? parseFloat(newD) : null,
          current_price: liveCmp,
          symbol_label: symbolLabelHint || data.symbol_label,
          instrument_key: targetKey,
          timeframe: targetTf,
          direction: newDir,
        });
        setSandboxResult(res);
      }
    } catch (err: any) {
      setSandboxError(
        `Failed to auto-fetch live pivots for ${targetKey}: ${err?.message || "Error"}`
      );
    } finally {
      setSandboxLoading(false);
    }
  };

  // Evaluate sandbox wave on manual parameter change
  const handleEvaluateSandbox = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    setPaperTradeMsg(null);
    try {
      const parsedD = dPrice.trim() !== "" ? parseFloat(dPrice) : null;
      const res = await evaluateHarmonicSandboxWave({
        x_price: Number(xPrice),
        a_price: Number(aPrice),
        b_price: Number(bPrice),
        c_price: Number(cPrice),
        d_price: parsedD && !isNaN(parsedD) ? parsedD : null,
        current_price: Number(cmpPrice),
        symbol_label: sandboxSymbol,
        instrument_key: sandboxInstKey,
        timeframe: sandboxTf,
        direction: sandboxDirection,
      });
      setSandboxResult(res);
    } catch (err: any) {
      setSandboxError(err?.message || "Failed to evaluate sandbox coordinates");
    } finally {
      setSandboxLoading(false);
    }
  };

  // On initial mount, auto-fetch live pivots for default symbol (VEDL)
  useEffect(() => {
    handleAutoFetchLivePivots(sandboxInstKey, sandboxTf, sandboxSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick preset loader for sandbox
  const handleLoadPreset = (type: string) => {
    setIsLiveSynced(false);
    if (type === "vedl_bat") {
      setSandboxSymbol("VEDL");
      setSandboxInstKey("NSE_EQ|INE205A01025");
      setSandboxTf("1d");
      setXPrice(358.0);
      setAPrice(251.0);
      setBPrice(287.0);
      setCPrice(260.0);
      setDPrice("");
      setCmpPrice(288.0);
      setSandboxDirection("AUTO");
      setPivotsMeta({
        x: { price: 358.0, type: "Swing High" },
        a: { price: 251.0, type: "Swing Low" },
        b: { price: 287.0, type: "Swing High" },
        c: { price: 260.0, type: "Swing Low" },
      });
    } else if (type === "nifty_gartley") {
      setSandboxSymbol("NIFTY 50");
      setSandboxInstKey("NSE_INDEX|Nifty 50");
      setSandboxTf("15m");
      setXPrice(24200.0);
      setAPrice(24800.0);
      setBPrice(24429.0);
      setCPrice(24650.0);
      setDPrice("");
      setCmpPrice(24620.0);
      setSandboxDirection("AUTO");
      setPivotsMeta({
        x: { price: 24200.0, type: "Swing Low" },
        a: { price: 24800.0, type: "Swing High" },
        b: { price: 24429.0, type: "Swing Low" },
        c: { price: 24650.0, type: "Swing High" },
      });
    } else if (type === "butterfly_expansion") {
      setSandboxSymbol("BANKNIFTY");
      setSandboxInstKey("NSE_INDEX|Nifty Bank");
      setSandboxTf("1h");
      setXPrice(50000.0);
      setAPrice(48500.0);
      setBPrice(49679.0);
      setCPrice(48900.0);
      setDPrice("");
      setCmpPrice(49100.0);
      setSandboxDirection("AUTO");
      setPivotsMeta({
        x: { price: 50000.0, type: "Swing High" },
        a: { price: 48500.0, type: "Swing Low" },
        b: { price: 49679.0, type: "Swing High" },
        c: { price: 48900.0, type: "Swing Low" },
      });
    }
  };

  // Mode A: Fetch custom symbol analysis
  const handleAnalyzeSymbol = async (instKeyToAnalyze?: string) => {
    const targetKey = instKeyToAnalyze || selectedInstrumentKey;
    if (!targetKey) return;

    setScannerLoading(true);
    setScannerError(null);
    try {
      const data = await fetchCustomHarmonicAnalysis(targetKey, scannerTf);
      setScannerData(data);
    } catch (err: any) {
      setScannerError(err?.message || `Failed to analyze ${targetKey}`);
    } finally {
      setScannerLoading(false);
    }
  };

  // 1-Click Paper Trade from Sandbox
  const handleExecuteSandboxPaperTrade = async () => {
    if (!sandboxResult?.best_match) return;
    const match = sandboxResult.best_match;
    try {
      setPaperTradeMsg("Submitting paper order...");
      const res = await createHarmonicPaperTrade({
        pattern_id: `HPT-CUSTOM-${sandboxSymbol}-${Date.now().toString(36).toUpperCase()}`,
        symbol_label: sandboxSymbol,
        instrument_key: sandboxInstKey || sandboxResult.instrument_key,
        timeframe: sandboxTf,
        pattern_name: match.pattern_name,
        direction: match.direction,
        entry_price: cmpPrice || sandboxResult.current_price,
        target_1: match.target_1,
        target_2: match.target_2,
        stop_loss: match.stop_loss,
        quantity: 10,
        notes: `Custom Sandbox setup for ${sandboxSymbol} (${match.pattern_name})`,
      });
      setPaperTradeMsg(
        `✅ Paper Trade active! ID: ${res?.trade?.trade_id || "OK"} (Target 1: ₹${match.target_1.toFixed(2)})`
      );
      if (onPaperTradeSuccess) onPaperTradeSuccess();
    } catch (err: any) {
      setPaperTradeMsg(`❌ Trade failed: ${err?.message || "Error"}`);
    }
  };

  // Helper for compliance badge color
  const getBadgeClass = (status: string) => {
    switch (status) {
      case "PERFECT":
        return "bg-success text-white";
      case "ACCEPTABLE":
        return "bg-info text-white";
      case "BORDERLINE":
        return "bg-warning text-dark";
      default:
        return "bg-danger text-white";
    }
  };

  // Calculated leg distances in points and percentages
  const legCalculations = useMemo(() => {
    const xaDist = Math.abs(aPrice - xPrice);
    const xaPct = xPrice > 0 ? (xaDist / xPrice) * 100 : 0;

    const abDist = Math.abs(bPrice - aPrice);
    const abPct = aPrice > 0 ? (abDist / aPrice) * 100 : 0;
    const ab_xa = xaDist > 0 ? abDist / xaDist : 0;

    const bcDist = Math.abs(cPrice - bPrice);
    const bcPct = bPrice > 0 ? (bcDist / bPrice) * 100 : 0;
    const bc_ab = abDist > 0 ? bcDist / abDist : 0;

    const acDist = Math.abs(cPrice - aPrice);
    const acPct = aPrice > 0 ? (acDist / aPrice) * 100 : 0;
    const ac_xa = xaDist > 0 ? acDist / xaDist : 0;

    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : sandboxResult?.best_match?.predicted_d_mid || 0;
    const cdDist = dVal > 0 ? Math.abs(dVal - cPrice) : 0;
    const cdPct = cPrice > 0 ? (cdDist / cPrice) * 100 : 0;
    const cd_bc = bcDist > 0 ? cdDist / bcDist : 0;

    const xdDist = dVal > 0 ? Math.abs(dVal - xPrice) : 0;
    const xdPct = xPrice > 0 ? (xdDist / xPrice) * 100 : 0;
    const xd_xa = xaDist > 0 ? xdDist / xaDist : 0;

    return {
      xa: { points: xaDist, pct: xaPct, from: xPrice, to: aPrice },
      ab: { points: abDist, pct: abPct, ratio: ab_xa, from: aPrice, to: bPrice },
      bc: { points: bcDist, pct: bcPct, ratio: bc_ab, from: bPrice, to: cPrice },
      ac: { points: acDist, pct: acPct, ratio: ac_xa, from: aPrice, to: cPrice },
      cd: { points: cdDist, pct: cdPct, ratio: cd_bc, from: cPrice, to: dVal },
      xd: { points: xdDist, pct: xdPct, ratio: xd_xa, from: xPrice, to: dVal },
    };
  }, [xPrice, aPrice, bPrice, cPrice, dPrice, sandboxResult]);

  // Mathematical coordinate layout for the dynamic Geometric Wave SVG
  const waveSvgLayout = useMemo(() => {
    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : sandboxResult?.best_match?.predicted_d_mid ||
          sandboxResult?.best_match?.target_3 ||
          cPrice;

    const validPrices = [xPrice, aPrice, bPrice, cPrice, dVal].filter(
      (p) => !isNaN(p) && p > 0
    );
    if (validPrices.length < 4) return null;

    const minP = Math.min(...validPrices);
    const maxP = Math.max(...validPrices);
    const spread = maxP - minP || 1.0;

    // ViewBox dimensions: 540 x 230
    const svgWidth = 540;
    const svgHeight = 230;
    const padX = 60;
    const padTop = 38;
    const padBottom = 38;
    const plotH = svgHeight - padTop - padBottom;
    const plotW = svgWidth - padX * 2;

    // Invert Y axis for financial charting (higher price = lower Y in SVG)
    const calcY = (price: number) => {
      const ratio = (price - minP) / spread;
      return padTop + plotH * (1 - ratio);
    };

    const ptX = { x: padX, y: calcY(xPrice), price: xPrice, label: "X" };
    const ptA = { x: padX + plotW * 0.25, y: calcY(aPrice), price: aPrice, label: "A" };
    const ptB = { x: padX + plotW * 0.50, y: calcY(bPrice), price: bPrice, label: "B" };
    const ptC = { x: padX + plotW * 0.75, y: calcY(cPrice), price: cPrice, label: "C" };
    const ptD = { x: padX + plotW * 1.00, y: calcY(dVal), price: dVal, label: "D" };

    const isBullish = sandboxResult?.best_match?.direction === "BULLISH";

    // Text position offsets (peak = text above, valley = text below)
    const getYOffset = (curr: number, prev?: number, next?: number) => {
      if (prev !== undefined && next !== undefined) {
        return curr >= prev && curr >= next ? -14 : 22;
      }
      if (prev !== undefined) {
        return curr >= prev ? -14 : 22;
      }
      if (next !== undefined) {
        return curr >= next ? -14 : 22;
      }
      return -14;
    };

    const offsetMap = {
      x: getYOffset(xPrice, undefined, aPrice),
      a: getYOffset(aPrice, xPrice, bPrice),
      b: getYOffset(bPrice, aPrice, cPrice),
      c: getYOffset(cPrice, bPrice, dVal),
      d: getYOffset(dVal, cPrice, undefined),
    };

    // Retracement & projection ratios
    const ab_xa =
      Math.abs(aPrice - xPrice) > 0
        ? (Math.abs(bPrice - aPrice) / Math.abs(aPrice - xPrice)).toFixed(3)
        : "—";
    const bc_ab =
      Math.abs(bPrice - aPrice) > 0
        ? (Math.abs(cPrice - bPrice) / Math.abs(bPrice - aPrice)).toFixed(3)
        : "—";
    const cd_bc =
      Math.abs(cPrice - bPrice) > 0
        ? (Math.abs(dVal - cPrice) / Math.abs(cPrice - bPrice)).toFixed(3)
        : "—";
    const xd_xa =
      Math.abs(aPrice - xPrice) > 0
        ? (Math.abs(dVal - xPrice) / Math.abs(aPrice - xPrice)).toFixed(3)
        : "—";
    const ac_xa =
      Math.abs(aPrice - xPrice) > 0
        ? (Math.abs(cPrice - aPrice) / Math.abs(aPrice - xPrice)).toFixed(3)
        : "—";

    // Calculate Live LTP / CMP coordinates and progress along C -> D path
    const liveCmp = cmpPrice > 0 ? cmpPrice : cPrice;
    const ptCmp = {
      x: 0,
      y: calcY(liveCmp),
      price: liveCmp,
    };

    // Calculate progression between C and D
    const cdSpread = Math.abs(dVal - cPrice) || 1.0;
    const progressToD = Math.min(
      1.0,
      Math.max(0.0, Math.abs(liveCmp - cPrice) / cdSpread)
    );
    ptCmp.x = padX + plotW * (0.75 + 0.25 * progressToD);

    const progressPct = Math.round(progressToD * 100);
    const ptsToD = Math.abs(dVal - liveCmp);
    const pctToD = liveCmp > 0 ? (ptsToD / liveCmp) * 100 : 0;
    const ptsFromC = Math.abs(liveCmp - cPrice);
    const pctFromC = cPrice > 0 ? (ptsFromC / cPrice) * 100 : 0;

    // Stage 1 Forming Stage Targets (Direction: Moving along C -> D Leg towards PRZ)
    const isBullishReversal = isBullish; // If Bullish pattern, D is low so C -> D is moving DOWN
    const formingAction = isBullishReversal ? "SHORT / PUT" : "LONG / CALL";
    const formingDirectionBadge = isBullishReversal ? "BEARISH C→D SCALP" : "BULLISH C→D SCALP";

    // Forming Target 1: 50% Midway of C -> D trajectory (Point B structural retest)
    const formingT1 =
      isBullishReversal
        ? cPrice - Math.abs(cPrice - dVal) * 0.5
        : cPrice + Math.abs(dVal - cPrice) * 0.5;

    // Forming Target 2: The PRZ Arrival price at Point D
    const formingT2 = dVal;

    // Forming Stop Loss: Point C swing invalidation
    const cBuffer = Math.abs(cPrice - bPrice) * 0.1 || (cPrice * 0.01);
    const formingSL = isBullishReversal ? cPrice + cBuffer : cPrice - cBuffer;

    // Rewards & Risk for Stage 1 based on live CMP
    const formingT1Pts = isBullishReversal ? Math.max(0, liveCmp - formingT1) : Math.max(0, formingT1 - liveCmp);
    const formingT1Pct = liveCmp > 0 ? (formingT1Pts / liveCmp) * 100 : 0;

    const formingT2Pts = isBullishReversal ? Math.max(0, liveCmp - formingT2) : Math.max(0, formingT2 - liveCmp);
    const formingT2Pct = liveCmp > 0 ? (formingT2Pts / liveCmp) * 100 : 0;

    const formingSlPts = isBullishReversal ? Math.max(0, formingSL - liveCmp) : Math.max(0, liveCmp - formingSL);
    const formingSlPct = liveCmp > 0 ? (formingSlPts / liveCmp) * 100 : 0;

    const ptFormingT1 = { x: padX + plotW * 0.88, y: calcY(formingT1), price: formingT1, label: "T1 (Mid)" };
    const ptFormingT2 = { x: padX + plotW * 1.00, y: calcY(formingT2), price: formingT2, label: "T2 (PRZ D)" };
    const ptFormingSL = { x: padX + plotW * 0.75, y: calcY(formingSL), price: formingSL, label: "SL (C)" };

    return {
      svgWidth,
      svgHeight,
      ptX,
      ptA,
      ptB,
      ptC,
      ptD,
      ptCmp,
      minP,
      maxP,
      midP: (minP + maxP) / 2,
      isBullish,
      offsetMap,
      ab_xa,
      bc_ab,
      ac_xa,
      cd_bc,
      xd_xa,
      isProjectedD: dPrice === "",
      progressPct,
      ptsToD,
      pctToD,
      ptsFromC,
      pctFromC,
      dVal,
      liveCmp,
      formingAction,
      formingDirectionBadge,
      formingT1,
      formingT2,
      formingSL,
      formingT1Pts,
      formingT1Pct,
      formingT2Pts,
      formingT2Pct,
      formingSlPts,
      formingSlPct,
      ptFormingT1,
      ptFormingT2,
      ptFormingSL,
    };
  }, [xPrice, aPrice, bPrice, cPrice, dPrice, cmpPrice, sandboxResult]);

  // Target roadmap coordinate layout for Completed Pattern Reversal (D -> T1 -> T2 -> T3)
  const targetSvgLayout = useMemo(() => {
    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : sandboxResult?.best_match?.predicted_d_mid ||
          sandboxResult?.best_match?.target_3 ||
          cPrice;

    const isBullish = sandboxResult?.best_match?.direction === "BULLISH";
    const reversalAction = isBullish ? "BUY / LONG" : "SELL / SHORT";
    const reversalDirectionBadge = isBullish ? "BULLISH PRZ REVERSAL" : "BEARISH PRZ REVERSAL";

    const cdMove = Math.abs(dVal - cPrice);
    const t1Val =
      sandboxResult?.best_match?.target_1 ||
      (isBullish ? dVal + cdMove * 0.382 : dVal - cdMove * 0.382);
    const t2Val =
      sandboxResult?.best_match?.target_2 ||
      (isBullish ? dVal + cdMove * 0.618 : dVal - cdMove * 0.618);
    const t3Val =
      sandboxResult?.best_match?.target_3 ||
      (isBullish ? dVal + cdMove * 1.000 : dVal - cdMove * 1.000);
    const slVal =
      sandboxResult?.best_match?.stop_loss ||
      (isBullish ? dVal - cdMove * 0.15 : dVal + cdMove * 0.15);

    const t1Pts = sandboxResult?.best_match?.t1_reward_points || Math.abs(t1Val - dVal);
    const t1Pct = sandboxResult?.best_match?.t1_reward_pct || (dVal > 0 ? (t1Pts / dVal) * 100 : 0);

    const t2Pts = sandboxResult?.best_match?.t2_reward_points || Math.abs(t2Val - dVal);
    const t2Pct = sandboxResult?.best_match?.t2_reward_pct || (dVal > 0 ? (t2Pts / dVal) * 100 : 0);

    const slPts = sandboxResult?.best_match?.sl_risk_points || Math.abs(dVal - slVal);
    const slPct = sandboxResult?.best_match?.sl_risk_pct || (dVal > 0 ? (slPts / dVal) * 100 : 0);

    const rrRatio = sandboxResult?.best_match?.live_rr_ratio || (slPts > 0 ? (t1Pts / slPts).toFixed(2) : "2.0");

    const validPrices = [
      xPrice,
      aPrice,
      bPrice,
      cPrice,
      dVal,
      t1Val,
      t2Val,
      slVal,
    ].filter((p) => !isNaN(p) && p > 0);
    if (validPrices.length < 4) return null;

    const minP = Math.min(...validPrices);
    const maxP = Math.max(...validPrices);
    const spread = maxP - minP || 1.0;

    const svgWidth = 540;
    const svgHeight = 230;
    const padX = 55;
    const padTop = 38;
    const padBottom = 38;
    const plotH = svgHeight - padTop - padBottom;
    const plotW = svgWidth - padX * 2;

    const calcY = (price: number) => {
      const ratio = (price - minP) / spread;
      return padTop + plotH * (1 - ratio);
    };

    const ptX = { x: padX, y: calcY(xPrice), price: xPrice, label: "X" };
    const ptA = {
      x: padX + plotW * 0.18,
      y: calcY(aPrice),
      price: aPrice,
      label: "A",
    };
    const ptB = {
      x: padX + plotW * 0.36,
      y: calcY(bPrice),
      price: bPrice,
      label: "B",
    };
    const ptC = {
      x: padX + plotW * 0.54,
      y: calcY(cPrice),
      price: cPrice,
      label: "C",
    };
    const ptD = {
      x: padX + plotW * 0.72,
      y: calcY(dVal),
      price: dVal,
      label: "D",
    };
    const ptT1 = {
      x: padX + plotW * 0.88,
      y: calcY(t1Val),
      price: t1Val,
      label: "T1",
    };
    const ptT2 = {
      x: padX + plotW * 1.00,
      y: calcY(t2Val),
      price: t2Val,
      label: "T2",
    };
    const ptSL = {
      x: padX + plotW * 0.76,
      y: calcY(slVal),
      price: slVal,
      label: "SL",
    };

    return {
      svgWidth,
      svgHeight,
      ptX,
      ptA,
      ptB,
      ptC,
      ptD,
      ptT1,
      ptT2,
      ptSL,
      minP,
      maxP,
      isBullish,
      t1Val,
      t2Val,
      t3Val,
      slVal,
      dVal,
      reversalAction,
      reversalDirectionBadge,
      t1Pts,
      t1Pct,
      t2Pts,
      t2Pct,
      slPts,
      slPct,
      rrRatio,
    };
  }, [xPrice, aPrice, bPrice, cPrice, dPrice, sandboxResult]);

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4 bg-surface">
      {/* Top Header & Mode Toggle */}
      <div className="card-header bg-dark text-white p-3 p-md-4 border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="mb-0 fw-bold">🔬 Harmonic Custom Lab & Sandbox</h4>
            <span className="badge bg-primary text-white">
              Studio & Wave Simulator
            </span>
          </div>
          <p className="text-secondary small mb-0 mt-1">
            <strong>Auto-detects swing pivots from live market candles</strong> on symbol selection, calculates Fibonacci leg distances, and validates against canonical harmonic pattern standards.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-warning fw-semibold shadow-sm d-flex align-items-center gap-1"
            onClick={() => setShowCheatsheet(!showCheatsheet)}
          >
            <i className="bi bi-journal-bookmark me-1" />
            <span>{showCheatsheet ? "Hide Standards Guide" : "📚 Pattern Standards Guide"}</span>
          </button>

          <div className="btn-group p-1 bg-white bg-opacity-10 rounded-3" role="group">
            <button
              type="button"
              className={`btn btn-sm px-3 ${
                studioMode === "sandbox"
                  ? "btn-primary shadow-sm fw-bold"
                  : "btn-outline-light text-white"
              }`}
              onClick={() => setStudioMode("sandbox")}
            >
              <i className="bi bi-sliders me-1" /> 🎛️ Sandbox & Fibonacci Distance
            </button>
            <button
              type="button"
              className={`btn btn-sm px-3 ${
                studioMode === "symbol_scanner"
                  ? "btn-primary shadow-sm fw-bold"
                  : "btn-outline-light text-white"
              }`}
              onClick={() => setStudioMode("symbol_scanner")}
            >
              <i className="bi bi-search me-1" /> 🔍 Scanner & Chart
            </button>
          </div>
        </div>
      </div>

      <div className="card-body p-3 p-md-4">
        {/* ========================================================================= */}
        {/* EXPANDABLE CANONICAL HARMONIC STANDARDS REFERENCE CHEATSHEET             */}
        {/* ========================================================================= */}
        {showCheatsheet && (
          <div className="card border-primary border-opacity-25 rounded-4 shadow-sm bg-light mb-4 overflow-hidden">
            <div className="card-header bg-primary text-white py-2 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <span className="fs-5">📚</span>
                <div>
                  <h6 className="fw-bold mb-0">Harmonic Pattern Mastery & Strategy Guide</h6>
                  <span className="small text-white text-opacity-75" style={{ fontSize: "11px" }}>
                    Canonical Fibonacci rules, institutional edge rationale, and execution blueprint
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <div className="btn-group btn-group-sm p-1 bg-white bg-opacity-20 rounded-3">
                  <button
                    type="button"
                    className={`btn btn-sm ${guideActiveTab === "cheatsheet" ? "btn-light text-primary fw-bold" : "btn-link text-white text-decoration-none"}`}
                    onClick={() => setGuideActiveTab("cheatsheet")}
                  >
                    📊 Canonical Ratios
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${guideActiveTab === "why_harmonics" ? "btn-light text-primary fw-bold" : "btn-link text-white text-decoration-none"}`}
                    onClick={() => setGuideActiveTab("why_harmonics")}
                  >
                    💡 Why Harmonics?
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${guideActiveTab === "patterns_detail" ? "btn-light text-primary fw-bold" : "btn-link text-white text-decoration-none"}`}
                    onClick={() => setGuideActiveTab("patterns_detail")}
                  >
                    📖 Pattern Breakdown
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${guideActiveTab === "playbook" ? "btn-light text-primary fw-bold" : "btn-link text-white text-decoration-none"}`}
                    onClick={() => setGuideActiveTab("playbook")}
                  >
                    🎯 4-Step Playbook
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white btn-sm ms-2"
                  onClick={() => setShowCheatsheet(false)}
                />
              </div>
            </div>

            <div className="card-body p-3 p-md-4">
              {/* TAB 1: CANONICAL RATIOS TABLE */}
              {guideActiveTab === "cheatsheet" && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-bold text-secondary text-uppercase">
                      Scott Carney Canonical Harmonic Ratio Benchmarks
                    </span>
                    <span className="badge bg-primary-subtle text-primary border small">
                      Institutional Standards
                    </span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered bg-white small mb-0 align-middle">
                      <thead className="table-dark text-center">
                        <tr>
                          <th>Pattern Name</th>
                          <th>B Point (AB/XA)</th>
                          <th>C Point (BC/AB)</th>
                          <th>D Projection (CD/BC)</th>
                          <th>D Retracement (XD/XA)</th>
                          <th>Canonical Invalidation Rule</th>
                        </tr>
                      </thead>
                      <tbody>
                        {HARMONIC_STANDARDS_CHEATSHEET.map((pat) => {
                          const isCurrentMatched =
                            sandboxResult?.best_match?.pattern_name
                              .toUpperCase()
                              .includes(pat.name.toUpperCase().split(" ")[0]);
                          return (
                            <tr
                              key={pat.name}
                              className={isCurrentMatched ? "table-success fw-bold" : ""}
                            >
                              <td className="fw-bold text-nowrap">
                                {isCurrentMatched && "🎯 "}
                                {pat.name}
                              </td>
                              <td className="font-monospace text-center">
                                {pat.bRetracement}{" "}
                                <span className="text-muted" style={{ fontSize: "10px" }}>
                                  (ideal: {pat.bIdeal})
                                </span>
                              </td>
                              <td className="font-monospace text-center">
                                {pat.cPullback}{" "}
                                <span className="text-muted" style={{ fontSize: "10px" }}>
                                  (ideal: {pat.cIdeal})
                                </span>
                              </td>
                              <td className="font-monospace text-center">
                                {pat.dProjection}{" "}
                                <span className="text-muted" style={{ fontSize: "10px" }}>
                                  (ideal: {pat.dIdeal})
                                </span>
                              </td>
                              <td className="font-monospace text-center text-primary fw-bold">
                                {pat.dRetracement}
                              </td>
                              <td className="small text-secondary">{pat.keyRule}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: WHY HARMONICS & INSTITUTIONAL EDGE */}
              {guideActiveTab === "why_harmonics" && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="card h-100 border p-3 rounded-3 bg-white">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="fs-4">🎯</span>
                        <h6 className="fw-bold mb-0 text-primary">
                          Predictive PRZ vs Lagging Indicators
                        </h6>
                      </div>
                      <p className="small text-secondary mb-0">
                        Traditional indicators like Moving Averages or RSI lag the market because they only calculate past closed candles. Harmonic patterns use geometric Fibonacci confluence to <strong>forecast future inflection points (Potential Reversal Zones - PRZ)</strong> before the price turns.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="card h-100 border p-3 rounded-3 bg-white">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="fs-4">⚖️</span>
                        <h6 className="fw-bold mb-0 text-success">
                          Asymmetric Risk-to-Reward Ratio (1:2 to 1:4+)
                        </h6>
                      </div>
                      <p className="small text-secondary mb-0">
                        Because harmonic structures have mathematically defined invalidation levels (the terminal stop loss beyond PRZ), your risk is strictly capped. This allows traders to achieve <strong>asymmetric 1:2, 1:3, and 1:4+ risk-to-reward trades</strong> with small risk and huge expansion runs.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="card h-100 border p-3 rounded-3 bg-white">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="fs-4">🔄</span>
                        <h6 className="fw-bold mb-0 text-info">
                          Two-Way Opportunity: C → D Run + Primary D Reversal
                        </h6>
                      </div>
                      <p className="small text-secondary mb-0">
                        When Point C confirms, smart money trades the <strong>expansion rally from C to D</strong> (like our VEDL Bat setup). Once Point D PRZ is reached, traders take profit and can execute the <strong>primary reversal trade</strong> in the opposite direction!
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="card h-100 border p-3 rounded-3 bg-white">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="fs-4">🏦</span>
                        <h6 className="fw-bold mb-0 text-warning text-dark">
                          Institutional Algorithmic Confluence
                        </h6>
                      </div>
                      <p className="small text-secondary mb-0">
                        Proprietary trading desks and quantitative HFT algorithms use Fibonacci clusters (0.382, 0.618, 0.786, 0.886, 1.272, 1.618) as liquidity pools. Harmonic trading aligns retail traders with where institutional order flow is executed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PATTERN-BY-PATTERN BREAKDOWN & LOGIC */}
              {guideActiveTab === "patterns_detail" && (
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <div className="card h-100 border p-3 rounded-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-primary">🦇 Bat & Alternate Bat</h6>
                        <span className="badge bg-primary-subtle text-primary">D = 0.886 / 1.130</span>
                      </div>
                      <p className="small text-secondary mb-2">
                        <strong>The highest R:R pattern.</strong> Point B has a shallow retracement (0.382–0.500), which stores immense kinetic energy. The move drops deeply to a precise 0.886 PRZ for an explosive reversal.
                      </p>
                      <div className="small bg-light p-2 rounded text-dark font-monospace" style={{ fontSize: "11px" }}>
                        B: 0.382–0.500 | C: 0.382–0.886 | D: 0.886 (Alt: 1.130)
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card h-100 border p-3 rounded-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-dark">🦅 Gartley 222</h6>
                        <span className="badge bg-dark text-white">D = 0.786</span>
                      </div>
                      <p className="small text-secondary mb-2">
                        <strong>The golden ratio standard.</strong> Point B must hit exactly 0.618 of XA. Point D completes at 0.786 of XA. Best used for trend continuation and early structural reversals.
                      </p>
                      <div className="small bg-light p-2 rounded text-dark font-monospace" style={{ fontSize: "11px" }}>
                        B: Strict 0.618 | C: 0.382–0.886 | D: Strict 0.786
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card h-100 border p-3 rounded-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-info">🦋 Butterfly Pattern</h6>
                        <span className="badge bg-info text-white">D = 1.272–1.618</span>
                      </div>
                      <p className="small text-secondary mb-2">
                        <strong>The trend exhaustion specialist.</strong> Point B dips deeply to 0.786. Point D extends beyond Point X (1.272–1.618), trapping late trend followers before snapping back into a major reversal.
                      </p>
                      <div className="small bg-light p-2 rounded text-dark font-monospace" style={{ fontSize: "11px" }}>
                        B: Strict 0.786 | C: 0.382–0.886 | D: 1.272–1.618 (XA)
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card h-100 border p-3 rounded-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-danger">🦀 Crab & Deep Crab</h6>
                        <span className="badge bg-danger text-white">D = 1.618</span>
                      </div>
                      <p className="small text-secondary mb-2">
                        <strong>The extreme momentum pattern.</strong> Point D shoots to an extreme 1.618 extension of XA with a powerful 2.24–3.618 CD projection. Captures blow-off tops and capitulation bottoms.
                      </p>
                      <div className="small bg-light p-2 rounded text-dark font-monospace" style={{ fontSize: "11px" }}>
                        B: 0.382–0.618 (Deep: 0.886) | D: Extreme 1.618 (XA)
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card h-100 border p-3 rounded-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-warning text-dark">🦈 Shark & ⚡ Cypher</h6>
                        <span className="badge bg-warning text-dark">Point C Breaks A</span>
                      </div>
                      <p className="small text-secondary mb-2">
                        <strong>The fake breakout trap.</strong> Point C breaks beyond Point A (1.130–1.618), luring breakout traders into the trap. Price then exhausts and completes at Point D for an explosive snapback.
                      </p>
                      <div className="small bg-light p-2 rounded text-dark font-monospace" style={{ fontSize: "11px" }}>
                        C: 1.130–1.618 (Breaks A) | D: 0.786–1.130
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card h-100 border p-3 rounded-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-success">📐 AB=CD Reciprocal</h6>
                        <span className="badge bg-success text-white">|CD| = 1.0 × |AB|</span>
                      </div>
                      <p className="small text-secondary mb-2">
                        <strong>The foundation of harmonic price action.</strong> Leg CD equals Leg AB in point length and time duration, representing natural harmonic market equilibrium and symmetry.
                      </p>
                      <div className="small bg-light p-2 rounded text-dark font-monospace" style={{ fontSize: "11px" }}>
                        Leg CD = 1.000 × Leg AB | Time Symmetry: t(CD) ≈ t(AB)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: 4-STEP PRACTICAL EXECUTION PLAYBOOK */}
              {guideActiveTab === "playbook" && (
                <div className="row g-3">
                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-white rounded-3 border h-100">
                      <span className="badge bg-primary text-white mb-2">STEP 1</span>
                      <h6 className="fw-bold text-dark">Setup & Quality Check</h6>
                      <p className="small text-secondary mb-0">
                        Ensure pattern quality score is <strong>≥ 75%</strong> and Fibonacci ratio compliance shows <code>PERFECT</code> or <code>ACCEPTABLE</code>.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-white rounded-3 border h-100">
                      <span className="badge bg-success text-white mb-2">STEP 2</span>
                      <h6 className="fw-bold text-dark">Order Execution</h6>
                      <p className="small text-secondary mb-0">
                        Place a Limit Order inside the <strong>Suggested Best Buy Range</strong>. Place Stop Loss strictly below the Invalidation Level.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-white rounded-3 border h-100">
                      <span className="badge bg-info text-white mb-2">STEP 3</span>
                      <h6 className="fw-bold text-dark">Target 1 & Breakeven</h6>
                      <p className="small text-secondary mb-0">
                        When price hits <strong>Target 1 (38.2% run)</strong>, book 50% profit and immediately trail Stop Loss to <strong>Breakeven (Entry Price)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-white rounded-3 border h-100">
                      <span className="badge bg-dark text-white mb-2">STEP 4</span>
                      <h6 className="fw-bold text-dark">Runners to T2 & T3</h6>
                      <p className="small text-secondary mb-0">
                        Trail the remaining 50% position risk-free towards <strong>Target 2 (61.8%)</strong> and <strong>Target 3 (PRZ Full Run)</strong> for maximum gains!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE B: INTERACTIVE FIBONACCI SANDBOX & WAVE SIMULATOR                    */}
        {/* ========================================================================= */}
        {studioMode === "sandbox" && (
          <div>
            {/* Live Sync Status Bar & Quick Presets Bar */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 bg-light rounded-3 mb-4 border">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <span className="small fw-bold text-secondary">
                  ⚡ Quick Presets:
                </span>
                <button
                  className="btn btn-sm btn-outline-dark fw-semibold"
                  onClick={() => {
                    handleLoadPreset("vedl_bat");
                    setTimeout(handleEvaluateSandbox, 50);
                  }}
                >
                  🦇 VEDL (1D) Bat Setup
                </button>
                <button
                  className="btn btn-sm btn-outline-dark fw-semibold"
                  onClick={() => {
                    handleLoadPreset("nifty_gartley");
                    setTimeout(handleEvaluateSandbox, 50);
                  }}
                >
                  🦅 NIFTY (15m) Gartley
                </button>
                <button
                  className="btn btn-sm btn-outline-dark fw-semibold"
                  onClick={() => {
                    handleLoadPreset("butterfly_expansion");
                    setTimeout(handleEvaluateSandbox, 50);
                  }}
                >
                  🦋 BANKNIFTY (1h) Butterfly
                </button>
              </div>

              <div className="d-flex align-items-center gap-2">
                {sandboxLoading ? (
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle small px-2 py-1 d-flex align-items-center gap-1">
                    <span className="spinner-border spinner-border-sm" style={{ width: "12px", height: "12px" }} />
                    Auto-Detecting Live Pivots...
                  </span>
                ) : isLiveSynced ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle small px-2 py-1">
                    🟢 Live Market Coordinates Synced ({liveSyncTime})
                  </span>
                ) : (
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small px-2 py-1">
                    ✏️ Manual / Custom Coordinate Simulation
                  </span>
                )}
                <button
                  className="btn btn-sm btn-outline-primary fw-semibold d-flex align-items-center gap-1"
                  onClick={() =>
                    handleAutoFetchLivePivots(
                      sandboxInstKey,
                      sandboxTf,
                      sandboxSymbol
                    )
                  }
                  disabled={sandboxLoading}
                  title="Auto-fetch recent swing high/low pivots directly from live market candles"
                >
                  <i className={`bi bi-arrow-repeat ${sandboxLoading ? "spin" : ""}`} />
                  <span>Re-Sync Live Pivots</span>
                </button>
              </div>
            </div>

            {/* Input Form with Dropdown Select for Symbol */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <label className="form-label small text-primary fw-bold d-flex justify-content-between">
                  <span>1. Select Stock / Index</span>
                  <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>
                    Auto-detects live pivots
                  </span>
                </label>
                <select
                  className="form-select form-select-sm fw-bold border-primary shadow-sm"
                  value={sandboxInstKey}
                  disabled={sandboxLoading}
                  onChange={(e) => {
                    const chosen = catalog.find(
                      (item) => item.instrument_key === e.target.value
                    );
                    if (chosen) {
                      setSandboxInstKey(chosen.instrument_key);
                      setSandboxSymbol(chosen.label);
                      // Auto-fetch live market prices for chosen stock
                      handleAutoFetchLivePivots(
                        chosen.instrument_key,
                        sandboxTf,
                        chosen.label
                      );
                    }
                  }}
                >
                  {catalogGroups.indices.length > 0 && (
                    <optgroup label="📈 Major Indices">
                      {catalogGroups.indices.map((item) => (
                        <option
                          key={item.instrument_key}
                          value={item.instrument_key}
                        >
                          {item.label} — {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {catalogGroups.stocks.length > 0 && (
                    <optgroup label="🏛️ Top Equities & F&O Stocks">
                      {catalogGroups.stocks.map((item) => (
                        <option
                          key={item.instrument_key}
                          value={item.instrument_key}
                        >
                          {item.label} — {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {catalogGroups.commodities.length > 0 && (
                    <optgroup label="🌾 MCX Commodities">
                      {catalogGroups.commodities.map((item) => (
                        <option
                          key={item.instrument_key}
                          value={item.instrument_key}
                        >
                          {item.label} — {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="col-12 col-md-2">
                <label className="form-label small text-secondary fw-semibold">
                  2. Timeframe
                </label>
                <select
                  className="form-select form-select-sm fw-semibold"
                  value={sandboxTf}
                  disabled={sandboxLoading}
                  onChange={(e) => {
                    const newTf = e.target.value;
                    setSandboxTf(newTf);
                    handleAutoFetchLivePivots(
                      sandboxInstKey,
                      newTf,
                      sandboxSymbol
                    );
                  }}
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf} Timeframe
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label small text-success fw-bold d-flex justify-content-between">
                  <span>Live Market CMP (₹)</span>
                  <span className="badge bg-success-subtle text-success">LTP</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control form-control-sm fw-bold border-success text-success font-monospace"
                  value={cmpPrice}
                  onChange={(e) => {
                    setIsLiveSynced(false);
                    setCmpPrice(parseFloat(e.target.value) || 0);
                  }}
                />
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label small text-secondary fw-semibold">
                  Direction Mode (Default: Auto)
                </label>
                <select
                  className="form-select form-select-sm"
                  value={sandboxDirection}
                  onChange={(e: any) => {
                    setSandboxDirection(e.target.value);
                  }}
                >
                  <option value="AUTO">Auto Detect Wave</option>
                  <option value="BULLISH">Bullish Setup (Buy PRZ)</option>
                  <option value="BEARISH">Bearish Setup (Sell PRZ)</option>
                </select>
              </div>
            </div>

            {/* Coordinates Row (Auto-filled from live market, freely editable for custom analysis) */}
            <div className="row g-3 align-items-end mb-3">
              <div className="col-6 col-md-2">
                <label className="form-label small text-primary fw-bold d-flex justify-content-between">
                  <span>Point X (₹)</span>
                  <span className="text-muted small" style={{ fontSize: "10px" }}>Anchor</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control form-control-sm fw-semibold border-primary font-monospace"
                  value={xPrice}
                  onChange={(e) => {
                    setIsLiveSynced(false);
                    setXPrice(parseFloat(e.target.value) || 0);
                  }}
                />
                {pivotsMeta.x && (
                  <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "11px" }}>
                    {pivotsMeta.x.type || "Anchor"} {pivotsMeta.x.time ? `• ${pivotsMeta.x.time.slice(5, 16)}` : ""}
                  </div>
                )}
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small text-primary fw-bold d-flex justify-content-between">
                  <span>Point A (₹)</span>
                  <span className="text-muted small" style={{ fontSize: "10px" }}>1st Leg</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control form-control-sm fw-semibold border-primary font-monospace"
                  value={aPrice}
                  onChange={(e) => {
                    setIsLiveSynced(false);
                    setAPrice(parseFloat(e.target.value) || 0);
                  }}
                />
                {pivotsMeta.a && (
                  <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "11px" }}>
                    {pivotsMeta.a.type || "Leg 1"} {pivotsMeta.a.time ? `• ${pivotsMeta.a.time.slice(5, 16)}` : ""}
                  </div>
                )}
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small text-primary fw-bold d-flex justify-content-between">
                  <span>Point B (₹)</span>
                  <span className="text-muted small" style={{ fontSize: "10px" }}>Retracement</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control form-control-sm fw-semibold border-primary font-monospace"
                  value={bPrice}
                  onChange={(e) => {
                    setIsLiveSynced(false);
                    setBPrice(parseFloat(e.target.value) || 0);
                  }}
                />
                {pivotsMeta.b && (
                  <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "11px" }}>
                    {pivotsMeta.b.type || "Retracement"} {pivotsMeta.b.time ? `• ${pivotsMeta.b.time.slice(5, 16)}` : ""}
                  </div>
                )}
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small text-primary fw-bold d-flex justify-content-between">
                  <span>Point C (₹)</span>
                  <span className="text-muted small" style={{ fontSize: "10px" }}>Pullback</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control form-control-sm fw-semibold border-primary font-monospace"
                  value={cPrice}
                  onChange={(e) => {
                    setIsLiveSynced(false);
                    setCPrice(parseFloat(e.target.value) || 0);
                  }}
                />
                {pivotsMeta.c && (
                  <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "11px" }}>
                    {pivotsMeta.c.type || "Pullback"} {pivotsMeta.c.time ? `• ${pivotsMeta.c.time.slice(5, 16)}` : ""}
                  </div>
                )}
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small text-secondary fw-semibold">
                  Point D (₹) (Optional)
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="Auto-projected"
                  className="form-control form-control-sm font-monospace"
                  value={dPrice}
                  onChange={(e) => {
                    setIsLiveSynced(false);
                    setDPrice(e.target.value);
                  }}
                />
                {pivotsMeta.d && (
                  <div className="text-success small mt-1 text-truncate" style={{ fontSize: "11px" }}>
                    {pivotsMeta.d.type || "PRZ"} ≈ ₹{pivotsMeta.d.price.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="col-6 col-md-2">
                <button
                  className="btn btn-primary btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={handleEvaluateSandbox}
                  disabled={sandboxLoading}
                >
                  {sandboxLoading ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className="bi bi-cpu" />
                  )}
                  <span>Calculate Wave</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPREHENSIVE FIBONACCI LEG DISTANCES & POINTS MEASUREMENT TABLE         */}
            {/* ========================================================================= */}
            <div className="card border rounded-4 bg-light p-3 mb-4 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">📐</span>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">
                      Fibonacci Leg Distances & Standard Ratio Benchmarks ({sandboxSymbol} • {sandboxTf})
                    </h6>
                    <span className="text-secondary small">
                      Points moved, percentage travel, measured ratio vs canonical harmonic target
                    </span>
                  </div>
                </div>

                <span className="badge bg-primary text-white px-3 py-1 font-monospace">
                  CMP: ₹{cmpPrice.toFixed(2)}
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-sm table-bordered bg-white small mb-0 align-middle">
                  <thead className="table-light">
                    <tr className="text-secondary">
                      <th>Harmonic Leg</th>
                      <th>Wave Trajectory</th>
                      <th>Distance in Points (₹)</th>
                      <th>Price Distance %</th>
                      <th>Measured Ratio</th>
                      <th>Standard Target (Canonical)</th>
                      <th>Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Leg XA */}
                    <tr>
                      <td className="fw-bold text-dark">
                        <span className="badge bg-primary text-white me-1">XA</span> Base Anchor Leg
                      </td>
                      <td className="font-monospace">
                        ₹{legCalculations.xa.from.toFixed(2)} → ₹{legCalculations.xa.to.toFixed(2)}
                      </td>
                      <td className="fw-bold text-primary font-monospace">
                        ₹{legCalculations.xa.points.toFixed(2)}
                      </td>
                      <td className="text-secondary font-monospace">
                        {legCalculations.xa.pct.toFixed(2)}%
                      </td>
                      <td className="fw-semibold font-monospace">1.000 (Base)</td>
                      <td className="text-muted font-monospace">Reference Leg</td>
                      <td>
                        <span className="badge bg-success-subtle text-success">ANCHOR</span>
                      </td>
                    </tr>

                    {/* Leg AB */}
                    <tr>
                      <td className="fw-bold text-dark">
                        <span className="badge bg-info text-white me-1">AB</span> 1st Retracement
                      </td>
                      <td className="font-monospace">
                        ₹{legCalculations.ab.from.toFixed(2)} → ₹{legCalculations.ab.to.toFixed(2)}
                      </td>
                      <td className="fw-bold text-info font-monospace">
                        ₹{legCalculations.ab.points.toFixed(2)}
                      </td>
                      <td className="text-secondary font-monospace">
                        {legCalculations.ab.pct.toFixed(2)}%
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        {legCalculations.ab.ratio.toFixed(3)} (AB/XA)
                      </td>
                      <td className="text-secondary font-monospace">
                        {sandboxResult?.best_match?.ratios?.AB_XA ? (
                          `${sandboxResult.best_match.ratios.AB_XA.min.toFixed(3)} – ${sandboxResult.best_match.ratios.AB_XA.max.toFixed(3)} (Ideal: ${sandboxResult.best_match.ratios.AB_XA.ideal.toFixed(3)})`
                        ) : (
                          "0.382 – 0.618"
                        )}
                      </td>
                      <td>
                        {sandboxResult?.best_match?.ratios?.AB_XA ? (
                          <span className={`badge ${getBadgeClass(sandboxResult.best_match.ratios.AB_XA.status)}`}>
                            {sandboxResult.best_match.ratios.AB_XA.status}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">MEASURED</span>
                        )}
                      </td>
                    </tr>

                    {/* Leg BC */}
                    <tr>
                      <td className="fw-bold text-dark">
                        <span className="badge bg-secondary text-white me-1">BC</span> Pullback Leg
                      </td>
                      <td className="font-monospace">
                        ₹{legCalculations.bc.from.toFixed(2)} → ₹{legCalculations.bc.to.toFixed(2)}
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        ₹{legCalculations.bc.points.toFixed(2)}
                      </td>
                      <td className="text-secondary font-monospace">
                        {legCalculations.bc.pct.toFixed(2)}%
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        {legCalculations.bc.ratio.toFixed(3)} (BC/AB)
                      </td>
                      <td className="text-secondary font-monospace">
                        {sandboxResult?.best_match?.ratios?.BC_AB ? (
                          `${sandboxResult.best_match.ratios.BC_AB.min.toFixed(3)} – ${sandboxResult.best_match.ratios.BC_AB.max.toFixed(3)} (Ideal: ${sandboxResult.best_match.ratios.BC_AB.ideal.toFixed(3)})`
                        ) : (
                          "0.382 – 0.886"
                        )}
                      </td>
                      <td>
                        {sandboxResult?.best_match?.ratios?.BC_AB ? (
                          <span className={`badge ${getBadgeClass(sandboxResult.best_match.ratios.BC_AB.status)}`}>
                            {sandboxResult.best_match.ratios.BC_AB.status}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">MEASURED</span>
                        )}
                      </td>
                    </tr>

                    {/* Leg AC */}
                    <tr>
                      <td className="fw-bold text-dark">
                        <span className="badge bg-warning text-dark me-1">AC</span> A → C Diagonal
                      </td>
                      <td className="font-monospace">
                        ₹{legCalculations.ac.from.toFixed(2)} → ₹{legCalculations.ac.to.toFixed(2)}
                      </td>
                      <td className="fw-bold text-warning-emphasis font-monospace">
                        ₹{legCalculations.ac.points.toFixed(2)}
                      </td>
                      <td className="text-secondary font-monospace">
                        {legCalculations.ac.pct.toFixed(2)}%
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        {legCalculations.ac.ratio.toFixed(3)} (AC/XA)
                      </td>
                      <td className="text-secondary font-monospace">
                        {sandboxResult?.best_match ? (
                          sandboxResult.best_match.pattern_name.includes("CYPHER")
                            ? "1.272 – 1.414 (Cypher Rule)"
                            : sandboxResult.best_match.pattern_name.includes("SHARK")
                            ? "1.130 – 1.618 (Shark Rule)"
                            : "0.618 – 1.618 (Swing Extension)"
                        ) : (
                          "0.618 – 1.618"
                        )}
                      </td>
                      <td>
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                          MEASURED
                        </span>
                      </td>
                    </tr>

                    {/* Leg CD */}
                    <tr>
                      <td className="fw-bold text-dark">
                        <span className="badge bg-success text-white me-1">CD</span> Projection to D
                      </td>
                      <td className="font-monospace">
                        ₹{legCalculations.cd.from.toFixed(2)} → ₹{legCalculations.cd.to.toFixed(2)}
                      </td>
                      <td className="fw-bold text-success font-monospace">
                        ₹{legCalculations.cd.points.toFixed(2)}
                      </td>
                      <td className="text-secondary font-monospace">
                        {legCalculations.cd.pct.toFixed(2)}%
                      </td>
                      <td className="fw-bold text-success font-monospace">
                        {legCalculations.cd.ratio.toFixed(3)} (CD/BC)
                      </td>
                      <td className="text-secondary font-monospace">
                        {sandboxResult?.best_match ? (
                          sandboxResult.best_match.pattern_name.includes("BAT")
                            ? "1.618 – 2.618 (Ideal: 2.000)"
                            : sandboxResult.best_match.pattern_name.includes("GARTLEY")
                            ? "1.130 – 1.618 (Ideal: 1.272)"
                            : sandboxResult.best_match.pattern_name.includes("CRAB")
                            ? "2.240 – 3.618 (Ideal: 2.618)"
                            : "1.272 – 2.618"
                        ) : (
                          "1.272 – 2.618"
                        )}
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          {dPrice !== "" ? "COMPLETED" : "PROJECTED PRZ"}
                        </span>
                      </td>
                    </tr>

                    {/* Overall XD Net Displacement */}
                    <tr className="table-light">
                      <td className="fw-bold text-dark">
                        <span className="badge bg-dark text-white me-1">XD</span> Net Invalidation / PRZ
                      </td>
                      <td className="font-monospace">
                        ₹{legCalculations.xd.from.toFixed(2)} → ₹{legCalculations.xd.to.toFixed(2)}
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        ₹{legCalculations.xd.points.toFixed(2)}
                      </td>
                      <td className="text-secondary font-monospace">
                        {legCalculations.xd.pct.toFixed(2)}%
                      </td>
                      <td className="fw-bold text-primary font-monospace">
                        {legCalculations.xd.ratio.toFixed(3)} (XD/XA)
                      </td>
                      <td className="text-primary fw-semibold font-monospace">
                        {sandboxResult?.best_match ? (
                          sandboxResult.best_match.pattern_name.includes("BAT")
                            ? "0.886 (Bat Rule)"
                            : sandboxResult.best_match.pattern_name.includes("GARTLEY")
                            ? "0.786 (Gartley Rule)"
                            : sandboxResult.best_match.pattern_name.includes("BUTTERFLY")
                            ? "1.272 – 1.618 (Butterfly Rule)"
                            : sandboxResult.best_match.pattern_name.includes("CRAB")
                            ? "1.618 (Crab Rule)"
                            : "0.786 – 1.618"
                        ) : (
                          "0.786 – 1.618"
                        )}
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          TARGET PRZ
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {sandboxError && (
              <div className="alert alert-danger py-2 small shadow-sm">
                {sandboxError}
              </div>
            )}
            {paperTradeMsg && (
              <div className="alert alert-info py-2 small fw-semibold shadow-sm">
                {paperTradeMsg}
              </div>
            )}

            {/* Results Display */}
            {sandboxResult && sandboxResult.best_match && (
              <div className="row g-4 mt-2">
                {/* Left Card: Best Match & Trade Setup */}
                <div className="col-12 col-lg-7">
                  <div className="card h-100 border-0 shadow-sm rounded-4 bg-light">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <span className="badge bg-primary text-white mb-1">
                            🎯 Best Pattern Classification
                          </span>
                          <h3 className="fw-bold mb-0 text-dark">
                            {sandboxResult.best_match.direction === "BULLISH"
                              ? "🟢 BULLISH"
                              : "🔴 BEARISH"}{" "}
                            {sandboxResult.best_match.pattern_name}
                          </h3>
                          <span className="text-secondary small">
                            {sandboxSymbol} • {sandboxTf} Timeframe • CMP: ₹
                            {cmpPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-end">
                          <span className="badge bg-success-subtle text-success fs-6 border border-success-subtle px-3 py-2">
                            Quality:{" "}
                            {(
                              sandboxResult.best_match.quality_score * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </div>

                      <hr className="my-3 opacity-10" />

                      {/* Actual Fibonacci Ratios vs Spec */}
                      <h6 className="fw-bold text-secondary small text-uppercase mb-2">
                        📐 Fibonacci Ratio Compliance
                      </h6>
                      <div className="table-responsive mb-3">
                        <table className="table table-sm table-bordered bg-white small mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Leg Ratio</th>
                              <th>Actual Value</th>
                              <th>Ideal Range</th>
                              <th>Compliance Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(
                              sandboxResult.best_match.ratios
                            ).map(([key, ratio]) => (
                              <tr key={key}>
                                <td className="fw-bold">{ratio.name}</td>
                                <td className="fw-semibold text-primary font-monospace">
                                  {ratio.actual.toFixed(3)}
                                </td>
                                <td className="text-secondary font-monospace">
                                  {ratio.min.toFixed(3)} – {ratio.max.toFixed(3)}{" "}
                                  (Target: {ratio.ideal.toFixed(3)})
                                </td>
                                <td>
                                  <span
                                    className={`badge ${getBadgeClass(
                                      ratio.status
                                    )}`}
                                  >
                                    {ratio.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* ========================================================================= */}
                      {/* DUAL-STATE HARMONIC PREDICTION: FORMING STAGE + TARGET ROADMAP            */}
                      {/* ========================================================================= */}
                      <div className="my-3">
                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                          <span className="small fw-bold text-secondary text-uppercase" style={{ fontSize: "11px" }}>
                            📐 Geometric Wave Dual-State Predictor
                          </span>

                          <div className="btn-group btn-group-sm p-1 bg-light rounded-3 border">
                            <button
                              type="button"
                              className={`btn btn-sm ${waveDisplayMode === "dual" ? "btn-primary shadow-sm fw-bold" : "btn-link text-secondary text-decoration-none"}`}
                              onClick={() => setWaveDisplayMode("dual")}
                            >
                              ⚡ Dual Split View
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${waveDisplayMode === "forming" ? "btn-primary shadow-sm fw-bold" : "btn-link text-secondary text-decoration-none"}`}
                              onClick={() => setWaveDisplayMode("forming")}
                            >
                              🟡 Stage 1: Forming (C→D)
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${waveDisplayMode === "targets" ? "btn-primary shadow-sm fw-bold" : "btn-link text-secondary text-decoration-none"}`}
                              onClick={() => setWaveDisplayMode("targets")}
                            >
                              🎯 Stage 2: Target Roadmap
                            </button>
                          </div>
                        </div>

                        <div className="row g-3">
                          {/* ========================================================================= */}
                          {/* HALF 1: STAGE 1 - ACTIVE FORMING WAVE (C -> D PRZ EXPANSION)              */}
                          {/* ========================================================================= */}
                          {(waveDisplayMode === "dual" || waveDisplayMode === "forming") && (
                            <div className={waveDisplayMode === "dual" ? "col-12 col-xl-6" : "col-12"}>
                              <div className="p-3 bg-white rounded-3 border text-center shadow-sm h-100 d-flex flex-column justify-content-between">
                                <div>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small fw-bold">
                                      🟡 Stage 1: Active Forming Phase
                                    </span>
                                    <span className="badge bg-light text-dark border small font-monospace">
                                      {waveSvgLayout?.progressPct}% to PRZ D
                                    </span>
                                  </div>

                                  {waveSvgLayout ? (
                                    <svg
                                      viewBox={`0 0 ${waveSvgLayout.svgWidth} ${waveSvgLayout.svgHeight}`}
                                      className="w-100"
                                      style={{ maxHeight: "210px" }}
                                    >
                                      <defs>
                                        <pattern id="gridPatternForming" width="40" height="40" patternUnits="userSpaceOnUse">
                                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
                                        </pattern>
                                      </defs>
                                      <rect width="100%" height="100%" fill="url(#gridPatternForming)" rx="8" />

                                      {/* Reference horizontal price lines */}
                                      <line
                                        x1="40"
                                        y1={waveSvgLayout.ptX.y}
                                        x2={waveSvgLayout.svgWidth - 40}
                                        y2={waveSvgLayout.ptX.y}
                                        stroke="rgba(13, 110, 253, 0.15)"
                                        strokeDasharray="2,4"
                                      />
                                      {/* Forming T1 Line (Midway 50%) */}
                                      <line
                                        x1="40"
                                        y1={waveSvgLayout.ptFormingT1.y}
                                        x2={waveSvgLayout.svgWidth - 40}
                                        y2={waveSvgLayout.ptFormingT1.y}
                                        stroke="#fd7e14"
                                        strokeDasharray="3,3"
                                        strokeWidth="1.2"
                                        opacity="0.65"
                                      />
                                      {/* Forming T2 Line (Point D PRZ) */}
                                      <line
                                        x1="40"
                                        y1={waveSvgLayout.ptD.y}
                                        x2={waveSvgLayout.svgWidth - 40}
                                        y2={waveSvgLayout.ptD.y}
                                        stroke="#198754"
                                        strokeDasharray="3,3"
                                        strokeWidth="1.2"
                                        opacity="0.75"
                                      />
                                      {/* Forming SL Line (Point C Invalidation) */}
                                      <line
                                        x1="40"
                                        y1={waveSvgLayout.ptFormingSL.y}
                                        x2={waveSvgLayout.svgWidth - 40}
                                        y2={waveSvgLayout.ptFormingSL.y}
                                        stroke="#dc3545"
                                        strokeDasharray="3,3"
                                        strokeWidth="1.2"
                                        opacity="0.65"
                                      />

                                      {/* Shaded Triangle 1 (X - A - B Wing) */}
                                      <polygon
                                        points={`${waveSvgLayout.ptX.x},${waveSvgLayout.ptX.y} ${waveSvgLayout.ptA.x},${waveSvgLayout.ptA.y} ${waveSvgLayout.ptB.x},${waveSvgLayout.ptB.y}`}
                                        fill="rgba(13, 110, 253, 0.14)"
                                        stroke="rgba(13, 110, 253, 0.4)"
                                        strokeWidth="1.2"
                                      />

                                      {/* Shaded Triangle 2 (B - C - D Wing) */}
                                      <polygon
                                        points={`${waveSvgLayout.ptB.x},${waveSvgLayout.ptB.y} ${waveSvgLayout.ptC.x},${waveSvgLayout.ptC.y} ${waveSvgLayout.ptD.x},${waveSvgLayout.ptD.y}`}
                                        fill={
                                          waveSvgLayout.isBullish
                                            ? "rgba(25, 135, 84, 0.16)"
                                            : "rgba(220, 53, 69, 0.16)"
                                        }
                                        stroke={
                                          waveSvgLayout.isBullish
                                            ? "rgba(25, 135, 84, 0.45)"
                                            : "rgba(220, 53, 69, 0.45)"
                                        }
                                        strokeWidth="1.2"
                                      />

                                      {/* Dotted Harmonic Axis lines */}
                                      <line
                                        x1={waveSvgLayout.ptX.x}
                                        y1={waveSvgLayout.ptX.y}
                                        x2={waveSvgLayout.ptB.x}
                                        y2={waveSvgLayout.ptB.y}
                                        stroke="#6c757d"
                                        strokeDasharray="3,3"
                                        strokeWidth="1.2"
                                        opacity="0.6"
                                      />
                                      <line
                                        x1={waveSvgLayout.ptA.x}
                                        y1={waveSvgLayout.ptA.y}
                                        x2={waveSvgLayout.ptC.x}
                                        y2={waveSvgLayout.ptC.y}
                                        stroke="#6c757d"
                                        strokeDasharray="3,3"
                                        strokeWidth="1.2"
                                        opacity="0.5"
                                      />

                                      {/* Polyline X -> A -> B -> C */}
                                      <polyline
                                        fill="none"
                                        stroke="#0d6efd"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={`${waveSvgLayout.ptX.x},${waveSvgLayout.ptX.y} ${waveSvgLayout.ptA.x},${waveSvgLayout.ptA.y} ${waveSvgLayout.ptB.x},${waveSvgLayout.ptB.y} ${waveSvgLayout.ptC.x},${waveSvgLayout.ptC.y}`}
                                      />

                                      {/* C -> CMP Active Leg */}
                                      <line
                                        x1={waveSvgLayout.ptC.x}
                                        y1={waveSvgLayout.ptC.y}
                                        x2={waveSvgLayout.ptCmp.x}
                                        y2={waveSvgLayout.ptCmp.y}
                                        stroke="#ffc107"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                      />

                                      {/* CMP -> D Projected Dashed Ray */}
                                      <line
                                        x1={waveSvgLayout.ptCmp.x}
                                        y1={waveSvgLayout.ptCmp.y}
                                        x2={waveSvgLayout.ptD.x}
                                        y2={waveSvgLayout.ptD.y}
                                        stroke={waveSvgLayout.isBullish ? "#198754" : "#dc3545"}
                                        strokeWidth="2.5"
                                        strokeDasharray="5,3"
                                        strokeLinecap="round"
                                      />

                                      {/* Ratios */}
                                      <g transform={`translate(${(waveSvgLayout.ptA.x + waveSvgLayout.ptB.x) / 2}, ${(waveSvgLayout.ptA.y + waveSvgLayout.ptB.y) / 2 - 8})`}>
                                        <rect x="-26" y="-8" width="52" height="16" rx="3.5" fill="#ffffff" stroke="#0d6efd" strokeWidth="1" />
                                        <text textAnchor="middle" y="3" fontSize="9" fontWeight="bold" fill="#0d6efd">
                                          {waveSvgLayout.ab_xa}
                                        </text>
                                      </g>

                                      <g transform={`translate(${(waveSvgLayout.ptB.x + waveSvgLayout.ptC.x) / 2}, ${(waveSvgLayout.ptB.y + waveSvgLayout.ptC.y) / 2 - 8})`}>
                                        <rect x="-26" y="-8" width="52" height="16" rx="3.5" fill="#ffffff" stroke="#6c757d" strokeWidth="1" />
                                        <text textAnchor="middle" y="3" fontSize="9" fontWeight="bold" fill="#495057">
                                          {waveSvgLayout.bc_ab}
                                        </text>
                                      </g>

                                      {/* Nodes X, A, B, C */}
                                      {[waveSvgLayout.ptX, waveSvgLayout.ptA, waveSvgLayout.ptB, waveSvgLayout.ptC].map((pt, idx) => (
                                        <g key={idx}>
                                          <circle cx={pt.x} cy={pt.y} r="5.5" fill="#0d6efd" stroke="#ffffff" strokeWidth="2" />
                                          <text x={pt.x} y={pt.y + waveSvgLayout.offsetMap[pt.label.toLowerCase() as keyof typeof waveSvgLayout.offsetMap]} textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#0d6efd">
                                            {pt.label} (₹{pt.price.toFixed(1)})
                                          </text>
                                        </g>
                                      ))}

                                      {/* Target Point D PRZ Node */}
                                      <circle cx={waveSvgLayout.ptD.x} cy={waveSvgLayout.ptD.y} r="7" fill={waveSvgLayout.isBullish ? "#198754" : "#dc3545"} stroke="#ffffff" strokeWidth="2" />
                                      <text x={waveSvgLayout.ptD.x} y={waveSvgLayout.ptD.y + waveSvgLayout.offsetMap.d} textAnchor="middle" fontSize="11" fontWeight="bold" fill={waveSvgLayout.isBullish ? "#198754" : "#dc3545"}>
                                        D (PRZ ₹{waveSvgLayout.ptD.price.toFixed(1)})
                                      </text>

                                      {/* Forming T1 Midway Label Pill */}
                                      <g transform={`translate(${waveSvgLayout.svgWidth - 55}, ${waveSvgLayout.ptFormingT1.y - 8})`}>
                                        <rect x="-28" y="-7" width="56" height="14" rx="3" fill="#fd7e14" />
                                        <text textAnchor="middle" y="3.5" fontSize="8.5" fontWeight="bold" fill="#ffffff">
                                          T1 ₹{waveSvgLayout.formingT1.toFixed(1)}
                                        </text>
                                      </g>

                                      {/* 🟡 Live Current LTP Yellow Line & Pulsing Dot */}
                                      {cmpPrice > 0 && waveSvgLayout.ptCmp && (
                                        <g transform={`translate(${waveSvgLayout.ptCmp.x}, ${waveSvgLayout.ptCmp.y})`}>
                                          <circle r="10" fill="rgba(255, 193, 7, 0.35)">
                                            <animate attributeName="r" values="6;13;6" dur="1.8s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
                                          </circle>
                                          <circle r="5" fill="#ffc107" stroke="#ffffff" strokeWidth="2" />
                                          <g transform="translate(0, -15)">
                                            <rect x="-38" y="-8" width="76" height="15" rx="3" fill="#ffc107" stroke="#ffffff" strokeWidth="1" />
                                            <text textAnchor="middle" y="3" fontSize="9" fontWeight="bold" fill="#000000">
                                              🟡 LTP ₹{waveSvgLayout.ptCmp.price.toFixed(1)}
                                            </text>
                                          </g>
                                        </g>
                                      )}
                                    </svg>
                                  ) : (
                                    <div className="text-muted small py-3">Awaiting coordinates...</div>
                                  )}
                                </div>

                                {/* Bottom Forming Stage Metrics Strip */}
                                <div className="mt-2 pt-2 border-top text-start">
                                  <div className="d-flex justify-content-between align-items-center small mb-1">
                                    <span className="text-secondary" style={{ fontSize: "11px" }}>
                                      C → D Trajectory Progress:
                                    </span>
                                    <span className="fw-bold font-monospace text-dark" style={{ fontSize: "11px" }}>
                                      {waveSvgLayout?.progressPct}% ({waveSvgLayout?.ptsToD.toFixed(1)} pts to PRZ)
                                    </span>
                                  </div>
                                  <div className="progress mb-2" style={{ height: "5px" }}>
                                    <div
                                      className="progress-bar bg-warning progress-bar-striped progress-bar-animated"
                                      role="progressbar"
                                      style={{ width: `${Math.min(100, Math.max(5, waveSvgLayout?.progressPct || 0))}%` }}
                                    />
                                  </div>

                                  <div className="row g-2 text-center" style={{ fontSize: "11px" }}>
                                    <div className="col-4">
                                      <div className="p-1.5 bg-light rounded-2 border">
                                        <span className="text-warning-emphasis fw-bold d-block" style={{ fontSize: "10px" }}>Forming T1 (50%)</span>
                                        <span className="font-monospace fw-bold text-dark">₹{waveSvgLayout?.formingT1.toFixed(1)}</span>
                                        <span className="text-success small d-block font-monospace" style={{ fontSize: "9.5px" }}>
                                          +{waveSvgLayout?.formingT1Pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-1.5 bg-light rounded-2 border">
                                        <span className="text-primary fw-bold d-block" style={{ fontSize: "10px" }}>Forming T2 (PRZ D)</span>
                                        <span className="font-monospace fw-bold text-dark">₹{waveSvgLayout?.formingT2.toFixed(1)}</span>
                                        <span className="text-success small d-block font-monospace" style={{ fontSize: "9.5px" }}>
                                          +{waveSvgLayout?.formingT2Pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-1.5 bg-light rounded-2 border">
                                        <span className="text-danger fw-bold d-block" style={{ fontSize: "10px" }}>Forming SL (Pt C)</span>
                                        <span className="font-monospace fw-bold text-dark">₹{waveSvgLayout?.formingSL.toFixed(1)}</span>
                                        <span className="text-danger small d-block font-monospace" style={{ fontSize: "9.5px" }}>
                                          -{waveSvgLayout?.formingSlPct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-center">
                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle font-monospace" style={{ fontSize: "10px" }}>
                                      ⚡ {waveSvgLayout?.formingDirectionBadge}: Target D at ₹{waveSvgLayout?.formingT2.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ========================================================================= */}
                          {/* HALF 2: STAGE 2 - FULL COMPLETED PATTERN & TARGET ROADMAP (D -> T1 -> T2) */}
                          {/* ========================================================================= */}
                          {(waveDisplayMode === "dual" || waveDisplayMode === "targets") && (
                            <div className={waveDisplayMode === "dual" ? "col-12 col-xl-6" : "col-12"}>
                              <div className="p-3 bg-white rounded-3 border text-center shadow-sm h-100 d-flex flex-column justify-content-between">
                                <div>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-success-subtle text-success border border-success-subtle small fw-bold">
                                      🎯 Stage 2: Target Roadmap & Reversal
                                    </span>
                                    <span className="badge bg-light text-dark border small font-monospace">
                                      T1: ₹{targetSvgLayout?.t1Val.toFixed(1)} • T2: ₹{targetSvgLayout?.t2Val.toFixed(1)}
                                    </span>
                                  </div>

                                  {targetSvgLayout ? (
                                    <svg
                                      viewBox={`0 0 ${targetSvgLayout.svgWidth} ${targetSvgLayout.svgHeight}`}
                                      className="w-100"
                                      style={{ maxHeight: "210px" }}
                                    >
                                      <defs>
                                        <pattern id="gridPatternTarget" width="40" height="40" patternUnits="userSpaceOnUse">
                                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
                                        </pattern>
                                      </defs>
                                      <rect width="100%" height="100%" fill="url(#gridPatternTarget)" rx="8" />

                                      {/* Target Horizontal Price Lines */}
                                      <line
                                        x1="35"
                                        y1={targetSvgLayout.ptT1.y}
                                        x2={targetSvgLayout.svgWidth - 35}
                                        y2={targetSvgLayout.ptT1.y}
                                        stroke="#0d6efd"
                                        strokeDasharray="2,3"
                                        strokeWidth="1.2"
                                        opacity="0.6"
                                      />
                                      <line
                                        x1="35"
                                        y1={targetSvgLayout.ptT2.y}
                                        x2={targetSvgLayout.svgWidth - 35}
                                        y2={targetSvgLayout.ptT2.y}
                                        stroke="#0dcaf0"
                                        strokeDasharray="2,3"
                                        strokeWidth="1.2"
                                        opacity="0.6"
                                      />
                                      <line
                                        x1="35"
                                        y1={targetSvgLayout.ptSL.y}
                                        x2={targetSvgLayout.svgWidth - 35}
                                        y2={targetSvgLayout.ptSL.y}
                                        stroke="#dc3545"
                                        strokeDasharray="2,3"
                                        strokeWidth="1.2"
                                        opacity="0.6"
                                      />

                                      {/* Wings XAB & BCD */}
                                      <polygon
                                        points={`${targetSvgLayout.ptX.x},${targetSvgLayout.ptX.y} ${targetSvgLayout.ptA.x},${targetSvgLayout.ptA.y} ${targetSvgLayout.ptB.x},${targetSvgLayout.ptB.y}`}
                                        fill="rgba(13, 110, 253, 0.12)"
                                        stroke="rgba(13, 110, 253, 0.35)"
                                        strokeWidth="1.2"
                                      />
                                      <polygon
                                        points={`${targetSvgLayout.ptB.x},${targetSvgLayout.ptB.y} ${targetSvgLayout.ptC.x},${targetSvgLayout.ptC.y} ${targetSvgLayout.ptD.x},${targetSvgLayout.ptD.y}`}
                                        fill={
                                          targetSvgLayout.isBullish
                                            ? "rgba(25, 135, 84, 0.14)"
                                            : "rgba(220, 53, 69, 0.14)"
                                        }
                                        stroke={
                                          targetSvgLayout.isBullish
                                            ? "rgba(25, 135, 84, 0.4)"
                                            : "rgba(220, 53, 69, 0.4)"
                                        }
                                        strokeWidth="1.2"
                                      />

                                      {/* Polyline X -> A -> B -> C -> D */}
                                      <polyline
                                        fill="none"
                                        stroke="#0d6efd"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={`${targetSvgLayout.ptX.x},${targetSvgLayout.ptX.y} ${targetSvgLayout.ptA.x},${targetSvgLayout.ptA.y} ${targetSvgLayout.ptB.x},${targetSvgLayout.ptB.y} ${targetSvgLayout.ptC.x},${targetSvgLayout.ptC.y} ${targetSvgLayout.ptD.x},${targetSvgLayout.ptD.y}`}
                                      />

                                      {/* Reversal Projection Rays: D -> T1 -> T2 */}
                                      <line
                                        x1={targetSvgLayout.ptD.x}
                                        y1={targetSvgLayout.ptD.y}
                                        x2={targetSvgLayout.ptT1.x}
                                        y2={targetSvgLayout.ptT1.y}
                                        stroke="#0d6efd"
                                        strokeWidth="3"
                                        strokeDasharray="4,3"
                                        strokeLinecap="round"
                                      />
                                      <line
                                        x1={targetSvgLayout.ptT1.x}
                                        y1={targetSvgLayout.ptT1.y}
                                        x2={targetSvgLayout.ptT2.x}
                                        y2={targetSvgLayout.ptT2.y}
                                        stroke="#0dcaf0"
                                        strokeWidth="3"
                                        strokeDasharray="4,3"
                                        strokeLinecap="round"
                                      />

                                      {/* Nodes X, A, B, C */}
                                      {[targetSvgLayout.ptX, targetSvgLayout.ptA, targetSvgLayout.ptB, targetSvgLayout.ptC].map((pt, idx) => (
                                        <g key={idx}>
                                          <circle cx={pt.x} cy={pt.y} r="5" fill="#0d6efd" stroke="#ffffff" strokeWidth="1.5" />
                                          <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#0d6efd">
                                            {pt.label}
                                          </text>
                                        </g>
                                      ))}

                                      {/* Point D Entry Node */}
                                      <circle cx={targetSvgLayout.ptD.x} cy={targetSvgLayout.ptD.y} r="6.5" fill="#ffc107" stroke="#000000" strokeWidth="1.5" />
                                      <text x={targetSvgLayout.ptD.x} y={targetSvgLayout.ptD.y - 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000000">
                                        D (Entry ₹{targetSvgLayout.ptD.price.toFixed(1)})
                                      </text>

                                      {/* Target 1 Node & Badge */}
                                      <circle cx={targetSvgLayout.ptT1.x} cy={targetSvgLayout.ptT1.y} r="6" fill="#0d6efd" stroke="#ffffff" strokeWidth="1.5" />
                                      <g transform={`translate(${targetSvgLayout.ptT1.x}, ${targetSvgLayout.ptT1.y - 14})`}>
                                        <rect x="-28" y="-7" width="56" height="14" rx="3" fill="#0d6efd" />
                                        <text textAnchor="middle" y="3.5" fontSize="8.5" fontWeight="bold" fill="#ffffff">
                                          T1 ₹{targetSvgLayout.t1Val.toFixed(1)}
                                        </text>
                                      </g>

                                      {/* Target 2 Node & Badge */}
                                      <circle cx={targetSvgLayout.ptT2.x} cy={targetSvgLayout.ptT2.y} r="6" fill="#0dcaf0" stroke="#ffffff" strokeWidth="1.5" />
                                      <g transform={`translate(${targetSvgLayout.ptT2.x}, ${targetSvgLayout.ptT2.y - 14})`}>
                                        <rect x="-28" y="-7" width="56" height="14" rx="3" fill="#0dcaf0" />
                                        <text textAnchor="middle" y="3.5" fontSize="8.5" fontWeight="bold" fill="#000000">
                                          T2 ₹{targetSvgLayout.t2Val.toFixed(1)}
                                        </text>
                                      </g>

                                      {/* Stop Loss Node */}
                                      <circle cx={targetSvgLayout.ptSL.x} cy={targetSvgLayout.ptSL.y} r="5.5" fill="#dc3545" stroke="#ffffff" strokeWidth="1.5" />
                                      <text x={targetSvgLayout.ptSL.x} y={targetSvgLayout.ptSL.y + 14} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#dc3545">
                                        SL ₹{targetSvgLayout.slVal.toFixed(1)}
                                      </text>
                                    </svg>
                                  ) : (
                                    <div className="text-muted small py-3">Awaiting coordinates...</div>
                                  )}
                                </div>

                                {/* Bottom Target Stage Metrics Strip */}
                                <div className="mt-2 pt-2 border-top text-start">
                                  <div className="d-flex justify-content-between align-items-center small mb-1">
                                    <span className="text-secondary" style={{ fontSize: "11px" }}>
                                      Reversal Risk / Reward:
                                    </span>
                                    <span className="badge bg-success font-monospace" style={{ fontSize: "10px" }}>
                                      1 : {targetSvgLayout?.rrRatio} (Breakeven at T1)
                                    </span>
                                  </div>
                                  <div className="row g-2 text-center" style={{ fontSize: "11px" }}>
                                    <div className="col-4">
                                      <div className="p-1.5 bg-light rounded-2 border">
                                        <span className="text-primary fw-bold d-block" style={{ fontSize: "10px" }}>Reversal T1 (38.2%)</span>
                                        <span className="font-monospace fw-bold text-dark">₹{targetSvgLayout?.t1Val.toFixed(1)}</span>
                                        <span className="text-success small d-block font-monospace" style={{ fontSize: "9.5px" }}>
                                          +{targetSvgLayout?.t1Pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-1.5 bg-light rounded-2 border">
                                        <span className="text-info fw-bold d-block" style={{ fontSize: "10px" }}>Reversal T2 (61.8%)</span>
                                        <span className="font-monospace fw-bold text-dark">₹{targetSvgLayout?.t2Val.toFixed(1)}</span>
                                        <span className="text-success small d-block font-monospace" style={{ fontSize: "9.5px" }}>
                                          +{targetSvgLayout?.t2Pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-1.5 bg-light rounded-2 border">
                                        <span className="text-danger fw-bold d-block" style={{ fontSize: "10px" }}>Reversal SL</span>
                                        <span className="font-monospace fw-bold text-dark">₹{targetSvgLayout?.slVal.toFixed(1)}</span>
                                        <span className="text-danger small d-block font-monospace" style={{ fontSize: "9.5px" }}>
                                          -{targetSvgLayout?.slPct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-center">
                                    <span className="badge bg-success-subtle text-success border border-success-subtle font-monospace" style={{ fontSize: "10px" }}>
                                      🎯 {targetSvgLayout?.reversalDirectionBadge}: Reversal at Point D (₹{targetSvgLayout?.dVal.toFixed(1)})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="d-flex gap-2 mt-3">
                        <button
                          className="btn btn-success fw-bold px-4 flex-grow-1 shadow-sm"
                          onClick={handleExecuteSandboxPaperTrade}
                        >
                          <i className="bi bi-lightning-charge-fill me-1" /> 1-Click
                          Paper Trade This Setup
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Target Ladder & PRZ */}
                <div className="col-12 col-lg-5">
                  <div className="card h-100 border-0 shadow-sm rounded-4 bg-white">
                    <div className="card-body p-4">
                      <h5 className="fw-bold text-dark mb-3 d-flex justify-content-between align-items-center">
                        <span>🎯 Trade Blueprint & Best Buy Price</span>
                        <span className={`badge ${sandboxResult.best_match.direction === "BULLISH" ? "bg-success text-white" : "bg-danger text-white"}`}>
                          {sandboxResult.best_match.entry_action || (sandboxResult.best_match.direction === "BULLISH" ? "BUY SETUP" : "SHORT SETUP")}
                        </span>
                      </h5>

                      {/* Best Entry / Buy Price Highlight Box */}
                      <div className={`p-3 rounded-3 border mb-3 ${sandboxResult.best_match.direction === "BULLISH" ? "bg-success bg-opacity-10 border-success-subtle" : "bg-danger bg-opacity-10 border-danger-subtle"}`}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="small fw-bold text-uppercase text-secondary">
                              ⭐ Suggested Best {sandboxResult.best_match.direction === "BULLISH" ? "Buy" : "Sell"} Price
                            </span>
                            <div className="fs-4 fw-bold text-dark font-monospace">
                              ₹{(sandboxResult.best_match.best_entry_price || sandboxResult.best_match.predicted_d_mid).toFixed(2)}
                            </div>
                          </div>

                          <div className="text-end">
                            <span className="small text-secondary fw-semibold d-block">Optimal Entry Range</span>
                            <span className="badge bg-white text-dark border font-monospace px-2 py-1">
                              ₹{(sandboxResult.best_match.entry_zone_low || (sandboxResult.best_match.best_entry_price || sandboxResult.best_match.predicted_d_mid) * 0.99).toFixed(2)} – ₹{(sandboxResult.best_match.entry_zone_high || (sandboxResult.best_match.best_entry_price || sandboxResult.best_match.predicted_d_mid) * 1.015).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 🛡️ Immediate Support & Resistance Levels Box */}
                      {(() => {
                        const immSupp = sandboxResult.best_match.immediate_support ||
                          (() => {
                            const pList = [xPrice, aPrice, bPrice, cPrice, parseFloat(dPrice) || sandboxResult.best_match.predicted_d_mid, sandboxResult.best_match.stop_loss].filter(p => !isNaN(p) && p < cmpPrice && p > 0);
                            return pList.length ? Math.max(...pList) : cmpPrice * 0.985;
                          })();
                        const immRes = sandboxResult.best_match.immediate_resistance ||
                          (() => {
                            const pList = [xPrice, aPrice, bPrice, cPrice, parseFloat(dPrice) || sandboxResult.best_match.predicted_d_mid, sandboxResult.best_match.target_1].filter(p => !isNaN(p) && p > cmpPrice && p > 0);
                            return pList.length ? Math.min(...pList) : cmpPrice * 1.015;
                          })();
                        const sDistPts = Math.max(cmpPrice - immSupp, 0);
                        const sDistPct = cmpPrice > 0 ? (sDistPts / cmpPrice) * 100 : 0;
                        const rDistPts = Math.max(immRes - cmpPrice, 0);
                        const rDistPct = cmpPrice > 0 ? (rDistPts / cmpPrice) * 100 : 0;

                        return (
                          <div className="p-2.5 px-3 rounded-3 bg-light border mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="small fw-bold text-dark text-uppercase d-flex align-items-center gap-1">
                                <span>🛡️</span> Immediate Support & Resistance
                              </span>
                              <span className="badge bg-secondary-subtle text-secondary font-monospace" style={{ fontSize: "10px" }}>
                                Pivot Confluence
                              </span>
                            </div>

                            <div className="row g-2 text-center">
                              <div className="col-6">
                                <div className="p-2 bg-white rounded-2 border border-success-subtle shadow-sm">
                                  <div className="small fw-bold text-success text-uppercase" style={{ fontSize: "10.5px" }}>
                                    Immediate Support (S₁)
                                  </div>
                                  <div className="fs-6 fw-bold text-dark font-monospace mt-0.5">
                                    ₹{immSupp.toFixed(2)}
                                  </div>
                                  <span className="text-secondary small font-monospace d-block" style={{ fontSize: "10px" }}>
                                    -{sDistPts.toFixed(1)} pts (-{sDistPct.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>

                              <div className="col-6">
                                <div className="p-2 bg-white rounded-2 border border-danger-subtle shadow-sm">
                                  <div className="small fw-bold text-danger text-uppercase" style={{ fontSize: "10.5px" }}>
                                    Immediate Resistance (R₁)
                                  </div>
                                  <div className="fs-6 fw-bold text-dark font-monospace mt-0.5">
                                    ₹{immRes.toFixed(2)}
                                  </div>
                                  <span className="text-secondary small font-monospace d-block" style={{ fontSize: "10px" }}>
                                    +{rDistPts.toFixed(1)} pts (+{rDistPct.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="list-group list-group-flush mb-4">
                        <div className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                          <div>
                            <span className="badge bg-primary me-2">Target 1 Exit</span>
                            <span className="small text-secondary">
                              38.2% Run
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="fw-bold text-primary fs-6 font-monospace d-block">
                              ₹{sandboxResult.best_match.target_1.toFixed(2)}
                            </span>
                            {sandboxResult.best_match.t1_reward_points !== undefined && (
                              <span className="text-success small font-monospace" style={{ fontSize: "11px" }}>
                                +₹{sandboxResult.best_match.t1_reward_points.toFixed(2)} (+{sandboxResult.best_match.t1_reward_pct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                          <div>
                            <span className="badge bg-info text-white me-2">
                              Target 2 Exit
                            </span>
                            <span className="small text-secondary">
                              61.8% Run
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="fw-bold text-info fs-6 font-monospace d-block">
                              ₹{sandboxResult.best_match.target_2.toFixed(2)}
                            </span>
                            {sandboxResult.best_match.t2_reward_points !== undefined && (
                              <span className="text-success small font-monospace" style={{ fontSize: "11px" }}>
                                +₹{sandboxResult.best_match.t2_reward_points.toFixed(2)} (+{sandboxResult.best_match.t2_reward_pct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                          <div>
                            <span className="badge bg-success text-white me-2">
                              Target 3 Exit (Point D)
                            </span>
                            <span className="small text-secondary">
                              PRZ Completion
                            </span>
                          </div>
                          <span className="fw-bold text-success fs-6 font-monospace">
                            ₹{sandboxResult.best_match.target_3.toFixed(2)}
                          </span>
                        </div>

                        <div className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                          <div>
                            <span className="badge bg-danger me-2">
                              Stop Loss
                            </span>
                            <span className="small text-secondary">
                              Invalidation Level
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="fw-bold text-danger fs-6 font-monospace d-block">
                              ₹{sandboxResult.best_match.stop_loss.toFixed(2)}
                            </span>
                            {sandboxResult.best_match.sl_risk_points !== undefined && (
                              <span className="text-danger small font-monospace" style={{ fontSize: "11px" }}>
                                -₹{sandboxResult.best_match.sl_risk_points.toFixed(2)} (-{sandboxResult.best_match.sl_risk_pct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                          <span className="small fw-semibold text-secondary">
                            Live Risk : Reward Ratio
                          </span>
                          <span className="badge bg-dark fs-6 px-3 py-1 font-monospace">
                            1 : {sandboxResult.best_match.live_rr_ratio}
                          </span>
                        </div>
                      </div>

                      {/* All Pattern Candidates Table */}
                      <h6 className="fw-bold text-secondary small text-uppercase mb-2">
                        📋 All Pattern Candidate Matches
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-hover small mb-0">
                          <thead>
                            <tr className="text-secondary">
                              <th>Pattern</th>
                              <th>Score</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sandboxResult.all_matches.map((m, idx) => (
                              <tr key={idx}>
                                <td className="fw-bold">{m.pattern_name}</td>
                                <td>{(m.quality_score * 100).toFixed(0)}%</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      m.is_valid
                                        ? "bg-success-subtle text-success"
                                        : "bg-light text-secondary"
                                    }`}
                                  >
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full-Width Candlestick & Harmonic Pattern Overlay Chart */}
                <div className="col-12 mt-4">
                  <HarmonicCandleWaveChart
                    candles={sandboxCandles}
                    pivotsMeta={pivotsMeta}
                    xPrice={xPrice}
                    aPrice={aPrice}
                    bPrice={bPrice}
                    cPrice={cPrice}
                    dPrice={dPrice}
                    bestMatch={sandboxResult.best_match}
                    cmpPrice={cmpPrice}
                    symbol={sandboxSymbol}
                    timeframe={sandboxTf}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE A: ANY SYMBOL ON-DEMAND AUTO SCANNER & CHART VISUALIZER              */}
        {/* ========================================================================= */}
        {studioMode === "symbol_scanner" && (
          <div>
            {/* Search Filter & Dropdown Toolbar */}
            <div className="row g-3 align-items-end mb-4">
              <div className="col-12 col-md-3">
                <label className="form-label small text-secondary fw-semibold">
                  🔍 Filter / Search List
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Type to filter e.g. ved, tata, nif, bharti..."
                  value={symbolSearchFilter}
                  onChange={(e) => setSymbolSearchFilter(e.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label small text-secondary fw-semibold">
                  Select Stock or Index (Dropdown)
                </label>
                <select
                  className="form-select form-select-sm fw-bold border-primary"
                  value={selectedInstrumentKey}
                  onChange={(e) => setSelectedInstrumentKey(e.target.value)}
                >
                  {catalogGroups.indices.length > 0 && (
                    <optgroup label="📈 Major Indices">
                      {catalogGroups.indices.map((item) => (
                        <option
                          key={item.instrument_key}
                          value={item.instrument_key}
                        >
                          {item.label} — {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {catalogGroups.stocks.length > 0 && (
                    <optgroup label="🏛️ Top Equities & F&O Stocks">
                      {catalogGroups.stocks.map((item) => (
                        <option
                          key={item.instrument_key}
                          value={item.instrument_key}
                        >
                          {item.label} — {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {catalogGroups.commodities.length > 0 && (
                    <optgroup label="🌾 MCX Commodities">
                      {catalogGroups.commodities.map((item) => (
                        <option
                          key={item.instrument_key}
                          value={item.instrument_key}
                        >
                          {item.label} — {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label small text-secondary fw-semibold">
                  Select Timeframe
                </label>
                <select
                  className="form-select form-select-sm fw-semibold"
                  value={scannerTf}
                  onChange={(e) => setScannerTf(e.target.value)}
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf} Timeframe
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-2">
                <button
                  className="btn btn-primary btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={() => handleAnalyzeSymbol()}
                  disabled={scannerLoading}
                >
                  {scannerLoading ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className="bi bi-graph-up-arrow" />
                  )}
                  <span>Analyze Stock</span>
                </button>
              </div>
            </div>

            {/* Quick Popular Presets */}
            <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
              <span className="small text-secondary fw-semibold">
                Quick Selection:
              </span>
              {PRESET_POPULAR.map((s) => {
                const matched = catalog.find((c) => c.label === s.label);
                return (
                  <button
                    key={s.label}
                    className={`btn btn-sm ${
                      selectedInstrumentKey === matched?.instrument_key
                        ? "btn-primary fw-bold"
                        : "btn-light border text-dark"
                    }`}
                    onClick={() => {
                      if (matched) {
                        setSelectedInstrumentKey(matched.instrument_key);
                        handleAnalyzeSymbol(matched.instrument_key);
                      }
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {scannerError && (
              <div className="alert alert-danger py-2 small shadow-sm">
                {scannerError}
              </div>
            )}

            {/* Analysis Results View */}
            {scannerData && (
              <div className="row g-4">
                {/* Header Summary */}
                <div className="col-12">
                  <div className="p-3 bg-light rounded-4 border d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                      <h4 className="fw-bold mb-0">
                        {scannerData.symbol_label}{" "}
                        <span className="text-secondary fs-6 fw-normal">
                          ({scannerData.timeframe})
                        </span>
                      </h4>
                      <span className="text-secondary small">
                        Instrument: {scannerData.instrument_key} • History:{" "}
                        {scannerData.candles.length} Candles
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                      <div className="text-end">
                        <div className="small text-secondary">CMP</div>
                        <div className="fs-5 fw-bold text-dark font-monospace">
                          ₹{scannerData.current_price.toFixed(2)}
                        </div>
                      </div>
                      <span className="badge bg-success-subtle text-success fs-6 border border-success-subtle px-3 py-2">
                        {scannerData.patterns.length} Active •{" "}
                        {scannerData.predictions.length} Forming
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left: Detected Patterns / Predictions */}
                <div className="col-12 col-lg-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4 bg-white">
                    <div className="card-body p-3 p-md-4">
                      <h5 className="fw-bold text-dark mb-3">
                        🔮 Emerging & Completed Setups
                      </h5>

                      {scannerData.patterns.length === 0 &&
                        scannerData.predictions.length === 0 && (
                          <div className="text-center py-4 text-muted">
                            <i className="bi bi-info-circle fs-3 d-block mb-2 text-secondary" />
                            No active harmonic setups detected on{" "}
                            {scannerData.symbol_label} ({scannerData.timeframe}).
                            <br />
                            <span className="small text-secondary">
                              Try switching timeframes (e.g. 15m, 1h, 1d) or test
                              custom coordinates in the Sandbox tab.
                            </span>
                          </div>
                        )}

                      {/* Forming Point D Predictions */}
                      {scannerData.predictions.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-3 border border-info-subtle bg-info bg-opacity-10 mb-3"
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <span className="badge bg-info text-white me-2">
                                🔮 FORMING POINT D
                              </span>
                              <span className="fw-bold text-dark">
                                {p.direction} {p.pattern_name}
                              </span>
                            </div>
                            <span className="badge bg-white text-dark border">
                              Quality: {(p.quality_score * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div className="row g-2 small text-secondary mb-2 font-monospace">
                            <div className="col-6">
                              Point D PRZ:{" "}
                              <strong className="text-dark">
                                ₹{p.predicted_d_mid.toFixed(2)}
                              </strong>
                            </div>
                            <div className="col-6">
                              Target 1:{" "}
                              <strong className="text-success">
                                ₹{p.target_1.toFixed(2)}
                              </strong>
                            </div>
                            <div className="col-6">
                              Stop Loss:{" "}
                              <strong className="text-danger">
                                ₹{p.stop_loss.toFixed(2)}
                              </strong>
                            </div>
                            <div className="col-6">
                              AB/XA:{" "}
                              <strong className="text-dark">
                                {p.ratio_ab_xa.toFixed(3)}
                              </strong>
                            </div>
                          </div>

                          <button
                            className="btn btn-sm btn-outline-primary w-100 fw-semibold"
                            onClick={() =>
                              onOpenPredictiveModal && onOpenPredictiveModal(p)
                            }
                          >
                            <i className="bi bi-bullseye me-1" /> View Full D
                            Projection Modal
                          </button>
                        </div>
                      ))}

                      {/* Confirmed Patterns */}
                      {scannerData.patterns.map((pat, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-3 border bg-light mb-3"
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <span className="badge bg-success text-white me-2">
                                COMPLETED
                              </span>
                              <span className="fw-bold text-dark">
                                {pat.direction} {pat.pattern_name}
                              </span>
                            </div>
                            <span className="badge bg-dark text-white">
                              Quality: {(pat.quality_score * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div className="row g-2 small text-secondary mb-2 font-monospace">
                            <div className="col-6">
                              Target 1:{" "}
                              <strong className="text-success">
                                ₹{pat.target_1.toFixed(2)}
                              </strong>
                            </div>
                            <div className="col-6">
                              Stop Loss:{" "}
                              <strong className="text-danger">
                                ₹{pat.stop_loss.toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          <button
                            className="btn btn-sm btn-outline-dark w-100 fw-semibold"
                            onClick={() =>
                              onOpenPatternModal && onOpenPatternModal(pat)
                            }
                          >
                            <i className="bi bi-eye me-1" /> View Visual Chart
                            Modal
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Candlestick History Chart Visualizer */}
                <div className="col-12 col-lg-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4 bg-white">
                    <div className="card-body p-3 p-md-4">
                      <h5 className="fw-bold text-dark mb-3">
                        📊 Candlestick History & Pivot Structure
                      </h5>

                      {/* Candlestick Canvas / Summary */}
                      <div className="p-3 bg-light rounded-3 border text-center mb-3">
                        <div className="small fw-semibold text-secondary mb-2">
                          Recent 150 Bars History
                        </div>
                        <div
                          className="d-flex align-items-end justify-content-between gap-1 overflow-hidden"
                          style={{ height: "140px" }}
                        >
                          {scannerData.candles.slice(-40).map((c, i) => {
                            const isGreen = c.close >= c.open;
                            const heightPct = Math.max(
                              10,
                              Math.min(
                                100,
                                ((c.close -
                                  Math.min(
                                    ...scannerData.candles
                                      .slice(-40)
                                      .map((k) => k.low)
                                  )) /
                                  (Math.max(
                                    ...scannerData.candles
                                      .slice(-40)
                                      .map((k) => k.high)
                                  ) -
                                    Math.min(
                                      ...scannerData.candles
                                        .slice(-40)
                                        .map((k) => k.low)
                                    ) || 1)) *
                                  100
                              )
                            );
                            return (
                              <div
                                key={i}
                                className="d-flex flex-column align-items-center flex-grow-1"
                                style={{ height: "100%" }}
                                title={`${c.time}\nO: ${c.open} H: ${c.high} L: ${c.low} C: ${c.close}`}
                              >
                                <div
                                  className="w-100 rounded-1"
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: isGreen
                                      ? "#198754"
                                      : "#dc3545",
                                    marginTop: "auto",
                                    minWidth: "3px",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Support / Resistance Levels */}
                      <div className="small">
                        <div className="d-flex justify-content-between py-1 border-bottom">
                          <span className="text-secondary">
                            Nearest Support (S1)
                          </span>
                          <span className="fw-bold text-success font-monospace">
                            {scannerData.nearest_support
                              ? `₹${scannerData.nearest_support.toFixed(2)}`
                              : "—"}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-1 border-bottom">
                          <span className="text-secondary">
                            Nearest Resistance (R1)
                          </span>
                          <span className="fw-bold text-danger font-monospace">
                            {scannerData.nearest_resistance
                              ? `₹${scannerData.nearest_resistance.toFixed(2)}`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
