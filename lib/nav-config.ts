export type NavItem = {
  label: string;
  href: string;
  icon: string;
  shortLabel?: string;
};

export type NavGroup = {
  type: "group";
  label: string;
  icon: string;
  /** Prefix used to auto-expand when path matches */
  matchPrefix: string;
  children: NavItem[];
};

export type NavEntry = ({ type?: "item" } & NavItem) | NavGroup;

export const mainNav: NavEntry[] = [
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  {
    type: "group",
    label: "Assets",
    icon: "assets",
    matchPrefix: "/assets",
    children: [
      { label: "Karten", href: "/assets/karten", icon: "cards", shortLabel: "Karten" },
      { label: "Sealed", href: "/assets/sealed", icon: "box", shortLabel: "Sealed" },
    ],
  },
  {
    type: "group",
    label: "Portfolio",
    icon: "chart",
    matchPrefix: "/portfolio",
    children: [
      {
        label: "Übersicht",
        href: "/portfolio",
        icon: "chart",
        shortLabel: "Übersicht",
      },
      {
        label: "Transaktionen",
        href: "/portfolio/transaktionen",
        icon: "list",
        shortLabel: "Tx",
      },
    ],
  },
  { label: "Sets", href: "/sets", icon: "folder" },
  {
    label: "Datenbank",
    href: "/kartendatenbank",
    icon: "database",
    shortLabel: "DB",
  },
  { label: "Wunschliste", href: "/wunschliste", icon: "heart" },
];

/** Flat list of leaf links (for mobile drawer / active checks) */
export function flattenNav(entries: NavEntry[] = mainNav): NavItem[] {
  const items: NavItem[] = [];
  for (const entry of entries) {
    if (entry.type === "group") {
      items.push(...entry.children);
    } else {
      items.push(entry);
    }
  }
  return items;
}

export const mobileBottomNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "grid", shortLabel: "Home" },
  { label: "Karten", href: "/assets/karten", icon: "cards", shortLabel: "Karten" },
  { label: "Sealed", href: "/assets/sealed", icon: "box", shortLabel: "Sealed" },
  { label: "Sets", href: "/sets", icon: "folder", shortLabel: "Sets" },
];
