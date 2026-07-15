/**
 * Demo-Modus: ohne Anmeldung erlaubt vs. nur eingeloggt.
 */
export const DEMO_ACCESS = {
  /** Seiten komplett ansehbar */
  pages: {
    dashboard: true,
    sammlung: true,
    portfolio: true,
    sets: true,
    kartendatenbank: true,
    wunschliste: true,
  },
  /** Aktionen im Demo erlaubt */
  actions: {
    browseCards: true,
    searchCards: true,
    filterCards: true,
    viewCardDetails: true,
    wishlistLocal: true,
    browseSets: true,
    viewMockPortfolio: true,
  },
  /** Nur mit Konto */
  requiresAuth: {
    addToCollection: true,
    editCollection: true,
    syncWishlist: true,
    saveFilters: false,
    portfolioTracking: true,
    exportData: true,
  },
} as const;

export type DemoGatedAction = keyof typeof DEMO_ACCESS.requiresAuth;