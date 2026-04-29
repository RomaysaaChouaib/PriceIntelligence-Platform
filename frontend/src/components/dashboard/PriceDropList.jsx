import React from 'react';
import { TrendingDown } from 'lucide-react';

function PriceDropList({ drops }) {
  return (
    <div className="pip-price-drops">
      <h3 className="pip-section-title">
        <TrendingDown size={18} />
        Baisses de prix récentes
      </h3>
      <div className="pip-drops-list">
        {drops?.map((drop, index) => (
          <div key={index} className="pip-drop-item">
            <div className="pip-drop-info">
              <span className="pip-drop-name">{drop.name}</span>
              <span className="pip-drop-source">{drop.source}</span>
            </div>
            <div className="pip-drop-price">
              <span className="pip-drop-amount">-{drop.amount?.toLocaleString()} FCFA</span>
              <span className="pip-drop-percent">{drop.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PriceDropList;