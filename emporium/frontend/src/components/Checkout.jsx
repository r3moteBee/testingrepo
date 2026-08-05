import React, { useState } from 'react';

function Checkout({ product, quantity, apiBase, onClose }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBase}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              product_id: product.id,
              quantity: quantity,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="modal-overlay">
        <div className="checkout-container">
          <button className="close-btn" onClick={onClose}>
            ×
          </button>

          <div className="checkout-content">
            <h2>Checkout</h2>

            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="order-item">
                <img
                  src={product.image?.url || product.images[0]?.url}
                  alt={product.name}
                />
                <div className="order-item-info">
                  <h4>{product.name}</h4>
                  <p>Quantity: {quantity}</p>
                  <p className="price">
                    ${(product.price_cents / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="order-total">
                <span>Total:</span>
                <span>${((product.price_cents * quantity) / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              className="btn btn-primary checkout-btn"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Complete Purchase'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="checkout-container">
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <div className="checkout-content">
          <h2>Payment Complete</h2>

          <div className="payment-success">
            <p>Your payment intent has been created successfully!</p>
            <div className="client-secret">
              <strong>Client Secret:</strong>
              <code>{clientSecret.client_secret}</code>
            </div>
            <p>
              Amount: ${(clientSecret.amount / 100).toFixed(2)}
              {clientSecret.currency.toUpperCase()}
            </p>
            <p>Provider: {clientSecret.provider}</p>
          </div>

          <div className="stripe-placeholder">
            <h3>Stripe Elements Would Mount Here</h3>
            <p>
              In production, you would use Stripe.js Elements to securely collect
              payment information.
            </p>
          </div>

          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Checkout;