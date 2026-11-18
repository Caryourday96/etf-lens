# ETF Lens

Adeticket fund comparison tool: ETFs and split-share funds, CAD/USD investment scenarios, actual trailing distribution income, fee projections and CSV export.

Canonical URL: https://etf.adeticket.com

Hosting: Azure App Service (`adeticket-etf-lens`) on the existing `adeticket` Linux plan in Canada Central. The production site is public and requires no login. Azure DNS hosts adeticket.com. The original private Sites deployment is retained as a fallback; it is not the canonical production host.

## Data

- Alpha Vantage: CAD/USD fund search and supported ETF expense ratios. Free key required for those operations; stored only as the production secret `ALPHA_VANTAGE_API_KEY`.
- Yahoo Finance public chart feed: latest available prices and actual trailing distribution records, including Canadian ETFs and split-share funds. This is an unofficial endpoint and can become unavailable or change. Alpha Vantage price/distribution history is a fallback. Display timestamps and source links are included.
- No sample dividend yields or user-entered yield overrides. Missing distribution data remains unavailable. Reported records can be split-adjusted and are not a guarantee of future payouts.
- Provider responses are cached in persistent SQLite under `/home/data/etf-lens/` for 24 hours, search results seven days. Alpha Vantage requests are paced and the app caps itself at 23 requests per UTC day. API usage elsewhere also counts against the provider's free allowance.
- `.TO` user tickers map to Alpha Vantage `.TRT` identifiers. XEQT, VEQT and FFN are also discoverable locally. Other provider-supported ETFs and split-share names are searchable. Coverage is not universal.
- Missing fund expense ratios can be entered as explicit user assumptions. Growth projections remain disabled until selected funds have known or explicitly entered fees. Dividend income is independent of that requirement.

## Calculation

Estimated annual income = investment amount × trailing 12-month distributions per current share ÷ latest available share price. This assumes fractional shares and repeating historical distributions. Monthly income is an annual average, not a payment calendar. Split-share distributions can be conditional or suspended. Class A and preferred shares have different rights.

CAD/USD switching re-denominates the numeric inputs; it is not FX conversion. A cross-currency scenario assumes an unchanged exchange rate and excludes conversion costs and withholding. Actual per-share distributions are labeled in the fund's trading currency.

Growth compounds monthly at `(1 + gross annual total return − annual fee)^(1/12) − 1`, with month-end contributions. Total return includes reinvested distributions. Do not add income estimates to projected balances. Taxes, spreads, inflation and tracking differences are excluded.

## Development and validation

Node 24+ required for Azure. The production Node server has no external runtime dependencies: run `node server.mjs` (default port 4318). Set `ALPHA_VANTAGE_API_KEY` in the server environment for market search and US ETF expense ratios. `ETF_DATABASE_PATH` can override the local SQLite cache path. The source HTML is `ui/index.html`; browser scripts/assets are in `public/`; API behavior is in `lib/api-market.mjs` and data adapters.

`node prepare-azure.mjs` packages the runtime into `outputs/azure/`. Zip that directory's contents, deploy to the Azure app, and use startup command `node server.mjs`. Configure secrets through Azure App Service settings; never include them in the ZIP. Built-in Azure authentication is disabled. The Sites/Vinext source is retained for fallback development; its route is synchronized into the Node API by the packaging helper. Do not change the original Site's audience or identity merely to develop the Azure version.

```
node check-dividends.cjs
node test-market.mjs
node node_modules/typescript/bin/tsc --noEmit
node --check server.mjs
node prepare-azure.mjs
```

D1 migrations under `drizzle/` apply only to the retained Sites fallback. The Azure server initializes equivalent SQLite cache tables at startup. Never commit API keys or local environment files. `.env.example` names the required secret without a value.

The compatibility date matches the installed Workerd runtime (2026-05-22); update it when upgrading that runtime.
