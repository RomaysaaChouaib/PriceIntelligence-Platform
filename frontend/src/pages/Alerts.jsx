import React from 'react';
import PriceAlertCard from '../dashboard/PriceAlertCard';
import PriceDropList from '../dashboard/PriceDropList';

function Alerts({ alerts, drops }) {
  return (
    <div className="pip-alerts-page">
      <h2 className="pip-page-title">🔔 Alertes de prix</h2>
      
      <div className="pip-alerts-grid">
        {alerts?.map((alert, index) => (
          <PriceAlertCard key={index} product={alert} />
        ))}
      </div>

      {drops && <PriceDropList drops={drops} />}
    </div>
  );
}

export default Alerts;