"use client";

import { FormEvent, useState } from "react";

import { CryptoOptimizationResponse, optimizeCryptoStrategy } from "@/lib/api";

const CRYPTO_STRATEGIES = [
  ["CRYPTO_BTC_PULLBACK_V1", "BTC Trend Pullback (BTC 1h + confirmed 4h)"],
  ["CRYPTO_BTC_REGIME_V1", "BTC Regime (low-frequency, BTC 1h only)"],
  ["CRYPTO_MOMENTUM_V1", "Momentum"],
  ["CRYPTO_TV_HA_V1", "TV-HA"],
  ["CRYPTO_FIBO_V1", "FIBO"],
  ["CRYPTO_JK_V1", "JK"],
] as const;

function dateOffset(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function fmt(value?: number | null, digits = 2) {
  return value == null ? "-" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

export function CryptoResearchShell() {
  const [symbols, setSymbols] = useState(["BTCUSD"]);
  const [timeframes, setTimeframes] = useState(["1h"]);
  const [strategies, setStrategies] = useState<string[]>(["CRYPTO_BTC_PULLBACK_V1"]);
  const [startDate, setStartDate] = useState(dateOffset(-30));
  const [endDate, setEndDate] = useState(dateOffset(-1));
  const [trainPercent, setTrainPercent] = useState(70);
  const [result, setResult] = useState<CryptoOptimizationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const researchDays = result?.duration_days ?? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  const trainDays = result?.train_days ?? researchDays * trainPercent / 100;
  const testDays = result?.test_days ?? researchDays - trainDays;
  const skippedContexts = result?.skipped_contexts ?? [];
  const leaderboard = result?.leaderboard ?? [];
  const qualifiedCount = result?.qualified_count ?? leaderboard.filter((candidate) => candidate.qualified).length;
  const incompleteDatasets = result?.datasets?.filter((dataset) => dataset.history_complete === false) ?? [];

  function toggle(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function handleRun(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      setResult(await optimizeCryptoStrategy({
        symbols,
        timeframes,
        strategy_names: strategies,
        start_date: startDate,
        end_date: endDate,
        initial_capital: 100000,
        risk_per_trade: 0.25,
        slippage_percent: 0.05,
        fee_percent: 0.05,
        train_percent: trainPercent,
        max_combinations: 4,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Crypto optimization failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="dashboard-hero mb-4">
        <div>
          <p className="eyebrow">Delta Historical Candle Research</p>
          <h1 className="hero-title">Crypto Strategy Research</h1>
          <p className="muted mb-0">
            Validate crypto strategies using Delta `/v2/history/candles`. Compare full-period activity with the shorter
            validation window before judging whether a strategy trades often enough.
          </p>
        </div>
      </section>

      {message && <div className="alert alert-danger">{message}</div>}

      <form className="dashboard-panel p-3 mb-4" onSubmit={handleRun}>
        <div className="row g-3">
          <div className="col-lg-3">
            <label className="form-label">Symbols</label>
            <div className="d-flex gap-3">
              {["BTCUSD", "ETHUSD"].map((item) => (
                <label key={item}><input type="checkbox" checked={symbols.includes(item)} onChange={() => toggle(item, symbols, setSymbols)} /> {item}</label>
              ))}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="form-label">Crypto Strategies</label>
            <div className="d-flex flex-wrap gap-3">
              {CRYPTO_STRATEGIES.map(([id, label]) => (
                <label key={id}><input type="checkbox" checked={strategies.includes(id)} onChange={() => toggle(id, strategies, setStrategies)} /> {label}</label>
              ))}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="form-label">Timeframes</label>
            <div className="d-flex flex-wrap gap-3">
              {["1m", "3m", "5m", "15m", "1h"].map((item) => (
                <label key={item}><input type="checkbox" checked={timeframes.includes(item)} onChange={() => toggle(item, timeframes, setTimeframes)} /> {item}</label>
              ))}
            </div>
          </div>
          <div className="col-lg-2">
            <label className="form-label">Start Date</label>
            <input className="form-control" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="col-lg-2">
            <label className="form-label">End Date</label>
            <input className="form-control" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="col-lg-2">
            <label className="form-label">Train %</label>
            <input className="form-control" type="number" min="50" max="90" value={trainPercent} onChange={(event) => setTrainPercent(Number(event.target.value))} />
          </div>
        </div>
        <p className="small muted mt-3 mb-0">
          Start with one symbol and timeframe. Adding markets or longer date ranges increases runtime and may exceed the browser request timeout.
        </p>
        <button className="btn btn-warning mt-3" disabled={busy || !symbols.length || !timeframes.length || !strategies.length}>
          {busy ? "Testing Strategies..." : "Find Best Configurations"}
        </button>
      </form>

      {result && (
        <>
          <div className="row g-3 mb-4">
            {[
              ["Datasets", result.dataset_count],
              ["Configs per Dataset", result.combination_count],
              ["Viable Candidates", qualifiedCount],
              ["Research Days", fmt(researchDays, 1)],
              ["Train / Test", `${fmt(trainDays, 1)}d / ${fmt(testDays, 1)}d`],
            ].map(([label, value]) => (
              <div className="col-6 col-lg-3" key={label}>
                <div className="metric-card p-3 h-100"><div className="muted small">{label}</div><div className="fs-4 fw-semibold">{value}</div></div>
              </div>
            ))}
          </div>

          <section className="dashboard-panel p-3">
            <h2 className="panel-title">Out-of-Sample Leaderboard</h2>
            <p className="small muted">
              Test trades cover only the final {fmt(testDays, 1)} days. Full trades cover all {fmt(researchDays, 1)} days.
              Candidates with fewer than two test trades receive a large score penalty.
            </p>
            {!qualifiedCount && leaderboard.length > 0 && (
              <div className="alert alert-danger py-2">
                No configuration passed validation. The rows below are ranked failures, not recommended strategies.
              </div>
            )}
            {incompleteDatasets.length > 0 && (
              <div className="alert alert-warning py-2">
                Historical warmup is incomplete for {incompleteDatasets.length} dataset(s). Early-window signals are unavailable,
                so these results cannot qualify a strategy.
              </div>
            )}
            {result.assumptions && (
              <div className="small muted mb-3">
                Sizing: {result.assumptions.risk_per_trade_percent}% of current equity risk per trade, costs included,
                maximum {result.assumptions.max_leverage}x notional exposure. Fees and slippage are applied per fill.
              </div>
            )}
            {skippedContexts.length > 0 && (
              <div className="alert alert-warning py-2">
                Skipped {skippedContexts.length} incompatible strategy/market combination(s), including BTC Regime outside BTCUSD 1h.
              </div>
            )}
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Rank</th><th>Status</th><th>Strategy</th><th>Market</th><th>Parameters</th><th>Test PnL</th><th>Test DD</th><th>Test Win %</th><th>Test Trades</th><th>Full Trades</th><th>Full PnL</th><th>Score</th></tr></thead>
                <tbody>
                  {leaderboard.slice(0, 50).map((candidate, index) => (
                    <tr key={candidate.candidate_id}>
                      <td>{index + 1}</td>
                      <td>{candidate.qualified ? <span className="badge text-bg-success">Passed</span> : <span className="badge text-bg-danger">Failed</span>}</td>
                      <td>{candidate.strategy_name.replace("CRYPTO_", "").replace("_V1", "")}</td>
                      <td><strong>{candidate.symbol}</strong><div className="small muted">{candidate.timeframe}</div></td>
                      <td className="small">{Object.entries(candidate.parameters).map(([key, value]) => `${key}=${value}`).join(", ")}</td>
                      <td>{fmt(candidate.test.net_pnl, 4)}</td>
                      <td>{fmt(candidate.test.max_drawdown, 4)}</td>
                      <td>{fmt(candidate.test.win_rate, 2)}</td>
                      <td><strong>{candidate.test.total_trades}</strong><div className="small muted">{fmt(candidate.test.trades_per_day ?? candidate.test.total_trades / testDays, 2)}/day</div></td>
                      <td><strong>{candidate.full.total_trades}</strong><div className="small muted">{fmt(candidate.full.trades_per_day ?? candidate.full.total_trades / researchDays, 2)}/day</div></td>
                      <td>{fmt(candidate.full.net_pnl, 4)}</td>
                      <td>{fmt(candidate.score, 4)}</td>
                    </tr>
                  ))}
                  {!leaderboard.length && (
                    <tr>
                      <td colSpan={12} className="text-center muted">No compatible strategy candidates were returned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
