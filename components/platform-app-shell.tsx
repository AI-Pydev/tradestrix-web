"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { BrokerHealth, fetchBrokerHealthByBroker } from "@/lib/api";

type PlatformAppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  caption: string;
  monogram: string;
  external?: boolean;
};

type NavGroup = {
  monogram: string;
  title: string;
  items: NavItem[];
};

const SIDEBAR_STORAGE_KEY = "tradekotak.sidebar.collapsed";
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";
const BROKER_HEALTH_ORDER = ["dhan", "kotakneo", "upstox", "kite"];
const BROKER_HEALTH_LABELS: Record<string, string> = {
  dhan: "Dhan",
  kotakneo: "Kotak",
  upstox: "Upstox",
  kite: "Kite",
};

function normalizeBrokerHealthId(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (normalized === "kotak" || normalized === "kotakneo") {
    return "kotakneo";
  }
  if (normalized === "dhan") {
    return "dhan";
  }
  if (normalized === "upstox") {
    return "upstox";
  }
  if (normalized === "kite") {
    return "kite";
  }
  return normalized;
}

const baseNavGroups: NavGroup[] = [
  {
    monogram: "OV",
    title: "Overview",
    items: [
      {
        href: "/",
        label: "Platform Home",
        caption: "Landing and module map",
        monogram: "PH",
      },
      {
        href: "/dashboard",
        label: "Execution Desk",
        caption: "Bot control center",
        monogram: "ED",
      },
      {
        href: "/multi-bot-launcher",
        label: "Multi-Bot",
        caption: "Batch launcher",
        monogram: "MB",
      },
      {
        href: "/brokers",
        label: "Brokers",
        caption: "Connections and auth",
        monogram: "BR",
      },
      {
        href: "/tradingview-alerts",
        label: "TV Alerts",
        caption: "Webhook templates",
        monogram: "TV",
      },
    ],
  },
  {
    monogram: "RS",
    title: "Research",
    items: [
      {
        href: "/support-resistance-scanner",
        label: "3M S/R",
        caption: "Intraday level scanner",
        monogram: "SR",
      },
      {
        href: "/opportunity-scanner",
        label: "Scanner",
        caption: "Stock and index setups",
        monogram: "SC",
      },
      {
        href: "/opportunity-scanner#scanner-paper-lab",
        label: "Paper Lab",
        caption: "Scanner trade tracking",
        monogram: "PB",
      },
      {
        href: "/execution-dashboard",
        label: "Execution Accordion",
        caption: "Multi-bot and monitor",
        monogram: "EA",
      },
      {
        href: "/multi-stock-monitor",
        label: "Multi-Stock Monitor",
        caption: "Signal and manual trade feed",
        monogram: "MS",
      },
      {
        href: "/upstox-backtest",
        label: "Backtest",
        caption: "Option-chain replay",
        monogram: "BT",
      },
      {
        href: "/strategy-qualification",
        label: "Qualification",
        caption: "Auto backtest cycle + buckets",
        monogram: "SQ",
      },
      {
        href: "/custom-candle-lab",
        label: "Candle Lab",
        caption: "Custom timeframe preview",
        monogram: "CL",
      },
    ],
  },
  {
    monogram: "MK",
    title: "Markets",
    items: [
      {
        href: "/index-auto-launch",
        label: "Index Auto",
        caption: "Indices-only market hours",
        monogram: "IA",
      },
      {
        href: "/mcx-market",
        label: "MCX Market",
        caption: "Commodity desk",
        monogram: "MX",
      },
      {
        href: "/crypto-market",
        label: "Crypto Market",
        caption: "Delta workflows",
        monogram: "CR",
      },
      {
        href: "/crypto-tradingview-templates",
        label: "Crypto TV Templates",
        caption: "Delta alert templates",
        monogram: "CT",
      },
    ],
  },
  {
    monogram: "BE",
    title: "Backend",
    items: [
      {
        href: `${BACKEND_BASE_URL}/api/v1/instruments/catalog`,
        label: "Instrument API",
        caption: "Catalog JSON",
        monogram: "IN",
        external: true,
      },
      {
        href: `${BACKEND_BASE_URL}/docs`,
        label: "API Docs",
        caption: "FastAPI reference",
        monogram: "AP",
        external: true,
      },
    ],
  },
];

