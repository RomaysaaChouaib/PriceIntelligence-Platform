import React from 'react';

const CATEGORY_COLORS = {
  "entrée_de_gamme": "#27ae60",
  "milieu_de_gamme_bas": "#2980b9",
  "milieu_de_gamme": "#8e44ad",
  "haut_de_gamme": "#e67e22",
  "premium": "#c0392b",
};

function Badge({ label, color, size = "md" }) {
  const sizes = {
    sm: "pip-badge-sm",
    md: "pip-badge-md",
    lg: "pip-badge-lg"
  };

  return (
    <span className={`pip-badge ${sizes[size]}`} style={{ background: color || CATEGORY_COLORS[label] || "#888" }}>
      {label?.replace(/_/g, " ")}
    </span>
  );
}

export default Badge;