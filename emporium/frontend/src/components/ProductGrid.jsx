import React, { useState, useEffect } from 'react';
import ProductDetail from './ProductDetail.jsx';

function ProductGrid({ apiBase }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [apiBase]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <>
      <div className="product-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => handleProductClick(product)}
          >
            {product.image ? (
              <img
                src={product.image.url}
                alt={product.name}
                className="product-image"
              />
            ) : (
              <div className="placeholder-image">
                No image available
              </div>
            )}
            <div className="product-content">
              <h3 className="product-title">{product.name}</h3>
              {product.description && (
                <p className="product-description">{product.description}</p>
              )}
              <div className="product-price">
                ${(product.price_cents / 100).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={handleCloseModal}
          apiBase={apiBase}
        />
      )}
    </>
  );
}

export default ProductGrid;