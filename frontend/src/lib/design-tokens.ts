/**
 * Aran Design System Tokens
 * 
 * This file contains all design tokens from the Aran design system.
 * These tokens are used throughout the application for consistent styling.
 */

// Design System Configuration
export const DESIGN_SYSTEM = {
  product: {
    name: "Aran",
    version: "1.0.0",
    description: "shadcn/ui inspired design system with semantic tokens and CSS variables",
    framework: "shadcn/ui"
  }
} as const;

// Color Tokens
export const COLORS = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(222.2 84% 4.9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(222.2 84% 4.9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(222.2 84% 4.9%)",
    primary: "hsl(222.2 47.4% 11.2%)",
    primaryForeground: "hsl(210 40% 98%)",
    secondary: "hsl(210 40% 96%)",
    secondaryForeground: "hsl(222.2 47.4% 11.2%)",
    muted: "hsl(210 40% 96%)",
    mutedForeground: "hsl(215.4 16.3% 46.9%)",
    accent: "hsl(210 40% 96%)",
    accentForeground: "hsl(222.2 47.4% 11.2%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(210 40% 98%)",
    border: "hsl(214.3 31.8% 91.4%)",
    input: "hsl(214.3 31.8% 91.4%)",
    ring: "hsl(222.2 84% 4.9%)",
    chart1: "hsl(12 76% 61%)",
    chart2: "hsl(173 58% 39%)",
    chart3: "hsl(197 37% 24%)",
    chart4: "hsl(43 74% 66%)",
    chart5: "hsl(27 87% 67%)"
  },
  dark: {
    background: "hsl(222.2 84% 4.9%)",
    foreground: "hsl(210 40% 98%)",
    card: "hsl(222.2 84% 4.9%)",
    cardForeground: "hsl(210 40% 98%)",
    popover: "hsl(222.2 84% 4.9%)",
    popoverForeground: "hsl(210 40% 98%)",
    primary: "hsl(210 40% 98%)",
    primaryForeground: "hsl(222.2 47.4% 11.2%)",
    secondary: "hsl(217.2 32.6% 17.5%)",
    secondaryForeground: "hsl(210 40% 98%)",
    muted: "hsl(217.2 32.6% 17.5%)",
    mutedForeground: "hsl(215 20.2% 65.1%)",
    accent: "hsl(217.2 32.6% 17.5%)",
    accentForeground: "hsl(210 40% 98%)",
    destructive: "hsl(0 62.8% 30.6%)",
    destructiveForeground: "hsl(210 40% 98%)",
    border: "hsl(217.2 32.6% 17.5%)",
    input: "hsl(217.2 32.6% 17.5%)",
    ring: "hsl(212.7 26.8% 83.9%)",
    chart1: "hsl(220 70% 50%)",
    chart2: "hsl(160 60% 45%)",
    chart3: "hsl(30 80% 55%)",
    chart4: "hsl(280 65% 60%)",
    chart5: "hsl(340 75% 55%)"
  }
} as const;

// Typography Tokens
export const TYPOGRAPHY = {
  fontFamily: {
    sans: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Oxygen",
      "Ubuntu",
      "Cantarell",
      "Helvetica Neue",
      "sans-serif"
    ],
    mono: [
      "JetBrains Mono",
      "Fira Code",
      "Consolas",
      "Monaco",
      "Courier New",
      "monospace"
    ]
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    "5xl": ["3rem", { lineHeight: "1" }],
    "6xl": ["3.75rem", { lineHeight: "1" }]
  },
  fontWeight: {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900"
  },
  lineHeight: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2"
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em"
  }
} as const;

// Spacing Tokens
export const SPACING = {
  0: "0px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  11: "2.75rem",
  12: "3rem",
  14: "3.5rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  28: "7rem",
  32: "8rem",
  36: "9rem",
  40: "10rem",
  44: "11rem",
  48: "12rem",
  52: "13rem",
  56: "14rem",
  60: "15rem",
  64: "16rem",
  72: "18rem",
  80: "20rem",
  96: "24rem"
} as const;

// Border Radius Tokens
export const BORDER_RADIUS = {
  none: "0px",
  sm: "0.125rem",
  DEFAULT: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px"
} as const;

// Box Shadow Tokens
export const BOX_SHADOW = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  none: "none"
} as const;

// Animation Tokens
export const ANIMATION = {
  duration: {
    75: "75ms",
    100: "100ms",
    150: "150ms",
    200: "200ms",
    300: "300ms",
    500: "500ms",
    700: "700ms",
    1000: "1000ms"
  },
  timingFunction: {
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    "in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
  },
  keyframes: {
    "accordion-down": {
      from: { height: "0" },
      to: { height: "var(--radix-accordion-content-height)" }
    },
    "accordion-up": {
      from: { height: "var(--radix-accordion-content-height)" },
      to: { height: "0" }
    },
    "fade-in": {
      from: { opacity: "0" },
      to: { opacity: "1" }
    },
    "slide-in": {
      from: { transform: "translateY(100%)" },
      to: { transform: "translateY(0)" }
    }
  }
} as const;

// Breakpoint Tokens
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
} as const;

// Z-Index Tokens
export const Z_INDEX = {
  0: "0",
  10: "10",
  20: "20",
  30: "30",
  40: "40",
  50: "50",
  auto: "auto"
} as const;

