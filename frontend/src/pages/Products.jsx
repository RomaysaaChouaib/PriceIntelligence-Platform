import React from 'react';
import ProductCard from '../dashboard/ProductCard';

function Products({ products }) {
  return (
    <div className="pip-products-page">
      <div className="pip-product-grid">
        {products?.map((product, index) => (
          <ProductCard key={index} product={product} />
        ))}
      </div>
    </div>
  );
}

export default Products;