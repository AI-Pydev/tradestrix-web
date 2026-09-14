"use client";


function HeroGoldTrendChart() {
  return (
    <div className="relative w-full h-16 sm:h-20 flex items-end justify-end select-none pointer-events-none">
      <svg
        viewBox="0 0 380 80"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="heroGoldGlow" x="-10%" y="-20%" width="130%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.9" />
          </filter>
          <linearGradient id="heroAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0b1020" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroVolumeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Volume histogram bars */}
        <g opacity="0.6">
          {[
            { x: 15, h: 12 }, { x: 35, h: 20 }, { x: 55, h: 16 }, { x: 75, h: 28 },
            { x: 95, h: 22 }, { x: 115, h: 32 }, { x: 135, h: 24 }, { x: 155, h: 38 },
            { x: 175, h: 28 }, { x: 195, h: 42 }, { x: 215, h: 34 }, { x: 235, h: 48 },
            { x: 255, h: 40 }, { x: 275, h: 56 }, { x: 295, h: 46 }, { x: 315, h: 62 },
            { x: 335, h: 52 }, { x: 355, h: 68 },
          ].map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={80 - bar.h}
              width="6"
              height={bar.h}
              rx="1.5"
              fill="url(#heroVolumeGradient)"
            />
          ))}
        </g>

        {/* Gradient fill area */}
        <path
          d="M 0 80 L 0 60 Q 40 58 80 52 T 160 46 T 230 38 T 300 28 T 350 16 L 380 12 L 380 80 Z"
          fill="url(#heroAreaGradient)"
        />

        {/* Glowing Trendline */}
        <path
          d="M 0 60 Q 40 58 80 52 T 160 46 T 230 38 T 300 28 T 350 16 L 380 12"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#heroGoldGlow)"
        />

        <circle cx="376" cy="12" r="3.5" fill="#fbbf24" filter="url(#heroGoldGlow)" />
        <circle cx="376" cy="12" r="6" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" className="animate-ping" />
      </svg>
    </div>
  );
}

export function DashboardHeroBanner() {
  return (
    <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl ts-card backdrop-blur-md">
      {/* Background subtle radial glow */}
      <div
        className="absolute top-0 right-1/4 -mt-8 h-48 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left Side: Welcome + Headline + Subtitle */}
        <div className="space-y-2 max-w-2xl">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase border border-slate-800 bg-slate-900/60">
            WELCOME BACK
          </span>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Trade Smarter.{" "}
            <span className="text-amber-400">Automate Fearlessly.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
            Access powerful trading tools, automation, and market intelligence — all in one place.
          </p>
        </div>

        {/* Right Side: Motto + Gold Trendline Chart */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0">
          <div className="text-right select-none pr-1">
            <div className="text-[9px] font-extrabold tracking-[0.25em] text-slate-400 uppercase leading-tight">
              DISCIPLINE
            </div>
            <div className="text-[9px] font-extrabold tracking-[0.25em] text-slate-400 uppercase leading-tight">
              BUILDS
            </div>
            <div className="text-[10px] font-black tracking-[0.25em] text-amber-400 uppercase leading-tight">
              FREEDOM
            </div>
          </div>

          <div className="w-64 sm:w-80 lg:w-96 mt-2">
            <HeroGoldTrendChart />
          </div>
        </div>
      </div>
    </div>
  );
}
