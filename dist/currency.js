let selectedCurrency = 'USD';
let savedDividendAmount = 10000;
try {
  const settings = JSON.parse(localStorage.getItem('etf-lens-currency'));
  if (['CAD', 'USD'].includes(settings?.currency)) selectedCurrency = settings.currency;
  if (Number.isFinite(settings?.amount) && settings.amount >= 0 && settings.amount <= 100000000) savedDividendAmount = settings.amount;
} catch {}
function currencyFormat(value, decimals=0) {
  return new Intl.NumberFormat('en-CA', {style:'currency', currency:selectedCurrency, currencyDisplay:'code', minimumFractionDigits:decimals, maximumFractionDigits:decimals}).format(value);
}
function dividendAmountValid() {
  const input = document.getElementById('dividendAmount');
  return input.value !== '' && input.checkValidity();
}
function saveCurrencySettings() {
  try { localStorage.setItem('etf-lens-currency', JSON.stringify({currency:selectedCurrency, amount:Number(document.getElementById('dividendAmount').value)})); } catch {}
}
function initializeCurrency() {
  const selector = document.getElementById('currency');
  const amount = document.getElementById('dividendAmount');
  selector.value = selectedCurrency;
  amount.value = savedDividendAmount;
  const labels = () => document.querySelectorAll('[data-currency]').forEach(node => node.textContent=selectedCurrency);
  selector.onchange = () => {
    selectedCurrency = selector.value;
    saveCurrencySettings(); labels(); plot();
  };
  amount.oninput = () => {
    document.getElementById('dividendAmountError').textContent = dividendAmountValid() ? '' : 'Enter an amount from 0 to 100,000,000.';
    if (dividendAmountValid()) saveCurrencySettings();
    updateDividendEstimates();
  };
  labels(); updateDividendEstimates();
}
