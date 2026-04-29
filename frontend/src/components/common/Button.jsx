import React from 'react';

function Button({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  disabled = false,
  icon: Icon,
  className = ""
}) {
  const variants = {
    primary: "pip-btn-primary",
    secondary: "pip-btn-secondary",
    ghost: "pip-btn-ghost",
    danger: "pip-btn-danger"
  };

  const sizes = {
    sm: "pip-btn-sm",
    md: "pip-btn-md",
    lg: "pip-btn-lg"
  };

  return (
    <button
      className={`pip-btn ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={16} className="pip-btn-icon" />}
      {children}
    </button>
  );
}

export default Button;