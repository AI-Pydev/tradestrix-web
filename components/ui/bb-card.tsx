import React from "react";

export type BBCardVariant = "standard" | "compact" | "elevated" | "hud";

export interface BBCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BBCardVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BBCardVariant, string> = {
  standard: "bg-slate-900 border border-slate-800 rounded-sm p-4",
  compact: "bg-slate-900 border border-slate-800 rounded-sm p-3",
  elevated: "bg-slate-900/60 border border-slate-800 rounded-sm p-4",
  hud: "bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-sm p-3",
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

