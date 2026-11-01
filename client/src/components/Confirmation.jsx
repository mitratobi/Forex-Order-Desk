import { useEffect, useRef } from 'react';
import { formatInr, formatUnits, formatDateTime } from '../utils/format.js';

// Shows only the server's values, never the client's estimate.
export default function Confirmation({ order, onReset }) {
  const headingRef = useRef(null);
  // The form that had focus has just been replaced, so move focus here (and announce it).
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="panel confirmation" aria-labelledby="confirm-title">
      <h2 id="confirm-title" ref={headingRef} tabIndex={-1}>Order confirmed</h2>
      <p className="reference">Reference: <strong>{order.reference}</strong></p>
      <dl>
        <dt>Customer</dt><dd>{order.customerName}</dd>
        <dt>Bought</dt><dd>{formatUnits(order.amount)} {order.currency}</dd>
        <dt>Rate</dt><dd>{formatInr(order.rate)} per {order.currency}</dd>
        <dt>Subtotal</dt><dd>{formatInr(order.inrSubtotal)}</dd>
        <dt>Service fee ({order.feePercent}%)</dt><dd>{formatInr(order.serviceFee)}</dd>
        <dt>Total payable</dt><dd><strong>{formatInr(order.inrTotal)}</strong></dd>
        <dt>Placed at</dt><dd>{formatDateTime(order.createdAt)}</dd>
      </dl>
      <button type="button" className="btn btn-secondary" onClick={onReset}>Place another order</button>
    </section>
  );
}
