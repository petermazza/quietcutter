# QuietCutter Design System Implementation Guide

## 🎨 **Quick Start**

All design tokens are now centralized in `client/src/lib/design-tokens.ts` for consistency across the application.

```tsx
import { colors, spacing, typography, iconSizes, borderRadius, shadows, transitions } from "@/lib/design-tokens";
```

---

## 📦 **COMPONENTS CREATED**

### 1. **Design Tokens** (`design-tokens.ts`)
Centralized design system with:
- Colors (brand, pro, semantic)
- Spacing (gap, padding, margin)
- Typography (headings, body, captions)
- Icon sizes
- Border radius
- Shadows
- Transitions & animations
- Responsive grids

### 2. **Card Variants** (`card-variants.tsx`)
Pre-built card components:
- `CardVariant` - Base card with 5 variants
- `FeatureCard` - Feature showcase cards
- `PresetCard` - Preset selection cards

### 3. **Icon Wrapper** (`icon-wrapper.tsx`)
Consistent icon sizing:
- `IconWrapper` - Size-controlled icon container
- `IconButton` - Icon for buttons

---

## 🎯 **USAGE EXAMPLES**

### **Colors**

```tsx
// Brand gradient (primary)
<h1 className={colors.brand.gradientText}>
  QuietCutter
</h1>

// Pro gradient
<Badge className={colors.pro.gradient}>
  <Crown /> PRO
</Badge>

// Pro background
<div className={colors.pro.bgSubtle}>
  Pro feature content
</div>
```

### **Spacing**

```tsx
// Gap spacing
<div className={spacing.gap.md}>
  {/* 16px gap between children */}
</div>

// Padding
<div className={spacing.padding.lg}>
  {/* 24px padding */}
</div>
```

### **Typography**

```tsx
// Headings
<h1 className={typography.h1}>Main Title</h1>
<h2 className={typography.h2}>Section Title</h2>

// Body text
<p className={typography.body}>Regular text</p>
<p className={typography.bodySmall}>Small text</p>

// Font family
<h1 className={typography.fontFamily.heading}>
  Outfit Font
</h1>
```

### **Icons**

```tsx
import { IconWrapper } from "@/components/ui/icon-wrapper";

// Consistent icon sizing
<IconWrapper size="md">
  <Upload />
</IconWrapper>

// Button icon
<Button>
  <IconWrapper size="sm">
    <Download />
  </IconWrapper>
  Download
</Button>
```

### **Card Variants**

```tsx
import { CardVariant, FeatureCard, PresetCard } from "@/components/ui/card-variants";

// Standard card
<CardVariant variant="default">
  <CardContent>Content</CardContent>
</CardVariant>

// Subtle card (muted background)
<CardVariant variant="subtle">
  <CardContent>Content</CardContent>
</CardVariant>

// Pro feature card
<CardVariant variant="pro">
  <CardContent>Pro content</CardContent>
</CardVariant>

// Feature showcase
<FeatureCard
  icon={<Zap className="w-6 h-6" />}
  title="Lightning Fast"
  description="Process files in seconds"
  iconColor="teal-500"
/>

// Preset selection
<PresetCard
  icon={<Mic className="w-6 h-6" />}
  name="Podcast"
  isSelected={selected === "podcast"}
  onClick={() => setSelected("podcast")}
/>
```

### **Shadows & Transitions**

```tsx
// Card with shadow
<Card className={cn(shadows.md, transitions.normal)}>
  Content
</Card>

// Hover effect
<Button className={cn(shadows.hover, transitions.normal)}>
  Hover me
</Button>

// Focus ring
<Input className={shadows.focus} />
```

### **Border Radius**

```tsx
// Cards
<Card className={borderRadius.md}>Content</Card>

// Buttons
<Button className={borderRadius.full}>Pill Button</Button>

// Large cards
<Card className={borderRadius.lg}>Large Card</Card>
```

---

## 📱 **RESPONSIVE DESIGN**

### **Breakpoints**
```tsx
sm: 640px   // Mobile landscape
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
2xl: 1536px // Extra large
```

### **Responsive Grids**

```tsx
import { grids } from "@/lib/design-tokens";

// Card grid (1 → 2 → 3 → 4 columns)
<div className={cn(
  "grid",
  grids.cards.mobile,
  grids.cards.tablet,
  grids.cards.desktop,
  grids.cards.wide,
  spacing.gap.lg
)}>
  {cards.map(card => <Card key={card.id} />)}
</div>

// Feature grid (1 → 2 → 3 columns)
<div className={cn(
  "grid",
  grids.features.mobile,
  grids.features.tablet,
  grids.features.desktop,
  spacing.gap.md
)}>
  {features.map(feature => <FeatureCard key={feature.id} />)}
</div>

// Preset grid (2 → 4 columns)
<div className={cn(
  "grid",
  grids.presets.mobile,
  grids.presets.desktop,
  spacing.gap.sm
)}>
  {presets.map(preset => <PresetCard key={preset.id} />)}
</div>
```

