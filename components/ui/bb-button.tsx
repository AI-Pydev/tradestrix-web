import React from "react";

export type BBButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "micro"
  | "tab-active"
  | "tab-inactive";

export interface BBButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BBButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BBButtonVariant, string> = {
  primary:
    "py-3 px-4 rounded-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-tight transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent",
  secondary:
    "py-2.5 px-3 rounded-sm bg-slate-900 hover:bg-slate-800 hover:border-slate-600 hover:text-white disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center",
  accent:
    "py-2.5 px-3 rounded-sm bg-slate-900 hover:bg-slate-800 hover:border-amber-500/70 hover:text-amber-200 disabled:opacity-50 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center",
  micro:
    "px-2 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 disabled:opacity-50 text-slate-300 rounded text-[10px] font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer border border-slate-700/50",
  "tab-active":
    "h-16 border-b-2 border-emerald-500 text-white font-bold inline-flex items-center px-4 bg-transparent cursor-pointer",
  "tab-inactive":
    "h-16 border-b-2 border-transparent text-slate-400 hover:text-white font-semibold inline-flex items-center px-4 bg-transparent transition-colors cursor-pointer",
};

export function BBButton({
  variant = "secondary",
  className = "",
  children,
  ...props
}: BBButtonProps) {
  const baseClasses = variantStyles[variant] || variantStyles.secondary;
  return (
    <button className={`${baseClasses} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export default BBButton;

