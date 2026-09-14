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
    "py-2.5 px-4 rounded-lg bg-[#55D6A0] hover:bg-[#34D399] disabled:opacity-50 text-[#070B14] font-bold text-xs uppercase tracking-tight transition-all cursor-pointer inline-flex items-center justify-center border border-transparent shadow-sm",
  secondary:
    "py-2 px-3.5 rounded-lg bg-[#0F1828] hover:bg-[#132033] hover:border-blue-400/40 hover:text-[#F1F5F9] disabled:opacity-50 text-[#CBD5E1] border border-slate-400/20 text-xs font-semibold transition-all cursor-pointer inline-flex items-center justify-center",
  accent:
    "py-2 px-3.5 rounded-lg bg-[#0F1828] hover:bg-[#132033] hover:border-amber-400/60 hover:text-amber-200 disabled:opacity-50 text-[#E8BC55] border border-amber-400/30 text-xs font-semibold transition-all cursor-pointer inline-flex items-center justify-center",
  micro:
    "px-2 py-1 bg-[#0F1828] hover:bg-[#132033] hover:text-[#55D6A0] disabled:opacity-50 text-[#A7B1C3] rounded-md text-[10px] font-mono font-medium transition-all inline-flex items-center gap-1 cursor-pointer border border-slate-400/15",
  "tab-active":
    "h-14 border-b-2 border-blue-500 text-white font-bold inline-flex items-center px-4 bg-transparent cursor-pointer",
  "tab-inactive":
    "h-14 border-b-2 border-transparent text-[#818EA3] hover:text-[#E4E9F2] font-semibold inline-flex items-center px-4 bg-transparent transition-colors cursor-pointer",
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

