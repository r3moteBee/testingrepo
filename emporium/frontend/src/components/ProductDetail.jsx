import React, { useState } from 'react';
import Checkout from './Checkout.jsx';

function ProductDetail({ product, onClose, apiBase }) {
  const [selectedImage, setSelectedImage] = useState(
    product.images[0] || product.image
  );
  const [showCheckout, setShowCheckout] = useState(false);
  const [quantity, setQuantity] = useState(1);

  if (showCheckout) {
    return (
      <div className="modal-overlay">
        <div className="checkout-container">
          <Checkout
            product={product}
            quantity={quantity}
            apiBase={apiBase}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="product-detail-container">
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <div className="product-detail-content">
          {/* Image Gallery */}
          <div className="image-gallery">
            <div className="main-image-container">
              {selectedImage ? (
                <img
                  src={selectedImage.url}
                  alt={product.name}
                  className="main-image"
                />
              ) : (
                <div className="placeholder-image">No image</div>
              )}
            </div>

            {product.images.length > 0 && (
              <div className="thumbnails">
                {product.images.map((image) => (
                  <button
                    key={image.id}
                    className={`thumbnail ${
                      selectedImage?.id === image.id ? 'active' : ''
                    }`}
                    onClick={() => setSelectedImage(image)}
                  >
                    <img src={image.url} alt={image.alt || 'Thumbnail'} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info">
            <h2>{product.name}</h2>
            {product.description && (
              <p className="description">{product.description}</p>
            )}
            <div className="price">
              ${(product.price_cents / 100).toFixed(2)}
            </div>

            <div className="quantity-selector">
              <label>Quantity:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              />
            </div>

            <button
              className="btn btn-primary add-to-cart"
              onClick={() => setShowCheckout(true)}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;