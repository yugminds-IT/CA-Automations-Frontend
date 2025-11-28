# Color Palette Documentation

This document outlines all the colors used in the AI Interactions Project.

## Theme Colors (CSS Variables)

The project uses a custom color system defined in `app/globals.css` with CSS variables using the OKLCH color space.

### Light Theme (`:root`)

| Variable | OKLCH Value | Usage |
|----------|-------------|-------|
| `--background` | `oklch(0.98 0 0)` | Main background (very light grey/white) |
| `--foreground` | `oklch(0.15 0 0)` | Main text color (dark grey/black) |
| `--card` | `oklch(1 0 0)` | Card background (white) |
| `--card-foreground` | `oklch(0.15 0 0)` | Card text (dark grey/black) |
| `--primary` | `oklch(0.15 0 0)` | Primary actions (dark grey/black) |
| `--primary-foreground` | `oklch(0.98 0 0)` | Text on primary buttons (white) |
| `--secondary` | `oklch(0.88 0 0)` | Secondary elements (light grey) |
| `--muted` | `oklch(0.92 0 0)` | Muted backgrounds (very light grey) |
| `--muted-foreground` | `oklch(0.5 0 0)` | Muted text (medium grey) |
| `--accent` | `oklch(0.85 0.08 60)` | Accent color (warm yellow/orange) |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Destructive actions (red) |
| `--border` | `oklch(0.88 0 0)` | Default borders (light grey) |
| `--input` | `oklch(0.92 0 0)` | Input field borders (very light grey) |
| `--ring` | `oklch(0.3 0 0)` | Focus ring color (dark grey) |

### Dark Theme (`.dark`)

| Variable | OKLCH Value | Usage |
|----------|-------------|-------|
| `--background` | `oklch(0.12 0 0)` | Main background (very dark grey) |
| `--foreground` | `oklch(0.95 0 0)` | Main text color (white/light grey) |
| `--card` | `oklch(0.16 0 0)` | Card background (dark grey) |
| `--card-foreground` | `oklch(0.95 0 0)` | Card text (white) |
| `--primary` | `oklch(0.15 0 0)` | Primary actions |
| `--primary-foreground` | `oklch(0.95 0 0)` | Text on primary buttons (white) |
| `--secondary` | `oklch(0.22 0 0)` | Secondary elements (dark grey) |
| `--muted` | `oklch(0.22 0 0)` | Muted backgrounds (dark grey) |
| `--muted-foreground` | `oklch(0.65 0 0)` | Muted text (medium grey) |
| `--accent` | `oklch(0.22 0 0)` | Accent color (dark grey) |
| `--destructive` | `oklch(0.396 0.141 25.723)` | Destructive actions (red) |
| `--border` | `oklch(0.22 0 0)` | Default borders (dark grey) |
| `--input` | `oklch(0.4 0.015 250)` | Input field borders (grey-600 equivalent) |
| `--ring` | `oklch(0.15 0 0)` | Focus ring color (dark grey) |

### Sidebar Colors

#### Light Theme
- `--sidebar`: `oklch(1 0 0)` (white)
- `--sidebar-foreground`: `oklch(0.15 0 0)` (dark grey)
- `--sidebar-primary`: `oklch(0.85 0.08 60)` (warm yellow/orange)
- `--sidebar-accent`: `oklch(0.92 0 0)` (light grey)
- `--sidebar-border`: `oklch(0.88 0 0)` (light grey)

#### Dark Theme
- `--sidebar`: `oklch(0.13 0 0)` (very dark grey)
- `--sidebar-foreground`: `oklch(0.95 0 0)` (white)
- `--sidebar-primary`: `oklch(0.85 0.08 60)` (warm yellow/orange - same as light)
- `--sidebar-accent`: `oklch(0.85 0.08 60)` (warm yellow/orange)
- `--sidebar-border`: `oklch(0.22 0 0)` (dark grey)

## Tailwind Utility Colors

The project also uses Tailwind's built-in color utilities for specific use cases:

### Status Colors
- **Green**: Used for success/active states
  - Light: `bg-green-100`, `text-green-700`
  - Dark: `dark:bg-green-900/30`, `dark:text-green-300`

- **Blue**: Used for info/role badges
  - Light: `bg-blue-100`, `text-blue-700`, `bg-blue-500`
  - Dark: `dark:bg-blue-900/30`, `dark:text-blue-300`

- **Yellow**: Used for warnings/pending states
  - Light: `bg-yellow-100`, `text-yellow-700`
  - Dark: `dark:bg-yellow-900/30`, `dark:text-yellow-300`
  - Focus indicator: `#FACC15` (yellow-400) - **Only on left border of focused inputs in dark mode**

- **Red**: Used for errors/destructive actions
  - Light: `bg-red-100`, `text-red-700`
  - Dark: `dark:bg-red-900/30`, `dark:text-red-300`
  - Destructive: `text-destructive`

### Grey Scale (Tailwind)
- `bg-gray-100`, `bg-gray-200`, `bg-gray-700`, `bg-gray-800`
- `text-gray-300`, `text-gray-400`, `text-gray-600`, `text-gray-700`
- `border-gray-300`, `border-gray-600` (specifically for borders in dark mode)

### Special Colors
- **Black**: `bg-black`, `text-black` - Used for buttons and logo background
- **White**: `text-white` - Used for text on black backgrounds

## Color Usage Guidelines

### For Text Fields, Buttons, and Tables
- **Light Mode**: Use theme variables (`border-input`, `border-border`)
- **Dark Mode**: 
  - Borders default to grey (`--input`: `oklch(0.4 0.015 250)` = grey-600)
  - Focus state: Yellow left border only (`#FACC15` / yellow-400)

### For Status Indicators
- Use Tailwind color utilities with dark mode variants
- Example: `bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`

### For Theme-Aware Components
- Use CSS variable classes: `bg-background`, `text-foreground`, `border-border`
- These automatically adapt to light/dark theme

## Chart Colors

The theme defines chart colors (1-5) for data visualization:
- Chart 1-5: Various grey scales from `oklch(0.4 0 0)` to `oklch(0.8 0 0)` in light mode
- Chart 1-5: Various scales from `oklch(0.5 0 0)` to `oklch(0.9 0 0)` in dark mode

## Important Notes

1. **Dark Mode Focus**: When a text field is focused in dark mode, only the **left border** turns yellow (`#FACC15`), not the entire border or a ring.

2. **Grey Borders**: In dark mode, text fields, buttons, and tables use grey borders (`oklch(0.4 0.015 250)`) by default.

3. **Yellow Accent**: Yellow (`oklch(0.85 0.08 60)`) is used for:
   - Sidebar active states
   - Tab active states (dark mode)
   - Focus indicators (dark mode, left border only)

4. **Consistency**: Always use theme CSS variables (`--*`) when possible for automatic theme adaptation.

