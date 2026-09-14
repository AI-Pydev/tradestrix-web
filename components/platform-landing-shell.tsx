"use client";

import { DashboardFooter } from "./dashboard/dashboard-footer";
import { DashboardHeroBanner } from "./dashboard/hero-banner";
import { DashboardKPIGrid } from "./dashboard/kpi-metrics-grid";
import { DashboardQuickAccessGrid } from "./dashboard/quick-access-grid";

export function PlatformLandingShell() {
  return (
    <div className="w-full min-h-screen ts-command-shell p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
      <div className="max-w-[1720px] mx-auto space-y-4 sm:space-y-5">
        {/* 1. Hero Banner: Trade Smarter. Automate Fearlessly. */}
        <DashboardHeroBanner />

        {/* 2. 6 Operational Command KPI Cards */}
        <DashboardKPIGrid />

        {/* 3. Unified Quick Access 12-Card Grid */}
        <DashboardQuickAccessGrid />

        {/* 4. Operational Status Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
}

export default PlatformLandingShell;
