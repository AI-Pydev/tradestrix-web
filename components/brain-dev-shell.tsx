/**
 * TradeStrix Brain — DEV UI shell.
 *
 * PRESENTATION / DEV VISIBILITY SLICE.
 *
 * This surface renders delivery status only. It deliberately claims no backend
 * capability: there is no live telemetry, no database probe, no process check
 * and no computed market/AI output anywhere in this file. All values arrive as
 * a `BrainStatusSnapshot` whose `source` is labelled in the UI.
 *
 * Styling is Brain-owned and locally scoped via `app/brain/brain.module.css`.
 * Nothing in this slice writes global CSS or touches shared platform files.
 */

import {
  getBrainStatusSnapshot,
  type AuthorizationRow,
  type BrainModule,
  type BrainStatusSnapshot,
  type FlowStage,
  type FoundationItem,
} from "@/modules/brain";

import { BrainCircuitIcon } from "@/components/dashboard/icons";
import styles from "@/app/brain/brain.module.css";

/* ------------------------------------------------------------------ tokens */

/** Tone keys map to the locally scoped status classes in the CSS module. */
type Tone = "done" | "active" | "pending" | "blocked";

const TONE_CLASS: Record<Tone, string> = {
  done: styles.statusDone,
  active: styles.statusActive,
  pending: styles.statusPending,
  blocked: styles.statusBlocked,
};

/**
 * Status presentation. Each entry pairs a colour tone with a distinct glyph
 * and an explicit text label, so status is never conveyed by colour alone.
 */
const STATUS_STYLES: Record<string, { tone: Tone; glyph: string; label: string }> = {
  // Foundation / decision states
  ACCEPTED: { tone: "done", glyph: "✓", label: "Accepted" },
  IN_PROGRESS: { tone: "active", glyph: "◐", label: "In progress" },
  NOT_IMPLEMENTED: { tone: "pending", glyph: "○", label: "Not implemented" },
  RESOLVED: { tone: "done", glyph: "✓", label: "Resolved" },
  OPEN: { tone: "pending", glyph: "○", label: "Open" },
  // Module states
  AVAILABLE: { tone: "done", glyph: "✓", label: "Available" },
  IN_DEVELOPMENT: { tone: "active", glyph: "◐", label: "In development" },
  PLANNED: { tone: "pending", glyph: "○", label: "Planned" },
  FOUNDATION_BLOCKED: { tone: "blocked", glyph: "▲", label: "Foundation blocked" },
  // Readiness facts
  YES: { tone: "done", glyph: "✓", label: "Yes" },
  NO: { tone: "blocked", glyph: "✕", label: "No" },
  UNVERIFIED: { tone: "pending", glyph: "○", label: "Unverified" },
  NOT_ESTABLISHED: { tone: "blocked", glyph: "✕", label: "Not established" },
};

function statusOf(state: string) {
  return (
    STATUS_STYLES[state] ?? {
      tone: "pending" as Tone,
      glyph: "○",
      label: state.replace(/_/g, " ").toLowerCase(),
    }
  );
}

/* -------------------------------------------------------------- primitives */

/**
 * Status pill. The glyph and the written label both encode state, so the pill
 * remains readable without colour perception.
 */
function StatusPill({ state }: { state: string }) {
  const status = statusOf(state);
  return (
    <span className={`${styles.status} ${TONE_CLASS[status.tone]}`}>
      <span aria-hidden="true">{status.glyph}</span>
      <span>{status.label}</span>
    </span>
  );
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel} aria-label={title}>
      <header className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {caption ? <p className={styles.panelCaption}>{caption}</p> : null}
      </header>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- regions */

function BrainHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerIdentity}>
        <span className={styles.headerMark} aria-hidden="true">
          <BrainCircuitIcon className="w-5 h-5" />
        </span>
        <div className={styles.headerText}>
          <h1 className={styles.headerTitle}>TradeStrix Brain</h1>
          <p className={styles.headerSubtitle}>
            AI Market Intelligence &amp; Governed Execution Platform
          </p>
        </div>
      </div>
      <ul className={styles.headerChips} aria-label="Environment status">
        <li className={`${styles.chip} ${styles.chipDev}`}>DEV</li>
        <li className={`${styles.chip} ${styles.chipActive}`}>FOUNDATION IN PROGRESS</li>
        <li className={`${styles.chip} ${styles.chipBlocked}`}>
          CONTROLLED LIVE: NOT ESTABLISHED
        </li>
      </ul>
    </header>
  );
}