const adminNavGroup: NavGroup = {
  monogram: "AD",
  title: "Admin",
  items: [
    {
      href: "/admin",
      label: "Approvals",
      caption: "Gmail access control",
      monogram: "AU",
    },
  ],
};

const adminNavGroups: NavGroup[] = [...baseNavGroups, adminNavGroup];

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Platform Home",
    subtitle: "Directory-driven landing surface for the trading platform",
  },
  "/dashboard": {
    title: "Execution Desk",
    subtitle: "Focused surface for bot launch, managed jobs, and trade operations",
  },
  "/execution-dashboard": {
    title: "Execution Accordion",
    subtitle: "Unified accordion surface for multi-bot launcher and monitor workflows",
  },
  "/multi-stock-monitor": {
    title: "Multi-Stock Monitor",
    subtitle: "Dedicated surface for multi-stock trades, P/L, and signal-driven positions",
  },
  "/brokers": {
    title: "Brokers",
    subtitle: "Dedicated surface for broker auth, routing readiness, and connection state",
  },
  "/tradingview-alerts": {
    title: "TradingView Alerts",
    subtitle: "Generate TradingView webhook templates, rotate tokens, and validate signals",
  },
  "/multi-bot-launcher": {
    title: "Multi-Bot Launcher",
    subtitle: "Batch orchestration surface for option-chain bot deployment",
  },
  "/index-auto-launch": {
    title: "Index Auto Launch",
    subtitle: "Dedicated automation surface for verified index CALL and PUT jobs",
  },
  "/mcx-market": {
    title: "MCX Market",
    subtitle: "Commodity launchpad for discovery, monitoring, and execution",
  },
  "/crypto-market": {
    title: "Crypto Market",
    subtitle: "Delta market analysis, strategy preview, and demo-order surface",
  },
  "/crypto-tradingview-templates": {
    title: "Crypto TradingView Templates",
    subtitle: "Dedicated template desk for Delta alert payloads and backend execution profiles",
  },
  "/upstox-backtest": {
    title: "Upstox Backtest",
    subtitle: "Historical option-chain replay and review workflow",
  },
  "/strategy-qualification": {
    title: "Strategy Qualification",
    subtitle: "Rolling auto-backtest cycle, scoring, issues, and launch buckets",
  },
  "/custom-candle-lab": {
    title: "Custom Candle Lab",
    subtitle: "Replay-driven testbed for internal candle generation across multiple timeframe styles",
  },
  "/support-resistance-scanner": {
    title: "3M Support / Resistance",
    subtitle: "Intraday scanner for proximity to strong 3-minute support and resistance zones",
  },
  "/opportunity-scanner": {
    title: "Opportunity Scanner",
    subtitle: "Ranked market scanning and scanner paper-lab workflow",
  },
  "/admin": {
    title: "Admin Approval Desk",
    subtitle: "Review Gmail signups, approve users, and manage access states",
  },
};

function basePath(href: string) {
  return href.split("#")[0] || "/";
}

function anchorPart(href: string) {
  const [, anchor] = href.split("#");
  return anchor ? `#${anchor}` : "";
}

function isActive(href: string, pathname: string, currentHash: string) {
  const base = basePath(href);
  const anchor = anchorPart(href);
  if (anchor) {
    return base === pathname && currentHash === anchor;
  }
  return base === pathname && !currentHash;
}

function isGroupActive(group: NavGroup, pathname: string, currentHash: string) {
  return group.items.some((item) => isActive(item.href, pathname, currentHash));
}

function activeGroupTitle(groups: NavGroup[], pathname: string, currentHash: string) {
  return groups.find((group) => isGroupActive(group, pathname, currentHash))?.title ?? groups[0]?.title ?? "";
}

function brokerHealthTone(health: BrokerHealth | undefined) {
  if (health === undefined) {
    return "gold";
  }
  if (health.status === "green" || health.valid) {
    return "green";
  }
  if (health.status === "red") {
    return "red";
  }
  return "gold";
}

