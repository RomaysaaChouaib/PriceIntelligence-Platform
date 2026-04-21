import React from 'react';

const CATEGORY_COLORS = {
  "entrée_de_gamme": "#27ae60",
  "milieu_de_gamme_bas": "#2980b9",
  "milieu_de_gamme": "#8e44ad",
  "haut_de_gamme": "#e67e22",
  "premium": "#c0392b",
};

function CategoryChart({ data }) {
  const maxCount = Math.max(...(data?.map(d => d.count) || [1]));

  return (
    <div className="pip-category-chart">
      <h3 className="pip-section-title">📊 Répartition par catégorie</h3>
      <div className="pip-chart-bars">
        {data?.map((item, index) => (
          <div key={index} className="pip-chart-bar-row">
            <div className="pip-bar-label">{item.category?.replace(/_/g, " ")}</div>
            <div className="pip-bar-bg">
              <div 
                className="pip-bar-fill"
                style={{ 
                  width: `${(item.count / maxCount) * 100}%`,
                  background: CATEGORY_COLORS[item.category] || "#888"
                }}
              ></div>
            </div>
            <div className="pip-bar-count">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryChart;