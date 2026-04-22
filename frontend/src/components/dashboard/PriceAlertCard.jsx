import React from 'react';
import { Bell } from 'lucide-react';

function PriceAlertCard({ product }) {
  const { name, targetPrice, currentPrice, percentage } = product;
  
  const percentageAbove = ((currentPrice - targetPrice) / targetPrice * 100).toFixed(0);

  return (
    <div className="pip-alert-card">
      <div className="pip-alert-header">
        <Bell className="pip-alert-icon" size={18} />
        <span className="pip-alert-percentage">+{percentageAbove}% au-dessus</span>
      </div>
      <h3 className="pip-alert-title">{name}</h3>
      <div className="pip-alert-prices">
        <div className="pip-alert-price-row">
          <span className="pip-alert-label">Cible:</span>
          <span className="pip-alert-target">{targetPrice?.toLocaleString()} FCFA</span>
        </div>
        <div className="pip-alert-price-row">
          <span className="pip-alert-label">Actuel:</span>
          <span className="pip-alert-current">{currentPrice?.toLocaleString()} FCFA</span>
        </div>
      </div>
    </div>
  );
}

export default PriceAlertCard;