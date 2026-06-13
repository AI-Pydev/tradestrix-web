"use client";

import { FormEvent, useState } from "react";

import { CryptoOptimizationResponse, optimizeCryptoStrategy } from "@/lib/api";

const CRYPTO_STRATEGIES = [
  ["CRYPTO_BTC_REGIME_V1", "BTC Regime (Recommended, 1h)"],
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
  const [strategies, setStrategies] = useState<string[]>(["CRYPTO_BTC_REGIME_V1"]);
  const [startDate, setStartDate] = useState(dateOffset(-30));
  const [endDate, setEndDate] = useState(dateOffset(-1));
  const [trainPercent, setTrainPercent] = useState(70);
  const [result, setResult] = useState<CryptoOptimizationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
        risk_per_trade: 0.5,
        slippage_percent: 0.05,
        fee_percent: 0.05,
        train_percent: trainPercent,
        max_combinations: 20,
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
            Validate crypto-specific strategies using Delta `/v2/history/candles`. BTC Regime is designed specifically for BTCUSD 1h.
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
              ["Candidates Ranked", result.leaderboard.length],
              ["Train / Test", `${result.train_percent}% / ${result.test_percent}%`],
            ].map(([label, value]) => (
              <div className="col-6 col-lg-3" key={label}>
                <div className="metric-card p-3 h-100"><div className="muted small">{label}</div><div className="fs-4 fw-semibold">{value}</div></div>
              </div>
            ))}
          </div>

          <section className="dashboard-panel p-3">
            <h2 className="panel-title">Out-of-Sample Leaderboard</h2>
            <p className="small muted">Candidates with fewer than two test trades receive a large score penalty. Low-frequency results still require forward paper validation.</p>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Rank</th><th>Strategy</th><th>Market</th><th>Parameters</th><th>Test PnL</th><th>Test DD</th><th>Test Win %</th><th>Test Trades</th><th>Full PnL</th><th>Score</th></tr></thead>
                <tbody>
                  {result.leaderboard.slice(0, 50).map((candidate, index) => (
                    <tr key={candidate.candidate_id}>
                      <td>{index + 1}</td>
                      <td>{candidate.strategy_name.replace("CRYPTO_", "").replace("_V1", "")}</td>
                      <td><strong>{candidate.symbol}</strong><div className="small muted">{candidate.timeframe}</div></td>
                      <td className="small">{Object.entries(candidate.parameters).map(([key, value]) => `${key}=${value}`).join(", ")}</td>
                      <td>{fmt(candidate.test.net_pnl, 4)}</td>
                      <td>{fmt(candidate.test.max_drawdown, 4)}</td>
                      <td>{fmt(candidate.test.win_rate, 2)}</td>
                      <td>{candidate.test.total_trades}</td>
                      <td>{fmt(candidate.full.net_pnl, 4)}</td>
                      <td>{fmt(candidate.score, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