### **Responsive Header**

```tsx
// Balanced 3-column layout
<header className="grid grid-cols-3 items-center gap-4 px-4 py-3">
  {/* Left: Logo */}
  <div className="flex items-center gap-2">
    <img src={logo} className="w-8 h-8" />
    <span className={typography.fontFamily.heading}>QuietCutter</span>
  </div>
  
  {/* Center: Navigation */}
  <nav className="hidden md:flex justify-center gap-6">
    <Link>Home</Link>
    <Link>About</Link>
    <Link>Blog</Link>
  </nav>
  
  {/* Right: User menu */}
  <div className="flex justify-end">
    <UserMenu />
  </div>
</header>
```

### **Mobile-First Approach**

```tsx
// Start with mobile, add larger breakpoints
<div className={cn(
  // Mobile (default)
  "flex flex-col gap-4 p-4",
  
  // Tablet
  "md:flex-row md:gap-6 md:p-6",
  
  // Desktop
  "lg:gap-8 lg:p-8"
)}>
  Content
</div>
```

---

## 🎨 **GRADIENT USAGE (LIMITED)**

Only use these 2 gradients to maintain consistency:

### **1. Brand Gradient** (Headings, Hero)
```tsx
// Text gradient
<h1 className={colors.brand.gradientText}>
  QuietCutter
</h1>

// Background gradient
<div className={colors.brand.gradient}>
  Content
</div>
```

### **2. Pro Gradient** (Pro features only)
```tsx
// Pro badge
<Badge className={cn(
  colors.pro.gradient,
  colors.pro.gradientHover
)}>
  <Crown /> PRO
</Badge>

// Pro card background
<Card className={colors.pro.bgSubtle}>
  Pro content
</Card>
```

**❌ DON'T:** Create new gradients  
**✅ DO:** Use these 2 consistently

---

## 🎭 **ANIMATIONS & MICRO-INTERACTIONS**

```tsx
import { animations } from "@/lib/design-tokens";

// Hover scale
<Button className={cn(
  transitions.normal,
  animations.scaleUp,
  animations.scaleDown
)}>
  Hover me
</Button>

// Loading spinner
<div className={animations.spin}>
  <Loader2 />
</div>

// Fade in entrance
<div className={animations.fadeIn}>
  Content
</div>

// Slide in from bottom
<div className={animations.slideInFromBottom}>
  Modal content
</div>
```

---

## 📐 **LAYOUT PATTERNS**

### **Centered Container**
```tsx
<div className="container mx-auto px-4 max-w-6xl">
  Content
</div>
```

### **Section Spacing**
```tsx
<section className={cn(
  "py-12",           // Mobile
  "md:py-16",        // Tablet
  "lg:py-24"         // Desktop
)}>
  Content
</section>
```

### **Card Grid**
```tsx
<div className={cn(
  "grid",
  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  spacing.gap.lg
)}>
  {items.map(item => <Card key={item.id} />)}
</div>
```

### **Flex Layout**
```tsx
<div className={cn(
  "flex flex-col md:flex-row",
  "items-center justify-between",
  spacing.gap.md
)}>
  <div>Left</div>
  <div>Right</div>
</div>
```

---

## ✅ **BEFORE & AFTER EXAMPLES**

### **Before (Inconsistent)**
```tsx
// ❌ Multiple gradients
<h1 className="bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text">
<Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">
<div className="bg-gradient-to-br from-yellow-50 to-orange-50">

// ❌ Inconsistent spacing
<div className="gap-2">
<div className="gap-4">
<div className="gap-6">

// ❌ Random icon sizes
<Icon className="w-3 h-3" />
<Icon className="w-6 h-6" />
<Icon className="w-8 h-8" />
```

### **After (Consistent)**
```tsx
// ✅ Centralized gradients
<h1 className={colors.brand.gradientText}>
<Badge className={colors.pro.gradient}>
<div className={colors.pro.bgSubtle}>

// ✅ Consistent spacing
<div className={spacing.gap.sm}>
<div className={spacing.gap.md}>
<div className={spacing.gap.lg}>

// ✅ Standardized icons
<IconWrapper size="xs"><Icon /></IconWrapper>
<IconWrapper size="md"><Icon /></IconWrapper>
<IconWrapper size="lg"><Icon /></IconWrapper>
```

---

## 🚀 **MIGRATION GUIDE**

