---
name: Culinary Command
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#5e3f3b'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#936e6a'
  outline-variant: '#e8bcb7'
  surface-tint: '#c00011'
  primary: '#bb0010'
  on-primary: '#ffffff'
  primary-container: '#e6191f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4ab'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#fdb706'
  on-secondary-container: '#6a4b00'
  tertiary: '#006191'
  on-tertiary: '#ffffff'
  tertiary-container: '#007bb6'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000a'
  secondary-fixed: '#ffdea7'
  secondary-fixed-dim: '#ffbb1d'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#8fcdff'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#004b71'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
  price-display:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-tablet: 24px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for high-velocity restaurant environments, balancing the energetic urgency of the food industry with the clinical precision of a financial tool. The brand personality is efficient, appetizing, and authoritative. 

The design style follows a **Corporate / Modern** approach with a heavy emphasis on **Minimalism**. By utilizing expansive white space and a restricted color palette, the UI ensures that staff can focus on task completion without visual fatigue. The emotional response should be one of total control; the interface acts as a silent, reliable partner during peak service hours.

## Colors

The palette is anchored by a high-energy Primary Red, used exclusively for primary actions and "Occupied" states to signal active focus. The Secondary Yellow is reserved for attention-based feedback, such as "Billing" status or warnings. 

The background remains a stark White to maximize contrast for readability under harsh kitchen or dining room lighting. Neutral Dark Gray is utilized for all primary text to reduce the eye strain associated with pure black. Semantic colors are introduced for status clarity: Green for "Available" and subtle grays for disabled or inactive interface elements.

## Typography

This design system employs a dual-font strategy. **Montserrat** is used for headlines, table numbers, and price displays to provide a bold, geometric presence that is easily scannable from a distance. **Inter** is utilized for all functional UI elements, body text, and line items to ensure maximum legibility and a systematic, utilitarian feel.

Line heights are generous for body text to prevent misreading orders, while price displays use tighter leading to emphasize the numerical value as a single unit.

## Layout & Spacing

The layout utilizes a **Fixed Grid** model for POS terminals (typically tablets or touch monitors) to ensure hit targets remain consistent and predictable for muscle memory. 

- **Desktop/Tablet:** 12-column grid with 24px margins. Content is organized into functional zones (Navigation, Menu Grid, Order Summary).
- **Mobile:** 4-column grid with 16px margins. The layout reflows to prioritize the Order Summary or Menu Search depending on the current flow.

Touch targets must never be smaller than 44x44px. The spacing rhythm follows an 8px base unit to maintain a clean, mathematical balance across all components.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

1. **Base (Level 0):** Pure white background.
2. **Cards/Plates (Level 1):** Subtle 1px border (#E5E5E5) with a soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)). Used for menu items and table units.
3. **Modals/Sidebars (Level 2):** High-contrast shadow (0px 10px 25px rgba(0,0,0,0.1)) to pull focus for modifications or payment processing.

Active states for buttons use a slight inner shadow to simulate a physical "press," providing tactile feedback for touch-screen users.

## Shapes

The shape language is consistently **Rounded** (8px / 0.5rem) to evoke a friendly and modern feel while remaining professional. 

- **Standard Buttons & Inputs:** 8px radius.
- **Featured Menu Cards:** 16px (rounded-lg) to soften the visual impact of photography.
- **Status Indicators:** Fully rounded (pill-shaped) for high-speed identification of table status.

## Components

### Buttons
- **Primary:** Solid Primary Red with white text. High contrast for "Submit Order" or "Complete Payment."
- **Secondary:** White background with Primary Red border and text. Used for "Add Note" or "Print Receipt."
- **Ghost:** Minimalist text-only buttons for non-critical navigation.

### Table Indicators
- **Available:** White card with a 4px Green top-border and Green text label.
- **Occupied:** Solid Primary Red card with white text.
- **Billing:** White card with a 4px Yellow top-border and Yellow text label.

### Menu Cards
- Vertical layout with an image at the top (16px top-rounded corners).
- Price displayed in the bottom-right corner using the `price-display` typography token in Primary Red.

### Input Fields
- Outlined style with a 1px #E5E5E5 border. 
- Focused state: 2px Primary Red border. 
- Large hit areas for touch input, specifically for quantity selectors (+/-).

### Order List
- Clean rows with 12px vertical padding. 
- Use `label-md` for item names and `label-sm` for modifiers (e.g., "Extra Sauce").
- Swipe-to-delete gestures should be visually hinted with a subtle chevron.