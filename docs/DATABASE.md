# CardCap – Datenbank-Anbindung

## Architektur (kurz)

| Daten | Speicher | Hinweis |
|-------|----------|---------|
| **Katalog** (Karten, Sets, Preise) | TCGdex-Cache unter `data/` | Global, nicht pro User |
| **User / Auth** | PostgreSQL (Prisma) | Login, Sessions |
| **Besitz** | PostgreSQL | Collection, Sealed, Wishlist |

Katalog und User-Besitz bleiben getrennt: User speichern `tcgCardId` + Besitz-Felder, Anzeige reichert aus dem Cache an.

## Phase 1 – Fundament (aktuell)

1. PostgreSQL starten (lokal Docker oder managed in Production)
2. Schema migrieren
3. Auth + Collection gegen echte DB
4. Health-Check: `GET /api/health`

## Lokal starten

```bash
# 1. Postgres
docker compose -f docker-compose.db.yml up -d

# 2. .env (falls noch SQLite)
# DATABASE_URL="postgresql://cardcap:cardcap@localhost:5432/cardcap"
# AUTH_SECRET="…"  # openssl rand -base64 32

# 3. Schema + Admin
npm run db:migrate
npm run db:status

# 4. App
npm run dev
```

Admin-User (wenn `SITE_GATE_PASSWORD` gesetzt): `admin@cardcap.de`  
Passwort = `SITE_GATE_PASSWORD`.

## Production (Vercel)

1. Managed Postgres anlegen (Neon / Supabase / …)
2. In Vercel Project → Settings → Environment Variables:
   - `DATABASE_URL` = Postgres-URL (mit `?sslmode=require` falls nötig)
   - `AUTH_SECRET` = starker Secret
3. Deploy: `db-prepare` führt `prisma migrate deploy` aus und legt den Admin an
4. Prüfen: `https://<domain>/api/health` → `"database": { "status": "ok" }`

## Nützliche Commands

| Command | Zweck |
|---------|--------|
| `npm run db:migrate` | Migrationen anwenden (`migrate dev` lokal) |
| `npm run db:push` | Schema ohne Migration pushen (Prototyp) |
| `npm run db:status` | Verbindung + Counts |
| `npm run db:studio` | Prisma Studio UI |
| `GET /api/health` | JSON Health inkl. DB |

## Nächste Phasen

2. **Sammlung** nur noch über DB wenn eingeloggt (localStorage nur Demo)
3. **SealedItem** API + UI an DB
4. **Sealed öffnen** als DB-Transaktion (Karten anlegen, Sealed entfernen)
5. **Import** localStorage → Account beim ersten Login

## Schema-Überblick

- `User`, `Account`, `Session` – Auth
- `CollectionItem` – Kartenbesitz (+ optional `exemplars` JSON, `origin`)
- `SealedItem` – Sealed-Inventar
- `WishlistItem` – Wunschliste
