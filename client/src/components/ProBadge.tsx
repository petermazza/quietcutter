import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProBadge({ className, size = "md" }: ProBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <Badge 
      className={cn(
        "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold",
        sizeClasses[size],
        className
      )}
    >
      <Crown className={cn(iconSizes[size], "mr-1")} />
      PRO
    </Badge>
  );
}

interface LockedFeatureProps {
  children: React.ReactNode;
  isLocked: boolean;
  reason?: string;
  onUpgrade?: () => void;
}

export function LockedFeature({ children, isLocked, reason, onUpgrade }: LockedFeatureProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded">
        <div className="text-center p-4">
          <ProBadge className="mb-2" />
          {reason && <p className="text-sm text-gray-600 mb-2">{reason}</p>}
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Upgrade to unlock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
