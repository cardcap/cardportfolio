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

1. Env gesetzt, neu deployen  
2. Neues Konto registrieren → Willkommensmail  
3. Login → „Passwort vergessen?“ → Link in Mail → neues Passwort  
