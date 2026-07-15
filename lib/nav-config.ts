export type NavItem = {
  label: string;
  href: string;
  icon: string;
  shortLabel?: string;
};

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  { label: "Sammlung", href: "/sammlung", icon: "cards", shortLabel: "Sammlung" },
  { label: "Portfolio", href: "/portfolio", icon: "chart" },
  { label: "Sets", href: "/sets", icon: "folder" },
  {
    label: "Kartendatenbank",
    href: "/kartendatenbank",
    icon: "database",
    shortLabel: "Karten",
  },
  { label: "Wunschliste", href: "/wunschliste", icon: "heart" },
];

export const mobileBottomNav: NavItem[] = [
  mainNav[0],
  mainNav[1],
  mainNav[4],
  mainNav[3],
];