/** Compact summary strip. Counts are derived from the snapshot, never typed in. */
function SummaryStrip({ snapshot }: { snapshot: BrainStatusSnapshot }) {
  const total = snapshot.foundation.length;
  const complete = snapshot.foundation.filter((item) => item.state === "ACCEPTED").length;
  const active = snapshot.foundation.find((item) => item.state === "IN_PROGRESS");

  const cells: { label: string; value: string; tone: string }[] = [
    {
      label: "Foundation",
      value: `${complete} / ${total} Complete`,
      tone: styles.summaryValueActive,
    },
    {
      label: "Backend",
      value: active ? `${active.id} In Progress` : "No phase active",
      tone: styles.summaryValueActive,
    },
    { label: "Database", value: "Not Connected", tone: styles.summaryValueBlocked },
    { label: "SA Process", value: "Not Running", tone: styles.summaryValueBlocked },
    { label: "Controlled Live", value: "Not Established", tone: styles.summaryValueBlocked },
  ];

  return (
    <ul className={styles.summary} aria-label="Platform readiness summary">
      {cells.map((cell) => (
        <li key={cell.label} className={styles.summaryCell}>
          <span className={styles.summaryLabel}>{cell.label}</span>
          <span className={`${styles.summaryValue} ${cell.tone}`}>{cell.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Observe to Adapt pipeline. Horizontal when space allows, wraps safely below. */
function SystemFlow({ stages }: { stages: FlowStage[] }) {
  return (
    <ol className={styles.flow} aria-label="Observe to Adapt cognition pipeline">
      {stages.map((stage, index) => {
        const status = statusOf(stage.state);
        return (
          <li key={stage.id} className={styles.flowItem}>
            <div className={`${styles.flowNode} ${TONE_CLASS[status.tone]}`}>
              <span className={styles.flowIndex}>{index + 1}</span>
              <span className={styles.flowLabel}>{stage.label}</span>
              <span className={styles.flowState}>
                <span aria-hidden="true">{status.glyph}</span> {status.label}
              </span>
            </div>
            {index < stages.length - 1 ? (
              <span className={styles.flowArrow} aria-hidden="true">
                {"→"}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function FoundationPanel({ items }: { items: FoundationItem[] }) {
  return (
    <Panel
      title="Production Foundation"
      caption="Delivery state of each numbered foundation phase."
    >
      <ul className={styles.rows}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <span className={styles.rowId}>{item.id}</span>
            <span className={styles.rowLabel}>{item.label}</span>
            <StatusPill state={item.state} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ModuleCards({ modules }: { modules: BrainModule[] }) {
  return (
    <Panel title="Brain Modules" caption="Intelligence surfaces and their delivery state.">
      <ul className={styles.modules}>
        {modules.map((module) => (
          <li key={module.id} className={styles.module}>
            <div className={styles.moduleHead}>
              <h3 className={styles.moduleName}>{module.name}</h3>
              <StatusPill state={module.state} />
            </div>
            <p className={styles.moduleDesc}>{module.description}</p>
            <p className={styles.moduleDetail}>{module.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AuthorizationPanel({ rows }: { rows: AuthorizationRow[] }) {
  return (
    <Panel
      title="Supersession Authorization"
      caption="Architecture decisions and verifiable runtime preconditions."
    >
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.id} className={`${styles.row} ${styles.rowWide}`}>
            <span className={styles.rowLabel}>{row.label}</span>
            <StatusPill state={row.state} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------------- shell */

export function BrainDevShell() {
  const snapshot = getBrainStatusSnapshot();

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <BrainHeader />

        {/*
          Provenance banner. Keeps the surface honest: this slice renders
          DEV PRESENTATION STATE, not backend truth.
        */}
        <p className={styles.provenance} role="note">
          <strong>Data source:</strong> {snapshot.sourceLabel}. No live telemetry, database
          probe or market output is shown on this page.
        </p>

        <SummaryStrip snapshot={snapshot} />

        <Panel
          title="System Flow"
          caption="How a decision travels through the Brain. Stage labels show delivery state, not activity."
        >
          <SystemFlow stages={snapshot.flow} />
        </Panel>

        <div className={styles.grid}>
          <FoundationPanel items={snapshot.foundation} />
          <AuthorizationPanel rows={snapshot.authorization} />
        </div>

        <ModuleCards modules={snapshot.modules} />
      </div>
    </div>
  );
}
