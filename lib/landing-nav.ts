export type LandingNavItem = {
  label: string;
  shortLabel?: string;
  href: string;
  description?: string;
};

export const landingNav: LandingNavItem[] = [
  {
    label: "Funktionen",
    href: "#funktionen",
  },
  {
    label: "Preise",
    href: "#preise",
  },
  {
    label: "Roadmap",
    shortLabel: "Roadmap",
    href: "/die-reise",
    description: "Roadmap & Vision",
  },
];

export const BRAND_NAME = "CardCap";
