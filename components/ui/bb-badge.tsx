import React from "react";

export type BBBadgeTone = "bullish" | "bearish" | "warning" | "grade-a" | "neutral";

export interface BBBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BBBadgeTone;
  children: React.ReactNode;
  className?: string;
  pill?: boolean;
}

const toneStyles: Record<BBBadgeTone, string> = {
  bullish: "bg-[#55D6A0]/12 text-[#55D6A0] border-[#55D6A0]/25",
  bearish: "bg-[#F17884]/12 text-[#F17884] border-[#F17884]/25",
  warning: "bg-[#E8BC55]/12 text-[#E8BC55] border-[#E8BC55]/25",
  "grade-a": "bg-[#55C7B4]/12 text-[#55C7B4] border-[#55C7B4]/25",
  neutral: "bg-[#0F1828] text-[#A7B1C3] border-slate-400/20",
};

export function BBBadge({
  tone = "neutral",
  children,
  className = "",
  pill = false,
  ...props
}: BBBadgeProps) {
  const toneClass = toneStyles[tone] || toneStyles.neutral;
  const radiusClass = pill ? "rounded-full" : "rounded-md";

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

