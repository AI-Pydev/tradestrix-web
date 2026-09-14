
interface BrandMarkProps {
  className?: string;
  size?: number;
}

export function TradeStrixBrandMark({ className = "", size = 36 }: BrandMarkProps) {
  return (
    <div
      className={`inline-flex items-center justify-center font-black select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        color: "#090d16",
        fontSize: Math.round(size * 0.44),
        letterSpacing: "0.02em",
        boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
      }}
    >
      TS
    </div>
  );
}

