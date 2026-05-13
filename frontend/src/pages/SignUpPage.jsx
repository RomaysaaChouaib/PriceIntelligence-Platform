import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Zap, Mail, User, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import './AuthPage.css';

// ══════════════════════════════════════════════════════════════════
// 🎨 DESIGN TOKENS — Fond Blanc + Texte Noir/Bleu
// ══════════════════════════════════════════════════════════════════
const DS = {
  bg0: "#ffffff",
  bg1: "#f8fafc",
  bg2: "#ffffff",
  bg3: "#f1f5f9",
  border: "#e2e8f0",
  borderGlow: "#2563eb",
  blue: "#2563eb",
  blueDim: "#2563eb",
  blueGlow: "rgba(0, 102, 204, 0.15)",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  error: "#ff4560",
  success: "#00a86b",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  sans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

// ── Global inline styles ──────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${DS.bg0};
    color: ${DS.textPrimary};
    font-family: ${DS.sans};
    font-size: 14px;
    line-height: 1.5;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${DS.bg3}; }
  ::-webkit-scrollbar-thumb { background: ${DS.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${DS.borderGlow}; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 8px ${DS.blueGlow}; }
    50%       { box-shadow: 0 0 20px ${DS.blue}40; }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  .fade-in { animation: fadeSlideUp 0.35s ease both; }
  .glow { animation: glow-pulse 2s ease-in-out infinite; }
  .shake { animation: shake 0.3s ease-in-out; }
`;

function InjectStyle() {
  if (typeof document !== 'undefined' && !document.getElementById("pip-auth-style")) {
    const s = document.createElement("style");
    s.id = "pip-auth-style";
    s.textContent = GLOBAL_STYLE;
    document.head.appendChild(s);
  }
  return null;
}

// ── Reusable UI Atoms ─────────────────────────────────────────────
function InputField({ id, label, icon: Icon, hint, error, ...props }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label 
        htmlFor={id} 
        style={{ 
          display: "flex", alignItems: "center", gap: 6,
          fontSize: "0.9rem", color: DS.textSecondary, 
          fontWeight: 500, marginBottom: "0.5rem", fontFamily: DS.mono 
        }}
      >
        {Icon && <Icon size={14} color={DS.blue} />}
        {label}
      </label>
      <input 
        id={id}
        style={{
          width: "100%", padding: "0.875rem 1rem",
          background: DS.bg0, border: `1px solid ${error ? DS.error : DS.border}`,
          borderRadius: 8, fontSize: "1rem", color: DS.textPrimary,
          fontFamily: DS.sans, transition: "all 0.2s",
          outline: "none",
        }}
        onFocus={e => {
          if (!error) e.target.style.borderColor = DS.borderGlow;
          e.target.style.boxShadow = `0 0 0 3px ${DS.blue}15`;
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? DS.error : DS.border;
          e.target.style.boxShadow = "none";
        }}
        {...props}
      />
      {hint && (
        <span style={{ 
          display: "block", marginTop: "0.375rem", 
          fontSize: "0.8rem", color: DS.textMuted, fontFamily: DS.mono 
        }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ 
          display: "flex", alignItems: "center", gap: 4,
          marginTop: "0.375rem", fontSize: "0.8rem", 
          color: DS.error, fontFamily: DS.mono, fontWeight: 500 
        }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  );
}

function Message({ type, children }) {
  const isErr = type === "error";
  return (
    <div className={`fade-in ${isErr ? "shake" : ""}`} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "1rem 1.25rem", borderRadius: 10, marginBottom: "1.5rem",
      background: isErr ? `${DS.error}10` : `${DS.success}10`,
      border: `1px solid ${isErr ? DS.error : DS.success}30`,
      color: isErr ? DS.error : DS.success,
      fontFamily: DS.mono, fontSize: "0.9rem", fontWeight: 500,
    }}>
      {isErr ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🔐 SIGN UP PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════
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
    
    // ✅ Validation
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

      // ✅ Sauvegarde utilisateur
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
        console.error('Réponse erreur:', err.response.data);
        errorMsg = err.response.data?.error || err.response.data?.message || err.response.data?.detail || 'Erreur serveur';
      } else if (err.request) {
        errorMsg = 'Le serveur ne répond pas. Vérifiez que Django tourne sur http://127.0.0.1:8000';
      } else {
        errorMsg = err.message || 'Erreur inconnue';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <InjectStyle />
      <div style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${DS.bg0} 0%, ${DS.bg1} 100%)`,
        backgroundImage: `
          radial-gradient(ellipse at 20% 10%, ${DS.blue}06 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, ${DS.blue}04 0%, transparent 50%)
        `,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem", position: "relative", overflow: "hidden",
      }}>
        
        {/* Glow effect background */}
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px", borderRadius: "50%",
          background: `radial-gradient(circle, ${DS.blue}06 0%, transparent 70%)`,
          filter: "blur(40px)", pointerEvents: "none",
        }} />

        {/* Auth Box */}
        <div className="fade-in" style={{
          background: DS.bg2,
          borderRadius: 16,
          border: `1px solid ${DS.border}`,
          boxShadow: `0 20px 60px ${DS.blue}08`,
          padding: "2.5rem",
          width: "100%", maxWidth: 480,
          position: "relative", zIndex: 2,
          borderTop: `3px solid ${DS.blue}`,
        }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, marginBottom: "1rem",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${DS.blue}10`, border: `1px solid ${DS.blue}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "glow-pulse 2.5s ease-in-out infinite",
              }}>
                <Zap size={20} color={DS.blue} />
              </div>
              <h2 style={{
                fontSize: "1.8rem", fontWeight: 700, color: DS.textPrimary,
                margin: 0, letterSpacing: "-0.3px",
              }}>
                PriceIntel
              </h2>
            </div>
            <p style={{ color: DS.textSecondary, fontSize: "0.95rem", margin: 0 }}>
              Créez votre compte pour accéder à la plateforme
            </p>
          </div>
          
          {/* Messages */}
          {success && <Message type="success">✅ Compte créé ! Redirection...</Message>}
          {error && <Message type="error">{error}</Message>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <InputField
              id="username"
              name="username"
              label="Nom d'utilisateur"
              icon={User}
              placeholder="Entrez votre nom d'utilisateur"
              value={form.username}
              onChange={handleChange}
              required
              disabled={loading || success}
              autoComplete="username"
            />

            <InputField
              id="email"
              name="email"
              label="Adresse email"
              icon={Mail}
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading || success}
              autoComplete="email"
            />

            <InputField
              id="password"
              name="password"
              label="Mot de passe"
              icon={Lock}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength="8"
              disabled={loading || success}
              hint="Minimum 8 caractères"
              autoComplete="new-password"
            />

            <InputField
              id="confirm"
              name="confirm"
              label="Confirmer le mot de passe"
              icon={Lock}
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={handleChange}
              required
              disabled={loading || success}
              autoComplete="new-password"
            />
            
            <button 
              type="submit" 
              style={{
                width: "100%", padding: "1rem",
                background: loading || success ? DS.bg3 : `${DS.blue}cc`,
                color: loading || success ? DS.textMuted : DS.bg0,
                border: `1px solid ${DS.blue}40`,
                borderRadius: 10, fontSize: "1rem", fontWeight: 700,
                fontFamily: DS.mono, letterSpacing: 1,
                cursor: loading || success ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: "0.5rem",
                opacity: loading || success ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading && !success) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = `0 6px 25px ${DS.blue}30`;
                }
              }}
              onMouseLeave={e => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: `2px solid ${DS.bg0}`,
                    borderTop: `2px solid transparent`,
                    animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }} />
                  Création en cours...
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={18} /> Redirection...
                </>
              ) : (
                <>S'inscrire →</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: "2rem", textAlign: "center",
            borderTop: `1px solid ${DS.border}`, paddingTop: "1.5rem",
          }}>
            <p style={{ color: DS.textSecondary, marginBottom: "1rem", fontSize: "0.95rem" }}>
              Déjà inscrit ?{" "}
              <Link 
                to="/login" 
                style={{
                  color: DS.blue, fontWeight: 600, textDecoration: "none",
                  transition: "color 0.2s", fontFamily: DS.mono,
                }}
                onMouseEnter={e => e.target.style.color = DS.blueDim}
                onMouseLeave={e => e.target.style.color = DS.blue}
              >
                Se connecter
              </Link>
            </p>
            <Link 
              to="/" 
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: DS.textMuted, textDecoration: "none",
                fontWeight: 500, fontSize: "0.9rem", fontFamily: DS.mono,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                e.target.style.color = DS.blue;
                e.target.style.transform = "translateX(-3px)";
              }}
              onMouseLeave={e => {
                e.target.style.color = DS.textMuted;
                e.target.style.transform = "translateX(0)";
              }}
            >
              <ArrowLeft size={14} /> Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}