"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { BBTickerBar } from "@/components/ui/bb-ticker-bar";
import { BrokerHealth, fetchBrokerHealthByBroker } from "@/modules/brokers";
import {
  ActivityIcon,
  BellRingIcon,
  BotIcon,
  BoxIcon,
  BrainCircuitIcon,
  ChartCandlestickIcon,
  CoinsIcon,
  FlaskConicalIcon,
  HistoryIcon,
  HouseIcon,
  Layers3Icon,
  NetworkIcon,
  PlayCircleIcon,
  PlugZapIcon,
  PlusIcon,
  RadarIcon,
  RefreshCwIcon,
  RocketIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrendingUpIcon,
} from "./dashboard/icons";
import { TradeStrixBrandMark } from "./dashboard/tradestrix-brand-mark";

type PlatformAppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const SIDEBAR_STORAGE_KEY = "tradestrix.sidebar.collapsed";
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

// Navigation Groups with Dedicated History and Trendline/Harmonics Research
const baseNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        href: "/",
        label: "Platform Home",
        caption: "Landing and module map",
        icon: HouseIcon,
      },
      {
        href: "/dashboard",
        label: "Execution Desk",
        caption: "Bot control center",
        icon: PlayCircleIcon,
      },
      {
        href: "/equity-desk",
        label: "Stock & ETF Desk",
        caption: "Stock, ETF & BeeS bots",
        icon: ChartCandlestickIcon,
      },
      {
        href: "/multi-stock-monitor",
        label: "Multi-Stock Monitor",
        caption: "Live quote & trade monitor",
        icon: ActivityIcon,
      },
    ],
  },
  {
    title: "RESEARCH",
    items: [
      {
        href: "/opportunity-scanner",
        label: "Opportunity Scanner",
        caption: "Stock and index setups",
        icon: ScanSearchIcon,
      },
      {
        href: "/support-resistance-scanner",
        label: "3M S/R Scanner",
        caption: "Intraday S/R analysis",
        icon: RadarIcon,
      },
      {
        href: "/trendline-intelligence",
        label: "Trendlines",
        caption: "Breakouts & headroom gate",
        icon: TrendingUpIcon,
      },
      {
        href: "/harmonic-patterns",
        label: "Harmonics",
        caption: "Pattern scanner & PRZ chart",
        icon: ActivityIcon,
      },
      {
        href: "/research-agent",
        label: "AI Research Agent",
        caption: "AI strategy diagnosis + fixes",
        icon: BrainCircuitIcon,
      },
      {
        href: "/strategy-qualification",
        label: "Strategy Qualification",
        caption: "Auto backtest & scoring",
        icon: TargetIcon,
      },
      {
        href: "/custom-candle-lab",
        label: "Custom Candle Lab",
        caption: "Custom modes & replay",
        icon: FlaskConicalIcon,
      },
    ],
  },
  {
    title: "HISTORY",
    items: [
      {
        href: "/trade-history",
        label: "Options Trade History",
        caption: "Daily and monthly options PnL",
        icon: HistoryIcon,
      },
      {
        href: "/equity-trade-history",
        label: "Stock & ETF History",
        caption: "Stock, ETF & BeeS PnL",
        icon: HistoryIcon,
      },
      {
        href: "/tradingview-alerts/trade-history",
        label: "TV Alert History",
        caption: "Webhook execution PnL",
        icon: HistoryIcon,
      },
    ],
  },
  {
    title: "MARKETS",
    items: [
      {
        href: "/index-auto-launch",
        label: "Index Auto Launch",
        caption: "Auto-launch basket",
        icon: RocketIcon,
      },
      {
        href: "/stock-auto-launch",
        label: "Stock Auto Launch",
        caption: "Qualified stock universe",
        icon: RocketIcon,
      },
      {
        href: "/mcx-market",
        label: "MCX Market",
        caption: "Commodity market tools",
        icon: BoxIcon,
      },
      {
        href: "/crypto-market",
        label: "Crypto Market",
        caption: "Delta & demo trading tools",
        icon: CoinsIcon,
      },
    ],
  },
  {
    title: "BACKEND",
    items: [
      {
        href: "/multi-bot-launcher",
        label: "Multi-Bot Launcher",
        caption: "Batch launch bots",
        icon: Layers3Icon,
      },
      {
        href: "/tradingview-alerts",
        label: "TradingView Alerts",
        caption: "Webhook templates",
        icon: BellRingIcon,
      },
      {
        href: "/brokers",
        label: "Brokers",
        caption: "Connections & auth",
        icon: PlugZapIcon,
      },
      {
        href: "/symbol-map",
        label: "Symbol Map",
        caption: "Broker symbol mappings",
        icon: NetworkIcon,
      },
      {
        href: "/upstox-backtest",
        label: "Upstox Backtest",
        caption: "Options backtest engine",
        icon: PlayCircleIcon,
      },
    ],
  },
];