export function PlatformAppShell({ children }: PlatformAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const [brokerHealth, setBrokerHealth] = useState<Record<string, BrokerHealth>>({});
  const [brokerHealthRefreshing, setBrokerHealthRefreshing] = useState(false);
  const [brokerHealthRefreshingId, setBrokerHealthRefreshingId] = useState<string | null>(null);
  const isPublicPath = pathname === "/login";
  const navGroups = user?.role === "ADMIN" ? adminNavGroups : baseNavGroups;
  const [expandedGroup, setExpandedGroup] = useState(() =>
    activeGroupTitle(navGroups, "/", ""),
  );

  async function loadBrokerHealth(refresh = false) {
    setBrokerHealthRefreshing(true);
    try {
      const settled = await Promise.allSettled(
        BROKER_HEALTH_ORDER.map(async (brokerId) => {
          const health = await fetchBrokerHealthByBroker(brokerId, refresh);
          return { brokerId, health };
        }),
      );
      const updates: Record<string, BrokerHealth> = {};
      for (const item of settled) {
        if (item.status === "fulfilled") {
          updates[normalizeBrokerHealthId(item.value.brokerId)] = item.value.health;
        }
      }
      if (Object.keys(updates).length > 0) {
        setBrokerHealth((current) => ({ ...current, ...updates }));
      }
    } catch {
    } finally {
      setBrokerHealthRefreshing(false);
    }
  }

  async function refreshHeaderBrokerHealth(brokerId: string) {
    const normalizedBrokerId = normalizeBrokerHealthId(brokerId);
    setBrokerHealthRefreshingId(normalizedBrokerId);
    try {
      const health = await fetchBrokerHealthByBroker(normalizedBrokerId, true);
      setBrokerHealth((current) => ({
        ...current,
        [normalizedBrokerId]: health,
      }));
    } catch {
    } finally {
      setBrokerHealthRefreshingId(null);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "1") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function syncHash() {
      setCurrentHash(window.location.hash || "");
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    setExpandedGroup(activeGroupTitle(navGroups, pathname, currentHash));
  }, [currentHash, navGroups, pathname]);

  useEffect(() => {
    void loadBrokerHealth(false);
  }, []);

  useEffect(() => {
    if (!loading && !isPublicPath && user?.status !== "APPROVED") {
      router.replace("/login");
    }
  }, [isPublicPath, loading, router, user]);

  const meta = routeMeta[pathname] ?? {
    title: "TradeStrix",
    subtitle: "Operator surface",
  };

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (loading || user?.status !== "APPROVED") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #07131f 0%, #0c1f34 100%)",
          color: "#e7eef8",
        }}
      >
        <div className="muted">Checking operator access...</div>
      </div>
    );
  }

  return (
    <div className={`platform-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`platform-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="platform-sidebar-head">
          <Link className="platform-brand" href="/">
            <span className="platform-brand-mark">TK</span>
            <span className="platform-brand-copy">
              <span className="platform-brand-title">TradeStrix</span>
              <span className="platform-brand-subtitle">Performance-first desk</span>
            </span>
          </Link>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="platform-sidebar-toggle desktop-only"
            onClick={() => setCollapsed((value) => !value)}
            type="button"
          >
            {collapsed ? ">>" : "<<"}
          </button>
          <button
            aria-label="Close sidebar"
            className="platform-sidebar-toggle mobile-only"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            X
          </button>
        </div>

        <nav className="platform-nav" aria-label="Primary">
          {navGroups.map((group) => (
            <div
              className={`platform-nav-group ${expandedGroup === group.title ? "open" : ""} ${
                isGroupActive(group, pathname, currentHash) ? "active" : ""
              }`}
              key={group.title}
            >
              <button
                aria-controls={`sidebar-group-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
                aria-expanded={expandedGroup === group.title}
                className="platform-nav-group-button"
                onClick={() => setExpandedGroup((value) => (value === group.title ? "" : group.title))}
                type="button"
              >
                <span className="platform-nav-group-button-left">
                  <span className="platform-nav-group-icon">{group.monogram}</span>
                  <span className="platform-nav-group-meta">
                    <span className="platform-nav-group-title">{group.title}</span>
                    <span className="platform-nav-group-count">{group.items.length} links</span>
                  </span>
                </span>
                <span className="platform-nav-group-chevron">{expandedGroup === group.title ? "-" : "+"}</span>
              </button>
              <div
                className="platform-nav-group-body"
                id={`sidebar-group-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <div className="platform-nav-items">
                  {group.items.map((item) =>
                    item.external ? (
                      <a
                        className={`platform-nav-link ${isActive(item.href, pathname, currentHash) ? "active" : ""}`}
                        href={item.href}
                        key={item.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="platform-nav-icon">{item.monogram}</span>
                        <span className="platform-nav-copy">
                          <span className="platform-nav-label">{item.label}</span>
                          <span className="platform-nav-caption">{item.caption}</span>
                        </span>
                      </a>
                    ) : (
                      <Link
                        className={`platform-nav-link ${isActive(item.href, pathname, currentHash) ? "active" : ""}`}
                        href={item.href}
                        key={item.href}
                      >
                        <span className="platform-nav-icon">{item.monogram}</span>
                        <span className="platform-nav-copy">
                          <span className="platform-nav-label">{item.label}</span>
                          <span className="platform-nav-caption">{item.caption}</span>
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="platform-sidebar-foot">
          <div className="platform-sidebar-note">Target shape: fast path, risk-first, multi-broker, modular monolith.</div>
        </div>
      </aside>

      {mobileOpen && <button aria-label="Close navigation overlay" className="platform-overlay" onClick={() => setMobileOpen(false)} type="button" />}

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="platform-topbar-left">
            <button
              aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
              className="platform-sidebar-toggle mobile-only"
              onClick={() => setMobileOpen((value) => !value)}
              type="button"
            >
              {mobileOpen ? "X" : "Menu"}
            </button>
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="platform-sidebar-toggle desktop-only"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
            <div className="platform-topbar-copy">
              <div className="platform-topbar-title">{meta.title}</div>
              <div className="platform-topbar-subtitle">{meta.subtitle}</div>
            </div>
          </div>
          <div className="platform-broker-health" aria-label="Broker API health">
            {BROKER_HEALTH_ORDER.map((brokerId) => {
              const health = brokerHealth[brokerId];
              const tone = brokerHealthTone(health);
              const label = BROKER_HEALTH_LABELS[brokerId] ?? brokerId;
              const refreshing = brokerHealthRefreshingId === brokerId;
              return (
                <div className="d-inline-flex align-items-center gap-1" key={brokerId}>
                  <Link
                    className={`platform-broker-health-chip ${tone}`}
                    href="/brokers"
                    title={health?.message ?? "Checking broker API token"}
                  >
                    <span className="platform-broker-health-dot" />
                    <span className="platform-broker-health-label">{label}</span>
                  </Link>
                  <button
                    className="platform-broker-health-refresh"
                    disabled={brokerHealthRefreshing || refreshing}
                    onClick={() => void refreshHeaderBrokerHealth(brokerId)}
                    title={`Refresh ${label} API health`}
                    type="button"
                  >
                    {refreshing ? "..." : "↻"}
                  </button>
                </div>
              );
            })}
            <button
              className="platform-broker-health-refresh"
              disabled={brokerHealthRefreshing}
              onClick={() => void loadBrokerHealth(true)}
              title="Refresh broker API health"
              type="button"
            >
              {brokerHealthRefreshing ? "..." : "Refresh"}
            </button>
          </div>
          <div className="platform-topbar-right">
            <PwaInstallButton />
            {user.role === "ADMIN" ? (
              <Link className="platform-topbar-link" href="/admin">
                Admin
              </Link>
            ) : null}
            <Link className="platform-topbar-link" href="/multi-stock-monitor">
              P/L
            </Link>
            <a className="platform-topbar-link" href={`${BACKEND_BASE_URL}/docs`} rel="noreferrer" target="_blank">
              API Docs
            </a>
            <span className="platform-topbar-link">{user.email}</span>
            <button
              className="platform-topbar-link"
              onClick={() => {
                signOut();
                router.replace("/login");
              }}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="platform-content">{children}</div>
      </div>
    </div>
  );
}
