// Design System Tokens for QuietCutter
// Centralized design tokens for consistency across the application

export const colors = {
  // Brand colors - Primary gradient
  brand: {
    primary: "teal-500",
    secondary: "blue-500",
    accent: "purple-500",
    gradient: "bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500",
    gradientText: "bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent",
  },
  
  // Pro feature colors
  pro: {
    gradient: "bg-gradient-to-r from-yellow-400 to-yellow-600",
    gradientHover: "hover:from-yellow-500 hover:to-yellow-700",
    bg: "bg-yellow-50",
    bgSubtle: "bg-gradient-to-br from-yellow-50 to-orange-50",
    border: "border-yellow-200",
    text: "text-yellow-600",
  },
  
  // Semantic colors
  semantic: {
    success: "green-500",
    error: "red-500",
    warning: "yellow-500",
    info: "blue-500",
  },
} as const;

export const spacing = {
  // Gap spacing
  gap: {
    xs: "gap-1",    // 4px
    sm: "gap-2",    // 8px
    md: "gap-4",    // 16px
    lg: "gap-6",    // 24px
    xl: "gap-8",    // 32px
    "2xl": "gap-12", // 48px
  },
  
  // Padding
  padding: {
    xs: "p-1",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  },
  
  // Margin
  margin: {
    xs: "m-1",
    sm: "m-2",
    md: "m-4",
    lg: "m-6",
    xl: "m-8",
  },
} as const;

export const typography = {
  // Headings
  h1: "text-4xl font-bold",
  h2: "text-2xl font-semibold",
  h3: "text-lg font-semibold",
  h4: "text-base font-semibold",
  
  // Body text
  body: "text-base",
  bodyLarge: "text-lg",
  bodySmall: "text-sm",
  
  // Utility
  caption: "text-xs",
  overline: "text-xs uppercase tracking-wide",
  
  // Font families
  fontFamily: {
    heading: "font-['Outfit',sans-serif]",
    body: "font-sans",
  },
} as const;

export const iconSizes = {
  xs: "w-3 h-3",   // 12px - Inline text icons
  sm: "w-4 h-4",   // 16px - Button icons
  md: "w-6 h-6",   // 24px - Feature icons
  lg: "w-8 h-8",   // 32px - Avatar/logo
  xl: "w-12 h-12", // 48px - Hero icons
} as const;

export const borderRadius = {
  sm: "rounded",        // 4px - Small elements
  md: "rounded-lg",     // 8px - Cards, inputs
  lg: "rounded-xl",     // 12px - Large cards
  full: "rounded-full", // Pills, avatars, buttons
} as const;

export const shadows = {
  sm: "shadow-sm",                    // Subtle elevation
  md: "shadow-md",                    // Cards
  lg: "shadow-lg",                    // Modals
  xl: "shadow-xl",                    // Popovers
  hover: "hover:shadow-lg",           // Interactive elements
  focus: "focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
} as const;

export const transitions = {
  fast: "transition-all duration-150",
  normal: "transition-all duration-200",
  slow: "transition-all duration-300",
  
  // Specific transitions
  transform: "transition-transform duration-200",
  colors: "transition-colors duration-200",
  opacity: "transition-opacity duration-200",
} as const;

export const animations = {
  // Hover effects
  scaleUp: "hover:scale-105",
  scaleDown: "active:scale-95",
  
  // Loading
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  
  // Entrance
  fadeIn: "animate-in fade-in duration-300",
  slideInFromBottom: "animate-in slide-in-from-bottom duration-500",
  slideInFromTop: "animate-in slide-in-from-top duration-500",
} as const;

// Responsive breakpoints (for reference)
export const breakpoints = {
  sm: "640px",   // Mobile landscape
  md: "768px",   // Tablet
  lg: "1024px",  // Desktop
  xl: "1280px",  // Large desktop
  "2xl": "1536px", // Extra large
} as const;

// Grid configurations for responsive layouts
export const grids = {
  // Card grids
  cards: {
    mobile: "grid-cols-1",
    tablet: "sm:grid-cols-2",
    desktop: "lg:grid-cols-3",
    wide: "xl:grid-cols-4",
  },
  
  // Feature grids
  features: {
    mobile: "grid-cols-1",
    tablet: "md:grid-cols-2",
    desktop: "lg:grid-cols-3",
  },
  
  // Preset grids
  presets: {
    mobile: "grid-cols-2",
    desktop: "md:grid-cols-4",
  },
} as const;

// Helper function to combine classes
export function combineClasses(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
