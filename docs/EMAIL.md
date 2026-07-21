# CardCap – E-Mail (IONOS)

## Zweck

| Ereignis | Mail |
|----------|------|
| Registrierung | Willkommen + Login-Link (kein Klartext-Passwort) |
| Passwort vergessen | Link zum Zurücksetzen (1 h gültig) |
| Passwort geändert | Sicherheits-Hinweis |

## IONOS SMTP (info@cardcap.de)

In Vercel → Project → Environment Variables (Production + Preview):

| Variable | Beispiel |
|----------|----------|
| `SMTP_HOST` | `smtp.ionos.de` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `info@cardcap.de` |
| `SMTP_PASS` | *Postfach-Passwort von IONOS* |
| `EMAIL_FROM` | `CardCap <info@cardcap.de>` |
| `AUTH_URL` | `https://cardcap.de` |

Optional: `SMTP_SECURE=true` und Port `465` statt 587.

## Sicherheit

- Passwörter werden **nie** per E-Mail im Klartext verschickt.
- Reset-Tokens sind gehasht in `VerificationToken` gespeichert.
- Forgot-Password verrät nicht, ob die E-Mail existiert.

## Test

1. Env gesetzt, **neu deployen** (Env greift erst nach Redeploy)  
2. `GET /api/health` → `email.configured: true`, `passLength` > 0  
3. Als Admin: `GET /api/admin/email-test` (SMTP-Handshake)  
4. Neues Konto registrieren → Willkommensmail  
5. Login → „Passwort vergessen?“ → Link in Mail → neues Passwort  

### Häufiger Fehler: `535 Authentication credentials invalid`

IONOS lehnt Login ab. Prüfen:

- `SMTP_USER` = **volle** Adresse, z. B. `info@cardcap.de` (nicht nur `info`)
- `SMTP_PASS` = **Postfach-Passwort** aus IONOS E-Mail (nicht Kundenpasswort / nicht Domain-Passwort)
- In IONOS: E-Mail → Postfach `info@cardcap.de` → Passwort setzen/zurücksetzen → exakt so in Vercel `SMTP_PASS`
- Sonderzeichen im Passwort ok; **keine** Anführungszeichen um den Wert in Vercel
- Nach Änderung an Env: **Redeploy** Production  

Optional Port `465` + `SMTP_SECURE=true` statt `587`.  

