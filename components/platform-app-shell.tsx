"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
  ChevronDownIcon,
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
  SearchIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrendingUpIcon,
} from "./dashboard/icons";
import { TradeStrixBrandMark } from "./dashboard/tradestrix-brand-mark";
import {
  BACKEND_BASE_URL,
  getCategoryGroups,
  MODULE_CATEGORIES,
  ModuleCategoryId,
} from "./platform-modules";

type PlatformAppShellProps = {
  children: React.ReactNode;
};

const SIDEBAR_STORAGE_KEY = "tradestrix.sidebar.collapsed";
const SIDEBAR_GROUPS_STORAGE_KEY = "tradestrix.sidebar.groups";
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

const DEFAULT_EXPANDED_GROUPS: Record<ModuleCategoryId, boolean> =
  MODULE_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.id] = true;
      return acc;
    },
    {} as Record<ModuleCategoryId, boolean>,
  );

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
    title: "Execution Mode",
    subtitle: "Paper/real trading mode, IP whitelist & signal gatekeeper",
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
  "/symbol-map": {
    title: "Symbol Map",
    subtitle: "Broker symbol mappings and canonical instrument resolution",
    icon: NetworkIcon,
  },
  "/login": {
    title: "Authentication",
    subtitle: "Sign in to TradeStrix platform",
    icon: ShieldCheckIcon,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<ModuleCategoryId, boolean>>(
    DEFAULT_EXPANDED_GROUPS,
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [brokerHealth, setBrokerHealth] = useState<Record<string, BrokerHealth>>({});
  const [brokerHealthRefreshing, setBrokerHealthRefreshing] = useState(false);
  const [brokerHealthRefreshingId, setBrokerHealthRefreshingId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isPublicPath = pathname === "/login";
  const isAdmin = user?.role === "ADMIN";
  const categoryGroups = useMemo(() => getCategoryGroups(isAdmin), [isAdmin]);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return categoryGroups;
    }
    return categoryGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(normalizedQuery) ||
            item.caption.toLowerCase().includes(normalizedQuery) ||
            item.description.toLowerCase().includes(normalizedQuery) ||
            group.title.toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [categoryGroups, normalizedQuery]);

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
    const storedGroups = window.localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
    if (storedGroups) {
      try {
        const parsed = JSON.parse(storedGroups) as Partial<Record<ModuleCategoryId, boolean>>;
        setExpandedGroups((prev) => ({ ...prev, ...parsed }));
      } catch {
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  useEffect(() => {
    const activeGroup = categoryGroups.find((group) =>
      group.items.some((item) => !item.external && isItemActive(item.href, pathname, currentHash)),
    );
    if (activeGroup) {
      setExpandedGroups((prev) =>
        prev[activeGroup.id] ? prev : { ...prev, [activeGroup.id]: true },
      );
    }
  }, [categoryGroups, pathname, currentHash]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCollapsed(false);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }

      if (!isEditable && event.key === "/") {
        event.preventDefault();
        setCollapsed(false);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleGroup(groupId: ModuleCategoryId) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

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

        {/* Search & Pinned Platform Home */}
        <div className="px-3 pt-3 pb-2 space-y-2.5 shrink-0">
          {collapsed ? (
            <button
              type="button"
              onClick={() => {
                setCollapsed(false);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              className="w-full flex items-center justify-center p-2 rounded-xl border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
              title="Search modules (Ctrl+K)"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules"
                aria-label="Search modules"
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-800/90 bg-slate-900/70 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900 transition-colors"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 border-0 bg-transparent p-0 text-[11px] text-slate-500 hover:text-slate-200"
                  aria-label="Clear module search"
                >
                  ✕
                </button>
              ) : (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 border border-slate-800 rounded px-1 py-0.5 pointer-events-none">
                  /
                </span>
              )}
            </div>
          )}

          {/* Pinned Platform Home */}
          {(() => {
            const homeActive = isItemActive("/", pathname, currentHash);
            return (
              <Link
                href="/"
                title={collapsed ? "Platform Home" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  homeActive
                    ? "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <HouseIcon
                  className={`w-4 h-4 shrink-0 ${
                    homeActive ? "text-emerald-400" : "text-slate-400"
                  }`}
                />
                {!collapsed && <span className="truncate">Platform Home</span>}
              </Link>
            );
          })()}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredGroups.length === 0 && !collapsed && (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              No modules match &ldquo;{searchQuery}&rdquo;
            </div>
          )}

          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = normalizedQuery
              ? true
              : (expandedGroups[group.id] ?? true);

            if (collapsed) {
              return (
                <div key={group.id} className="space-y-1 pt-2 border-t border-slate-800/60 first:border-t-0 first:pt-0">
                  {group.items.map((item) => {
                    const active = !item.external && isItemActive(item.href, pathname, currentHash);
                    const Icon = item.icon;
                    const cls = `flex items-center justify-center p-2 rounded-xl transition-colors ${
                      active
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`;

                    return item.external ? (
                      <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className={cls}
                        title={item.label}
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link key={item.id} href={item.href} className={cls} title={item.label}>
                        <Icon className="w-4 h-4" />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border-0 bg-transparent text-xs font-semibold text-slate-200 hover:bg-slate-900/70 transition-colors select-none"
                  aria-expanded={isExpanded}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${group.iconBg} ${group.iconColor}`}
                    >
                      <GroupIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{group.title}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500">
                    <span className="font-mono">{group.items.length}</span>
                    <ChevronDownIcon
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        isExpanded ? "rotate-180 text-slate-400" : ""
                      }`}
                    />
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-0.5 py-0.5">
                    {group.items.map((item) => {
                      const active = !item.external && isItemActive(item.href, pathname, currentHash);
                      const Icon = item.icon;
                      const linkClasses = `group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        active
                          ? "bg-emerald-500/12 text-emerald-300 font-semibold"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 font-medium"
                      }`;

                      const inner = (
                        <>
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                                active
                                  ? "text-emerald-400"
                                  : `${item.iconColor} opacity-80 group-hover:opacity-100`
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </>
                      );

                      if (item.external) {
                        return (
                          <a
                            key={item.id}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className={linkClasses}
                            title={item.caption}
                          >
                            {inner}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={linkClasses}
                          title={item.caption}
                        >
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
