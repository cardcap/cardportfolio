export type LandingNavItem = {
  label: string;
  shortLabel?: string;
  href: string;
  description?: string;
};

export const landingNav: LandingNavItem[] = [
  {
    label: "Die Reise hat erst begonnen",
    shortLabel: "Die Reise",
    href: "/die-reise",
    description: "Roadmap & Vision",
  },
];

export const BRAND_NAME = "CardPortfolio";