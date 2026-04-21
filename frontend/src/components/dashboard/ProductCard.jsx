import React from 'react';
import Badge from '../common/Badge';

function ProductCard({ product }) {
  const {
    title,
    brand_detected,
    brand,
    price,
    price_category,
    image,
    is_gaming,
    ram_gb,
    storage_gb,
    source,
    link
  } = product;

  return (
    <div className="pip-product-card">
      {is_gaming && <span className="pip-gaming-tag">🎮 Gaming</span>}
      {image && (
        <img src={image} alt={title} className="pip-product-img" />
      )}
      <div className="pip-card-content">
        <div className="pip-card-top">
          <span className="pip-brand-label">{brand_detected || brand}</span>
          {price_category && (
            <Badge label={price_category} />
          )}
        </div>
        <h3 className="pip-card-title">{title}</h3>
        <div className="pip-specs-row">
          {ram_gb && <span className="pip-spec">🧠 {ram_gb} Go</span>}
          {storage_gb && <span className="pip-spec">💾 {storage_gb} Go</span>}
        </div>
        <p className="pip-price">{price?.toLocaleString()} MAD</p>
        <div className="pip-card-footer">
          <small>{source}</small>
          <a href={link} target="_blank" rel="noreferrer" className="pip-view-btn">
            Voir sur Jumia →
          </a>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;