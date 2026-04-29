import { useState, useEffect } from "react";
import "./main.css";

const API = "http://127.0.0.1:8000/api";

function Spinner() {
  return <div className="spinner"></div>;
}

function Badge({ label, color }) {
  return <span className="badge-pill" style={{ background: color }}>{label}</span>;
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
// ONGLET PRODUITS — Scraping live + affichage CSV enrichi
// ══════════════════════════════════════════════════════════════════
function TabProducts() {
  const [query, setQuery]       = useState("");
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState("db");   // "csv", "db", ou "scrape"
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [scrapeTarget, setScrapeTarget] = useState(""); 

  // Chargement initial sur la base de données
  useEffect(() => { 
      fetchDB(1, ""); 
  }, []);

  // 1. Fetch depuis le CSV enrichi
  const fetchCSV = async (p = 1) => {
    setLoading(true); setMode("csv"); setScrapeMsg("");
    try {
      const res  = await fetch(`${API}/products/?query=${query}&page=${p}&limit=20`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 2. Fetch depuis la Base de données (MySQL)
  const fetchDB = async (p = 1) => {
    setLoading(true); setMode("db"); setScrapeMsg("");
    try {
      // On utilise l'endpoint de recherche classique (search) qui tape dans la DB
      const res  = await fetch(`${API}/search/?query=${query}&page=${p}&limit=20`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 3. Logique de Scraping en direct
 const runScrape = async (target) => {
    setLoading(true);
    setScrapeTarget(target);
    
    // Si query est vide, on n'envoie pas de paramètre ou on envoie une chaîne vide
    // Ton backend Django utilisera alors : request.GET.get("query", "pc portable")
    const searchParam = query.trim() !== "" ? `?query=${encodeURIComponent(query)}` : "";
    
    setScrapeMsg(`⏳ Lancement du scraping ${target} ${query.trim() !== "" ? `pour "${query}"` : "(automatique)"}...`);
    
    try {
      let endpoint = "";
      switch(target) {
        case "jumia":      endpoint = "scrape/jumia/"; break;
        case "amazon":     endpoint = "scrape/amazon/"; break;
        case "aliexpress": endpoint = "scrape/aliexpress/"; break;
        case "all":        endpoint = "scrape/All/"; break;
        default:           endpoint = "search/";
      }

      // Appel de l'API avec ou sans query
      const res = await fetch(`${API}/${endpoint}${searchParam}`);
      const data = await res.json();
      
      if (data.success) {
        // Succès : Ton backend a renvoyé "success": True après insertion MySQL
        setScrapeMsg(`✅ ${data.message}`);
        
        // Optionnel : Basculer sur l'onglet DB pour voir les résultats
        setMode("db");
        fetchDB(1); 
      } else {
        setScrapeMsg(`❌ Erreur: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      setScrapeMsg(`❌ Erreur réseau sur ${target}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="search-box">
        <input
          type="text"
          placeholder="Rechercher un modèle..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === "csv" ? "active" : ""}`} onClick={() => fetchCSV(1)}>📂 CSV</button>
          <button className={`mode-btn ${mode === "db" ? "active" : ""}`} onClick={() => fetchDB(1)}>🗄️ Produits (DB)</button>
          <button className={`mode-btn ${mode === "scrape" ? "active" : ""}`} onClick={() => setMode("scrape")}>🕷️ Scraper</button>
        </div>

        {mode !== "scrape" && (
          <button onClick={() => mode === "csv" ? fetchCSV(1) : fetchDB(1)} disabled={loading} className="search-main-btn">
            {loading ? "..." : "🔍 Rechercher"}
          </button>
        )}
      </div>

      {/* Zone des boutons de Scraping - Apparaît seulement si mode === "scrape" */}
      {mode === "scrape" && (
        <div className="scrape-actions">
          <p>Lancer un nouveau scraping vers la base de données :</p>
          <div className="scrape-buttons-group">
            <button onClick={() => runScrape("jumia")} disabled={loading} className="btn-jumia">
               {loading && scrapeTarget === "jumia" ? "⏳" : "Scraper Jumia"}
            </button>
            <button onClick={() => runScrape("amazon")} disabled={loading} className="btn-amazon">
               {loading && scrapeTarget === "amazon" ? "⏳" : "Scraper Amazon"}
            </button>
            <button onClick={() => runScrape("aliexpress")} disabled={loading} className="btn-aliex">
               {loading && scrapeTarget === "aliexpress" ? "⏳" : "Scraper AliExpress"}
            </button>
            <button onClick={() => runScrape("all")} disabled={loading} className="btn-all">
               {loading && scrapeTarget === "all" ? "⏳" : "🔥 Tout Scraper"}
            </button>
          </div>
        </div>
      )}

      {scrapeMsg && <div className="scrape-info-bar">{scrapeMsg}</div>}

      <div className="status-bar">
        <strong>{total}</strong> produits trouvés
        <span className="mode-tag">{mode === "csv" ? "Fichier CSV" : mode === "db" ? "Base de données" : "Mode Scraping"}</span>
      </div>

      {loading && mode !== "scrape" ? <Spinner /> : (
        <>
          <div className="product-list">
            {products.map((item, i) => (
              <div className="card" key={i}>
                {item.is_gaming && <span className="gaming-tag">🎮 Gaming</span>}
                {item.image && <img src={item.image} alt={item.title} className="product-img" />}
                <div className="card-content">
                  <span className="brand-label">{item.brand_detected || "Inconnu"}</span>
                  <h3>{item.title}</h3>
                  <p className="price">{item.price?.toLocaleString()} MAD</p>
                  <div className="card-footer">
                    <small>{item.source}</small>
                    <a href={item.link} target="_blank" rel="noreferrer" className="view-btn">Voir →</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button onClick={() => mode === "csv" ? fetchCSV(page - 1) : fetchDB(page - 1)} disabled={page <= 1}>←</button>
            <span>{page} / {pages}</span>
            <button onClick={() => mode === "csv" ? fetchCSV(page + 1) : fetchDB(page + 1)} disabled={page >= pages}>→</button>
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
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/stats/`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  }, []);
  if (loading) return <Spinner />;
  if (!data)   return <p>Erreur</p>;
  const { stats, by_brand, by_category, gaming, distribution } = data;
  return (
    <div className="stats-page">
      <div className="kpi-grid">
        {[
          ["Produits analysés", stats.count],
          ["Prix médian", `${stats.median?.toLocaleString()} MAD`],
          ["Prix moyen",  `${Math.round(stats.mean)?.toLocaleString()} MAD`],
          ["Prix min",    `${stats.min?.toLocaleString()} MAD`],
          ["Prix max",    `${stats.max?.toLocaleString()} MAD`],
          ["Coeff. variation", `${stats.cv}%`],
        ].map(([label, val], i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-val">{val}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <h3>📊 Distribution des prix</h3>
        <div className="histogram">
          {distribution.map((b, i) => {
            const maxC = Math.max(...distribution.map(x=>x.count));
            return (
              <div className="bar-wrap" key={i} title={`${b.count} produits`}>
                <div className="bar-count">{b.count}</div>
                <div className="bar" style={{height: Math.max(4,(b.count/maxC)*180)}}></div>
                <div className="bar-label">{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="two-cols">
        <div className="chart-card">
          <h3>🏷️ Stats par marque</h3>
          <table className="data-table">
            <thead><tr><th>Marque</th><th>Nb</th><th>Médiane MAD</th><th>Moyenne MAD</th></tr></thead>
            <tbody>
              {by_brand.slice(0,8).map((b,i)=>(
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

        <div className="chart-card">
          <h3>💰 Répartition par gamme</h3>
          {by_category.map((c,i)=>{
            const maxC = Math.max(...by_category.map(x=>x.count));
            return (
              <div key={i} className="cat-row">
                <div className="cat-name">{c.price_category?.replace(/_/g," ")}</div>
                <div className="cat-bar-bg">
                  <div className="cat-bar" style={{width:`${(c.count/maxC)*100}%`, background:Object.values(CATEGORY_COLORS)[i]}}></div>
                </div>
                <div className="cat-count">{c.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-card">
        <h3>🎮 Gaming vs Non-Gaming</h3>
        <div className="gaming-compare">
          {[
            {key:"gaming",    label:"🎮 Gaming",    cls:"gaming"},
            {key:"non_gaming",label:"💻 Non-Gaming", cls:"non-gaming"},
          ].map(({key,label,cls})=>(
            <div className={`gaming-box ${cls}`} key={key}>
              <div className="gbox-title">{label}</div>
              <div className="gbox-count">{gaming[key]?.count} produits</div>
              <div className="gbox-price">Médiane : <strong>{gaming[key]?.median?.toLocaleString()} MAD</strong></div>
              <div className="gbox-price">Moyenne : <strong>{Math.round(gaming[key]?.mean)?.toLocaleString()} MAD</strong></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONGLET CLUSTERING — KMeans + DBSCAN
// ══════════════════════════════════════════════════════════════════
function TabClustering() {
  const [algo, setAlgo]       = useState("kmeans");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [eps, setEps]         = useState(0.5);
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
    } catch(err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchClustering("kmeans", eps, minSamples); }, []);

  const switchAlgo = (a) => {
    setAlgo(a);
    fetchClustering(a, eps, minSamples);
  };

  const clusterNames = data ? [...new Set(data.scatter?.map(p=>p.cluster) || [])] : [];
  const colorMap = {};
  clusterNames.forEach((n,i) => { colorMap[n] = CLUSTER_COLORS[i%6]; });

  return (
    <div className="stats-page">

      {/* ── Sélecteur d'algorithme ── */}
      <div className="algo-selector">
        <div className="algo-label">Algorithme de clustering :</div>
        <div className="algo-btns">
          <button
            className={`algo-btn kmeans ${algo === "kmeans" ? "active" : ""}`}
            onClick={() => switchAlgo("kmeans")}
          >
            <span className="algo-icon">🔵</span>
            <span className="algo-name">K-Means</span>
            <span className="algo-desc">k optimal automatique</span>
          </button>
          <button
            className={`algo-btn dbscan ${algo === "dbscan" ? "active" : ""}`}
            onClick={() => switchAlgo("dbscan")}
          >
            <span className="algo-icon">🟣</span>
            <span className="algo-name">DBSCAN</span>
            <span className="algo-desc">détection automatique</span>
          </button>
        </div>
      </div>

      {/* ── Paramètres DBSCAN ── */}
      {algo === "dbscan" && (
        <div className="dbscan-params">
          <div className="param-title">⚙️ Paramètres DBSCAN</div>
          <div className="param-row">
            <label>eps (rayon de voisinage) :
              <input type="number" value={eps} step="0.1" min="0.1" max="5"
                onChange={e => setEps(parseFloat(e.target.value))} />
            </label>
            <label>min_samples (points minimum) :
              <input type="number" value={minSamples} step="1" min="2" max="50"
                onChange={e => setMinSamples(parseInt(e.target.value))} />
            </label>
            <button className="apply-btn" onClick={() => fetchClustering("dbscan", eps, minSamples)}>
              ▶ Appliquer
            </button>
          </div>
          <div className="param-hint">
            💡 <strong>eps</strong> : distance max entre deux points voisins. <strong>min_samples</strong> : nb min de points pour former un cluster. Label <strong>-1</strong> = outlier.
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {!loading && data && (
        <>
          {/* ── KPIs ── */}
          <div className="kpi-grid">
            {algo === "kmeans" ? (
              <>
                <div className="kpi-card">
                  <div className="kpi-val">{data.best_k}</div>
                  <div className="kpi-label">k optimal (K-Means)</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-val">{data.silhouette}</div>
                  <div className="kpi-label">Score Silhouette</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-val">{data.summary?.length}</div>
                  <div className="kpi-label">Segments créés</div>
                </div>
              </>
            ) : (
              <>
                <div className="kpi-card">
                  <div className="kpi-val">{data.n_clusters}</div>
                  <div className="kpi-label">Clusters trouvés (DBSCAN)</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-val">{data.scatter?.filter(p=>p.cluster==="Outlier").length || 0}</div>
                  <div className="kpi-label">Outliers détectés</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-val">eps = {data.eps}</div>
                  <div className="kpi-label">Rayon utilisé</div>
                </div>
              </>
            )}
          </div>

          {/* ── Tableau k optimal (KMeans seulement) ── */}
          {algo === "kmeans" && data.k_scores && (
            <div className="chart-card">
              <h3>🔍 Recherche du k optimal</h3>
              <table className="data-table">
                <thead>
                  <tr><th>k</th><th>Inertie</th><th>Silhouette ↑</th><th>Davies-Bouldin ↓</th></tr>
                </thead>
                <tbody>
                  {data.k_scores.map((r,i) => (
                    <tr key={i} className={r.k === data.best_k ? "row-best" : ""}>
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

          {/* ── Explication DBSCAN ── */}
          {algo === "dbscan" && (
            <div className="chart-card dbscan-info">
              <h3>ℹ️ Comment fonctionne DBSCAN ?</h3>
              <p>DBSCAN (Density-Based Spatial Clustering of Applications with Noise) regroupe les points denses sans fixer k à l'avance :</p>
              <ul className="info-list">
                <li><strong>Core point</strong> : a au moins <em>min_samples</em> voisins dans un rayon <em>eps</em></li>
                <li><strong>Border point</strong> : dans le rayon d'un core point, mais pas assez de voisins</li>
                <li><strong>Outlier (label -1)</strong> : isolé, ni core ni border → anomalie de prix</li>
              </ul>
            </div>
          )}

          {/* ── Résumé clusters ── */}
          <div className="chart-card">
            <h3>📦 Résumé des segments</h3>
            <div className="cluster-grid">
              {data.summary?.map((c,i) => (
                <div className="cluster-card" key={i}
                  style={{borderTop:`4px solid ${c.cluster==="Outlier" ? "#e74c3c" : CLUSTER_COLORS[i%6]}`}}>
                  <div className="cluster-name" style={{color: c.cluster==="Outlier" ? "#e74c3c" : "inherit"}}>
                    {c.cluster === "Outlier" ? "⚠️ " : ""}{c.cluster}
                  </div>
                  <div className="cluster-count">{c.count} produits</div>
                  <div className="cluster-stats">
                    <div>Médiane : <strong>{c.median?.toLocaleString()} MAD</strong></div>
                    <div>Moyenne : <strong>{Math.round(c.mean)?.toLocaleString()} MAD</strong></div>
                    <div>Min : {c.min?.toLocaleString()} | Max : {c.max?.toLocaleString()}</div>
                    {c.top_brand && <div>Top marque : <strong>{c.top_brand}</strong></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Nuage de points ── */}
          <div className="chart-card">
            <h3>🔵 Nuage de points — Prix par cluster</h3>
            <div className="legend">
              {clusterNames.map((n,i) => (
                <span key={i} className="legend-item">
                  <span className="legend-dot"
                    style={{background: n==="Outlier" ? "#e74c3c" : CLUSTER_COLORS[i%6]}}></span>{n}
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
  const prices = points.map(p=>p.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const W=700, H=260, PAD=40;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="scatter-svg">
      <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke="#ddd"/>
      <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#ddd"/>
      <text x={W/2} y={H-4} textAnchor="middle" fontSize="11" fill="#999">Prix MAD</text>
      {points.map((p,i)=>{
        const x = PAD + ((p.price-minP)/(maxP-minP||1))*(W-2*PAD);
        const y = PAD + (Math.sin(i*0.7)*0.4+0.5)*(H-2*PAD);
        return <circle key={i} cx={x} cy={y} r={4} fill={colorMap[p.cluster]||"#999"} opacity={0.75}>
          <title>{p.title} — {p.price?.toLocaleString()} MAD</title>
        </circle>;
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONGLET ANOMALIES
// ══════════════════════════════════════════════════════════════════
function TabAnomalies() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/anomalies/`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  }, []);
  if (loading) return <Spinner />;
  if (!data)   return <p>Erreur</p>;
  return (
    <div className="stats-page">
      <div className="kpi-grid">
        <div className="kpi-card warn"><div className="kpi-val">{data.total}</div><div className="kpi-label">Anomalies (Isolation Forest)</div></div>
        {data.summary.map((s,i)=>(
          <div className="kpi-card" key={i}>
            <div className="kpi-val">{s.anomalies} <small>({s.pourcentage}%)</small></div>
            <div className="kpi-label">{s.methode}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <h3>🚨 Produits à prix suspect</h3>
        <p className="hint">Détectés par Isolation Forest — prix anormal par rapport aux specs.</p>
        <table className="data-table">
          <thead><tr><th>#</th><th>Titre</th><th>Marque</th><th>Gamme</th><th>Prix MAD</th></tr></thead>
          <tbody>
            {data.anomalies.map((a,i)=>(
              <tr key={i}>
                <td>{i+1}</td>
                <td className="td-title">{a.title}</td>
                <td>{a.brand_detected}</td>
                <td><Badge label={a.price_category?.replace(/_/g," ")} color={CATEGORY_COLORS[a.price_category]||"#888"}/></td>
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
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/association/`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  }, []);
  if (loading) return <Spinner />;
  if (!data)   return <p>Erreur</p>;
  return (
    <div className="stats-page">
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-val">{data.total}</div><div className="kpi-label">Règles générées</div></div>
      </div>
      <div className="chart-card">
        <h3>🔗 Règles d'association (Apriori)</h3>
        <p className="hint">
          <strong>Support</strong> = fréquence &nbsp;|&nbsp;
          <strong>Confiance</strong> = probabilité &nbsp;|&nbsp;
          <strong>Lift &gt; 1</strong> = règle non triviale
        </p>
        {!data.rules.length ? <p>Aucune règle trouvée.</p> : (
          <div className="rules-list">
            {data.rules.map((r,i)=>(
              <div className="rule-card" key={i}>
                <div className="rule-body">
                  <span className="rule-if">SI &nbsp; {r.antecedent}</span>
                  <span className="rule-arrow">→</span>
                  <span className="rule-then">ALORS &nbsp; {r.consequent}</span>
                </div>
                <div className="rule-metrics">
                  <span className="metric">Support : <strong>{(r.support*100).toFixed(1)}%</strong></span>
                  <span className="metric">Confiance : <strong>{(r.confidence*100).toFixed(1)}%</strong></span>
                  <span className="metric lift">Lift : <strong>{r.lift}</strong></span>
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
// APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════
const TABS = [
  {id:"products",    label:"🛒 Produits"},
  {id:"stats",       label:"📊 Statistiques"},
  {id:"clustering",  label:"🔵 Clustering"},
  {id:"anomalies",   label:"🚨 Anomalies"},
  {id:"association", label:"🔗 Association"},
];

export default function App() {
  const [tab, setTab] = useState("products");
  return (
    <div className="container">
      <header className="app-header">
        <h1>🛒 Price Intelligence Platform</h1>
        <p className="subtitle">Scraping Jumia Maroc + Data Mining</p>
      </header>
      <nav className="tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="tab-content">
        {tab==="products"    && <TabProducts />}
        {tab==="stats"       && <TabStats />}
        {tab==="clustering"  && <TabClustering />}
        {tab==="anomalies"   && <TabAnomalies />}
        {tab==="association" && <TabAssociation />}
      </main>
    </div>
  );
}