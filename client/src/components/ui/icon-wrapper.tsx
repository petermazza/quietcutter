import { cn } from "@/lib/utils";
import { iconSizes } from "@/lib/design-tokens";

interface IconWrapperProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  className?: string;
}

export function IconWrapper({ size = "md", children, className }: IconWrapperProps) {
  return (
    <div className={cn(iconSizes[size], className)}>
      {children}
    </div>
  );
}

// Specific icon components for common use cases
interface IconButtonProps {
  icon: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function IconButton({ icon, size = "sm", className }: IconButtonProps) {
  return (
    <div className={cn(iconSizes[size], className)}>
      {icon}
    </div>
  );
}
