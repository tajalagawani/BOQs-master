/**
 * White-Label Branding Configuration
 *
 * This module centralizes all branding configuration loaded from environment variables.
 * All client-facing values should be accessed through this config.
 *
 * Environment variables must be prefixed with NEXT_PUBLIC_ to be available client-side.
 */

export interface BrandingColors {
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  accent: string;
  accentHover: string;
  accentPressed: string;
  tintLight: string;
  tintLighter: string;
  darkBgPrimary: string;
  darkBgSecondary: string;
  darkBgCard: string;
  headerBg: string;
  textOnPrimary: string;
  textOnDark: string;
}

export interface BrandingLogos {
  primary: string;
  white: string;
  svg: string;
  hero: string;
  favicon: string;
}

export interface BrandingFeatures {
  showFooterLinks: boolean;
  showDemoCredentials: boolean;
  enableDarkMode: boolean;
  showAboutPage: boolean;
  showContactPage: boolean;
}

export interface BrandingConfig {
  // Company Identity
  clientName: string;
  clientFullName: string;
  tagline: string;
  slogan: string;
  footerText: string;
  copyrightYear: string;

  // Contact Information
  email: string;
  adminEmail: string;
  supportUrl: string;
  website: string;

  // Social Links
  socialLinkedin: string;
  socialTwitter: string;
  socialInstagram: string;

  // Logos
  logos: BrandingLogos;

  // Colors
  colors: BrandingColors;

  // Site Metadata
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;

  // Open Graph
  ogImage: string;
  ogSiteName: string;

  // Features
  features: BrandingFeatures;
}

/**
 * Generate color variants from a primary color
 * Creates darker shades and lighter tints
 */
function generateColorVariants(primaryColor: string): Partial<BrandingColors> {
  // If we have a hex color, generate variants
  if (primaryColor.startsWith('#') && primaryColor.length === 7) {
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);

    // Darken by reducing values
    const darken = (value: number, amount: number) => Math.max(0, Math.floor(value * (1 - amount)));
    // Lighten by mixing with white
    const lighten = (value: number, amount: number) => Math.floor(value + (255 - value) * amount);

    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return {
      primaryDark: `#${toHex(darken(r, 0.25))}${toHex(darken(g, 0.25))}${toHex(darken(b, 0.25))}`,
      primaryDarker: `#${toHex(darken(r, 0.4))}${toHex(darken(g, 0.4))}${toHex(darken(b, 0.4))}`,
      accent: `#${toHex(lighten(r, 0.2))}${toHex(lighten(g, 0.2))}${toHex(lighten(b, 0.2))}`,
      accentHover: `#${toHex(lighten(r, 0.3))}${toHex(lighten(g, 0.3))}${toHex(lighten(b, 0.3))}`,
      accentPressed: `#${toHex(lighten(r, 0.1))}${toHex(lighten(g, 0.1))}${toHex(lighten(b, 0.1))}`,
      tintLight: `#${toHex(lighten(r, 0.9))}${toHex(lighten(g, 0.9))}${toHex(lighten(b, 0.9))}`,
      tintLighter: `#${toHex(lighten(r, 0.95))}${toHex(lighten(g, 0.95))}${toHex(lighten(b, 0.95))}`,
    };
  }
  return {};
}

/**
 * Main branding configuration object
 * All values are loaded from environment variables with sensible defaults
 */
