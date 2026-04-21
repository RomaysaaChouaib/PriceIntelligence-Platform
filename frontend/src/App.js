import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./main.css";
import {
  Search, Bell, ShoppingBag,
  TrendingUp, Package, Menu, X, AlertTriangle, Link2,
  RefreshCw, ChevronLeft, ChevronRight, BarChart2,
  LogOut, User, Lock, AlertCircle,
  // ═════ IMPORTS AJOUTÉS ═════
  Activity, Clock, Database
  // ═════════════════════════
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

// ══════════════════════════════════════════════════════════════════
// 🛡️ AUTH CONTEXT INTEGRÉ
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
      console.log("Mode démo activé (backend non disponible)");
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
      user: { username: "admin", first_name: "Admin" }, 
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
    
    if (!result.success) {
      setError(result.error || "Erreur de connexion");
    }
    
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
            <label>
              <User size={18} />
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom"
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
            {loading ? "Connexion..." : "Se connecter →"}
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

// ══════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ══════════════════════════════════════════════════════════════════
function Spinner() {
  return (
    <div className="pip-spinner-wrap">
      <div className="pip-spinner"></div>
    </div>
  );
}

function Badge({ label, color }) {
  return <span className="pip-badge" style={{ background: color }}>{label}</span>;
}

const CATEGORY_COLORS = {
  "entrée_de_gamme":     "#27ae60",
  "milieu_de_gamme_bas": "#2980b9",
  "milieu_de_gamme":     "#8e44ad",
  "haut_de_gamme":       "#e67e22",
  "premium":             "#c0392b",
};

const CLUSTER_COLORS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c"];

// ══════════════════════════════════════════════════════════════════
// ONGLET PRODUITS
// ══════════════════════════════════════════════════════════════════
function TabProducts() {
  const [query, setQuery]         = useState("");
  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [mode, setMode]           = useState("csv");
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [scrapeMsg, setScrapeMsg] = useState("");

  useEffect(() => { fetchCSV(1, ""); }, []);

  const fetchCSV = async (p = 1, q = query) => {
    setLoading(true);
    setScrapeMsg("");
    try {
      const res  = await fetch(`${API}/products/?query=${q}&page=${p}&limit=20`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchScrape = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setScrapeMsg("⏳ Scraping Jumia en cours… (peut prendre 1-2 min)");
    try {
      const res  = await fetch(`${API}/search/?query=${query}`);
      const data = await res.json();
      setScrapeMsg(`✅ Scraping terminé — ${data.products?.length || 0} produits récupérés`);
      await fetchCSV(1, query);
    } catch (e) {
      setScrapeMsg("❌ Erreur de scraping");
      console.error(e);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (mode === "scrape") fetchScrape();
    else fetchCSV(1, query);
  };

  return (
    <div>
      <div className="pip-search-box">
        <div className="pip-search-input-wrap">
          <Search className="pip-search-icon" />
          <input
            type="text"
            placeholder="Ex: hp, lenovo, macbook, gaming…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="pip-mode-toggle">
          <button
            className={`pip-mode-btn ${mode === "csv" ? "active" : ""}`}
            onClick={() => setMode("csv")}
            title="Lire le CSV existant"
          >📂 CSV</button>
          <button
            className={`pip-mode-btn ${mode === "scrape" ? "active" : ""}`}
            onClick={() => setMode("scrape")}
            title="Scraper Jumia en direct"
          >🕷️ Scraper</button>
        </div>
        <button className="pip-search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? "⏳ …" : mode === "scrape" ? "Scraper Jumia" : "Rechercher"}
        </button>
      </div>

      {scrapeMsg && (
        <div className={`pip-scrape-msg ${scrapeMsg.startsWith("✅") ? "ok" : scrapeMsg.startsWith("❌") ? "err" : ""}`}>
          {scrapeMsg}
        </div>
      )}

      <div className="pip-status-bar">
        <span><strong>{total}</strong> produits — Page {page}/{pages}</span>
        {mode === "csv"    && <span className="pip-mode-tag">📂 Données CSV enrichies</span>}
        {mode === "scrape" && <span className="pip-mode-tag scrape">🕷️ Mode scraping live</span>}
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="pip-product-list">
            {products.map((item, i) => (
              <div className="pip-card" key={i}>
                {item.is_gaming && <span className="pip-gaming-tag">🎮 Gaming</span>}
                {item.image && <img src={item.image} alt={item.title} className="pip-product-img" />}
                <div className="pip-card-content">
                  <div className="pip-card-top">
                    <span className="pip-brand-label">{item.brand_detected || item.brand}</span>
                    {item.price_category && (
                      <Badge
                        label={item.price_category.replace(/_/g, " ")}
                        color={CATEGORY_COLORS[item.price_category] || "#888"}
                      />
                    )}
                  </div>
                  <h3 className="pip-card-title">{item.title}</h3>
                  <div className="pip-specs-row">
                    {item.ram_gb     && <span className="pip-spec">🧠 {item.ram_gb} Go</span>}
                    {item.storage_gb && <span className="pip-spec">💾 {item.storage_gb} Go</span>}
                  </div>
                  <p className="pip-price">{item.price?.toLocaleString()} MAD</p>
                  <div className="pip-card-footer">
                    <small>{item.source}</small>
                    <a href={item.link} target="_blank" rel="noreferrer" className="pip-view-btn">
                      Voir sur Jumia →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pip-pagination">
            <button onClick={() => fetchCSV(page - 1)} disabled={page <= 1}>
              <ChevronLeft size={16} /> Préc
            </button>
            <span>Page {page} / {pages}</span>
            <button onClick={() => fetchCSV(page + 1)} disabled={page >= pages}>
              Suiv <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONGLET STATISTIQUES
// ══════════════════════════════════════════════════════════════════
function TabStats() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/stats/`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <p>Erreur</p>;
  const { stats, by_brand, by_category, gaming, distribution } = data;

  return (
    <div className="pip-stats-page">
      <div className="pip-kpi-grid">
        {[
          ["Produits analysés",  stats.count],
          ["Prix médian",        `${stats.median?.toLocaleString()} MAD`],
          ["Prix moyen",         `${Math.round(stats.mean)?.toLocaleString()} MAD`],
          ["Prix min",           `${stats.min?.toLocaleString()} MAD`],
          ["Prix max",           `${stats.max?.toLocaleString()} MAD`],
          ["Coeff. variation",   `${stats.cv}%`],
        ].map(([label, val], i) => (
          <div className="pip-kpi-card" key={i}>
            <div className="pip-kpi-val">{val}</div>
            <div className="pip-kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="pip-chart-card">
        <h3>📊 Distribution des prix</h3>
        <div className="pip-histogram">
          {distribution.map((b, i) => {
            const maxC = Math.max(...distribution.map(x => x.count));
            return (
              <div className="pip-bar-wrap" key={i} title={`${b.count} produits`}>
                <div className="pip-bar-count">{b.count}</div>
                <div className="pip-bar" style={{ height: Math.max(4, (b.count / maxC) * 180) }}></div>
                <div className="pip-bar-label">{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pip-two-cols">
        <div className="pip-chart-card">
          <h3>🏷️ Stats par marque</h3>
          <table className="pip-data-table">
            <thead><tr><th>Marque</th><th>Nb</th><th>Médiane MAD</th><th>Moyenne MAD</th></tr></thead>
            <tbody>
              {by_brand.slice(0, 8).map((b, i) => (
                <tr key={i}>
                  <td><strong>{b.brand_detected}</strong></td>
                  <td>{b.count}</td>
                  <td>{b.median?.toLocaleString()}</td>
                  <td>{Math.round(b.mean)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pip-chart-card">
          <h3>💰 Répartition par gamme</h3>
          {by_category.map((c, i) => {
            const maxC = Math.max(...by_category.map(x => x.count));
            return (
              <div key={i} className="pip-cat-row">
                <div className="pip-cat-name">{c.price_category?.replace(/_/g, " ")}</div>
                <div className="pip-cat-bar-bg">
                  <div className="pip-cat-bar" style={{ width: `${(c.count / maxC) * 100}%`, background: Object.values(CATEGORY_COLORS)[i] }}></div>
                </div>
                <div className="pip-cat-count">{c.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pip-chart-card">
        <h3>🎮 Gaming vs Non-Gaming</h3>
        <div className="pip-gaming-compare">
          {[
            { key: "gaming",     label: "🎮 Gaming",     cls: "gaming" },
            { key: "non_gaming", label: "💻 Non-Gaming", cls: "non-gaming" },
          ].map(({ key, label, cls }) => (
            <div className={`pip-gaming-box ${cls}`} key={key}>
              <div className="pip-gbox-title">{label}</div>
              <div className="pip-gbox-count">{gaming[key]?.count} produits</div>
              <div className="pip-gbox-price">Médiane : <strong>{gaming[key]?.median?.toLocaleString()} MAD</strong></div>
              <div className="pip-gbox-price">Moyenne : <strong>{Math.round(gaming[key]?.mean)?.toLocaleString()} MAD</strong></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONGLET CLUSTERING
// ══════════════════════════════════════════════════════════════════
function TabClustering() {
  const [algo, setAlgo]             = useState("kmeans");
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [eps, setEps]               = useState(0.5);
  const [minSamples, setMinSamples] = useState(5);

  const fetchClustering = async (a, e, ms) => {
    setLoading(true);
    setData(null);
    try {
      const url = a === "dbscan"
        ? `${API}/clustering/?algo=dbscan&eps=${e}&min_samples=${ms}`
        : `${API}/clustering/?algo=kmeans`;
      const res  = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchClustering("kmeans", eps, minSamples); }, []);

  const switchAlgo = (a) => {
    setAlgo(a);
    fetchClustering(a, eps, minSamples);
  };

  const clusterNames = data ? [...new Set(data.scatter?.map(p => p.cluster) || [])] : [];
  const colorMap = {};
  clusterNames.forEach((n, i) => { colorMap[n] = CLUSTER_COLORS[i % 6]; });

  return (
    <div className="pip-stats-page">
      <div className="pip-algo-selector">
        <div className="pip-algo-label">Algorithme de clustering :</div>
        <div className="pip-algo-btns">
          <button
            className={`pip-algo-btn kmeans ${algo === "kmeans" ? "active" : ""}`}
            onClick={() => switchAlgo("kmeans")}
          >
            <span className="pip-algo-icon">🔵</span>
            <span className="pip-algo-name">K-Means</span>
            <span className="pip-algo-desc">k optimal automatique</span>
          </button>
          <button
            className={`pip-algo-btn dbscan ${algo === "dbscan" ? "active" : ""}`}
            onClick={() => switchAlgo("dbscan")}
          >
            <span className="pip-algo-icon">🟣</span>
            <span className="pip-algo-name">DBSCAN</span>
            <span className="pip-algo-desc">détection automatique</span>
          </button>
        </div>
      </div>

      {algo === "dbscan" && (
        <div className="pip-dbscan-params">
          <div className="pip-param-title">⚙️ Paramètres DBSCAN</div>
          <div className="pip-param-row">
            <label>eps (rayon de voisinage) :
              <input type="number" value={eps} step="0.1" min="0.1" max="5"
                onChange={e => setEps(parseFloat(e.target.value))} />
            </label>
            <label>min_samples (points minimum) :
              <input type="number" value={minSamples} step="1" min="2" max="50"
                onChange={e => setMinSamples(parseInt(e.target.value))} />
            </label>
            <button className="pip-apply-btn" onClick={() => fetchClustering("dbscan", eps, minSamples)}>
              ▶ Appliquer
            </button>
          </div>
          <div className="pip-param-hint">
            💡 <strong>eps</strong> : distance max entre deux points voisins.{" "}
            <strong>min_samples</strong> : nb min de points pour former un cluster.{" "}
            Label <strong>-1</strong> = outlier.
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {!loading && data && (
        <>
          <div className="pip-kpi-grid">
            {algo === "kmeans" ? (
              <>
                <div className="pip-kpi-card"><div className="pip-kpi-val">{data.best_k}</div><div className="pip-kpi-label">k optimal (K-Means)</div></div>
                <div className="pip-kpi-card"><div className="pip-kpi-val">{data.silhouette}</div><div className="pip-kpi-label">Score Silhouette</div></div>
                <div className="pip-kpi-card"><div className="pip-kpi-val">{data.summary?.length}</div><div className="pip-kpi-label">Segments créés</div></div>
              </>
            ) : (
              <>
                <div className="pip-kpi-card"><div className="pip-kpi-val">{data.n_clusters}</div><div className="pip-kpi-label">Clusters trouvés (DBSCAN)</div></div>
                <div className="pip-kpi-card"><div className="pip-kpi-val">{data.scatter?.filter(p => p.cluster === "Outlier").length || 0}</div><div className="pip-kpi-label">Outliers détectés</div></div>
                <div className="pip-kpi-card"><div className="pip-kpi-val">eps = {data.eps}</div><div className="pip-kpi-label">Rayon utilisé</div></div>
              </>
            )}
          </div>

          {algo === "kmeans" && data.k_scores && (
            <div className="pip-chart-card">
              <h3>🔍 Recherche du k optimal</h3>
              <table className="pip-data-table">
                <thead><tr><th>k</th><th>Inertie</th><th>Silhouette ↑</th><th>Davies-Bouldin ↓</th></tr></thead>
                <tbody>
                  {data.k_scores.map((r, i) => (
                    <tr key={i} className={r.k === data.best_k ? "pip-row-best" : ""}>
                      <td>{r.k === data.best_k ? "⭐ " : ""}{r.k}</td>
                      <td>{Math.round(r.inertia).toLocaleString()}</td>
                      <td>{r.silhouette}</td>
                      <td>{r.davies_bouldin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {algo === "dbscan" && (
            <div className="pip-chart-card pip-dbscan-info">
              <h3>ℹ️ Comment fonctionne DBSCAN ?</h3>
              <p>DBSCAN (Density-Based Spatial Clustering of Applications with Noise) regroupe les points denses sans fixer k à l'avance :</p>
              <ul className="pip-info-list">
                <li><strong>Core point</strong> : a au moins <em>min_samples</em> voisins dans un rayon <em>eps</em></li>
                <li><strong>Border point</strong> : dans le rayon d'un core point, mais pas assez de voisins</li>
                <li><strong>Outlier (label -1)</strong> : isolé, ni core ni border → anomalie de prix</li>
              </ul>
            </div>
          )}

          <div className="pip-chart-card">
            <h3>📦 Résumé des segments</h3>
            <div className="pip-cluster-grid">
              {data.summary?.map((c, i) => (
                <div className="pip-cluster-card" key={i}
                  style={{ borderTop: `4px solid ${c.cluster === "Outlier" ? "#e74c3c" : CLUSTER_COLORS[i % 6]}` }}>
                  <div className="pip-cluster-name" style={{ color: c.cluster === "Outlier" ? "#e74c3c" : "inherit" }}>
                    {c.cluster === "Outlier" ? "⚠️ " : ""}{c.cluster}
                  </div>
                  <div className="pip-cluster-count">{c.count} produits</div>
                  <div className="pip-cluster-stats">
                    <div>Médiane : <strong>{c.median?.toLocaleString()} MAD</strong></div>
                    <div>Moyenne : <strong>{Math.round(c.mean)?.toLocaleString()} MAD</strong></div>
                    <div>Min : {c.min?.toLocaleString()} | Max : {c.max?.toLocaleString()}</div>
                    {c.top_brand && <div>Top marque : <strong>{c.top_brand}</strong></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pip-chart-card">
            <h3>🔵 Nuage de points — Prix par cluster</h3>
            <div className="pip-legend">
              {clusterNames.map((n, i) => (
                <span key={i} className="pip-legend-item">
                  <span className="pip-legend-dot"
                    style={{ background: n === "Outlier" ? "#e74c3c" : CLUSTER_COLORS[i % 6] }}></span>
                  {n}
                </span>
              ))}
            </div>
            <ScatterPlot points={data.scatter} colorMap={colorMap} />
          </div>
        </>
      )}
    </div>
  );
}

function ScatterPlot({ points, colorMap }) {
  if (!points.length) return null;
  const prices = points.map(p => p.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const W = 700, H = 260, PAD = 40;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="pip-scatter-svg">
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#ddd" />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#ddd" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#999">Prix MAD</text>
      {points.map((p, i) => {
        const x = PAD + ((p.price - minP) / (maxP - minP || 1)) * (W - 2 * PAD);
        const y = PAD + (Math.sin(i * 0.7) * 0.4 + 0.5) * (H - 2 * PAD);
        return (
          <circle key={i} cx={x} cy={y} r={4} fill={colorMap[p.cluster] || "#999"} opacity={0.75}>
            <title>{p.title} — {p.price?.toLocaleString()} MAD</title>
          </circle>
        );
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONGLET ANOMALIES
// ══════════════════════════════════════════════════════════════════
function TabAnomalies() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/anomalies/`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <p>Erreur</p>;

  return (
    <div className="pip-stats-page">
      <div className="pip-kpi-grid">
        <div className="pip-kpi-card warn">
          <div className="pip-kpi-val">{data.total}</div>
          <div className="pip-kpi-label">Anomalies (Isolation Forest)</div>
        </div>
        {data.summary.map((s, i) => (
          <div className="pip-kpi-card" key={i}>
            <div className="pip-kpi-val">{s.anomalies} <small>({s.pourcentage}%)</small></div>
            <div className="pip-kpi-label">{s.methode}</div>
          </div>
        ))}
      </div>
      <div className="pip-chart-card">
        <h3>🚨 Produits à prix suspect</h3>
        <p className="pip-hint">Détectés par Isolation Forest — prix anormal par rapport aux specs.</p>
        <table className="pip-data-table">
          <thead><tr><th>#</th><th>Titre</th><th>Marque</th><th>Gamme</th><th>Prix MAD</th></tr></thead>
          <tbody>
            {data.anomalies.map((a, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td className="pip-td-title">{a.title}</td>
                <td>{a.brand_detected}</td>
                <td><Badge label={a.price_category?.replace(/_/g, " ")} color={CATEGORY_COLORS[a.price_category] || "#888"} /></td>
                <td><strong>{a.price?.toLocaleString()} MAD</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONGLET ASSOCIATION
// ══════════════════════════════════════════════════════════════════
function TabAssociation() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/association/`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <p>Erreur</p>;

  return (
    <div className="pip-stats-page">
      <div className="pip-kpi-grid">
        <div className="pip-kpi-card">
          <div className="pip-kpi-val">{data.total}</div>
          <div className="pip-kpi-label">Règles générées</div>
        </div>
      </div>
      <div className="pip-chart-card">
        <h3>🔗 Règles d'association (Apriori)</h3>
        <p className="pip-hint">
          <strong>Support</strong> = fréquence &nbsp;|&nbsp;
          <strong>Confiance</strong> = probabilité &nbsp;|&nbsp;
          <strong>Lift &gt; 1</strong> = règle non triviale
        </p>
        {!data.rules.length ? <p>Aucune règle trouvée.</p> : (
          <div className="pip-rules-list">
            {data.rules.map((r, i) => (
              <div className="pip-rule-card" key={i}>
                <div className="pip-rule-body">
                  <span className="pip-rule-if">SI &nbsp; {r.antecedent}</span>
                  <span className="pip-rule-arrow">→</span>
                  <span className="pip-rule-then">ALORS &nbsp; {r.consequent}</span>
                </div>
                <div className="pip-rule-metrics">
                  <span className="pip-metric">Support : <strong>{(r.support * 100).toFixed(1)}%</strong></span>
                  <span className="pip-metric">Confiance : <strong>{(r.confidence * 100).toFixed(1)}%</strong></span>
                  <span className="pip-metric lift">Lift : <strong>{r.lift}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CONFIGURATION DES ONGLETS
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { id: "products",    label: "Produits",     icon: ShoppingBag},
  { id: "stats",       label: "Statistiques", icon: TrendingUp},
  { id: "clustering",  label: "Clustering",   icon: BarChart2},
  { id: "anomalies",   label: "Anomalies",    icon: AlertTriangle},
  { id: "association", label: "Association",  icon: Link2},
];

// ══════════════════════════════════════════════════════════════════
// 🎯 COMPOSANT DASHBOARD
// ══════════════════════════════════════════════════════════════════
function Dashboard() {
  const [tab, setTab] = useState("products");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // ═════ VARIABLE AJOUTÉE ═════
  const [scraperActive] = useState(true); // true = actif, false = inactif
  // ══════════════════════════
  
  const { user, logout } = useAuth();
  
  const onLogout = () => {
    logout();
  };

  const quickStats = [
    { title: "Produits trackés",    value: "1 234",   icon: Package,       color: "#3b82f6" },
    { title: "Prix moyen",          value: "3 450 MAD", icon: TrendingUp,  color: "#f97316" },
    { title: "Marques analysées",   value: "42",       icon: ShoppingBag,  color: "#10b981" },
    { title: "Anomalies détectées", value: "18",       icon: AlertTriangle, color: "#8b5cf6" },
  ];

  const currentTabLabel = TABS.find(t => t.id === tab)?.label || "";

  return (
    <div className="pip-layout">
      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`pip-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="pip-sidebar-logo">
          <div className="pip-logo-icon">
            <ShoppingBag size={22} color="#fff" />
          </div>
          {sidebarOpen && (
            <div className="pip-logo-text">
              <span className="pip-logo-name">PriceIntel</span>
            </div>
          )}
          <button className="pip-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="pip-nav">
          {sidebarOpen && <div className="pip-nav-section-label">Navigation</div>}
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`pip-nav-item ${tab === item.id ? "active" : ""}`}
              title={!sidebarOpen ? item.label : ""}
            >
              <item.icon className="pip-nav-icon" size={18} />
              {sidebarOpen && <span className="pip-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="pip-sidebar-footer">
            <div className="pip-nav-section-label">
              <Activity size={14} />
              <span>Statut du système</span>
            </div>
            <div className="pip-system-status">
              <div className="pip-status-item">
                <div className={`pip-status-dot ${scraperActive ? 'active' : 'inactive'}`}></div>
                <span className="pip-status-label">Scraper</span>
                <span className={`pip-status-value ${scraperActive ? 'active' : ''}`}>
                  {scraperActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="pip-status-divider"></div>
              <div className="pip-status-item">
                <Clock size={14} className="pip-status-icon" />
                <span className="pip-status-label">Dernier scrape</span>
                <span className="pip-status-time">Il y a 2h</span>
              </div>
              <div className="pip-status-divider"></div>
              <div className="pip-status-item">
                <Database size={14} className="pip-status-icon" />
                <span className="pip-status-label">Produits en DB</span>
                <span className="pip-status-value">1,234</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <div className="pip-main">
        <header className="pip-header">
          <div className="pip-header-left">
            <div className="pip-breadcrumb">
              <span className="pip-breadcrumb-home">PriceIntel</span>
              <ChevronRight size={14} className="pip-breadcrumb-sep" />
              <span className="pip-breadcrumb-current">{currentTabLabel}</span>
            </div>
          </div>
          
          <div className="pip-header-right">
            <button className="pip-header-icon-btn" title="Actualiser">
              <RefreshCw size={17} />
            </button>
            <button className="pip-header-icon-btn pip-bell" title="Notifications">
              <Bell size={17} />
              <span className="pip-notif-dot"></span>
            </button>
            
            {user && (
              <div className="pip-user-menu">
                <span className="pip-username">
                  {user?.first_name || user?.username || "Admin"}
                </span>
                <button onClick={onLogout} className="pip-logout-btn" title="Déconnexion">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            
            <div className="pip-avatar">
              {(user?.first_name?.[0] || user?.username?.[0] || "A").toUpperCase()}
            </div>
          </div>
        </header>

        <main className="pip-content">
          {tab === "products" && (
            <div className="pip-welcome-banner">
              <div className="pip-welcome-text">
                <h1>Bonjour {user?.first_name ? ` ${user.first_name}`:''} 👋</h1>
                <p>Bienvenue sur <strong>Price Intelligence Platform</strong></p>
              </div>
              <div className="pip-welcome-actions">
                <button className="pip-btn-primary">
                  <Search size={16} /> Nouvelle recherche
                </button>
                <button className="pip-btn-ghost">
                  <Bell size={16} /> Voir alertes
                </button>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div className="pip-quick-stats">
              {quickStats.map((stat, i) => (
                <div key={i} className="pip-quick-stat-card">
                  <div>
                    <p className="pip-qs-label">{stat.title}</p>
                    <h3 className="pip-qs-value">{stat.value}</h3>
                  </div>
                  <div className="pip-qs-icon" style={{ background: stat.color + "18", color: stat.color }}>
                    <stat.icon size={22} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pip-tab-content">
            {tab === "products"    && <TabProducts />}
            {tab === "stats"       && <TabStats />}
            {tab === "clustering"  && <TabClustering />}
            {tab === "anomalies"   && <TabAnomalies />}
            {tab === "association" && <TabAssociation />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🎯 APP PRINCIPALE — Avec Routing PROTÉGÉ
// ══════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

// ═════ COMPOSANT DE ROUTING SÉPARÉ ═════
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        <div className="pip-spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <Login />} 
      />
      
      <Route 
        path="/*" 
        element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
    </Routes>
  );
}