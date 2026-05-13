import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./main.css";
import {
  Search, Bell, ShoppingBag, TrendingUp, Package, Menu, X, AlertTriangle, Link2,
  RefreshCw, ChevronRight, BarChart2, LogOut, User, Lock, AlertCircle,
  Activity, Clock, Database, Download, Play, Square, Settings,
  TrendingDown, ArrowRight, ChevronLeft, ChevronRight as ChevRight,
  Home, Zap, Eye, Filter, ArrowUpDown
} from "lucide-react";
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import PricingPage from './pages/PricingPage';
import ScrapingPage from './pages/ScrapingPage';
import DataMiningPage from './pages/DataMiningPage';

const API = "http://127.0.0.1:8000/api";

// ══════════════════════════════════════════════════════════════════
//  DESIGN TOKENS — Light Theme (Fond Blanc)
// ══════════════════════════════════════════════════════════════════
const DS = {
  bg0: "#ffffff",
  bg1: "#f8fafc",
  bg2: "#ffffff",
  bg3: "#f1f5f9",
  border: "#e2e8f0",
  borderGlow: "#2563eb",
  cyan: "#2563eb",
  cyanDim: "#1d4ed8",
  amber: "#f5a623",
  amberDim: "#b87a1a",
  green: "#00e57a",
  greenDim: "#00994f",
  red: "#ff4560",
  redDim: "#aa2230",
  purple: "#a855f7",
  purpleDim: "#6d28d9",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  sans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

// ── Global inline styles ──────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${DS.bg1};
    color: ${DS.textPrimary};
    font-family: ${DS.sans};
    font-size: 14px;
    line-height: 1.5;
  }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${DS.bg3}; }
  ::-webkit-scrollbar-thumb { background: ${DS.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${DS.borderGlow}; }
  input, select, textarea {
    background: ${DS.bg0};
    border: 1px solid ${DS.border};
    color: ${DS.textPrimary};
    border-radius: 6px;
    padding: 8px 12px;
    font-family: ${DS.sans};
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus, select:focus { border-color: ${DS.cyan}; box-shadow: 0 0 0 2px ${DS.cyan}18; }
  table { border-collapse: collapse; }
  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 8px ${DS.cyan}44; } 50% { box-shadow: 0 0 20px ${DS.cyan}88; } }
  .fade-in { animation: fadeSlideUp 0.35s ease both; }
  .fade-in-d1 { animation: fadeSlideUp 0.35s ease 0.05s both; }
  .fade-in-d2 { animation: fadeSlideUp 0.35s ease 0.10s both; }
  .fade-in-d3 { animation: fadeSlideUp 0.35s ease 0.15s both; }
  .fade-in-d4 { animation: fadeSlideUp 0.35s ease 0.20s both; }
