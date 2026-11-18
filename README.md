# ETF Lens

Adeticket fund comparison tool: ETFs and split-share funds, CAD/USD investment scenarios, actual trailing distribution income, fee projections and CSV export.

Canonical URL: https://etf.adeticket.com

Hosting: OpenAI Sites on Cloudflare Workers with D1. Azure DNS hosts the adeticket.com zone; Azure does not host this application. The site is owner-private and requires sign-in. The GitHub repository is a source mirror, not a separate deployment service.

## Data

- Alpha Vantage: CAD/USD fund search and supported ETF expense ratios. Free key required for those operations; stored only as the production secret `ALPHA_VANTAGE_API_KEY`.
- Yahoo Finance public chart feed: latest available prices and actual trailing distribution records, including Canadian ETFs and split-share funds. This is an unofficial endpoint and can become unavailable or change. Alpha Vantage price/distribution history is a fallback. Display timestamps and source links are included.
- No sample dividend yields or user-entered yield overrides. Missing distribution data remains unavailable. Reported records can be split-adjusted and are not a guarantee of future payouts.
- Provider responses are cached in D1 for 24 hours, search results seven days. Alpha Vantage requests are paced and the app caps itself at 23 requests per UTC day. API usage elsewhere also counts against the provider's free allowance.
- `.TO` user tickers map to Alpha Vantage `.TRT` identifiers. XEQT, VEQT and FFN are also discoverable locally. Other provider-supported ETFs and split-share names are searchable. Coverage is not universal.
- Missing fund expense ratios can be entered as explicit user assumptions. Growth projections remain disabled until selected funds have known or explicitly entered fees. Dividend income is independent of that requirement.

## Calculation

Estimated annual income = investment amount × trailing 12-month distributions per current share ÷ latest available share price. This assumes fractional shares and repeating historical distributions. Monthly income is an annual average, not a payment calendar. Split-share distributions can be conditional or suspended. Class A and preferred shares have different rights.

CAD/USD switching re-denominates the numeric inputs; it is not FX conversion. A cross-currency scenario assumes an unchanged exchange rate and excludes conversion costs and withholding. Actual per-share distributions are labeled in the fund's trading currency.

Growth compounds monthly at `(1 + gross annual total return − annual fee)^(1/12) − 1`, with month-end contributions. Total return includes reinvested distributions. Do not add income estimates to projected balances. Taxes, spreads, inflation and tracking differences are excluded.

## Development and validation

Node 22.13+ required. Run `npm ci`, then `npm run dev`. The source HTML is `ui/index.html`; browser scripts/assets are in `public/`; server routes are in `app/api/market/`. Preserve the Sites Vite integration and the source identity in `.openai/hosting.json`.

```
node check-dividends.cjs
node test-market.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

D1 migrations are under `drizzle/`. Sites applies them during publication. Local schema instructions are in the bundled starter documentation and project scripts. Never commit API keys or local environment files. `.env.example` names the required secret without a value.

The compatibility date matches the installed Workerd runtime (2026-05-22); update it when upgrading that runtime.
