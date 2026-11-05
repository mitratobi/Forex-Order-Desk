# Forex Order Desk

A small full-stack app for buying foreign currency at fixed INR rates. A customer sees the rates, places a buy order with a live INR estimate, gets a confirmation with a reference ID, and sees the order appear in their history without a page reload.

- **Frontend:** React 18 + Vite, plain CSS (`client/`)
- **Backend:** Node.js 20+ + Express 5 (`server/`)
- **The server is the source of truth.** It validates every field, looks up the rate itself and calculates the INR total. The estimate shown in the browser is only a preview.

> The rates are fixed sample rates for this assessment, not live market rates. The UI says so.

## Setup and run

Requires Node.js 20 or newer.

```bash
# Terminal 1 - API on http://localhost:4000
cd server
npm install
npm start

# Terminal 2 - web app on http://localhost:5173
cd client
npm install
npm run dev
```

Open http://localhost:5173. In development Vite proxies `/api` to the Express server, so no CORS setup is needed.

Optional environment variables (copy `.env.example` to `.env` in each folder; nothing is required to run locally):

| App | Variable | Purpose |
| --- | --- | --- |
| server | `PORT` | API port (default 4000) |
| server | `CORS_ORIGIN` | Comma-separated frontend origins allowed in production |
| server | `DATA_FILE` | Where orders are saved (default `server/data/orders.json`) |
| client | `VITE_API_URL` | Backend URL in production (empty in dev) |

## Tests

```bash
cd server
npm test
```

Jest + Supertest, 35 tests in 3 files: `pricing.test.js` (money maths), `orders.test.js` (API and validation), `persistence.test.js` (saved orders and rate limit). They use an in-memory store, so they never touch `orders.json`.

## API

| Method and path | Success | Errors |
| --- | --- | --- |
| `GET /api/rates` | 200 `{ base, isSample, feePercent, rates: [{ currency, name, rate }] }` | |
| `POST /api/orders` | 201 order record (200 with the original order if the `Idempotency-Key` was already used) | 400 field errors, 413 body too large, 429 too many orders |
| `GET /api/orders` | 200 array, newest first. Optional `?currency=USD` filter | 400 unknown currency |
| `GET /api/health` | 200 `{ "status": "ok" }` | |

Unknown routes return a JSON 404. Malformed JSON returns 400, never an HTML error page.

**Request** (`POST /api/orders`; send an `Idempotency-Key` header, e.g. a UUID):

```json
{ "customerName": "Asha Rao", "currency": "USD", "amount": "250.50" }
```

**201 response:**

```json
{
  "id": "c3f0a1e2-…",
  "reference": "FX-20261101-0001",
  "customerName": "Asha Rao",
  "currency": "USD",
  "amount": 250.5,
  "rate": 83.2,
  "inrSubtotal": 20841.6,
  "feePercent": 1.5,
  "serviceFee": 312.62,
  "inrTotal": 21154.22,
  "createdAt": "2026-11-01T09:30:00.000Z"
}
```

**400 response:**

```json
{
  "error": "Please fix the highlighted fields.",
  "fields": { "amount": "The maximum per order is 5,000 USD. Please split larger amounts into separate orders." }
}
```

`rate` is a snapshot taken at order time, so a later rate change never alters an old order. Any `rate` or `total` the client sends is ignored.

### Validation rules

| Field | Rule |
| --- | --- |
| `customerName` | Required after trimming (whitespace-only is empty); 2-60 characters; letters, spaces, `.` `'` `-` only |
| `currency` | Required; case-insensitive; must be USD, EUR, GBP, AED or SGD |
| `amount` | Required; a number or numeric string matching `^\d+(\.\d{1,2})?$` (so no negatives, exponents or text); greater than 0; at most 5,000; at most 2 decimal places |

The server reports every invalid field at once. The browser runs the same rules for instant feedback, but the server's check is the one that counts.

### How the total is calculated

All money maths uses integers, never floating-point rupees:

```
subtotalPaise = round(amountCents × ratePaise / 100)
feePaise      = round(subtotalPaise × 15 / 1000)      // 1.5%
totalPaise    = subtotalPaise + feePaise
```

Worked example: 250.50 USD → 25,050 cents; ₹83.20 → 8,320 paise; 25,050 × 8,320 / 100 = 2,084,160 paise = ₹20,841.60. Fee = 31,262 paise = ₹312.62. Total = ₹21,154.22. Rounding is half-up. `server/src/services/pricing.js` and `client/src/utils/pricing.js` hold the same logic, so the preview and the confirmation agree.

The 1.5% service fee is shown in the form before the customer submits, and returned as its own `serviceFee` field.

## Duplicate-order protection

1. The submit button is disabled while an order is in flight (and a ref blocks a fast double-click).
2. The browser sends an `Idempotency-Key` header. The server remembers each key for 10 minutes; a repeat returns the original order with status 200 instead of creating a second one.
3. After a network failure the retry reuses the same key, so a request that actually succeeded is not doubled. A new key is generated only after a success.

## Frontend states

Loading (rates skeleton, history text), empty ("No orders yet…"), error with a Retry button (rates and history), validation errors under each field, and a server-down message ("We couldn't reach the server. Your order was not placed…"). Requests time out after 8 seconds. Whatever the customer typed is kept when an order fails.

## Storage choice

Orders are held in memory and mirrored to `server/data/orders.json` after every new order. The file is written to a temp file and then renamed, so a crash cannot leave a half-written file. If the file is unreadable it is renamed to `orders.json.corrupt-<time>` and the server starts empty rather than overwriting it. Idempotency keys are held in memory only.

I chose this over a database so the project runs with `npm install && npm start` and nothing else. The limits: a single server process only, no locking for concurrent writers, and not suitable for production.

## Data flow

Form state → client validation → `POST` JSON → server trims and validates → server looks up the rate and calculates paise totals → store (memory + file) → `201` → the UI renders the server's copy of the order and prepends it to history, then refetches history in the background. Incomplete submissions are blocked in the browser and rejected by the server.

## Basic security

- Server-side validation of every field; unknown fields are ignored.
- `helmet` security headers; JSON body limited to 10 KB.
- POST `/api/orders` rate-limited to 30 per minute per IP (`express-rate-limit`).
- CORS allowlist from `CORS_ORIGIN`; no origins are allowed if it is unset.
- No secrets in the code; only `.env.example` files are included.
- React escapes output, so a customer name cannot inject HTML.
- The error handler returns a generic message and never a stack trace.

## Going live

- **Frontend:** `npm run build` in `client/` produces a static `dist/` folder, deployable to Vercel or Netlify. Set `VITE_API_URL` to the backend URL at build time.
- **Backend:** `npm start` on Render, Railway or similar, with `PORT` from the host and `CORS_ORIGIN` set to the frontend's URL. Both hosts provide HTTPS. Use `/api/health` for uptime checks.
- **Database:** replace the JSON file with MongoDB Atlas or Postgres. Free hosts wipe local disk on redeploy, so the file would not survive. Behind a proxy, also set Express's `trust proxy` so the rate limit sees real client IPs.

## Assumptions and limitations

- Rates are fixed and held in code (`server/src/data/rates.js`); adding a currency is one line there.
- No login, KYC or payment; the customer name is stored on each order. In production a `customers` collection would hold the customer and orders would reference it by `customerId`.
- One currency per order; the maximum is 5,000 units of that currency.
- Half-up rounding to the paise.
- The reference (`FX-YYYYMMDD-NNNN`) uses the UTC date and is numbered per day from the saved orders, which is only safe with one server process.
- History is global, not per customer.
- Idempotency keys are lost when the server restarts.

## Tests performed

The Jest rows come from `npm test` (35 passing); the browser rows come from running the app end to end.

| Scenario | How | Result |
| --- | --- | --- |
| Valid order returns 201 with id, reference, createdAt, rate snapshot | Jest | Pass |
| 250.50 USD gives ₹20,841.60 + ₹312.62 fee = ₹21,154.22 | Jest | Pass |
| Client-sent rate/total ignored | Jest | Pass |
| Whitespace-only name, name with digits → 400 | Jest | Pass |
| Unsupported or missing currency → 400 | Jest | Pass |
| Missing, `12abc`, `1e3`, array amount → 400 | Jest | Pass |
| Zero, negative, 5,000.01, 3 decimals → 400 | Jest | Pass |
| 5,000 accepted (boundary) | Jest | Pass |
| Several invalid fields reported together | Jest | Pass |
| Malformed JSON → 400 | Jest | Pass |
| Invalid orders are never stored | Jest | Pass |
| Repeated `Idempotency-Key` → original order, no duplicate | Jest | Pass |
| Orders newest first; `?currency=` filter; unknown currency → 400 | Jest | Pass |
| Orders and reference numbering survive a restart | Jest, and a real server restart | Pass |
| Corrupt orders file set aside | Jest | Pass |
| Rate limit returns 429 after 30 POSTs; reads unaffected | Jest | Pass |
| Health check and JSON 404 | Jest | Pass |
| Full journey in the browser (rates → order → confirmation → history, no reload) | Browser run | Pass |
| Inline validation messages; submit stays disabled while invalid | Browser run | Pass |
| Live estimate matches the server total; fee shown before submit | Browser run | Pass |
| Double-click submit sends one request and creates one order | Browser run | Pass |
| Stop the server mid-flow: message shown, input kept, retry reuses the key and creates one order | Browser run | Pass |
| Server down on page load: error banners on rates and history; Retry recovers | Browser run | Pass |
| Layout at 375, 768, 1280 px with no horizontal scroll; history is cards on mobile | Browser run | Pass |
| Keyboard-only order (Tab through the fields, Enter to submit); focus moves to the confirmation | Browser run | Pass |

## AI tools used

- An **AI coding assistant** wrote most of the code: the Express server and error handling, the Jest tests, the React client, and this README. It also set up the dependencies and ran the browser checks.
- Libraries: Express, cors, helmet, express-rate-limit (server); Jest and Supertest (tests); React, React DOM and Vite (client).

## Screenshots

In `screenshots/` (desktop 1280px unless noted):

| File | Shows |
| --- | --- |
| `01-rates-and-form.png` | Rates and the order form with the live estimate |
| `02-validation-error.png` | Inline validation errors |
| `03-confirmation.png` | Order confirmation |
| `04-history.png` | Order history |
| `05-server-down.png` | Server-down message with the customer's input kept |
| `06-mobile.png` | Mobile view at 375px |
