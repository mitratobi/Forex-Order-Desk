import { useRef, useState } from 'react';
import { validateName, validateCurrency, validateAmount } from '../utils/validate.js';
import { amountToCents, rateToPaise, calculateTotals, paiseToRupees } from '../utils/pricing.js';
import { formatInr, formatUnits } from '../utils/format.js';

const EMPTY = { customerName: '', currency: '', amount: '' };

function getErrors(values) {
  return {
    customerName: validateName(values.customerName),
    currency: validateCurrency(values.currency),
    amount: validateAmount(values.amount, values.currency),
  };
}

// Preview only: the server recalculates and its numbers are what the customer is charged.
function getEstimate(values, rates, feePercent) {
  const rate = rates.find((r) => r.currency === values.currency)?.rate;
  if (!rate || validateAmount(values.amount, values.currency)) return null;
  const totals = calculateTotals(amountToCents(values.amount.trim()), rateToPaise(rate), feePercent);
  return {
    rate,
    subtotal: paiseToRupees(totals.subtotalPaise),
    fee: paiseToRupees(totals.feePaise),
    total: paiseToRupees(totals.totalPaise),
  };
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      <p id={`${id}-error`} className="field-error" aria-live="polite">{error}</p>
    </div>
  );
}

export default function OrderForm({ ratesState, onPlaceOrder, nameInputRef }) {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  // One key per attempt; kept on failure so a retry cannot double-book, renewed on success.
  const keyRef = useRef(crypto.randomUUID());
  // State updates are async, so a fast double-click could slip past `submitting`; a ref cannot.
  const inFlightRef = useRef(false);

  const rates = ratesState.status === 'ready' ? ratesState.data.rates : [];
  const feePercent = ratesState.status === 'ready' ? ratesState.data.feePercent : 0;
  const errors = getErrors(values);
  const isValid = !errors.customerName && !errors.currency && !errors.amount;
  const estimate = getEstimate(values, rates, feePercent);

  const shownError = (field) => (touched[field] && errors[field]) || serverErrors[field] || '';

  function change(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: '' }));
  }

  const blur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  async function submit(event) {
    event.preventDefault();
    if (!isValid || inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    setFormError('');
    try {
      await onPlaceOrder(
        { customerName: values.customerName.trim(), currency: values.currency, amount: values.amount.trim() },
        keyRef.current,
      );
      setValues(EMPTY);
      setTouched({});
      keyRef.current = crypto.randomUUID();
    } catch (err) {
      if (err.status === 400) setServerErrors(err.fields || {});
      setFormError(err.status === 0 ? "We couldn't reach the server. Your order was not placed. Please try again." : err.message);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="order-title">
      <h2 id="order-title">Place a buy order</h2>
      <form onSubmit={submit} noValidate>
        <Field id="customerName" label="Full name" error={shownError('customerName')}>
          <input
            id="customerName"
            ref={nameInputRef}
            type="text"
            autoComplete="name"
            value={values.customerName}
            onChange={(e) => change('customerName', e.target.value)}
            onBlur={() => blur('customerName')}
            aria-invalid={Boolean(shownError('customerName'))}
            aria-describedby="customerName-error"
          />
        </Field>

        <Field id="currency" label="Currency" error={shownError('currency')}>
          <select
            id="currency"
            value={values.currency}
            onChange={(e) => change('currency', e.target.value)}
            onBlur={() => blur('currency')}
            aria-invalid={Boolean(shownError('currency'))}
            aria-describedby="currency-error"
            disabled={ratesState.status !== 'ready'}
          >
            <option value="">Select a currency</option>
            {rates.map((r) => (
              <option key={r.currency} value={r.currency}>{r.currency} - {r.name}</option>
            ))}
          </select>
        </Field>

        <Field id="amount" label="Amount" error={shownError('amount')}>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 250.50"
            value={values.amount}
            onChange={(e) => change('amount', e.target.value)}
            onBlur={() => blur('amount')}
            aria-invalid={Boolean(shownError('amount'))}
            aria-describedby="amount-error"
          />
        </Field>

        <div className="estimate" aria-live="polite">
          {estimate ? (
            <>
              <p>
                Subtotal: {formatUnits(Number(values.amount))} {values.currency} × {formatInr(estimate.rate)} ={' '}
                {formatInr(estimate.subtotal)}
              </p>
              <p>Service fee ({feePercent}%): {formatInr(estimate.fee)}</p>
              <p className="total">Estimated total payable: {formatInr(estimate.total)}</p>
            </>
          ) : (
            <p>Choose a currency and enter an amount to see your estimate.</p>
          )}
          <p className="hint">
            A {feePercent || 1.5}% service fee is added to every order. Final amount is confirmed by our server when you place the order.
          </p>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <button type="submit" className="btn" disabled={!isValid || submitting}>
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </section>
  );
}
