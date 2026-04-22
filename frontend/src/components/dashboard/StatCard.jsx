import React from 'react';

function StatCard({ title, value, icon: Icon, color = "#3b82f6", trend }) {
  return (
    <div className="pip-stat-card">
      <div className="pip-stat-content">
        <p className="pip-stat-label">{title}</p>
        <h3 className="pip-stat-value">{value}</h3>
        {trend && (
          <span className={`pip-stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="pip-stat-icon" style={{ background: color + "18", color: color }}>
        <Icon size={22} />
      </div>
    </div>
  );
}

export default StatCard;