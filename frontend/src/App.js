import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./main.css";
import {
  Search, Bell, ShoppingBag, TrendingUp, Package, Menu, X, AlertTriangle, Link2,
  RefreshCw, ChevronRight, BarChart2, LogOut, User, Lock, AlertCircle,
  Activity, Clock, Database
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

// ══════════════════════════════════════════════════════════════════
// 🛡️ AUTH CONTEXT
// ══════════════════════════════════════════════════════════════════
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("pip_user");
    return saved ? JSON.parse(saved) : null;
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
        const userData = { 
          username, 
          first_name: data.first_name || username,
          is_staff: data.is_staff || false 
        };
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
    } catch (error) {
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

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return { 
      user: null, 
      login: async () => ({ success: true }), 
      logout: () => {}, 
      loading: false 
    };
  }
  return context;
};

// ══════════════════════════════════════════════════════════════════
// 🔐 COMPOSANT LOGIN
// ══════════════════════════════════════════════════════════════════
function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(username, password);
    if (!result.success) setError(result.error || "Erreur de connexion");
    setLoading(false);
  };

  return (
    <div className="pip-login-container">
      <div className="pip-login-card">
        <div className="pip-login-header">
          <div className="pip-login-logo">
            <ShoppingBag size={40} color="#f97316" />
          </div>
          <h1>PriceIntel</h1>
          <p>Plateforme d'Intelligence Prix</p>
        </div>
        <form onSubmit={handleSubmit} className="pip-login-form">
          <div className="pip-login-input-group">
            <label><User size={18} /> Nom d'utilisateur</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Entrez votre nom" required disabled={loading} autoFocus />
          </div>
          <div className="pip-login-input-group">
            <label><Lock size={18} /> Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Entrez votre mot de passe" required disabled={loading} />
          </div>
          {error && <div className="pip-login-error"><AlertCircle size={16} /> {error}</div>}
          <button type="submit" className="pip-login-button" disabled={loading || !username.trim()}>
            {loading ? "Connexion..." : "Se connecter →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🛠️ UTILS
// ══════════════════════════════════════════════════════════════════
function Spinner() {
  return <div className="pip-spinner-wrap"><div className="pip-spinner"></div></div>;
}

function Badge({label, color}) {
  return <span className="pip-badge" style={{background: color}}>{label}</span>;
}

const CATEGORY_COLORS = {
  "entrée_de_gamme": "#27ae60",
  "milieu_de_gamme_bas": "#2980b9",
  "milieu_de_gamme": "#8e44ad",
  "haut_de_gamme": "#e67e22",
  "premium": "#c0392b",
};

const CLUSTER_COLORS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c"];

// ══════════════════════════════════════════════════════════════════
// 🛒 ONGLET PRODUITS
// ══════════════════════════════════════════════════════════════════
// 🛒 ONGLET PRODUITS (CORRIGÉ)
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// 🛒 ONGLET PRODUITS (CORRIGÉ POUR FORCER ?query=laptop)
// ══════════════════════════════════════════════════════════════════
function TabProducts() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("db"); // "csv", "db", ou "scrape"
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [scrapeTarget, setScrapeTarget] = useState("");

  // 🛡️ Fonction utilitaire pour récupérer le token d'authentification
  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  // Chargement initial
  useEffect(() => {
    fetchDB(1, "");
  }, []);

  // 1. Fetch depuis le CSV
  const fetchCSV = async (p = 1) => {
    setLoading(true);
    setMode("csv");
    setScrapeMsg("");
    try {
      const res = await fetch(`${API}/products/?query=${query}&page=${p}&limit=20`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // 2. Fetch depuis la DB (MySQL)
  const fetchDB = async (p = 1) => {
    setLoading(true);
    setMode("db");
    setScrapeMsg("");
    try {
      const res = await fetch(`${API}/search/?query=${query}&page=${p}&limit=20`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // 3. Logique de Scraping CORRIGÉE
  const runScrape = async (target) => {
    setLoading(true);
    setScrapeTarget(target);
    
    // 🔥 MODIFICATION ICI : On force "laptop" si l'utilisateur n'a rien écrit
    const finalQuery = query.trim() !== "" ? query.trim() : "laptop";
    const searchParam = `?query=${encodeURIComponent(finalQuery)}`;
    
    setScrapeMsg(`⏳ Scraping ${target} en cours pour "${finalQuery}"...`);
    
    try {
      let endpoint = "";
      switch (target) {
        case "jumia": endpoint = "scrape/jumia/"; break;
        case "amazon": endpoint = "scrape/amazon/"; break;
        case "aliexpress": endpoint = "scrape/aliexpress/"; break;
        case "all": endpoint = "scrape/All/"; break;
        default: endpoint = "search/";
      }

      // L'URL appelée sera toujours ex: http://127.0.0.1:8000/api/scrape/amazon/?query=laptop
      const res = await fetch(`${API}/${endpoint}${searchParam}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success) {
        setScrapeMsg(`✅ ${data.message}`);
        setMode("db");
        fetchDB(1); 
      } else {
        setScrapeMsg(`❌ Erreur: ${data.error || "Problème lors du scraping"}`);
      }
    } catch (e) {
      console.error(e);
      setScrapeMsg(`❌ Erreur réseau sur ${target}`);
    }
    setLoading(false);
    setScrapeTarget("");
  };

  // 🎨 Styles de base pour les boutons de scraping corrigés
  const scrapeBtnStyle = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    minWidth: '140px'
  };

  return (
    <div>
      {/* 🔍 Barre de recherche et modes */}
      <div className="pip-search-box">
        <input
          type="text"
          className="pip-search-input"
          placeholder="Rechercher un modèle... (ex: laptop)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        
        <div className="pip-mode-toggle">
          <button className={`pip-mode-btn ${mode === "csv" ? "active" : ""}`} onClick={() => fetchCSV(1)}>
            📂 CSV
          </button>
          <button className={`pip-mode-btn ${mode === "db" ? "active" : ""}`} onClick={() => fetchDB(1)}>
            🗄️ Produits (DB)
          </button>
          <button className={`pip-mode-btn ${mode === "scrape" ? "active" : ""}`} onClick={() => setMode("scrape")}>
            🕷️ Scraper
          </button>
        </div>

        {mode !== "scrape" && (
          <button 
            onClick={() => (mode === "csv" ? fetchCSV(1) : fetchDB(1))} 
            disabled={loading} 
            className="pip-search-btn"
          >
            {loading ? "..." : "🔍 Rechercher"}
          </button>
        )}
      </div>

      {/* 🕷️ Zone Scraper */}
      {mode === "scrape" && (
        <div className="pip-card" style={{ marginBottom: '20px', padding: '20px' }}>
          <p style={{ marginBottom: '15px', fontWeight: 'bold', color: '#1e293b' }}>
            Lancer un nouveau scraping vers la base de données :
          </p>
          <div className="scrape-buttons-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            
            <button 
              onClick={() => runScrape("jumia")} 
              disabled={loading} 
              style={{ ...scrapeBtnStyle, background: '#f97316', opacity: loading ? 0.7 : 1 }}
            >
              {loading && scrapeTarget === "jumia" ? "⏳ Scraping..." : "Scraper Jumia"}
            </button>
            
            <button 
              onClick={() => runScrape("amazon")} 
              disabled={loading} 
              style={{ ...scrapeBtnStyle, background: '#232f3e', opacity: loading ? 0.7 : 1 }}
            >
              {loading && scrapeTarget === "amazon" ? "⏳ Scraping..." : "Scraper Amazon"}
            </button>
            
            <button 
              onClick={() => runScrape("aliexpress")} 
              disabled={loading} 
              style={{ ...scrapeBtnStyle, background: '#e62e04', opacity: loading ? 0.7 : 1 }}
            >
              {loading && scrapeTarget === "aliexpress" ? "⏳ Scraping..." : "Scraper AliExpress"}
            </button>
            
            <button 
              onClick={() => runScrape("all")} 
              disabled={loading} 
              style={{ ...scrapeBtnStyle, background: '#1e293b', opacity: loading ? 0.7 : 1 }}
            >
              {loading && scrapeTarget === "all" ? "⏳ Scraping..." : "🔥 Tout Scraper"}
            </button>

          </div>
        </div>
      )}

      {/* 💬 Barre de message (Succès / Erreur) */}
      {scrapeMsg && (
        <div className={`pip-scrape-info-bar`} 
             style={{ 
               padding: '12px', 
               borderRadius: '8px', 
               marginBottom: '15px', 
               fontWeight: '500',
               color: scrapeMsg.includes('✅') ? '#166534' : scrapeMsg.includes('⏳') ? '#0f172a' : '#991b1b',
               backgroundColor: scrapeMsg.includes('✅') ? '#dcfce7' : scrapeMsg.includes('⏳') ? '#f1f5f9' : '#fee2e2',
               border: `1px solid ${scrapeMsg.includes('✅') ? '#bbf7d0' : scrapeMsg.includes('⏳') ? '#e2e8f0' : '#fecaca'}`
             }}>
          {scrapeMsg}
        </div>
      )}

      {/* 📊 Statut actuel */}
      <div className="pip-status-bar" style={{ marginBottom: '15px' }}>
        <strong>{total}</strong> produits trouvés
        <span className="mode-tag" style={{ marginLeft: '10px', padding: '4px 8px', borderRadius: '4px', background: '#e2e8f0', fontSize: '12px', fontWeight: '600' }}>
          {mode === "csv" ? "Fichier CSV" : mode === "db" ? "Base de données" : "Mode Scraping"}
        </span>
      </div>

      {/* 📦 Liste des produits ou Spinner */}
      {loading && mode !== "scrape" ? (
        <Spinner />
      ) : (
        <>
          <div className="pip-product-list">
            {products.map((item, i) => (
              <div className="pip-card" key={i}>
                {item.is_gaming && <span className="pip-gaming-tag">🎮 Gaming</span>}
                {item.image && <img src={item.image} alt={item.title} className="pip-product-img" />}
                <div className="pip-card-content">
                  <span className="pip-brand-label">{item.brand_detected || "Inconnu"}</span>
                  <h3 className="pip-card-title">{item.title}</h3>
                  <p className="pip-price">{item.price?.toLocaleString()} MAD</p>
                  <div className="pip-card-footer">
                    <small style={{ color: '#64748b' }}>{item.source}</small>
                    <a href={item.link} target="_blank" rel="noreferrer" className="pip-view-btn">
                      Voir →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 📄 Pagination */}
          {pages > 1 && (
            <div className="pip-pagination">
              <button 
                onClick={() => (mode === "csv" ? fetchCSV(page - 1) : fetchDB(page - 1))} 
                disabled={page <= 1}
              >
                ←
              </button>
              <span>{page} / {pages}</span>
              <button 
                onClick={() => (mode === "csv" ? fetchCSV(page + 1) : fetchDB(page + 1))} 
                disabled={page >= pages}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════
// 📊 ONGLET STATISTIQUES
// ══════════════════════════════════════════════════════════════════
function TabStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading]= useState(true);
  useEffect(()=> {
    fetch(`${API}/stats/`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  }, []);
  if (loading) return <Spinner />;
  if (!data) return <p>Erreur de chargement</p>;
  const { stats, by_brand, by_category, gaming, distribution } = data;
  return (
    <div className="stats-page">
      <div className="pip-kpi-grid">
        {[
          ["Produits", stats.count],
          ["Médiane", `${stats.median?.toLocaleString()} MAD`],
          ["Moyenne", `${Math.round(stats.mean)?.toLocaleString()} MAD`],
          ["CV", `${stats.cv}%`],
        ].map(([label,val], i)=> (
          <div className="pip-kpi-card" key={i}>
            <div className="pip-kpi-val">{val}</div>
            <div className="pip-kpi-label">{label}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <h3>📊 Distribution des prix</h3>
        <div className="histogram">
          {distribution.map((b,i) => (
            <div className="bar-wrap" key={i}>
              <div className="bar-count">{b.count}</div>
              <div className="bar" style={{height: Math.max(10, (b.count/Math.max(...distribution.map(x=>x.count)))*150)}}></div>
              <div className="bar-label">{b.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="two-cols">
        <div className="chart-card">
          <h3>🏷️ Par marque</h3>
          <table className="data-table">
            <thead><tr><th>Marque</th><th>Nb</th><th>Médiane</th></tr></thead>
            <tbody>
              {by_brand.slice(0,6).map((b,i)=>(
                <tr key={i}><td><strong>{b.brand_detected}</strong></td><td>{b.count}</td><td>{b.median?.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chart-card">
          <h3>💰 Gammes</h3>
          {by_category.map((c,i)=>(
            <div key={i} className="cat-row">
              <div className="cat-name">{c.price_category?.replace(/_/g," ")}</div>
              <div className="cat-bar-bg"><div className="cat-bar" style={{width:`${(c.count/Math.max(...by_category.map(x=>x.count)))*100}%`, background:Object.values(CATEGORY_COLORS)[i]}}></div></div>
              <div className="cat-count">{c.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🔵 ONGLET CLUSTERING
// ══════════════════════════════════════════════════════════════════
function TabClustering() {
  const [algo, setAlgo] = useState("kmeans");
  const [data, setData] = useState(null);
  const [loading, setLoading]= useState(false);
  const [eps, setEps] = useState(0.5);
  const [minSamples, setMinSamples]= useState(5);

  const fetchClustering = async (a, e, ms) => {
    setLoading(true);
    try {
      const url = a === "dbscan" ? `${API}/clustering/?algo=dbscan&eps=${e}&min_samples=${ms}` : `${API}/clustering/?algo=kmeans`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch(err) { console.error(err); }
    setLoading(false);
  };

  useEffect(()=> { fetchClustering("kmeans", 0.5, 5); }, []);

  const colorMap = {};
  if(data?.scatter) {
    [...new Set(data.scatter.map(p=>p.cluster))].forEach((n,i)=> { colorMap[n]= CLUSTER_COLORS[i%6]; });
  }

  return (
    <div className="stats-page">
      <div className="algo-selector">
        <div className="algo-btns">
          <button className={`algo-btn kmeans ${algo === "kmeans" ? "active" : ""}`} onClick={()=> {setAlgo("kmeans"); fetchClustering("kmeans");}}>
            <span className="algo-name">K-Means</span>
          </button>
          <button className={`algo-btn dbscan ${algo === "dbscan" ? "active" : ""}`} onClick={()=> {setAlgo("dbscan"); fetchClustering("dbscan", eps, minSamples);}}>
            <span className="algo-name">DBSCAN</span>
          </button>
        </div>
      </div>

      {algo === "dbscan" && (
        <div className="dbscan-params">
          <div className="param-row">
            <label>eps <input type="number" value={eps} step="0.1" onChange={e => setEps(parseFloat(e.target.value))} /></label>
            <label>min <input type="number" value={minSamples} onChange={e => setMinSamples(parseInt(e.target.value))} /></label>
            <button className="apply-btn" onClick={()=> fetchClustering("dbscan", eps, minSamples)}>Appliquer</button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : data && (
        <>
          <div className="cluster-grid">
            {data.summary?.map((c,i)=> (
              <div className="cluster-card" key={i} style={{borderTop:`4px solid ${CLUSTER_COLORS[i%6]}`}}>
                <div className="cluster-name">{c.cluster}</div>
                <div className="cluster-count">{c.count} produits</div>
                <div className="cluster-stats">Médiane: <strong>{c.median?.toLocaleString()} MAD</strong></div>
              </div>
            ))}
          </div>
          <div className="chart-card">
            <h3>Visualisation des clusters</h3>
            <ScatterPlot points={data.scatter || []} colorMap={colorMap} />
          </div>
        </>
      )}
    </div>
  );
}

function ScatterPlot({points, colorMap}) {
  if (!points.length) return null;
  const prices = points.map(p=>p.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  return (
    <svg width="100%" height="200" className="scatter-svg">
      {points.map((p,i)=> (
        <circle key={i} cx={40 + ((p.price-minP)/(maxP-minP||1))*600} cy={100 + Math.sin(i)*40} r={5} fill={colorMap[p.cluster] || "#999"} opacity={0.6} />
      ))}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🚨 ONGLET ANOMALIES
// ══════════════════════════════════════════════════════════════════
function TabAnomalies() {
  const [data, setData] = useState(null);
  const [loading, setLoading]= useState(true);
  useEffect(()=> {
    fetch(`${API}/anomalies/`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="stats-page">
      <div className="pip-kpi-grid">
        <div className="pip-kpi-card warn"><div className="pip-kpi-val">{data?.total}</div><div className="pip-kpi-label">Anomalies</div></div>
      </div>
      <div className="chart-card">
        <table className="data-table">
          <thead><tr><th>Produit</th><th>Gamme</th><th>Prix</th></tr></thead>
          <tbody>
            {data?.anomalies.map((a,i)=>(
              <tr key={i}><td className="td-title">{a.title}</td><td><Badge label={a.price_category} color={CATEGORY_COLORS[a.price_category]}/></td><td>{a.price?.toLocaleString()} MAD</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🔗 ONGLET ASSOCIATION
// ══════════════════════════════════════════════════════════════════
function TabAssociation() {
  const [data, setData] = useState(null);
  const [loading, setLoading]= useState(true);
  useEffect(()=> {
    fetch(`${API}/association/`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="stats-page">
      <div className="chart-card">
        <h3>🔗 Règles d'association</h3>
        <div className="rules-list">
          {data?.rules.map((r,i)=>(
            <div className="rule-card" key={i}>
              <div className="rule-body"><span className="rule-if">{r.antecedent}</span><span className="rule-arrow">→</span><span className="rule-then">{r.consequent}</span></div>
              <div className="rule-metrics"><span>Confiance: {(r.confidence*100).toFixed(1)}%</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🚀 DASHBOARD & ROUTING
// ══════════════════════════════════════════════════════════════════
function Dashboard() {
  const [tab, setTab] = useState("products");
  const { user, logout } = useAuth();

  return (
    <div className="pip-layout">
      <aside className="pip-sidebar">
        <div style={{padding: '20px', textAlign: 'center', borderBottom: '1px solid #1e293b'}}>
          <h2 style={{fontSize: '18px', color: '#f97316'}}>PriceIntel</h2>
        </div>
        <nav style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {["products", "stats", "clustering", "anomalies", "association"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? "active" : ""}`} style={{width: '100%', textAlign: 'left'}}>
              {t.toUpperCase()}
            </button>
          ))}
          <button onClick={logout} style={{marginTop: '20px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444'}} className="tab-btn">
            <LogOut size={16} /> Déconnexion
          </button>
        </nav>
      </aside>
      <main className="pip-main">
        <header className="pip-header">
          <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
             <Menu size={20} /> <strong>Tableau de bord</strong>
          </div>
          <div><User size={16} /> {user?.first_name}</div>
        </header>
        <div className="pip-content">
          <div className="pip-tab-content">
            {tab === "products" && <TabProducts />}
            {tab === "stats" && <TabStats />}
            {tab === "clustering" && <TabClustering />}
            {tab === "anomalies" && <TabAnomalies />}
            {tab === "association" && <TabAssociation />}
          </div>
        </div>
      </main>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRouteWrapper />} />
          <Route path="/*" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginRouteWrapper() {
  const { user } = useAuth();
  return user ? <Navigate to="/" /> : <Login />;
}