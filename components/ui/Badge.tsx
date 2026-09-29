import { cn } from "@/lib/utils";
import { ALLIANCE_COLORS } from "@/lib/constants";

interface BadgeProps {
  label: string;
  variant?: "default" | "alliance" | "status" | "urgent";
  alliance?: string;
}

export default function Badge({ label, variant = "default", alliance }: BadgeProps) {
  const allianceColor = alliance ? ALLIANCE_COLORS[alliance] : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        variant === "default" && "bg-gray-100 text-gray-700",
        variant === "status" && "bg-amber-100 text-amber-800",
        variant === "urgent" && "bg-red-100 text-red-700",
        variant === "alliance" && "text-white"
      )}
      style={
        variant === "alliance" && allianceColor
          ? { backgroundColor: allianceColor }
          : undefined
      }
    >
      {label}
    </span>
  );
}