### **Step 1: Import Design Tokens**
```tsx
import { 
  colors, 
  spacing, 
  typography, 
  iconSizes,
  borderRadius,
  shadows,
  transitions 
} from "@/lib/design-tokens";
```

### **Step 2: Replace Hardcoded Values**
```tsx
// Before
<div className="gap-4 p-6 rounded-lg shadow-md">

// After
<div className={cn(
  spacing.gap.md,
  spacing.padding.lg,
  borderRadius.md,
  shadows.md
)}>
```

### **Step 3: Use Card Variants**
```tsx
// Before
<Card className="bg-card/50 border-border/50">

// After
<CardVariant variant="subtle">
```

### **Step 4: Standardize Icons**
```tsx
// Before
<Upload className="w-6 h-6" />

// After
<IconWrapper size="md">
  <Upload />
</IconWrapper>
```

---

## 📊 **DESIGN TOKEN REFERENCE**

### **Colors**
- `colors.brand.gradient` - Primary brand gradient
- `colors.brand.gradientText` - Text gradient
- `colors.pro.gradient` - Pro feature gradient
- `colors.pro.bgSubtle` - Pro background
- `colors.semantic.success` - Green-500
- `colors.semantic.error` - Red-500

### **Spacing**
- `spacing.gap.xs` - 4px
- `spacing.gap.sm` - 8px
- `spacing.gap.md` - 16px
- `spacing.gap.lg` - 24px
- `spacing.gap.xl` - 32px

### **Typography**
- `typography.h1` - text-4xl font-bold
- `typography.h2` - text-2xl font-semibold
- `typography.h3` - text-lg font-semibold
- `typography.body` - text-base
- `typography.bodySmall` - text-sm
- `typography.caption` - text-xs

### **Icon Sizes**
- `iconSizes.xs` - 12px (w-3 h-3)
- `iconSizes.sm` - 16px (w-4 h-4)
- `iconSizes.md` - 24px (w-6 h-6)
- `iconSizes.lg` - 32px (w-8 h-8)
- `iconSizes.xl` - 48px (w-12 h-12)

### **Border Radius**
- `borderRadius.sm` - rounded (4px)
- `borderRadius.md` - rounded-lg (8px)
- `borderRadius.lg` - rounded-xl (12px)
- `borderRadius.full` - rounded-full

### **Shadows**
- `shadows.sm` - shadow-sm
- `shadows.md` - shadow-md
- `shadows.lg` - shadow-lg
- `shadows.hover` - hover:shadow-lg
- `shadows.focus` - focus ring

---

## 🎯 **BEST PRACTICES**

### **DO:**
✅ Use design tokens for all styling  
✅ Use CardVariant components  
✅ Use IconWrapper for consistent sizing  
✅ Limit gradients to 2 styles  
✅ Follow mobile-first responsive design  
✅ Use semantic color names  
✅ Add transitions to interactive elements  

### **DON'T:**
❌ Create new gradients  
❌ Use hardcoded spacing values  
❌ Mix icon sizes randomly  
❌ Skip responsive breakpoints  
❌ Use inline styles  
❌ Ignore the design system  

---

## 📱 **RESPONSIVE TESTING CHECKLIST**

- [ ] Mobile (375px) - iPhone SE
- [ ] Mobile landscape (640px)
- [ ] Tablet (768px) - iPad
- [ ] Desktop (1024px)
- [ ] Large desktop (1280px)
- [ ] Extra large (1536px)

Test:
- [ ] Header layout (3-column grid)
- [ ] Card grids (responsive columns)
- [ ] Navigation (mobile menu)
- [ ] Spacing consistency
- [ ] Text readability
- [ ] Touch targets (min 44px)

---

## 🔧 **TROUBLESHOOTING**

### **Issue: Colors not applying**
```tsx
// ❌ Wrong
className={colors.brand.primary}

// ✅ Correct
className={`text-${colors.brand.primary}`}
// Or use the full class name
className="text-teal-500"
```

### **Issue: Grid not responsive**
```tsx
// ❌ Wrong
<div className="grid-cols-4">

// ✅ Correct
<div className={cn(
  "grid",
  grids.cards.mobile,
  grids.cards.tablet,
  grids.cards.desktop
)}>
```

### **Issue: Icons different sizes**
```tsx
// ❌ Wrong
<Upload className="w-6 h-6" />
<Download className="w-4 h-4" />

// ✅ Correct
<IconWrapper size="md"><Upload /></IconWrapper>
<IconWrapper size="sm"><Download /></IconWrapper>
```

---

**Last Updated:** 2026-02-15  
**Version:** 1.0  
**Status:** Production Ready

All design system components are deployed and ready to use! 🚀
