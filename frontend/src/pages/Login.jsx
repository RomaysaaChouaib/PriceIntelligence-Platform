import React, { useState } from 'react';
import { useAuth } from '../App'; // Import depuis App.js
import { ShoppingBag, User, Lock, AlertCircle } from 'lucide-react';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error || 'Erreur de connexion');
    }
    // Si succès, le user est déjà défini dans le context
    
    setLoading(false);
  };

  return (
    <div className="pip-login-container">
      <div className="pip-login-card">
        {/* Logo */}
        <div className="pip-login-header">
          <div className="pip-login-logo">
            <ShoppingBag size={40} color="#f97316" />
          </div>
          <h1>PriceIntel</h1>
          <p>Plateforme d'Intelligence Prix</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="pip-login-form">
          <div className="pip-login-input-group">
            <label>
              <User size={18} />
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="pip-login-input-group">
            <label>
              <Lock size={18} />
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="pip-login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="pip-login-button"
            disabled={loading || !username.trim()}
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>

          <div className="pip-login-demo">
            <small>
              💡 <strong>Mode démo :</strong> Entrez n'importe quel nom pour tester
            </small>
          </div>
        </form>

        <div className="pip-login-footer">
          <p>© 2024 PriceIntel - Jumia Maroc</p>
        </div>
      </div>
    </div>
  );
}

export default Login;