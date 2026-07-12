# Night Porter — AI front desk for hotels

single-file static site (`index.html`) — no build step, no dependencies.
the hotel end-to-end consulting pitch (website concierge / phone agent / check-in kiosk +
RFID / lock install), by Jace AI Solutions. bright + modern style.

deployed on Render as a static site (publish path `.`), auto-deploys on push to main.

## the whatsapp number

set in the CONFIG block at the top of the `<script>` at the bottom of `index.html`:

```js
const WHATSAPP_NUMBER = "917973744625";
```

international format, digits only — country code + number, no `+`, no spaces. it powers
every green button, the floating bubble, and the contact form (which opens WhatsApp with
the visitor's answers pre-filled — no backend, nothing stored).

## content honesty notes

- the hero call demo is labeled **"Illustrative conversation"** — it is a scripted example.
- the proof band's "already runs at a live hotel today" refers to the real production voice
  concierge we built (client intentionally unnamed on the page).
- no invented metrics, logos, or testimonials.
