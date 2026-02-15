import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { borderRadius, shadows, transitions } from "@/lib/design-tokens";

interface CardVariantProps {
  variant?: "default" | "subtle" | "pro" | "feature" | "hover";
  children: React.ReactNode;
  className?: string;
}

export function CardVariant({ variant = "default", children, className }: CardVariantProps) {
  const variantStyles = {
    default: "bg-card border-border",
    subtle: "bg-card/50 border-border/50",
    pro: "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200",
    feature: "bg-gradient-to-br from-card to-accent/5 border-accent/20",
    hover: cn(
      "bg-card border-border",
      transitions.normal,
      shadows.hover,
      "hover:border-border/80"
    ),
  };

  return (
    <Card className={cn(variantStyles[variant], borderRadius.md, className)}>
      {children}
    </Card>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor?: string;
  className?: string;
}

export function FeatureCard({ 
  icon, 
  title, 
  description, 
  iconColor = "teal-500",
  className 
}: FeatureCardProps) {
  return (
    <CardVariant variant="subtle" className={className}>
      <CardContent className="pt-6 text-center">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
          `bg-${iconColor}/20`
        )}>
          <div className={`text-${iconColor}`}>
            {icon}
          </div>
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </CardVariant>
  );
}

interface PresetCardProps {
  icon: React.ReactNode;
  name: string;
  isSelected?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PresetCard({ 
  icon, 
  name, 
  isSelected, 
  isLocked,
  onClick,
  className 
}: PresetCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "relative w-full text-left",
        transitions.normal,
        isLocked && "opacity-50 cursor-not-allowed"
      )}
    >
      <Card className={cn(
        borderRadius.md,
        transitions.normal,
        shadows.sm,
        isSelected && "border-blue-500 ring-2 ring-blue-500/20",
        !isLocked && shadows.hover,
        !isLocked && "hover:border-blue-400 cursor-pointer",
        className
      )}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0",
            isSelected ? "text-blue-500" : "text-muted-foreground"
          )}>
            {icon}
          </div>
          <span className={cn(
            "font-medium text-sm",
            isSelected && "text-blue-500"
          )}>
            {name}
          </span>
        </CardContent>
      </Card>
    </button>
  );
}