const adminNavGroup: NavGroup = {
  title: "ADMIN",
  items: [
    {
      href: "/admin",
      label: "Approvals",
      caption: "Gmail access control",
      icon: ShieldCheckIcon,
    },
  ],
};

const adminNavGroups: NavGroup[] = [...baseNavGroups, adminNavGroup];

const routeMeta: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
  "/": {
    title: "Platform Home",
    subtitle: "Command center & operational intelligence",
    icon: HouseIcon,
  },
  "/dashboard": {
    title: "Execution Desk",
    subtitle: "Bot control center and trade operations",
    icon: PlayCircleIcon,
  },
  "/trade-history": {
    title: "Trade History",
    subtitle: "Daily and monthly PnL review",
    icon: HistoryIcon,
  },
  "/equity-desk": {
    title: "Stock & ETF Desk",
    subtitle: "Stock, ETF & BeeS bots",
    icon: ChartCandlestickIcon,
  },
  "/equity-trade-history": {
    title: "Stock & ETF History",
    subtitle: "Stock & ETF PnL breakdown",
    icon: HistoryIcon,
  },
  "/execution-dashboard": {
    title: "Execution Accordion",
    subtitle: "Multi-bot launcher and monitor workflows",
    icon: Layers3Icon,
  },
  "/multi-stock-monitor": {
    title: "Multi-Stock Monitor",
    subtitle: "Multi-stock trades, open positions, and realized P/L",
    icon: ChartCandlestickIcon,
  },
  "/brokers": {
    title: "Brokers",
    subtitle: "Manage broker connections and authentication flows",
    icon: PlugZapIcon,
  },
  "/tradingview-alerts": {
    title: "TradingView Alerts",
    subtitle: "Webhook templates and token management",
    icon: BellRingIcon,
  },
  "/tradingview-alerts/trade-history": {
    title: "TradingView Trade History",
    subtitle: "Webhook-specific daily and cumulative PnL",
    icon: HistoryIcon,
  },
  "/multi-bot-launcher": {
    title: "Multi-Bot Launcher",
    subtitle: "Batch launch CALL and PUT bots from one surface",
    icon: Layers3Icon,
  },
  "/index-auto-launch": {
    title: "Index Auto Launch",
    subtitle: "Manage the verified-index auto-launch basket",
    icon: RocketIcon,
  },
  "/stock-auto-launch": {
    title: "Stock Auto Launch",
    subtitle: "Automated assignment for qualified stock universe",
    icon: RocketIcon,
  },
  "/mcx-market": {
    title: "MCX Market",
    subtitle: "Open the commodity market workflow",
    icon: BoxIcon,
  },
  "/crypto-market": {
    title: "Crypto Market",
    subtitle: "Use the delta and demo-order crypto tools",
    icon: CoinsIcon,
  },
  "/crypto-jobs": {
    title: "Crypto Jobs",
    subtitle: "Continuous paper runtime for crypto",
    icon: BotIcon,
  },
  "/crypto-research": {
    title: "Crypto Strategy Research",
    subtitle: "Delta historical candle backtests",
    icon: ScanSearchIcon,
  },
  "/crypto-tradingview-templates": {
    title: "Crypto TV Templates",
    subtitle: "Dedicated template desk for Delta alert payloads",
    icon: BellRingIcon,
  },
  "/upstox-backtest": {
    title: "Upstox Backtest",
    subtitle: "Options backtest engine and replay",
    icon: PlayCircleIcon,
  },
  "/strategy-qualification": {
    title: "Strategy Qualification",
    subtitle: "Auto-backtest cycle, scoring, and buckets",
    icon: TargetIcon,
  },
  "/custom-candle-lab": {
    title: "Custom Candle Lab",
    subtitle: "Preview custom candle modes and replay behavior",
    icon: FlaskConicalIcon,
  },
  "/support-resistance-scanner": {
    title: "3M S/R Scanner",
    subtitle: "Intraday support and resistance setups",
    icon: RadarIcon,
  },
  "/opportunity-scanner": {
    title: "Opportunity Scanner",
    subtitle: "Ranked stock and index opportunities",
    icon: ScanSearchIcon,
  },
  "/research-agent": {
    title: "AI Research Agent",
    subtitle: "Quantitative diagnosis and strategy fixes",
    icon: BrainCircuitIcon,
  },
  "/trendline-intelligence": {
    title: "Trendline Intelligence",
    subtitle: "Automated trendline detection, breakouts, and headroom analysis",
    icon: TrendingUpIcon,
  },
  "/harmonic-patterns": {
    title: "Harmonic Patterns",
    subtitle: "Fibonacci geometric ratios, PRZ zones, and predictive pattern scanner",
    icon: ActivityIcon,
  },
  "/admin": {
    title: "Admin Approval Desk",
    subtitle: "Review Gmail signups and manage access states",
    icon: ShieldCheckIcon,
  },
};