export const branding: BrandingConfig = {
  // Company Identity
  clientName: process.env.NEXT_PUBLIC_CLIENT_NAME || 'ROSHN',
  clientFullName: process.env.NEXT_PUBLIC_CLIENT_FULL_NAME || 'ROSHN Real Estate',
  tagline: process.env.NEXT_PUBLIC_CLIENT_TAGLINE || 'The National Champion of Destination Real Estate',
  slogan: process.env.NEXT_PUBLIC_CLIENT_SLOGAN || 'Building the Difference',
  footerText: process.env.NEXT_PUBLIC_CLIENT_FOOTER_TEXT || 'Shaping Immersive Places, Elevating People, Inspiring Life',
  copyrightYear: process.env.NEXT_PUBLIC_COPYRIGHT_YEAR || new Date().getFullYear().toString(),

  // Contact Information
  email: process.env.NEXT_PUBLIC_CLIENT_EMAIL || 'info@company.com',
  adminEmail: process.env.NEXT_PUBLIC_CLIENT_ADMIN_EMAIL || 'admin@company.com',
  supportUrl: process.env.NEXT_PUBLIC_CLIENT_SUPPORT_URL || '',
  website: process.env.NEXT_PUBLIC_CLIENT_WEBSITE || '',

  // Social Links
  socialLinkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '',
  socialTwitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || '',
  socialInstagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || '',

  // Logos
  logos: {
    primary: process.env.NEXT_PUBLIC_LOGO_PRIMARY || '/roshnlogo.png',
    white: process.env.NEXT_PUBLIC_LOGO_WHITE || process.env.NEXT_PUBLIC_LOGO_PRIMARY || '/roshn-logo-white.png',
    svg: process.env.NEXT_PUBLIC_LOGO_SVG || '/roshan-logo-rebrand (2).svg',
    hero: process.env.NEXT_PUBLIC_LOGO_HERO || '/ebd82c74b08cb807c307315da9d9bd5f_82c0926829.webp',
    favicon: process.env.NEXT_PUBLIC_FAVICON_URL || process.env.NEXT_PUBLIC_LOGO_PRIMARY || '/roshnlogo.png',
  },

  // Colors - with auto-generation of variants from primary
  colors: {
    primary: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#006B5E',
    primaryDark: process.env.NEXT_PUBLIC_PRIMARY_COLOR_DARK || generateColorVariants(process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#006B5E').primaryDark || '#004D40',
    primaryDarker: process.env.NEXT_PUBLIC_PRIMARY_COLOR_DARKER || generateColorVariants(process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#006B5E').primaryDarker || '#003D33',
    accent: process.env.NEXT_PUBLIC_ACCENT_COLOR || '#00A693',
    accentHover: process.env.NEXT_PUBLIC_ACCENT_COLOR_HOVER || '#00a88e',
    accentPressed: process.env.NEXT_PUBLIC_ACCENT_COLOR_PRESSED || '#00917a',
    tintLight: process.env.NEXT_PUBLIC_TINT_LIGHT || '#E6F2F0',
    tintLighter: process.env.NEXT_PUBLIC_TINT_LIGHTER || '#F0F7F6',
    darkBgPrimary: process.env.NEXT_PUBLIC_DARK_BG_PRIMARY || '#02231f',
    darkBgSecondary: process.env.NEXT_PUBLIC_DARK_BG_SECONDARY || '#253836',
    darkBgCard: process.env.NEXT_PUBLIC_DARK_BG_CARD || '#1a2e2c',
    headerBg: process.env.NEXT_PUBLIC_HEADER_BG_COLOR || process.env.NEXT_PUBLIC_DARK_BG_PRIMARY || '#02231f',
    textOnPrimary: process.env.NEXT_PUBLIC_TEXT_ON_PRIMARY || '#ffffff',
    textOnDark: process.env.NEXT_PUBLIC_TEXT_ON_DARK || '#ffffff',
  },

  // Site Metadata
  siteTitle: process.env.NEXT_PUBLIC_SITE_TITLE || 'ROSHN - Parametric Cost Model Platform',
  siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Advanced masterplan analytics and parametric cost modeling platform for real estate development',
  siteKeywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS || 'parametric,cost model,real estate,masterplan,analytics',

  // Open Graph
  ogImage: process.env.NEXT_PUBLIC_OG_IMAGE || '/og-image.png',
  ogSiteName: process.env.NEXT_PUBLIC_OG_SITE_NAME || process.env.NEXT_PUBLIC_CLIENT_NAME || 'ROSHN Platform',

  // Features
  features: {
    showFooterLinks: process.env.NEXT_PUBLIC_SHOW_FOOTER_LINKS !== 'false',
    showDemoCredentials: process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true',
    enableDarkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE !== 'false',
    showAboutPage: process.env.NEXT_PUBLIC_SHOW_ABOUT_PAGE !== 'false',
    showContactPage: process.env.NEXT_PUBLIC_SHOW_CONTACT_PAGE !== 'false',
  },
};

/**
 * Helper function to get CSS variables string for injection
 */
export function getBrandingCSSVariables(): string {
  const { colors } = branding;
  return `
    --brand-primary: ${colors.primary};
    --brand-primary-dark: ${colors.primaryDark};
    --brand-primary-darker: ${colors.primaryDarker};
    --brand-accent: ${colors.accent};
    --brand-accent-hover: ${colors.accentHover};
    --brand-accent-pressed: ${colors.accentPressed};
    --brand-tint-light: ${colors.tintLight};
    --brand-tint-lighter: ${colors.tintLighter};
    --brand-dark-bg: ${colors.darkBgPrimary};
    --brand-dark-bg-secondary: ${colors.darkBgSecondary};
    --brand-dark-card: ${colors.darkBgCard};
    --brand-header-bg: ${colors.headerBg};
    --brand-text-on-primary: ${colors.textOnPrimary};
    --brand-text-on-dark: ${colors.textOnDark};
    --roshn-primary: ${colors.primary};
    --roshn-primary-dark: ${colors.primaryDark};
    --roshn-primary-darker: ${colors.primaryDarker};
    --roshn-accent: ${colors.accent};
    --roshn-light: ${colors.tintLight};
    --roshn-lighter: ${colors.tintLighter};
    --text-brand: ${colors.primary};
    --text-brand-dark: ${colors.primaryDark};
    --background-dark: ${colors.darkBgPrimary};
  `;
}

/**
 * Server-side metadata generation helper
 */
export function getBrandingMetadata() {
  return {
    title: branding.siteTitle,
    description: branding.siteDescription,
    keywords: branding.siteKeywords,
    icons: {
      icon: branding.logos.favicon,
      apple: branding.logos.favicon,
    },
    openGraph: {
      title: branding.siteTitle,
      description: branding.siteDescription,
      siteName: branding.ogSiteName,
      images: [branding.ogImage],
    },
  };
}

export default branding;
