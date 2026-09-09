import React from "react";

export type BBBadgeTone = "bullish" | "bearish" | "warning" | "grade-a" | "neutral";

export interface BBBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BBBadgeTone;
  children: React.ReactNode;
  className?: string;
  pill?: boolean;
}

const toneStyles: Record<BBBadgeTone, string> = {
  bullish: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  bearish: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  "grade-a": "bg-teal-500/10 text-teal-400 border-teal-400/40",
  neutral: "bg-slate-800 text-slate-300 border-slate-700",
};

export function BBBadge({
  tone = "neutral",
  children,
  className = "",
  pill = false,
  ...props
}: BBBadgeProps) {
  const toneClass = toneStyles[tone] || toneStyles.neutral;
  const radiusClass = pill ? "rounded-full" : "rounded-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] leading-tight px-1.5 py-0.5 ${radiusClass} uppercase font-mono font-bold border ${toneClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}

export default BBBadge;

