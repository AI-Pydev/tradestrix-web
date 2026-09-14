import React from "react";

export type BBCardVariant = "standard" | "compact" | "elevated" | "hud";

export interface BBCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BBCardVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BBCardVariant, string> = {
  standard: "bg-[#0B1322] border border-slate-400/15 rounded-xl p-4 transition-all duration-150 hover:border-blue-400/30",
  compact: "bg-[#0B1322] border border-slate-400/15 rounded-xl p-3 transition-all duration-150 hover:border-blue-400/30",
  elevated: "bg-[#0F1828] border border-blue-400/20 rounded-xl p-4 shadow-lg shadow-black/20",
  hud: "bg-[#070C18]/90 backdrop-blur-md border border-slate-400/15 rounded-xl p-3 shadow-xl",
};

export function BBCard({
  variant = "standard",
  className = "",
  children,
  ...props
}: BBCardProps) {
  const baseClasses = variantStyles[variant] || variantStyles.standard;
  return (
    <div className={`${baseClasses} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default BBCard;

