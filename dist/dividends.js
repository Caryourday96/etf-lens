// These are explicitly illustrative assumptions, not reported fund yields.
const dividendYields = {};
try {
  const storedYields = JSON.parse(localStorage.getItem('etf-lens-dividends'));
  for (const [ticker, value] of Object.entries(storedYields || {})) {
    if (Number.isFinite(value) && value >= 0 && value <= 30) dividendYields[ticker] = value;
  }
} catch {}
const incomeMoney = value => currencyFormat(value, 2);
function dividendEstimate(balance, yieldPercent) { return balance * yieldPercent / 100; }
function yieldFor(ticker) { return dividendYields[ticker] ?? 2; }
function renderDividends() {
  const container = document.getElementById('dividendCards');
  container.innerHTML = current().map((fund, i) => `<article class="dividend-card" style="--color:${colors[i]}"><h3>${fund.ticker}</h3><label for="yield-${fund.ticker}">Assumed annual dividend yield (%)</label><input id="yield-${fund.ticker}" data-yield="${fund.ticker}" type="number" min="0" max="30" step="0.01" value="${yieldFor(fund.ticker)}"><p class="yield-error" id="yield-error-${fund.ticker}" role="alert"></p><dl><div><dt>Annual income on your investment</dt><dd id="annual-${fund.ticker}"></dd></div><div><dt>Monthly equivalent</dt><dd id="monthly-${fund.ticker}"></dd></div><div><dt>Annual income at horizon balance</dt><dd id="future-${fund.ticker}"></dd></div></dl><a href="${fund.url}" target="_blank" rel="noopener">Check issuer yield & distributions</a></article>`).join('');
  container.oninput = event => {
    const input = event.target;
    if (!input.dataset.yield) return;
    const ticker = input.dataset.yield;
    if (input.value === '' || !input.checkValidity()) {
      document.getElementById('yield-error-'+ticker).textContent = 'Enter a yield from 0% to 30%.';
      for (const kind of ['annual','monthly','future']) document.getElementById(kind+'-'+ticker).textContent = '—';
      return;
    }
    document.getElementById('yield-error-'+ticker).textContent = '';
    dividendYields[ticker] = Number(input.value);
    try { localStorage.setItem('etf-lens-dividends', JSON.stringify(dividendYields)); } catch {}
    updateDividendEstimates();
  };
  updateDividendEstimates();
}
function dividendInputsValid() {
  return current().every(f => {
    const input = document.getElementById('yield-'+f.ticker);
    return input && input.value !== '' && input.checkValidity();
  });
}
function updateDividendEstimates() {
  const s = scenario();
  for (const fund of current()) {
    const input = document.getElementById('yield-'+fund.ticker);
    if (!input) continue;
    const ok = valid() && input.value !== '' && input.checkValidity();
    const annual = dividendEstimate(Number(document.getElementById('dividendAmount').value), yieldFor(fund.ticker));
    const future = dividendEstimate(balances(s, fund.fee).at(-1), yieldFor(fund.ticker));
    document.getElementById('annual-'+fund.ticker).textContent = input.value !== '' && input.checkValidity() && dividendAmountValid() ? incomeMoney(annual) : '—';
    document.getElementById('monthly-'+fund.ticker).textContent = input.value !== '' && input.checkValidity() && dividendAmountValid() ? incomeMoney(annual / 12) : '—';
    document.getElementById('future-'+fund.ticker).textContent = ok ? incomeMoney(future) : '—';
  }
}