function basePath(href: string) {
  return href.split("#")[0] || "/";
}

function anchorPart(href: string) {
  const [, anchor] = href.split("#");
  return anchor ? `#${anchor}` : "";
}

function isItemActive(href: string, pathname: string, currentHash: string) {
  const base = basePath(href);
  const anchor = anchorPart(href);
  if (anchor) {
    return base === pathname && currentHash === anchor;
  }
  return base === pathname && !currentHash;
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isPublicPath = pathname === "/login";
  const navGroups = user?.role === "ADMIN" ? adminNavGroups : baseNavGroups;

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
    void loadBrokerHealth(false);
  }, []);

  useEffect(() => {
    if (!loading && !isPublicPath && user?.status !== "APPROVED") {
      router.replace("/login");
    }
  }, [isPublicPath, loading, router, user]);

  const meta = routeMeta[pathname] ?? {
    title: "TradeStrix",
    subtitle: "Directory-driven trading workspace",
    icon: HouseIcon,
  };
  const RouteIcon = meta.icon;

  const userEmail = user?.email ?? "operator@tradestrix.io";
  const userDisplayName =
    userEmail.split("@")[0].charAt(0).toUpperCase() + userEmail.split("@")[0].slice(1);
  const userInitials =
    userDisplayName.slice(0, 2).toUpperCase() || "TS";

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (loading || user?.status !== "APPROVED") {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-200">
        <div className="flex items-center gap-3">
          <TradeStrixBrandMark size={32} />
          <span className="text-sm text-slate-400 font-mono">Checking operator credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 antialiased font-sans">
      {/* 1. Modern Sidebar (5 Strong Functional Groups) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-800/80 bg-slate-950 transition-all duration-300 ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <Link href="/" className="flex items-center gap-3 overflow-hidden group">
            <TradeStrixBrandMark size={34} />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-slate-100 group-hover:text-amber-300 transition-colors leading-none">
                  TradeStrix
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  Sovereign Capital & Trade Fearless
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 items-center justify-center text-xs transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!collapsed && (
                <div className="px-3 pb-1 text-[11px] font-extrabold tracking-[0.14em] text-slate-400 uppercase select-none font-mono flex items-center justify-between">
                  <span>{group.title}</span>
                  <div className="h-px flex-1 ml-3 bg-gradient-to-r from-slate-800/80 to-transparent" />
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(item.href, pathname, currentHash);
                  const Icon = item.icon;

                  const linkClasses = `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    active
                      ? "ts-nav-active"
                      : "ts-nav-link text-slate-300"
                  } ${collapsed ? "justify-center px-2" : ""}`;

                  const content = (
                    <>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? "bg-blue-500 text-white shadow-sm"
                            : "bg-slate-900 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {!collapsed && (
                        <div className="flex flex-col min-w-0">
                          <span className="truncate leading-snug">{item.label}</span>
                          <span
                            className={`text-[10px] font-normal truncate leading-none mt-0.5 ${
                              active ? "text-blue-300/80" : "text-slate-400"
                            }`}
                          >
                            {item.caption}
                          </span>
                        </div>
                      )}
                    </>
                  );

                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClasses}
                        title={collapsed ? item.label : undefined}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={linkClasses}
                      title={collapsed ? item.label : undefined}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        {/* 2. Modern Glass Topbar */}
        <header className="sticky top-0 z-20 h-16 px-4 md:px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          {/* Left Title / Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            >
              ☰
            </button>

            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0">
              <RouteIcon className="w-4 h-4 text-slate-300" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-100 tracking-tight leading-none truncate">
                {meta.title}
              </span>
              <span className="text-xs text-slate-400 truncate mt-0.5">
                {meta.subtitle}
              </span>
            </div>
          </div>

          {/* Middle: Broker Status Badges (Clean styling with zero white boxes) */}
          <div className="hidden xl:flex items-center gap-2">
            {BROKER_HEALTH_ORDER.map((brokerId) => {
              const health = brokerHealth[brokerId];
              const label = BROKER_HEALTH_LABELS[brokerId] ?? brokerId;
              const isGreen = health?.status === "green" || health?.valid;
              const isRefreshing = brokerHealthRefreshingId === brokerId;

              return (
                <div
                  key={brokerId}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full ts-card-soft text-xs font-semibold text-slate-200 shadow-sm"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isGreen
                        ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                        : "bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse"
                    }`}
                  />
                  <span>{label}</span>
                  <span
                    className={`text-[11px] font-normal ${
                      isGreen ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {isGreen ? "Connected" : "Reconnecting..."}
                  </span>
                  <button
                    type="button"
                    onClick={() => void refreshHeaderBrokerHealth(brokerId)}
                    disabled={brokerHealthRefreshing || isRefreshing}
                    className="ml-1 text-slate-400 hover:text-slate-100 bg-transparent border-0 p-0 leading-none focus:outline-none"
                    title={`Refresh ${label}`}
                  >
                    <RefreshCwIcon className={`w-3 h-3 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
                  </button>
                </div>
              );
            })}

            <Link
              href="/brokers"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full ts-btn text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Broker</span>
            </Link>

            <button
              type="button"
              onClick={() => void loadBrokerHealth(true)}
              disabled={brokerHealthRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full ts-btn text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCwIcon className={`w-3 h-3 text-slate-400 ${brokerHealthRefreshing ? "animate-spin text-amber-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Right: Quick Links & User Profile */}
          <div className="flex items-center gap-3">
            <PwaInstallButton />

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full border ts-border-gold bg-amber-400/10 text-amber-300 text-xs font-bold uppercase tracking-wider"
              >
                ADMIN
              </Link>
            )}

            <Link
              href="/multi-stock-monitor"
              className="hidden md:inline-flex items-center px-3 py-1 rounded-full ts-btn text-slate-300 text-xs font-medium transition-colors"
            >
              P/L
            </Link>

            <a
              href={`${BACKEND_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center px-3 py-1 rounded-full ts-btn text-slate-300 text-xs font-medium transition-colors"
            >
              API DOCS
            </a>

            {/* User Profile Pill (Clean layout with non-overlapping initials and email) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 px-2.5 py-1 rounded-full ts-btn hover:border-[#60a5fa] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-extrabold text-[11px] shadow-sm shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col text-left min-w-0 pr-1">
                  <span className="text-xs font-bold text-slate-200 leading-none truncate max-w-[140px]">
                    {userDisplayName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                    {userEmail}
                  </span>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-md p-1.5 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-200 truncate">{userDisplayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      router.replace("/login");
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. Market Ticker Bar (Row 1) */}
        <BBTickerBar />

        {/* 4. Page Content (Starts immediately with KPI strip on the dashboard) */}
        <main className="flex-1 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default PlatformAppShell;