`;

function InjectStyle() {
  useEffect(() => {
    const id = "pip-global-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = GLOBAL_STYLE;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  AUTH CONTEXT
// ══════════════════════════════════════════════════════════════════
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("pip_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        const userData = { username, first_name: data.first_name || username, is_staff: data.is_staff || false };
        localStorage.setItem("pip_user", JSON.stringify(userData));
        localStorage.setItem("access_token", data.access);
        setUser(userData);
        return { success: true };
      } else {
        const demoUser = { username, first_name: username, is_staff: true };
        localStorage.setItem("pip_user", JSON.stringify(demoUser));
        setUser(demoUser);
        return { success: true, demo: true };
      }
    } catch {
      const demoUser = { username: username || "admin", first_name: "Admin", is_staff: true };
      localStorage.setItem("pip_user", JSON.stringify(demoUser));
      setUser(demoUser);
      return { success: true, demo: true };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("pip_user");
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) return { user: null, login: async () => ({ success: true }), logout: () => {}, loading: false };
  return ctx;
};

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ══════════════════════════════════════════════════════════════════
//  SHARED UI ATOMS
// ══════════════════════════════════════════════════════════════════
function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: `2px solid ${DS.border}`,
        borderTop: `2px solid ${DS.cyan}`,
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: DS.textMuted, fontSize: 12, fontFamily: DS.mono, letterSpacing: 2 }}>LOADING…</span>
    </div>
  );
}

function ErrMsg({ msg }) {
  return (
    <div style={{
      background: `${DS.red}12`, border: `1px solid ${DS.red}40`,
      color: DS.red, padding: "14px 18px", borderRadius: 8,
      fontSize: 13, margin: "12px 0", fontFamily: DS.mono,
      display: "flex", alignItems: "center", gap: 8
    }}>
      <X size={14} /> {msg}
    </div>
  );
}

function Card({ children, style, glow, accent }) {
  return (
    <div style={{
      background: DS.bg2,
      border: `1px solid ${glow ? DS.borderGlow : DS.border}`,
      borderRadius: 10,
      padding: "1.25rem",
      position: "relative",
      overflow: "hidden",
      boxShadow: glow ? `0 0 20px ${accent || DS.cyan}18` : "0 1px 3px rgba(0,0,0,0.05)",
      ...style,
    }}>
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }} />
      )}
      {children}
    </div>
  );
}

function SectionTitle({ children, icon: Icon, accent = DS.cyan }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
      {Icon && <Icon size={15} color={accent} />}
      <span style={{ fontSize: 13, fontWeight: 600, color: DS.textPrimary, letterSpacing: 0.3 }}>{children}</span>
    </div>
  );
}

function Tag({ children, color = DS.cyan, size = "sm" }) {
  const pad = size === "sm" ? "2px 8px" : "4px 12px";
  const fs = size === "sm" ? 11 : 12;
  return (
    <span style={{
      display: "inline-block", padding: pad, borderRadius: 999,
      fontSize: fs, fontWeight: 600, letterSpacing: 0.3,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      fontFamily: DS.mono,
    }}>{children}</span>
  );
}

function StatPill({ label, value, color = DS.cyan, delay = 0 }) {
  return (
    <div className={`fade-in`} style={{
      background: DS.bg0, border: `1px solid ${color}30`,
      borderRadius: 10, padding: "1rem 1.25rem",
      position: "relative", overflow: "hidden",
      animationDelay: `${delay}s`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${color}06 0%, transparent 60%)` }} />
      <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: DS.mono, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color, fontFamily: DS.mono, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function ProgressBar({ value, color = DS.cyan, height = 4, label }) {
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
          <span style={{ color: DS.textSecondary }}>{label}</span>
          <span style={{ color, fontFamily: DS.mono }}>{value}%</span>
        </div>
      )}
      <div style={{ height, background: DS.bg3, borderRadius: height, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: height, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

const PLATFORM_COLORS = {
  jumia: { stroke: "#f5a623", fill: "#f5a62322" },
  amazon: { stroke: "#2563eb", fill: "#2563eb22" },
  aliexpress: { stroke: "#00e57a", fill: "#00e57a22" },
  default: { stroke: "#a855f7", fill: "#a855f722" },
};

const CLUSTER_PALETTE = ["#2563eb", "#f5a623", "#00e57a", "#a855f7", "#ff4560", "#38bdf8"];

// ══════════════════════════════════════════════════════════════════
// LOGIN PAGE (CORRIGÉ : CHAMPS TOUJOURS VIDES)
// ══════════════════════════════════════════════════════════════════
function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Force les champs à être vides à chaque chargement de la page
  useEffect(() => {
    setUsername("");
    setPassword("");
    setError("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(username, password);
    if (result.success) {
      // Vide les champs avant redirection
      setUsername("");
      setPassword("");
      navigate('/dashboard');
    } else {
      setError(result.error || "Erreur de connexion");
      // Vide le mot de passe en cas d'erreur pour sécurité/UX
      setPassword("");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: DS.bg1,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundImage: `radial-gradient(ellipse at 20% 50%, ${DS.cyan}08 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${DS.amber}06 0%, transparent 50%)`,
    }}>
      <InjectStyle />
      <div className="fade-in" style={{ width: 400, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${DS.cyan}22, ${DS.cyan}44)`,
            border: `1px solid ${DS.cyan}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", animation: "glow-pulse 2s ease-in-out infinite",
          }}>
            <Zap size={26} color={DS.cyan} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: DS.textPrimary, letterSpacing: -0.5 }}>PriceIntel</h1>
          <p style={{ color: DS.textMuted, fontSize: 13, fontFamily: DS.mono, letterSpacing: 1, marginTop: 4 }}>INTELLIGENCE PRIX PLATFORM</p>
        </div>
        <Card accent={DS.cyan} glow>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: DS.textSecondary, fontFamily: DS.mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                <User size={12} /> Identifiant
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="nom d'utilisateur" 
                required 
                disabled={loading} 
                autoFocus 
                autoComplete="off" 
                autoCorrect="off" 
                autoCapitalize="off" 
                spellCheck={false}
                style={{ width: "100%", background: DS.bg0, border: `1px solid ${DS.border}` }} 
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: DS.textSecondary, fontFamily: DS.mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                <Lock size={12} /> Mot de passe
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                disabled={loading} 
                autoComplete="new-password" 
                autoCorrect="off" 
                autoCapitalize="off" 
                spellCheck={false}
                style={{ width: "100%", background: DS.bg0, border: `1px solid ${DS.border}` }} 
              />
            </div>
            {error && (
              <div style={{ background: `${DS.red}12`, border: `1px solid ${DS.red}40`, color: DS.red, padding: "10px 14px", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <button type="submit" disabled={loading || !username.trim()} style={{
              width: "100%", padding: "12px",
              background: loading ? DS.bg3 : `linear-gradient(135deg, ${DS.cyan}cc, ${DS.cyanDim}cc)`,
              border: `1px solid ${DS.cyan}40`, borderRadius: 8, color: DS.bg0, fontWeight: 700,
              fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: DS.mono, letterSpacing: 1, transition: "all 0.2s",
              opacity: loading || !username.trim() ? 0.6 : 1,
            }}>
              {loading ? "CONNEXION…" : "SE CONNECTER →"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB PRODUITS (CSV SUPPRIMÉ)
// ══════════════════════════════════════════════════════════════════
function TabProducts() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("db");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [scrapeTarget, setScrapeTarget] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [polling, setPolling] = useState(false);
  const [scrapeCategory, setScrapeCategory] = useState("laptop");
  const [alerts, setAlerts] = useState([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => { fetchDB(1); }, []);

  const fetchDB = async (p = 1) => {
    setLoading(true); setMode("db"); setScrapeMsg("");
    try {
      const res = await fetch(`${API}/search/?query=${query}&page=${p}&limit=20`, { headers: getAuthHeaders() });
      const data = await res.json();
      setProducts(data.products || []); setTotal(data.total || 0); setPages(data.pages || 1); setPage(p);
    } catch { setScrapeMsg("❌ Erreur lors du chargement DB"); }
    setLoading(false);
  };

  const fetchAccessories = async (p = 1) => {
    setLoading(true); setMode("db_accessoire"); setScrapeMsg("");
    try {
      const res = await fetch(`${API}/search/Accessoire/?query=${query}&page=${p}&limit=20`, { headers: getAuthHeaders() });
      const data = await res.json();
      setProducts(data.accessories || []); setTotal(data.total || 0); setPages(data.pages || 1); setPage(p);
    } catch { setScrapeMsg("❌ Erreur lors du chargement des accessoires"); }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    setLoading(true); setMode("alerts"); setScrapeMsg("");
    try {
      const res = await fetch(`${API}/notifications/`, { headers: getAuthHeaders() });
      const data = await res.json();
      setAlerts(data.alerts || []); setTotal(data.alerts?.length || 0); setPages(1);
    } catch { setScrapeMsg("❌ Erreur lors de la récupération des alertes"); }
    setLoading(false);
  };

  const pollTaskStatus = (taskId, target) => {
    setPolling(true); setProgress(30);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/status/${taskId}/`, { headers: getAuthHeaders() });
        const status = await res.json();
        if (status.status === "SUCCESS") {
          clearInterval(interval); setProgress(100); setPolling(false);
          setScrapeMsg(`✅ Scraping ${target} terminé — ${status.result?.inserted || 0} produits`);
          if (!["jumia", "amazon", "aliexpress", "all"].includes(target)) fetchAccessories(1);
          else fetchDB(1);
          setTimeout(() => { setProgress(0); setScrapeMsg(""); }, 3000);
        } else if (status.status === "FAILURE") {
          clearInterval(interval); setPolling(false); setScrapeMsg("❌ Échec"); setProgress(0);
        } else { setProgress(p => Math.min(p + 8, 90)); }
      } catch { clearInterval(interval); setPolling(false); }
    }, 2000);
  };

  const runScrape = async (target) => {
    setLoading(true); setScrapeTarget(target);
    const defaultQuery = { souris: "souris", laptop_stand: "laptop_stand", cooling_pad: "cooling_pad", sac_laptop: "sac_laptop", usb: "usb_flash_drive" }[target] || "laptop";
    const finalQuery = query.trim() !== "" ? query.trim() : defaultQuery;
    setScrapeMsg(`⏳ Scraping ${target}...`); setProgress(10);
    try {
      const endpoints = { jumia: "scrape/jumia/", amazon: "scrape/amazon/", aliexpress: "scrape/aliexpress/", all: "scrape/All/", souris: "scrape/souris/", laptop_stand: "scrape/laptop_stand/", cooling_pad: "scrape/cooling_pad/", sac_laptop: "scrape/sac_laptop/", usb: "scrape/usb/" };
      const url = `${API}/${endpoints[target] || "search/"}?query=${encodeURIComponent(finalQuery)}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.task_id) { setCurrentTaskId(data.task_id); pollTaskStatus(data.task_id, target); }
      else if (data.success) {
        setScrapeMsg(`✅ ${data.message}`); setProgress(100);
        if (!["jumia", "amazon", "aliexpress", "all"].includes(target)) fetchAccessories(1); else fetchDB(1);
        setTimeout(() => setProgress(0), 3000);
      }
    } catch { setScrapeMsg("❌ Erreur"); setProgress(0); }
    setLoading(false);
  };

  const handleStop = async () => {
    if (!currentTaskId) return;
    try {
      const res = await fetch(`${API}/scrape/stop/?task_id=${currentTaskId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) { setScrapeMsg("🛑 Arrêté"); setCurrentTaskId(null); setProgress(0); setPolling(false); }
    } catch { setScrapeMsg("❌ Erreur arrêt"); }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* SEARCH BAR */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${DS.border}` }} />
        <button onClick={() => mode === "alerts" ? fetchNotifications() : mode === "db_accessoire" ? fetchAccessories(1) : fetchDB(1)} style={{ padding: "10px 20px", background: DS.platformBlue, color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Rechercher</button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20, background: "#f1f5f9", padding: 5, borderRadius: 10 }}>
        {["db", "db_accessoire", "scrape", "alerts"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: mode === m ? "white" : "transparent", fontWeight: "bold", cursor: "pointer", color: mode === m ? DS.platformBlue : DS.textSecondary }}>
            {m === "db" ? "Produits" : m === "db_accessoire" ? "Accessoires" : m === "scrape" ? "Scraper" : "Alertes"}
          </button>
        ))}
      </div>

      {/* SCRAPE PANEL */}
      {mode === "scrape" && (
        <Card accent={DS.amber} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
             <button onClick={() => setScrapeCategory("laptop")} style={{ flex: 1, padding: 10, borderRadius: 8, background: scrapeCategory === "laptop" ? DS.amber : "#eee", border: "none", color: scrapeCategory === "laptop" ? "white" : "black", fontWeight: "bold" }}>Laptops</button>
             <button onClick={() => setScrapeCategory("accessoire")} style={{ flex: 1, padding: 10, borderRadius: 8, background: scrapeCategory === "accessoire" ? DS.amber : "#eee", border: "none", color: scrapeCategory === "accessoire" ? "white" : "black", fontWeight: "bold" }}>Accessoires</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {scrapeCategory === "laptop" ? (
              <>
                <button onClick={() => runScrape("jumia")} style={{ padding: "10px", background: "#f97316", color: "white", border: "none", borderRadius: 8 }}>Jumia</button>
                <button onClick={() => runScrape("amazon")} style={{ padding: "10px", background: "#232f3e", color: "white", border: "none", borderRadius: 8 }}>Amazon</button>
                <button onClick={() => runScrape("all")} style={{ padding: "10px", background: "#1e293b", color: "white", border: "none", borderRadius: 8 }}>Tout Scraper</button>
              </>
            ) : (
              <button onClick={() => runScrape("souris")} style={{ padding: "10px", background: DS.platformBlue, color: "white", border: "none", borderRadius: 8 }}>Souris</button>
            )}
            <button onClick={handleStop} style={{ padding: "10px", background: DS.red, color: "white", border: "none", borderRadius: 8 }}>STOP</button>
          </div>
        </Card>
      )}

      {/* LISTING */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {mode === "alerts" ? (
          alerts.map((item, i) => (
            <div key={i} style={{ border: `2px solid ${DS.red}`, borderRadius: 12, padding: 15, position: "relative" }}>
              <span style={{ background: DS.red, color: "white", padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>-{item.percentage}%</span>
              <h3>{item.title}</h3>
              <p style={{ color: DS.red, fontWeight: "bold" }}>{item.new_price} {item.currency}</p>
              {/* LIEN ICI */}
              <a href={item.link} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, color: DS.platformBlue, fontWeight: "bold", textDecoration: "none" }}>ACHETER →</a>
            </div>
          ))
        ) : (
          products.map((item, i) => (
            <div key={i} style={{ border: `1px solid ${DS.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", background: "white" }}>
              {item.image && <img src={item.image} alt="" style={{ height: 150, objectFit: "contain", padding: 10 }} />}
              <div style={{ padding: 15 }}>
                <h4 style={{ fontSize: 13, height: 35, overflow: "hidden" }}>{item.title}</h4>
                <p style={{ fontWeight: "bold", color: DS.platformBlue }}>{item.price} {item.currency}</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                  <small>{item.source}</small>
                  {/* LIEN ICI */}
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ padding: "5px 10px", background: "#1e293b", color: "white", borderRadius: 5, fontSize: 11, textDecoration: "none" }}>VOIR →</a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB STATS
// ══════════════════════════════════════════════════════════════════
function TabStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/stats/").then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} />;
  if (!data) return null;

  const { stats, by_brand, by_category, gaming, distribution, by_source } = data;
  const fmt = (v) => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";

  const kpis = [
    { label: "PRODUITS", value: stats.count?.toLocaleString("fr-FR"), color: DS.cyan },
    { label: "MÉDIANE", value: `${fmt(stats.median)} MAD`, color: DS.amber },
    { label: "MOYENNE", value: `${fmt(stats.mean)} MAD`, color: DS.amber },
    { label: "ÉCART-TYPE", value: `${fmt(stats.std)} MAD`, color: DS.purple },
    { label: "CV", value: `${stats.cv ?? "—"}%`, color: DS.purple },
    { label: "MIN", value: `${fmt(stats.min)} MAD`, color: DS.green },
    { label: "MAX", value: `${fmt(stats.max)} MAD`, color: DS.red },
    { label: "Q1 / Q3", value: `${fmt(stats.p25)} / ${fmt(stats.p75)}`, color: DS.textSecondary },
  ];

  const Histogram = ({ distribution }) => {
    if (!distribution?.length) return null;
    const max = Math.max(...distribution.map(d => d.count));
    const BAR_COLORS = [DS.cyan, DS.cyanDim, DS.amber, DS.amberDim, DS.purple, DS.green, DS.red, DS.cyan, DS.amber, DS.purple, DS.green, DS.red];
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={BarChart2} accent={DS.cyan}>Distribution des prix</SectionTitle>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160, paddingBottom: 4 }}>
          {distribution.map((b, i) => {
            const h = Math.max(4, (b.count / max) * 140);
            const color = BAR_COLORS[i % BAR_COLORS.length];
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 9, color: DS.textMuted, fontFamily: DS.mono }}>{b.count > 999 ? `${(b.count/1000).toFixed(1)}k` : b.count}</span>
                <div style={{
                  width: "100%", height: h, borderRadius: "3px 3px 0 0",
                  background: `linear-gradient(180deg, ${color}, ${color}66)`,
                  cursor: "default", transition: "opacity 0.2s",
                }}
                  onMouseEnter={e => e.target.style.opacity = 0.7}
                  onMouseLeave={e => e.target.style.opacity = 1}
                  title={`${b.label}: ${b.count.toLocaleString("fr-FR")} produits`}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 3, borderTop: `1px solid ${DS.border}`, paddingTop: 6 }}>
          {distribution.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: DS.textMuted, fontFamily: DS.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {b.label?.split("–")[0]}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: DS.textMuted, marginTop: 4 }}>Plages de prix en MAD</div>
      </Card>
    );
  };

  const Boxplot = ({ bdata }) => {
    if (!bdata?.length) return null;
    const W = 640, H = 280, PL = 70, PR = 20, PT = 20, PB = 70;
    const CW = W - PL - PR, CH = H - PT - PB;
    const allVals = bdata.flatMap(d => [d.min, d.q1, d.median, d.q3, d.max].filter(v => v != null));
    const minV = Math.min(...allVals), maxV = Math.max(...allVals);
    const range = maxV - minV || 1;
    const toY = v => PT + CH - ((v - minV) / range) * CH;
    const slotW = CW / bdata.length;
    const cx = i => PL + slotW * i + slotW / 2;
    const BOX_W = Math.min(50, slotW * 0.45);
    const PLT_COLORS = { aliexpress: DS.green, amazon: DS.cyan, jumia: DS.amber };
    const yTicks = Array.from({ length: 6 }, (_, i) => minV + (i / 5) * range);
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={TrendingUp} accent={DS.amber}>Boxplot comparatif par plateforme</SectionTitle>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          <defs>
            {bdata.map((d, i) => {
              const c = PLT_COLORS[d.source?.toLowerCase()] || DS.purple;
              return <linearGradient key={i} id={`box-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.6" />
                <stop offset="100%" stopColor={c} stopOpacity="0.15" />
              </linearGradient>;
            })}
          </defs>
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PL} y1={toY(t)} x2={W - PR} y2={toY(t)} stroke={DS.border} strokeWidth="1" />
              <text x={PL - 8} y={toY(t) + 4} fontSize="10" fill={DS.textMuted} textAnchor="end" fontFamily="JetBrains Mono, monospace">{Math.round(t / 1000)}k</text>
            </g>
          ))}
          <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH} stroke={DS.border} strokeWidth="1" />
          {bdata.map((d, i) => {
            if (!d.q1 || !d.q3 || !d.median) return null;
            const key = d.source?.toLowerCase();
            const c = PLT_COLORS[key] || DS.purple;
            const half = BOX_W / 2, cap = BOX_W * 0.35;
            return (
              <g key={i}>
                {d.max && d.q3 && <><line x1={cx(i)} y1={toY(d.max)} x2={cx(i)} y2={toY(d.q3)} stroke={c} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" /><line x1={cx(i) - cap} y1={toY(d.max)} x2={cx(i) + cap} y2={toY(d.max)} stroke={c} strokeWidth="2" /></>}
                <rect x={cx(i) - half} y={toY(d.q3)} width={BOX_W} height={Math.max(4, toY(d.q1) - toY(d.q3))} fill={`url(#box-grad-${i})`} stroke={c} strokeWidth="1.5" rx="3" />
                <line x1={cx(i) - half} y1={toY(d.median)} x2={cx(i) + half} y2={toY(d.median)} stroke={c} strokeWidth="2.5" />
                <text x={cx(i)} y={toY(d.median) - 7} fontSize="10" fill={c} textAnchor="middle" fontWeight="600" fontFamily="JetBrains Mono, monospace">{Math.round(d.median / 1000)}k</text>
                {d.min && d.q1 && <><line x1={cx(i)} y1={toY(d.q1)} x2={cx(i)} y2={toY(d.min)} stroke={c} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" /><line x1={cx(i) - cap} y1={toY(d.min)} x2={cx(i) + cap} y2={toY(d.min)} stroke={c} strokeWidth="2" /></>}
                <text x={cx(i)} y={PT + CH + 18} fontSize="11" fill={DS.textPrimary} textAnchor="middle" fontWeight="500" fontFamily="JetBrains Mono, monospace">{d.source}</text>
                <text x={cx(i)} y={PT + CH + 34} fontSize="9" fill={DS.textMuted} textAnchor="middle" fontFamily="JetBrains Mono, monospace">({d.count?.toLocaleString("fr-FR")})</text>
              </g>
            );
          })}
        </svg>
        <div style={{ fontSize: 10, color: DS.textMuted, marginTop: 4 }}>▬ Médiane &nbsp;□ Q1–Q3 &nbsp;╌ Min/Max</div>
      </Card>
    );
  };

  const BrandTable = ({ by_brand }) => {
    if (!by_brand?.length) return null;
    const max = Math.max(...by_brand.map(b => b.count));
    const colors = [DS.cyan, DS.amber, DS.green, DS.purple, DS.red, DS.cyan, DS.amber, DS.green];
    return (
      <Card>
        <SectionTitle icon={Package} accent={DS.cyan}>Top marques</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Marque", "Produits", "Part", "Médiane"].map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 8px", fontSize: 10, fontWeight: 600, color: DS.textSecondary, borderBottom: `1px solid ${DS.border}`, fontFamily: DS.mono, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {by_brand.slice(0, 8).map((b, i) => {
              const pct = Math.round((b.count / max) * 100);
              const color = colors[i % colors.length];
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${DS.border}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = DS.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, color: DS.textPrimary }}>{b.brand_detected || b.brand}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", color: DS.textPrimary, fontFamily: DS.mono, fontWeight: 600 }}>{b.count?.toLocaleString("fr-FR")}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: DS.bg3, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: DS.textMuted, fontFamily: DS.mono, minWidth: 26, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", color: DS.textSecondary, fontFamily: DS.mono }}>{fmt(b.median)} MAD</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  };

  const Categories = ({ by_category }) => {
    if (!by_category?.length) return null;
    const max = Math.max(...by_category.map(c => c.count));
    const catColors = { "très_bas": DS.green, "bas": DS.cyan, "moyen": DS.amber, "haut": DS.purple, "très_haut": DS.red };
    const labels = { "très_bas": "Très bas (< 1 500)", "bas": "Bas (1 500–4 000)", "moyen": "Moyen (4 000–10 000)", "haut": "Haut (10 000–25 000)", "très_haut": "Très haut (> 25 000)" };
    return (
      <Card>
        <SectionTitle icon={TrendingUp} accent={DS.amber}>Gammes de prix</SectionTitle>
        {by_category.map((c, i) => {
          const key = c.price_category?.toLowerCase().replace(/ /g, "_");
          const color = catColors[key] || DS.cyan;
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: DS.textPrimary, fontWeight: 500 }}>{labels[key] || c.price_category}</span>
                <span style={{ color: DS.textMuted, fontFamily: DS.mono }}>{c.count?.toLocaleString("fr-FR")}</span>
              </div>
              <ProgressBar value={pct} color={color} height={6} />
            </div>
          );
        })}
      </Card>
    );
  };

  const GamingSection = ({ gaming }) => {
    if (!gaming?.gaming) return null;
    return (
      <Card style={{ marginBottom: 16 }} accent={DS.purple}>
        <SectionTitle icon={Zap} accent={DS.purple}>Gaming vs Standard</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[{ label: "Gaming", g: gaming.gaming, color: DS.purple }, { label: "Standard", g: gaming.non_gaming, color: DS.cyan }].map(({ label, g, color }, i) => (
            <div key={i} style={{ padding: "1rem", borderRadius: 8, background: DS.bg0, border: `1px solid ${color}30` }}>
              <Tag color={color}>{label}</Tag>
              <div style={{ fontSize: 28, fontWeight: 700, color: DS.textPrimary, fontFamily: DS.mono, margin: "8px 0 4px" }}>{g?.count?.toLocaleString("fr-FR")}</div>
              <div style={{ fontSize: 11, color: DS.textMuted }}>Médiane : <span style={{ color, fontFamily: DS.mono, fontWeight: 600 }}>{fmt(g?.median)} MAD</span></div>
            </div>
          ))}
        </div>
        {gaming.mannwhitney && (
          <div style={{ padding: "8px 12px", borderRadius: 6, background: DS.bg0, fontSize: 11, fontFamily: DS.mono, color: DS.textMuted }}>
            Mann-Whitney p-value : <strong style={{ color: DS.textPrimary }}>{gaming.mannwhitney.pvalue}</strong>
            {gaming.mannwhitney.pvalue < 0.05 ? <span style={{ color: DS.green, marginLeft: 8 }}>✓ Significatif</span> : <span style={{ color: DS.amber, marginLeft: 8 }}>⚠ Non significatif</span>}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        {kpis.map(({ label, value, color }, i) => (
          <StatPill key={i} label={label} value={value} color={color} delay={i * 0.04} />
        ))}
      </div>
      {distribution && <Histogram distribution={distribution} />}
      {by_source?.length > 0 && <Boxplot bdata={by_source} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {by_brand && <BrandTable by_brand={by_brand} />}
        {by_category && <Categories by_category={by_category} />}
      </div>
      {gaming && <GamingSection gaming={gaming} />}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.open(`${API}/export/csv/`, "_blank")} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
          background: `${DS.green}18`, border: `1px solid ${DS.green}40`,
          borderRadius: 8, color: DS.green, cursor: "pointer", fontWeight: 600,
          fontSize: 12, fontFamily: DS.mono, letterSpacing: 0.5,
        }}>
          <Download size={14} /> EXPORTER CSV
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB CLUSTERING
// ══════════════════════════════════════════════════════════════════
function TabClustering() {
  const [algo, setAlgo] = useState("kmeans");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eps, setEps] = useState(0.1);
  const [minSamples, setMinSamples] = useState(3);

  const fmtMAD = (v) => v != null ? v.toLocaleString("fr-FR") + " MAD" : "—";
  const fmtNum = (v) => v != null ? v.toLocaleString("fr-FR") : "—";

  const fetchClustering = async (a = algo, e = eps, ms = minSamples) => {
    setLoading(true); setError(null);
    try {
      const url = a === "dbscan" ? `/clustering/?algo=dbscan&eps=${e}&min_samples=${ms}` : "/clustering/?algo=kmeans";
      const json = await apiFetch(url);
      setData(json);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  useEffect(() => { fetchClustering(); }, []);

  const ClusterCards = ({ summary }) => {
    if (!summary?.length) return null;
    const total = summary.reduce((s, c) => s + (c.count || 0), 0);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        {summary.map((c, i) => {
          const color = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
          const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
          return (
            <div key={i} className="fade-in" style={{
              background: DS.bg0, border: `1px solid ${color}30`,
              borderRadius: 10, padding: "1rem", position: "relative", overflow: "hidden",
              animationDelay: `${i * 0.06}s`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${color}06, transparent)` }} />
              <Tag color={color} size="sm">SEG {i + 1}</Tag>
              <div style={{ fontSize: 13, fontWeight: 600, color: DS.textPrimary, margin: "8px 0 4px" }}>{c.cluster}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: DS.textPrimary, fontFamily: DS.mono, lineHeight: 1 }}>{fmtNum(c.count)}</div>
              <div style={{ fontSize: 11, color: DS.textMuted, margin: "6px 0 4px" }}>Médiane : <span style={{ color, fontFamily: DS.mono, fontWeight: 600 }}>{fmtMAD(c.median)}</span></div>
              <div style={{ fontSize: 10, color: DS.textMuted, fontFamily: DS.mono }}>{fmtMAD(c.min)} — {fmtMAD(c.max)}</div>
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={pct} color={color} height={3} />
                <span style={{ fontSize: 10, color: DS.textMuted, fontFamily: DS.mono, marginTop: 4, display: "block" }}>{pct}% du marché</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const HBarChart = ({ summary }) => {
    if (!summary?.length) return null;
    const max = Math.max(...summary.map(c => c.count));
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={BarChart2} accent={DS.cyan}>Répartition par segment</SectionTitle>
        {summary.map((c, i) => {
          const color = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: DS.textSecondary, fontWeight: 500 }}>{c.cluster}</span>
                <span style={{ color: DS.textPrimary, fontFamily: DS.mono, fontWeight: 600 }}>{fmtNum(c.count)}</span>
              </div>
              <div style={{ height: 24, background: DS.bg3, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 4, transition: "width 0.7s ease" }} />
                <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontFamily: DS.mono, color: pct > 30 ? DS.bg0 : color, fontWeight: 600 }}>
                  {fmtMAD(c.median)}
                </span>
              </div>
            </div>
          );
        })}
      </Card>
    );
  };

  const PriceRangeChart = ({ summary }) => {
    if (!summary?.length) return null;
    const sorted = [...summary].sort((a, b) => (a.median || 0) - (b.median || 0));
    const maxVal = Math.max(...sorted.map(c => c.max || 0));
    const total = sorted.reduce((s, c) => s + (c.count || 0), 0);
    const fmt = v => v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v) + "";
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={TrendingUp} accent={DS.amber}>Plages de prix par segment</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Segment", "Min", "Plage", "Max", "Produits"].map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? "left" : i === 2 ? "left" : "right", padding: "6px 8px", fontSize: 10, fontWeight: 600, color: DS.textSecondary, borderBottom: `1px solid ${DS.border}`, fontFamily: DS.mono, letterSpacing: 1, textTransform: "uppercase", width: i === 2 ? "38%" : "auto" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const color = CLUSTER_PALETTE[summary.indexOf(c) % CLUSTER_PALETTE.length];
              const minPct = ((c.min || 0) / maxVal) * 100;
              const maxPct = ((c.max || 0) / maxVal) * 100;
              const medPct = ((c.median || 0) / maxVal) * 100;
              const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${DS.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = DS.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: DS.textPrimary }}>{c.cluster}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", fontSize: 10, color: DS.textMuted, fontFamily: DS.mono }}>{fmt(c.min)}k</td>
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ position: "relative", height: 20, background: DS.bg3, borderRadius: 3 }}>
                      <div style={{ position: "absolute", top: 0, height: "100%", left: `${minPct}%`, width: `${maxPct - minPct}%`, background: `${color}22`, border: `1px solid ${color}40`, borderRadius: 3 }} />
                      <div style={{ position: "absolute", top: 0, height: "100%", left: `${medPct - 0.5}%`, width: 2, background: color, borderRadius: 1 }} />
                      <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 9, fontWeight: 600, color, whiteSpace: "nowrap", fontFamily: DS.mono }}>
                        {fmt(c.median)}k
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", fontSize: 10, color: DS.textMuted, fontFamily: DS.mono }}>{fmt(c.max)}k</td>
                  <td style={{ textAlign: "right", padding: "10px 8px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: DS.textPrimary, fontFamily: DS.mono }}>{fmtNum(c.count)}</span>
                    <span style={{ fontSize: 9, color: DS.textMuted, marginLeft: 4 }}>{pct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  };

  const Donut = ({ summary }) => {
    if (!summary?.length) return null;
    const total = summary.reduce((s, c) => s + (c.count || 0), 0);
    const R = 70, CX = 90, CY = 90, stroke = 28;
    let cumAngle = -Math.PI / 2;
    const slices = summary.map((c, i) => {
      const frac = c.count / total;
      const angle = frac * 2 * Math.PI;
      const x1 = CX + R * Math.cos(cumAngle), y1 = CY + R * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = CX + R * Math.cos(cumAngle), y2 = CY + R * Math.sin(cumAngle);
      return { x1, y1, x2, y2, large: frac > 0.5 ? 1 : 0, color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length], pct: Math.round(frac * 100), name: c.cluster, frac };
    });
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={Activity} accent={DS.cyan}>Part de marché par segment</SectionTitle>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <defs><filter id="glow-donut"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
            {slices.map((s, i) => (
              <path key={i} d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`} fill={s.color} opacity="0.8" stroke={DS.bg0} strokeWidth="2" />
            ))}
            <circle cx={CX} cy={CY} r={R - stroke} fill={DS.bg0} />
            <text x={CX} y={CY - 8} textAnchor="middle" fontSize="18" fontWeight="700" fill={DS.textPrimary} fontFamily="JetBrains Mono, monospace">{total.toLocaleString("fr-FR")}</text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize="9" fill={DS.textMuted} fontFamily="JetBrains Mono, monospace">PRODUITS</text>
          </svg>
          <div style={{ flex: 1 }}>
            {slices.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: DS.textSecondary }}>{s.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color, fontFamily: DS.mono }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  const PCAScatter = ({ scatterData, summary }) => {
    const [active, setActive] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    const points = useMemo(() => {
      if (!scatterData?.length) return [];
      const prices = scatterData.map(d => d.price);
      const minP = Math.min(...prices), maxP = Math.max(...prices);
      const rng = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
      return scatterData.map((d, i) => {
        const r = rng(i * 31 + 7);
        const normX = ((d.price - minP) / (maxP - minP || 1));
        const clusterIdx = summary ? summary.findIndex(s => s.cluster === d.cluster) : -1;
        return { x: normX + (r() - 0.5) * 0.15, y: 0.5 + (r() - 0.5) * 0.8, cluster: d.cluster, color: CLUSTER_PALETTE[clusterIdx >= 0 ? clusterIdx % CLUSTER_PALETTE.length : i % CLUSTER_PALETTE.length], price: d.price, title: d.title };
      });
    }, [scatterData, summary]);
    if (!points?.length) return null;
    const clusters = summary ? summary.map(s => s.cluster) : [...new Set(points.map(d => d.cluster))];
    const W = 580, H = 300, PAD = 45;
    const xs = points.map(d => d.x), ys = points.map(d => d.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const toX = x => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
    const toY = y => PAD + (H - PAD * 2) - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);
    const sample = points.length > 500 ? points.filter((_, i) => i % Math.ceil(points.length / 500) === 0) : points;
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={Eye} accent={DS.purple}>PCA — Clusters projetés en 2D</SectionTitle>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => setActive(null)} style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, cursor: "pointer", background: !active ? DS.textPrimary : DS.bg0, color: !active ? DS.bg0 : DS.textSecondary, border: `1px solid ${DS.border}`, fontFamily: DS.mono }}>ALL</button>
          {clusters.map((c, i) => { const color = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length]; const isA = active === c; return (<button key={i} onClick={() => setActive(isA ? null : c)} style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, cursor: "pointer", background: isA ? color : DS.bg0, color: isA ? DS.bg0 : DS.textSecondary, border: `1px solid ${isA ? color : DS.border}`, fontFamily: DS.mono }}>{c}</button>); })}
        </div>
        <div style={{ position: "relative" }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: DS.bg0, borderRadius: 8, border: `1px solid ${DS.border}` }}>
            {[0.25, 0.5, 0.75].map((t, i) => (<line key={i} x1={PAD + t * (W - PAD * 2)} y1={PAD} x2={PAD + t * (W - PAD * 2)} y2={H - PAD} stroke={DS.border} strokeWidth="1" strokeDasharray="4,3" />))}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={DS.border} strokeWidth="1" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={DS.border} strokeWidth="1" />
            <text x={W / 2} y={H - 10} fontSize="10" fill={DS.textMuted} textAnchor="middle" fontFamily="JetBrains Mono, monospace">Prix (faible → élevé)</text>
            {sample.map((d, i) => (<circle key={i} cx={Math.max(PAD + 5, Math.min(W - PAD - 5, toX(d.x)))} cy={Math.max(PAD + 5, Math.min(H - PAD - 5, toY(d.y)))} r="4" fill={d.color} fillOpacity={active && active !== d.cluster ? 0.04 : 0.75} stroke={active === d.cluster ? "#000" : "none"} strokeWidth="1" style={{ cursor: "pointer" }} onMouseEnter={e => setTooltip({ d, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })} onMouseLeave={() => setTooltip(null)} />))}
          </svg>
          {tooltip && (
            <div style={{ position: "absolute", left: tooltip.x + 12, top: tooltip.y - 36, background: DS.bg0, border: `1px solid ${DS.borderGlow}`, color: DS.textPrimary, padding: "8px 12px", borderRadius: 8, fontSize: 11, pointerEvents: "none", maxWidth: 200, zIndex: 10, fontFamily: DS.mono, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
              <div style={{ fontWeight: 600, color: DS.cyan, marginBottom: 2 }}>{tooltip.d.cluster}</div>
              <div style={{ color: DS.textMuted }}>{tooltip.d.price?.toLocaleString("fr-FR")} MAD</div>
              {tooltip.d.title && <div style={{ color: DS.textMuted, fontSize: 10, marginTop: 2 }}>{tooltip.d.title.slice(0, 28)}…</div>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          {clusters.map((c, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: DS.textMuted, fontFamily: DS.mono }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length], display: "inline-block" }} />{c} ({points.filter(d => d.cluster === c).length})</div>))}
        </div>
      </Card>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, background: DS.bg0, padding: 4, borderRadius: 8, border: `1px solid ${DS.border}`, width: "fit-content" }}>
        {["kmeans", "dbscan"].map(a => (
          <button key={a} onClick={() => { setAlgo(a); fetchClustering(a); }} style={{
            padding: "8px 24px", borderRadius: 6,
            background: algo === a ? DS.bg3 : "transparent",
            border: algo === a ? `1px solid ${DS.cyan}` : "1px solid transparent",
            color: algo === a ? DS.cyan : DS.textSecondary,
            cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: DS.mono, letterSpacing: 1, transition: "all 0.2s",
          }}>
            {a.toUpperCase()}
          </button>
        ))}
      </div>
      {algo === "dbscan" && (
        <Card style={{ marginBottom: 16 }} accent={DS.amber}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: DS.textSecondary, display: "flex", alignItems: "center", gap: 8, fontFamily: DS.mono }}>
              EPS <input type="number" value={eps} step="0.05" min="0.05" onChange={e => setEps(parseFloat(e.target.value))} style={{ width: 80 }} />
            </label>
            <label style={{ fontSize: 12, color: DS.textSecondary, display: "flex", alignItems: "center", gap: 8, fontFamily: DS.mono }}>
              MIN_SAMPLES <input type="number" value={minSamples} step="1" min="1" onChange={e => setMinSamples(parseInt(e.target.value))} style={{ width: 70 }} />
            </label>
            <button onClick={() => fetchClustering("dbscan", eps, minSamples)} style={{ padding: "8px 16px", borderRadius: 6, background: `${DS.amber}22`, border: `1px solid ${DS.amber}40`, color: DS.amber, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: DS.mono }}>APPLIQUER</button>
          </div>
        </Card>
      )}
      {error && <ErrMsg msg={error} />}
      {data && !loading && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {data.best_k && <Tag color={DS.green}>k optimal = {data.best_k}</Tag>}
          {data.n_clusters !== undefined && <Tag color={DS.purple}>{data.n_clusters} clusters</Tag>}
          {data.silhouette !== undefined && <Tag color={DS.cyan}>Silhouette = {data.silhouette}</Tag>}
        </div>
      )}
      {loading ? <Spinner /> : data && (
        <>
          <ClusterCards summary={data.summary} />
          <HBarChart summary={data.summary} />
          <PriceRangeChart summary={data.summary} />
          {algo === "kmeans" && <Donut summary={data.summary} />}
          {data.scatter?.length > 0 && <PCAScatter scatterData={data.scatter} summary={data.summary} />}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB ANOMALIES
// ══════════════════════════════════════════════════════════════════
function AnomaliesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price_desc");

  useEffect(() => {
    apiFetch("/anomalies/").then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} />;
  if (!data) return null;

  const { summary = [], anomalies = [], total } = data;
  const seen = new Set();
  const unique = anomalies.filter(a => { const key = `${a.title?.slice(0, 60)}_${a.price}`; if (seen.has(key)) return false; seen.add(key); return true; });
  const categories = [...new Set(unique.map(a => a.price_category).filter(Boolean))];
  const filtered = (filter === "all" ? unique : unique.filter(a => a.price_category === filter))
    .sort((a, b) => sortBy === "price_desc" ? b.price - a.price : a.price - b.price);
  const fmt = v => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";
  const METHOD_COLORS = { "IQR": DS.amber, "Z-score": DS.cyan, "Isolation Forest": DS.red, "LOF": DS.purple };

  const DistribChart = () => {
    const bins = [
      { label: "< 3k", min: 0, max: 3000 }, { label: "3–6k", min: 3000, max: 6000 },
      { label: "6–12k", min: 6000, max: 12000 }, { label: "12–25k", min: 12000, max: 25000 },
      { label: "25–50k", min: 25000, max: 50000 }, { label: "> 50k", min: 50000, max: Infinity },
    ];
    const counts = bins.map(b => ({ ...b, count: unique.filter(a => a.price >= b.min && a.price < b.max).length }));
    const max = Math.max(...counts.map(c => c.count), 1);
    const colors = [DS.cyan, DS.amber, DS.green, DS.purple, DS.red, DS.cyanDim];
    return (
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={BarChart2} accent={DS.red}>Distribution des anomalies par tranche de prix</SectionTitle>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
          {counts.map((b, i) => {
            const h = Math.max(4, (b.count / max) * 110);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: colors[i], fontFamily: DS.mono }}>{b.count}</span>
                <div style={{ width: "100%", height: h, background: `linear-gradient(180deg, ${colors[i]}, ${colors[i]}44)`, borderRadius: "3px 3px 0 0" }} title={`${b.label}: ${b.count}`} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${DS.border}`, paddingTop: 6 }}>
          {counts.map((b, i) => (<div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: DS.textMuted, fontFamily: DS.mono }}>{b.label}</div>))}
        </div>
      </Card>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        <StatPill label="ANOMALIES UNIQUES" value={unique.length} color={DS.red} />
        {summary.map((m, i) => {
          const color = METHOD_COLORS[m.methode] || DS.textSecondary;
          return <StatPill key={i} label={m.methode.toUpperCase()} value={m.anomalies} color={color} delay={i * 0.05} />;
        })}
      </div>
      {summary.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle icon={AlertTriangle} accent={DS.red}>Comparaison des méthodes</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["Méthode", "Anomalies", "%", "Type", "Barre"].map((h, i) => (<th key={i} style={{ textAlign: i < 2 ? "left" : "right", padding: "6px 8px", fontSize: 10, fontWeight: 600, color: DS.textSecondary, borderBottom: `1px solid ${DS.border}`, fontFamily: DS.mono, letterSpacing: 1 }}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {summary.map((m, i) => {
                const color = METHOD_COLORS[m.methode] || DS.cyan;
                const maxA = Math.max(...summary.map(x => x.anomalies), 1);
                const pct = Math.round((m.anomalies / maxA) * 100);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${DS.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = DS.bg3}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 8px" }}><Tag color={color}>{m.methode}</Tag></td>
                    <td style={{ padding: "10px 8px", fontWeight: 700, color: DS.textPrimary, fontFamily: DS.mono }}>{m.anomalies}</td>
                    <td style={{ textAlign: "right", padding: "10px 8px", color: DS.textMuted, fontFamily: DS.mono }}>{m.pourcentage}%</td>
                    <td style={{ textAlign: "right", padding: "10px 8px", fontSize: 10, color: DS.textMuted }}>
                      {m.methode === "Isolation Forest" || m.methode === "LOF" ? "Multi" : "Uni"}variée
                    </td>
                    <td style={{ padding: "10px 8px", minWidth: 100 }}>
                      <ProgressBar value={pct} color={color} height={4} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <DistribChart />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setFilter("all")} style={{
              padding: "5px 14px", borderRadius: 999, fontSize: 11, cursor: "pointer",
              background: filter === "all" ? DS.red : DS.bg0,
              border: `1px solid ${filter === "all" ? DS.red : DS.border}`,
              color: filter === "all" ? DS.bg0 : DS.textSecondary, fontFamily: DS.mono, fontWeight: 600,
            }}>ALL ({unique.length})</button>
            {categories.map((cat, i) => (
              <button key={i} onClick={() => setFilter(cat)} style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 11, cursor: "pointer",
                background: filter === cat ? DS.amber : DS.bg0,
                border: `1px solid ${filter === cat ? DS.amber : DS.border}`,
                color: filter === cat ? DS.bg0 : DS.textSecondary, fontFamily: DS.mono, fontWeight: 600,
              }}>{cat?.replace(/_/g, " ")} ({unique.filter(a => a.price_category === cat).length})</button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 11, background: DS.bg0, border: `1px solid ${DS.border}`, color: DS.textSecondary, fontFamily: DS.mono }}>
            <option value="price_desc">Prix ↓</option>
            <option value="price_asc">Prix ↑</option>
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Produit", "Marque", "Prix", "Gamme", "Alerte"].map((h, i) => (<th key={i} style={{ textAlign: i === 2 ? "right" : "left", padding: "6px 8px", fontSize: 10, fontWeight: 600, color: DS.textSecondary, borderBottom: `1px solid ${DS.border}`, fontFamily: DS.mono, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>))}</tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((a, i) => {
              const isHigh = a.price > 3000;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${DS.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = DS.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 8px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: DS.textPrimary }} title={a.title}>{a.title?.slice(0, 50)}{a.title?.length > 50 ? "…" : ""}</td>
                  <td style={{ padding: "10px 8px", color: DS.textSecondary, fontFamily: DS.mono, fontSize: 11 }}>{a.brand_detected || "—"}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: DS.cyan, fontFamily: DS.mono }}>{fmt(a.price)} MAD</td>
                  <td style={{ padding: "10px 8px" }}><Tag color={DS.amber} size="sm">{a.price_category?.replace(/_/g, " ") || "—"}</Tag></td>
                  <td style={{ padding: "10px 8px" }}>
                    {isHigh ? <Tag color={DS.red} size="sm">⬆ ÉLEVÉ</Tag> : <Tag color={DS.amber} size="sm">⬇ BAS</Tag>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 50 && (
          <div style={{ fontSize: 11, color: DS.textMuted, textAlign: "center", marginTop: 12, padding: 8, background: DS.bg0, borderRadius: 6, fontFamily: DS.mono }}>
            +{filtered.length - 50} anomalies supplémentaires — affine le filtre
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB ASSOCIATION
// ══════════════════════════════════════════════════════════════════
function TabAssociation() {
  const [tab, setTab] = useState("laptops");
  const [dataLap, setDataLap] = useState(null);
  const [dataAcc, setDataAcc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("lift");
  const [filterText, setFilter] = useState("");

  useEffect(() => {
    Promise.all([apiFetch("/association/"), apiFetch("/association/accessories/")])
      .then(([lap, acc]) => { setDataLap(lap); setDataAcc(acc); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} />;

  const cleanLabel = (str) => {
    if (!str) return "—";
    return str.replace(/is_gaming=is_gaming=/g, "gaming=").replace(/has_gpu=has_gpu=/g, "gpu=").replace(/brand_detected=/g, "marque=").replace(/price_category=/g, "gamme=").replace(/accessory_category=/g, "cat=").replace(/price_range=/g, "prix=").replace(/source=/g, "src=").replace(/_/g, " ");
  };

  const LIFT_COLOR = (lift) => {
    if (lift >= 5) return DS.red;
    if (lift >= 3) return DS.amber;
    if (lift >= 1.5) return DS.green;
    return DS.cyan;
  };

  const CONF_COLOR = (conf) => conf >= 0.9 ? DS.green : conf >= 0.7 ? DS.amber : DS.cyan;

  const RulesTable = ({ rules, emptyMsg }) => {
    if (!rules?.length) return (
      <div style={{ textAlign: "center", padding: 60, color: DS.textMuted, fontSize: 12, fontFamily: DS.mono }}>{emptyMsg || "Aucune règle disponible."}</div>
    );
    const filtered = rules
      .filter(r => !filterText || cleanLabel(r.antecedent).toLowerCase().includes(filterText.toLowerCase()) || cleanLabel(r.consequent).toLowerCase().includes(filterText.toLowerCase()))
      .sort((a, b) => b[sortBy] - a[sortBy]);
    return (
      <>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Si (antécédent)", "", "Alors (conséquent)", "Support", "Confiance", "Lift"].map((h, i) => (
              <th key={i} style={{ textAlign: i >= 3 ? "right" : "left", padding: "6px 8px", fontSize: 10, fontWeight: 600, color: DS.textSecondary, borderBottom: `1px solid ${DS.border}`, fontFamily: DS.mono, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.slice(0, 40).map((r, i) => {
              const liftC = LIFT_COLOR(r.lift);
              const confC = CONF_COLOR(r.confidence);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${DS.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = DS.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 8px", maxWidth: 200 }}><Tag color={DS.textMuted} size="sm">{cleanLabel(r.antecedent)}</Tag></td>
                  <td style={{ padding: "10px 6px", color: DS.textMuted, fontSize: 14 }}>→</td>
                  <td style={{ padding: "10px 8px", maxWidth: 200 }}><Tag color={DS.cyan} size="sm">{cleanLabel(r.consequent)}</Tag></td>
                  <td style={{ textAlign: "right", padding: "10px 8px", fontSize: 11, color: DS.textMuted, fontFamily: DS.mono }}>{(r.support * 100).toFixed(1)}%</td>
                  <td style={{ padding: "10px 8px", minWidth: 90 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <div style={{ width: 50, height: 4, background: DS.bg3, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(r.confidence * 100).toFixed(0)}%`, background: confC, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: confC, fontFamily: DS.mono }}>{(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px" }}>
                    <Tag color={liftC} size="sm">×{r.lift?.toFixed(2)}</Tag>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 40 && <div style={{ fontSize: 11, color: DS.textMuted, textAlign: "center", marginTop: 10, fontFamily: DS.mono }}>{filtered.length - 40} règles supplémentaires</div>}
      </>
    );
  };

  const AccStats = ({ stats }) => {
    if (!stats?.length) return null;
    const catColors = { mouse: DS.cyan, souris: DS.cyan, stand: DS.green, laptop_stand: DS.green, usb: DS.amber, usb_flash_drive: DS.amber, cooling_pad: DS.purple, sac_laptop: DS.red };
    const fmt = v => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        {stats.map((s, i) => {
          const key = s.category?.toLowerCase().replace(/ /g, "_");
          const color = catColors[key] || DS.cyan;
          return (
            <div key={i} style={{ background: DS.bg0, border: `1px solid ${color}30`, borderRadius: 10, padding: "0.875rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <Tag color={color} size="sm">{s.category?.replace(/_/g, " ")}</Tag>
              <div style={{ fontSize: 22, fontWeight: 700, color: DS.textPrimary, fontFamily: DS.mono, margin: "8px 0 4px" }}>{s.count?.toLocaleString("fr-FR")}</div>
              <div style={{ fontSize: 11, color: DS.textMuted }}>Médiane : <span style={{ color, fontFamily: DS.mono }}>{fmt(s.median)} MAD</span></div>
            </div>
          );
        })}
      </div>
    );
  };

  const lapRules = dataLap?.rules || [];
  const accRules = dataAcc?.rules_accessories || [];
  const crossRules = dataAcc?.rules_cross || [];
  const accStats = dataAcc?.stats_by_category || [];

  const TABS_ASSOC = [
    { id: "laptops", label: `LAPTOPS`, count: lapRules.length },
    { id: "accessoires", label: `ACCESSOIRES`, count: accRules.length },
    { id: "cross", label: `CROSS`, count: crossRules.length },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[{ label: "RÈGLES LAPTOPS", value: lapRules.length, color: DS.cyan }, { label: "RÈGLES ACCESSOIRES", value: accRules.length, color: DS.green }, { label: "RÈGLES CROISÉES", value: crossRules.length, color: DS.purple }].map(({ label, value, color }, i) => (
          <StatPill key={i} label={label} value={value} color={color} delay={i * 0.05} />
        ))}
      </div>
      <div style={{ background: `${DS.cyan}08`, border: `1px solid ${DS.cyan}20`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: DS.textSecondary, lineHeight: 1.7 }}>
        <span style={{ color: DS.cyan, fontWeight: 600 }}>Règles d'association</span> — liens entre caractéristiques et gammes de prix.<br />
        Ex : <span style={{ color: DS.textPrimary, fontFamily: DS.mono }}>marque=HP ∧ gaming=Oui → gamme=haut de gamme</span><br />
        <span style={{ fontSize: 11, color: DS.textMuted, fontFamily: DS.mono }}>support ≥ 8% | confiance ≥ 60% | lift ≥ 1.2</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: DS.bg0, padding: 4, borderRadius: 8, border: `1px solid ${DS.border}` }}>
        {TABS_ASSOC.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "8px 12px", borderRadius: 6,
            background: tab === t.id ? DS.bg3 : "transparent",
            border: tab === t.id ? `1px solid ${DS.cyan}` : "1px solid transparent",
            color: tab === t.id ? DS.cyan : DS.textSecondary,
            cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: DS.mono, letterSpacing: 1, transition: "all 0.2s",
          }}>
            {t.label} <span style={{ color: DS.textMuted, fontWeight: 400 }}>({t.count})</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <Filter size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: DS.textMuted }} />
          <input type="text" placeholder="Filtrer les règles…" value={filterText} onChange={e => setFilter(e.target.value)} style={{ width: "100%", paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ArrowUpDown size={12} color={DS.textMuted} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 11, fontFamily: DS.mono }}>
            <option value="lift">Lift ↓</option>
            <option value="confidence">Confiance ↓</option>
            <option value="support">Support ↓</option>
          </select>
        </div>
      </div>
      <Card>
        {tab === "laptops" && <RulesTable rules={lapRules} emptyMsg="Aucune règle laptop." />}
        {tab === "accessoires" && <><AccStats stats={accStats} /><RulesTable rules={accRules} emptyMsg="Aucune règle accessoire." /></>}
        {tab === "cross" && (
          <>
            <div style={{ fontSize: 12, color: DS.textSecondary, marginBottom: 12, padding: "8px 12px", background: DS.bg0, borderRadius: 6, fontFamily: DS.mono }}>
              Ex : <span style={{ color: DS.cyan }}>gamme=premium → souris=haut</span>
            </div>
            <RulesTable rules={crossRules} emptyMsg="Aucune règle croisée." />
          </>
        )}
      </Card>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {[{ label: "Lift ≥ 5 — très fort", color: DS.red }, { label: "Lift ≥ 3 — fort", color: DS.amber }, { label: "Lift ≥ 1.5 — moyen", color: DS.green }, { label: "Lift ≥ 1.2 — faible", color: DS.cyan }].map((l, i) => (
          <Tag key={i} color={l.color} size="sm">{l.label}</Tag>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { id: "products", label: "Produits", icon: ShoppingBag },
  { id: "stats", label: "Statistiques", icon: TrendingUp },
  { id: "clustering", label: "Clustering", icon: BarChart2 },
  { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
  { id: "association", label: "Association", icon: Link2 },
];

const ACCENT_COLORS = {
  products: DS.cyan, stats: DS.amber, clustering: DS.purple, anomalies: DS.red, association: DS.green,
};

function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("products");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

  const [quickStats, setQuickStats] = useState([
    { title: "Produits trackés", value: "—", icon: Package, color: DS.cyan },
    { title: "Prix médian", value: "—", icon: TrendingUp, color: DS.amber },
    { title: "Marques analysées", value: "—", icon: ShoppingBag, color: DS.green },
    { title: "Anomalies détectées", value: "—", icon: AlertTriangle, color: DS.red },
  ]);

  useEffect(() => {
    apiFetch("/stats/").then(d => {
      const s = d.stats || {};
      setQuickStats(prev => [
        { ...prev[0], value: s.count?.toLocaleString("fr-FR") || "—" },
        { ...prev[1], value: s.median ? `${s.median.toLocaleString("fr-FR")} MAD` : "—" },
        { ...prev[2], value: String(d.by_brand?.length || "—") },
        prev[3],
      ]);
    }).catch(() => {});
    apiFetch("/anomalies/").then(d => {
      setQuickStats(prev => prev.map((s, i) => i === 3 ? { ...s, value: String(d.total || "—") } : s));
    }).catch(() => {});
  }, []);

  const accent = ACCENT_COLORS[tab] || DS.cyan;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.bg1 }}>
      <InjectStyle />
      <aside style={{
        width: sidebarOpen ? 220 : 58, flexShrink: 0,
        background: DS.bg0, borderRight: `1px solid ${DS.border}`,
        display: "flex", flexDirection: "column",
        transition: "width 0.25s ease", overflow: "hidden",
        position: "sticky", top: 0, height: "100vh",
        boxShadow: "0 0 20px rgba(0,0,0,0.03)",
      }}>
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${DS.border}`, display: "flex", alignItems: "center", gap: 10, minHeight: 60 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${DS.cyan}22`, border: `1px solid ${DS.cyan}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "glow-pulse 2s ease-in-out infinite" }}>
            <Zap size={16} color={DS.cyan} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DS.textPrimary, letterSpacing: -0.3 }}>PriceIntel</div>
              <div style={{ fontSize: 9, color: DS.textMuted, fontFamily: DS.mono, letterSpacing: 1 }}>INTEL PLATFORM</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ marginLeft: "auto", background: "none", border: "none", color: DS.textMuted, cursor: "pointer", padding: 4, flexShrink: 0 }}>
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {sidebarOpen && <div style={{ fontSize: 9, color: DS.textMuted, fontFamily: DS.mono, letterSpacing: 2, padding: "4px 8px", marginBottom: 4 }}>NAVIGATION</div>}
          {TABS.map(item => {
            const isActive = tab === item.id;
            const color = ACCENT_COLORS[item.id];
            return (
              <button key={item.id} onClick={() => setTab(item.id)} title={!sidebarOpen ? item.label : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "10px 12px" : "10px 14px",
                  borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.2s",
                  background: isActive ? `${color}18` : "transparent",
                  color: isActive ? color : DS.textSecondary,
                  position: "relative", overflow: "hidden",
                }}>
                {isActive && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: color, borderRadius: "0 2px 2px 0" }} />}
                <item.icon size={16} />
                {sidebarOpen && <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 9, color: DS.textMuted, fontFamily: DS.mono, letterSpacing: 2, marginBottom: 8 }}>SYSTÈME</div>
            {[{ label: "API Django", status: "ACTIF", color: DS.green }, { label: "MySQL", status: "OK", color: DS.green }].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0, animation: "pulse-dot 2s ease-in-out infinite" }} />
                <span style={{ flex: 1, fontSize: 11, color: DS.textSecondary }}>{s.label}</span>
                <span style={{ fontSize: 9, color: s.color, fontFamily: DS.mono, fontWeight: 700 }}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          height: 56, background: DS.bg0, borderBottom: `1px solid ${DS.border}`,
          display: "flex", alignItems: "center", padding: "0 20px", gap: 12,
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 11, color: DS.textMuted, fontFamily: DS.mono }}>PriceIntel</span>
            <ChevronRight size={12} color={DS.textMuted} />
            <span style={{ fontSize: 12, color: accent, fontFamily: DS.mono, fontWeight: 600 }}>
              {TABS.find(t => t.id === tab)?.label?.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => navigate('/')} style={{ padding: "6px 8px", background: "none", border: `1px solid ${DS.border}`, borderRadius: 6, color: DS.textMuted, cursor: "pointer", display: "flex", alignItems: "center" }} title="Accueil"><Home size={15} /></button>
            <button onClick={() => window.location.reload()} style={{ padding: "6px 8px", background: "none", border: `1px solid ${DS.border}`, borderRadius: 6, color: DS.textMuted, cursor: "pointer", display: "flex", alignItems: "center" }} title="Actualiser"><RefreshCw size={15} /></button>
            {user && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: DS.bg3, border: `1px solid ${DS.border}`, borderRadius: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${DS.cyan}22`, border: `1px solid ${DS.cyan}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: DS.cyan }}>
                  {(user?.first_name?.[0] || user?.username?.[0] || "A").toUpperCase()}
                </div>
                <span style={{ fontSize: 12, color: DS.textSecondary }}>{user?.first_name || user?.username}</span>
                <button onClick={logout} style={{ background: "none", border: "none", color: DS.textMuted, cursor: "pointer", padding: 2, display: "flex" }} title="Déconnexion"><LogOut size={14} /></button>
              </div>
            )}
          </div>
        </header>
        <main style={{ flex: 1, padding: "20px", overflowY: "auto", background: DS.bg1 }}>
          {tab === "products" && (
            <>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: DS.textPrimary, letterSpacing: -0.5, marginBottom: 4 }}>
                  Bonjour{user?.first_name ? ` ${user.first_name}` : ""} 👋
                </h1>
                <p style={{ color: DS.textSecondary, fontSize: 13 }}>Bienvenue sur <span style={{ color: DS.cyan }}>Price Intelligence Platform</span></p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 24 }}>
                {quickStats.map((stat, i) => (
                  <div key={i} className="fade-in" style={{
                    background: DS.bg0, border: `1px solid ${stat.color}30`,
                    borderRadius: 10, padding: "1rem 1.25rem",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    animationDelay: `${i * 0.07}s`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: DS.textMuted, marginBottom: 6 }}>{stat.title}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: DS.mono }}>{stat.value}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <stat.icon size={20} color={stat.color} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "products" && <TabProducts />}
          {tab === "stats" && <TabStats />}
          {tab === "clustering" && <TabClustering />}
          {tab === "anomalies" && <AnomaliesTab />}
          {tab === "association" && <TabAssociation />}
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ROUTING
// ══════════════════════════════════════════════════════════════════
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/scraping" element={<ScrapingPage />} />
          <Route path="/datamining" element={<DataMiningPage />} />
          <Route path="/*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
