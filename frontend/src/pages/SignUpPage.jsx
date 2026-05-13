import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css';

export default function SignUpPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (form.password !== form.confirm) {
      return setError('Les mots de passe ne correspondent pas.');
    }

    if (form.password.length < 8) {
      return setError('Le mot de passe doit contenir au moins 8 caractères.');
    }

    setLoading(true);
    try {
      console.log('📤 Envoi de la requête vers le backend...');
      
      const res = await axios.post('http://127.0.0.1:8000/api/auth/signup/', {
        username: form.username,
        email: form.email,
        password: form.password,
        confirm_password: form.confirm
      });

      console.log('✅ Réponse du backend:', res.data);

      // Sauvegarder les données utilisateur
      const userData = {
        username: res.data.user?.username || form.username,
        first_name: res.data.user?.first_name || form.username,
        email: res.data.user?.email || form.email,
        is_staff: res.data.user?.is_staff || false
      };

      localStorage.setItem('pip_user', JSON.stringify(userData));
      localStorage.setItem('access_token', res.data.tokens?.access || res.data.token);
      
      setSuccess(true);
      
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 800);
      
    } catch (err) {
      console.error('❌ Erreur détaillée:', err);
      
      let errorMsg = 'Erreur lors de l\'inscription.';
      
      if (err.response) {
        // Le backend a répondu avec une erreur
        console.error('Réponse erreur:', err.response.data);
        errorMsg = err.response.data?.error || err.response.data?.message || err.response.data?.detail || 'Erreur serveur';
      } else if (err.request) {
        // Le backend n'a pas répondu
        errorMsg = 'Le serveur ne répond pas. Vérifiez que Django tourne sur http://127.0.0.1:8000';
      } else {
        // Autre erreur
        errorMsg = err.message || 'Erreur inconnue';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="#e85d04" />
            </svg>
            <h2>PriceIntel</h2>
          </div>
          <p className="auth-subtitle">Créez votre compte pour accéder à la plateforme</p>
        </div>
        
        {success && (
          <div className="success-msg">
            ✅ Compte créé ! Redirection...
          </div>
        )}
        
        {error && (
          <div className="error-msg">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input 
              id="username"
              name="username" 
              placeholder="Entrez votre nom d'utilisateur" 
              value={form.username} 
              onChange={handleChange} 
              required 
              disabled={loading || success} 
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Adresse email</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              placeholder="votre@email.com" 
              value={form.email} 
              onChange={handleChange} 
              required 
              disabled={loading || success} 
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <input 
              id="password"
              name="password" 
              type="password" 
              placeholder="••••••••" 
              value={form.password} 
              onChange={handleChange} 
              required 
              minLength="8"
              disabled={loading || success} 
            />
            <span className="input-hint">Minimum 8 caractères</span>
          </div>

          <div className="input-group">
            <label htmlFor="confirm">Confirmer le mot de passe</label>
            <input 
              id="confirm"
              name="confirm" 
              type="password" 
              placeholder="••••••••" 
              value={form.confirm} 
              onChange={handleChange} 
              required 
              disabled={loading || success} 
            />
          </div>
          
          <button type="submit" className="btn-auth" disabled={loading || success}>
            {loading ? 'Création en cours...' : success ? 'Redirection...' : "S'inscrire →"}
          </button>
        </form>

        <div className="auth-footer">
          <p>Déjà inscrit ? <Link to="/login" className="auth-link">Se connecter</Link></p>
          <Link to="/" className="back-link">← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}