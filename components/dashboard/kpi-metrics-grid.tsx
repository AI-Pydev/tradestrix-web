"use client";

import React from "react";
import {
    BotIcon,
    ChartCandlestickIcon,
    PlugZapIcon,
    ShieldCheckIcon,
    TargetIcon,
    TrendingUpIcon,
} from "./icons";

interface KPICardProps {
  icon: React.ReactNode;
  iconClass: string;
  cardClass: string;
  title: string;
  value: string;
  valueColor?: string;
  submetric: string;
  submetricColor?: string;
}

function OperationalKPICard({
  icon,
  iconClass,
  cardClass,
  title,
  value,
  valueColor = "text-[#E4E9F2]",
  submetric,
  submetricColor = "text-[#55D6A0]",
}: KPICardProps) {
  return (
    <div
      className={`group relative flex items-center gap-3.5 p-3.5 ts-kpi-card ${cardClass}`}
    >
      {/* Left Icon Box (46px container, 24px icon) carrying semantic identity */}
      <div className={`kpi-icon-box ${iconClass}`}>
        {icon}
      </div>

      {/* Right: 3 lines stacked (title, value, sub-metric) */}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-mono font-medium truncate text-[#A7B1C3]">
          {title}
        </div>
        <div
          className={`text-xl sm:text-2xl font-bold font-mono tracking-tight leading-tight ${valueColor}`}
        >
          {value}
        </div>
        <div
          className={`text-[11px] font-mono mt-0.5 leading-none font-medium truncate ${submetricColor}`}
        >
          {submetric}
        </div>
      </div>
    </div>
  );
}

export function DashboardKPIGrid() {
  return (
    <section aria-label="Operational Command Metrics" className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Active Bots -> Semantic Blue */}
        <OperationalKPICard
          icon={<BotIcon className="w-6 h-6" />}
          iconClass="kpi-icon-blue"
          cardClass="ts-kpi-blue"
          title="Active Bots"
          value="7"
          valueColor="text-[#E4E9F2]"
          submetric="▲ +2 vs. yesterday"
          submetricColor="text-[#55D6A0]"
        />

        {/* 2. Open Positions -> Semantic Teal */}
        <OperationalKPICard
          icon={<ChartCandlestickIcon className="w-6 h-6" />}
          iconClass="kpi-icon-teal"
          cardClass="ts-kpi-teal"
          title="Open Positions"
          value="12"
          valueColor="text-[#E4E9F2]"
          submetric="4 Long / 8 Short"
          submetricColor="text-[#A7B1C3]"
        />

        {/* 3. Day P/L -> Semantic Green */}
        <OperationalKPICard
          icon={<TrendingUpIcon className="w-6 h-6" />}
          iconClass="kpi-icon-green"
          cardClass="ts-kpi-green"
          title="Day P/L"
          value="+₹12,450"
          valueColor="text-[#55D6A0]"
          submetric="▲ +2.4%"
          submetricColor="text-[#55D6A0]"
        />

        {/* 4. Win Rate -> Semantic Purple */}
        <OperationalKPICard
          icon={<TargetIcon className="w-6 h-6" />}
          iconClass="kpi-icon-purple"
          cardClass="ts-kpi-purple"
          title="Win Rate"
          value="68%"
          valueColor="text-[#E4E9F2]"
          submetric="▲ +6%"
          submetricColor="text-[#55D6A0]"
        />

        {/* 5. Broker Health -> Semantic Cyan */}
        <OperationalKPICard
          icon={<ShieldCheckIcon className="w-6 h-6" />}
          iconClass="kpi-icon-cyan"
          cardClass="ts-kpi-cyan"
          title="Broker Health"
          value="4 / 4"
          valueColor="text-[#E4E9F2]"
          submetric="▲ All systems online"
          submetricColor="text-[#55D6A0]"
        />

        {/* 6. API Status -> Semantic Pink */}
        <OperationalKPICard
          icon={<PlugZapIcon className="w-6 h-6" />}
          iconClass="kpi-icon-pink"
          cardClass="ts-kpi-pink"
          title="API Status"
          value="Healthy"
          valueColor="text-[#55D6A0]"
          submetric="Latency 42 ms"
          submetricColor="text-[#A7B1C3]"
        />
      </div>
    </section>
  );
}