// Component-specific tokens
export const COMPONENTS = {
  button: {
    variants: {
      default: {
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        borderRadius: "var(--radius)",
        padding: "0.5rem 1rem",
        fontSize: "0.875rem",
        fontWeight: "500",
        transition: "all 0.2s",
        hover: {
          backgroundColor: "hsl(var(--primary) / 0.9)"
        }
      },
      destructive: {
        backgroundColor: "hsl(var(--destructive))",
        color: "hsl(var(--destructive-foreground))",
        hover: {
          backgroundColor: "hsl(var(--destructive) / 0.9)"
        }
      },
      outline: {
        border: "1px solid hsl(var(--border))",
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        hover: {
          backgroundColor: "hsl(var(--accent))",
          color: "hsl(var(--accent-foreground))"
        }
      },
      secondary: {
        backgroundColor: "hsl(var(--secondary))",
        color: "hsl(var(--secondary-foreground))",
        hover: {
          backgroundColor: "hsl(var(--secondary) / 0.8)"
        }
      },
      ghost: {
        backgroundColor: "transparent",
        color: "hsl(var(--foreground))",
        hover: {
          backgroundColor: "hsl(var(--accent))",
          color: "hsl(var(--accent-foreground))"
        }
      },
      link: {
        color: "hsl(var(--primary))",
        textDecoration: "underline",
        textUnderlineOffset: "4px",
        hover: {
          textDecoration: "none"
        }
      }
    },
    sizes: {
      default: {
        height: "2.5rem",
        padding: "0.5rem 1rem",
        fontSize: "0.875rem"
      },
      sm: {
        height: "2.25rem",
        padding: "0.5rem 0.75rem",
        fontSize: "0.875rem",
        borderRadius: "0.375rem"
      },
      lg: {
        height: "2.75rem",
        padding: "0.5rem 2rem",
        fontSize: "1rem",
        borderRadius: "0.375rem"
      },
      icon: {
        height: "2.5rem",
        width: "2.5rem",
        padding: "0"
      }
    }
  },
  input: {
    base: {
      display: "flex",
      height: "2.5rem",
      width: "100%",
      borderRadius: "0.375rem",
      border: "1px solid hsl(var(--border))",
      backgroundColor: "hsl(var(--background))",
      padding: "0.5rem 0.75rem",
      fontSize: "0.875rem",
      transition: "all 0.2s",
      placeholder: {
        color: "hsl(var(--muted-foreground))"
      },
      focus: {
        outline: "2px solid hsl(var(--ring))",
        outlineOffset: "2px"
      },
      disabled: {
        cursor: "not-allowed",
        opacity: "0.5"
      }
    }
  },
  card: {
    base: {
      borderRadius: "0.5rem",
      border: "1px solid hsl(var(--border))",
      backgroundColor: "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
    },
    header: {
      padding: "1.5rem 1.5rem 0",
      display: "flex",
      flexDirection: "column",
      gap: "0.375rem"
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "600",
      lineHeight: "1",
      letterSpacing: "-0.025em"
    },
    description: {
      fontSize: "0.875rem",
      color: "hsl(var(--muted-foreground))"
    },
    content: {
      padding: "1.5rem"
    },
    footer: {
      padding: "0 1.5rem 1.5rem",
      display: "flex",
      alignItems: "center"
    }
  },
  dialog: {
    overlay: {
      position: "fixed",
      inset: "0",
      zIndex: "50",
      backgroundColor: "rgb(0 0 0 / 0.8)"
    },
    content: {
      position: "fixed",
      left: "50%",
      top: "50%",
      zIndex: "50",
      width: "100%",
      maxWidth: "32rem",
      transform: "translate(-50%, -50%)",
      gap: "1rem",
      border: "1px solid hsl(var(--border))",
      backgroundColor: "hsl(var(--background))",
      padding: "1.5rem",
      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      borderRadius: "0.5rem"
    }
  }
} as const;

// Utility functions for working with design tokens
export const getColor = (theme: 'light' | 'dark', color: keyof typeof COLORS.light) => {
  return COLORS[theme][color];
};

export const getSpacing = (size: keyof typeof SPACING) => {
  return SPACING[size];
};

export const getBorderRadius = (size: keyof typeof BORDER_RADIUS) => {
  return BORDER_RADIUS[size];
};

export const getBoxShadow = (size: keyof typeof BOX_SHADOW) => {
  return BOX_SHADOW[size];
};

export const getAnimationDuration = (duration: keyof typeof ANIMATION.duration) => {
  return ANIMATION.duration[duration];
};

export const getBreakpoint = (size: keyof typeof BREAKPOINTS) => {
  return BREAKPOINTS[size];
};

export const getZIndex = (level: keyof typeof Z_INDEX) => {
  return Z_INDEX[level];
};

// Type definitions for better TypeScript support
export type ColorToken = keyof typeof COLORS.light;
export type SpacingToken = keyof typeof SPACING;
export type BorderRadiusToken = keyof typeof BORDER_RADIUS;
export type BoxShadowToken = keyof typeof BOX_SHADOW;
export type AnimationDurationToken = keyof typeof ANIMATION.duration;
export type BreakpointToken = keyof typeof BREAKPOINTS;
export type ZIndexToken = keyof typeof Z_INDEX;
export type Theme = 'light' | 'dark';
