import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./main.css";
import {
  Search, Bell, ShoppingBag, TrendingUp, Package, Menu, X, AlertTriangle, Link2,
  RefreshCw, ChevronRight, BarChart2, LogOut, User, Lock, AlertCircle,
  Activity, Clock, Database, Download, Play, Square, Settings,
  TrendingDown, ArrowRight, ChevronLeft, ChevronRight as ChevRight
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

// ══════════════════════════════════════════════════════════════════
// 🛡️ AUTH CONTEXT (inchangé)
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

// ── Helpers ────────────────────────────────────────────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function Spinner() {
  return <div className="pip-spinner-wrap"><div className="pip-spinner"></div></div>;
}

function ErrMsg({ msg }) {
  return <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "14px 18px", borderRadius: "8px", fontSize: "14px", margin: "12px 0" }}>❌ {msg}</div>;
}

const CATEGORY_COLORS = {
  "entrée_de_gamme": "#27ae60", "milieu_de_gamme_bas": "#2980b9",
  "milieu_de_gamme": "#8e44ad", "haut_de_gamme": "#e67e22", "premium": "#c0392b",
};
const CLUSTER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
const PLATFORM_COLORS = {
  jumia: { box: "#3b82f6", fill: "#dbeafe" },
  amazon: { box: "#f97316", fill: "#ffedd5" },
  aliexpress: { box: "#10b981", fill: "#d1fae5" },
  default: { box: "#64748b", fill: "#f1f5f9" },
};

// ══════════════════════════════════════════════════════════════════
// 🔐 PAGE LOGIN (inchangée)
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
          <div className="pip-login-logo"><ShoppingBag size={40} color="#f97316" /></div>
          <h1>PriceIntel</h1>
          <p>Plateforme d'Intelligence Prix</p>
        </div>
        <form onSubmit={handleSubmit} className="pip-login-form">
          <div className="pip-login-input-group">
            <label><User size={18} /> Nom d'utilisateur</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Entrez votre nom" required disabled={loading} autoFocus />
          </div>
          <div className="pip-login-input-group">
            <label><Lock size={18} /> Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Entrez votre mot de passe" required disabled={loading} />
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
// 🛒 ONGLET PRODUITS — avec scraping + progression + historique
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

  // ── Barre de progression ──
  const [progress, setProgress] = useState(0);
  const [polling, setPolling] = useState(false);

  // 🔥 AJOUT : État pour gérer les deux sous-menus de scraping
  const [scrapeCategory, setScrapeCategory] = useState("laptop");

  const API = "http://127.0.0.1:8000/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchDB(1, "");
  }, []);

  const fetchCSV = async (p = 1) => {
    setLoading(true);
    setMode("csv");
    setScrapeMsg("");

    try {
      const res = await fetch(
        `${API}/products/?query=${query}&page=${p}&limit=20`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
      setScrapeMsg("❌ Erreur lors du chargement CSV");
    }

    setLoading(false);
  };

  const fetchDB = async (p = 1) => {
    setLoading(true);
    setMode("db");
    setScrapeMsg("");

    try {
      const res = await fetch(
        `${API}/search/?query=${query}&page=${p}&limit=20`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
      setScrapeMsg("❌ Erreur lors du chargement DB");
    }

    setLoading(false);
  };

  const fetchAccessories = async (p = 1) => {
    setLoading(true);
    setMode("db_accessoire");
    setScrapeMsg("");

    try {
      const res = await fetch(
        `${API}/search/Accessoire/?query=${query}&page=${p}&limit=20`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();

      setProducts(data.accessories || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
      setScrapeMsg("❌ Erreur lors du chargement des accessoires");
    }

    setLoading(false);
  };

  // ── Polling du statut Celery ───────────────────────────────────
  const pollTaskStatus = (taskId, target) => {
    setPolling(true);
    setProgress(30);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/status/${taskId}/`, {
          headers: getAuthHeaders(),
        });

        const status = await res.json();

        if (status.status === "SUCCESS") {
          clearInterval(interval);

          setProgress(100);
          setPolling(false);

          setScrapeMsg(
            `✅ Scraping ${target} terminé — ${
              status.result?.inserted || 0
            } produits`
          );

          // Sauvegarde historique
          fetch(`${API}/history/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              query,
              source: target,
              count: status.result?.inserted || 0,
            }),
          }).catch(() => {});

          if (
            target !== "jumia" &&
            target !== "amazon" &&
            target !== "aliexpress" &&
            target !== "all"
          ) {
            fetchAccessories(1);
          } else {
            fetchDB(1);
          }

          setTimeout(() => {
            setProgress(0);
            setScrapeMsg("");
          }, 3000);
        } else if (status.status === "FAILURE") {
          clearInterval(interval);

          setPolling(false);
          setScrapeMsg("❌ Échec du scraping");
          setProgress(0);
        } else {
          setProgress((p) => Math.min(p + 8, 90));
        }
      } catch (e) {
        console.error(e);

        clearInterval(interval);
        setPolling(false);
        setProgress(0);
      }
    }, 2000);
  };

  const runScrape = async (target) => {
    setLoading(true);
    setScrapeTarget(target);

    // --- 🔥 CORRECTION : Définir un mot-clé par défaut selon l'accessoire ---
    let defaultQuery = "laptop";

    if (target === "souris") defaultQuery = "souris";
    if (target === "laptop_stand") defaultQuery = "laptop_stand";
    if (target === "cooling_pad") defaultQuery = "cooling_pad";
    if (target === "sac_laptop") defaultQuery = "sac_laptop";
    if (target === "usb") defaultQuery = "usb_flash_drive";

    const finalQuery =
      query.trim() !== "" ? query.trim() : defaultQuery;

    const searchParam = `?query=${encodeURIComponent(finalQuery)}`;

    setScrapeMsg(
      `⏳ Scraping ${target} en cours pour "${finalQuery}"...`
    );

    setProgress(10);

    try {
      let endpoint = "";

      switch (target) {
        case "jumia":
          endpoint = "scrape/jumia/";
          break;

        case "amazon":
          endpoint = "scrape/amazon/";
          break;

        case "aliexpress":
          endpoint = "scrape/aliexpress/";
          break;

        case "all":
          endpoint = "scrape/All/";
          break;

        case "souris":
          endpoint = "scrape/souris/";
          break;

        case "laptop_stand":
          endpoint = "scrape/laptop_stand/";
          break;

        case "cooling_pad":
          endpoint = "scrape/cooling_pad/";
          break;

        case "sac_laptop":
          endpoint = "scrape/sac_laptop/";
          break;

        case "usb":
          endpoint = "scrape/usb/";
          break;

        default:
          endpoint = "search/";
      }

      const url = `${API}/${endpoint}${searchParam}`;

      console.log("Appel API vers :", url);

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (data.task_id) {
        setCurrentTaskId(data.task_id);

        setScrapeMsg(
          `⏳ Scraping ${target} en cours pour "${finalQuery}"...`
        );

        pollTaskStatus(data.task_id, target);
      } else if (data.success) {
        setProgress(100);

        setScrapeMsg(`✅ ${data.message}`);

        if (
          target !== "jumia" &&
          target !== "amazon" &&
          target !== "aliexpress" &&
          target !== "all"
        ) {
          setMode("db_accessoire");
          fetchAccessories(1);
        } else {
          setMode("db");
          fetchDB(1);
        }

        setTimeout(() => {
          setProgress(0);
          setScrapeMsg("");
        }, 3000);
      } else {
        setScrapeMsg(
          `❌ ${
            data.message || data.error || "Problème lors du scraping"
          }`
        );

        setProgress(0);
      }
    } catch (e) {
      console.error("Erreur Fetch:", e);

      setScrapeMsg(`❌ Erreur réseau sur ${target}`);
      setProgress(0);
    }

    setLoading(false);
    setScrapeTarget("");
  };

  // ── STOP scraping ──────────────────────────────────────────────
  const handleStop = async () => {
    if (!currentTaskId) {
      setScrapeMsg(
        "❌ Impossible d'arrêter : aucune tâche en cours ou Task ID introuvable."
      );

      return;
    }

    setScrapeMsg("⏳ Demande d'arrêt envoyée...");

    try {
      const res = await fetch(
        `${API}/scrape/Stop/?task_id=${currentTaskId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();

      if (data.success) {
        setScrapeMsg(
          `🛑 ${data.message || "Scraping arrêté."}`
        );

        setCurrentTaskId(null);
        setProgress(0);
        setPolling(false);
      } else {
        setScrapeMsg(
          `❌ Erreur: ${
            data.message || "Impossible d'arrêter"
          }`
        );
      }
    } catch (e) {
      console.error("Erreur lors de l'arrêt:", e);

      setScrapeMsg(
        "❌ Erreur lors de l'envoi de l'arrêt."
      );
    }
  };

  const scrapeBtnStyle = (bg) => ({
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s",
    minWidth: "140px",
    background: bg,
    opacity: loading || polling ? 0.7 : 1,
  });

  // Style des boutons de sélection de catégorie
  const categoryBtnStyle = (isActive) => ({
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    backgroundColor: isActive ? "#1e293b" : "#e2e8f0",
    color: isActive ? "white" : "#475569",
    transition: "background-color 0.2s",
    flex: 1,
  });

  return (
    <div>
      <div className="pip-search-box">
        <input
          type="text"
          className="pip-search-input"
          placeholder='Rechercher un produit… (ex: "laptop", "redmi 14")'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (mode === "csv") fetchCSV(1);
              else if (mode === "db_accessoire")
                fetchAccessories(1);
              else fetchDB(1);
            }
          }}
        />

        <div className="pip-mode-toggle">
          <button
            className={`pip-mode-btn ${
              mode === "csv" ? "active" : ""
            }`}
            onClick={() => fetchCSV(1)}
          >
            📂 CSV
          </button>

          <button
            className={`pip-mode-btn ${
              mode === "db" ? "active" : ""
            }`}
            onClick={() => fetchDB(1)}
          >
            🗄️ Produits (DB)
          </button>

          <button
            className={`pip-mode-btn ${
              mode === "db_accessoire" ? "active" : ""
            }`}
            onClick={() => fetchAccessories(1)}
          >
            🎧 Accessoires
          </button>

          <button
            className={`pip-mode-btn ${
              mode === "scrape" ? "active" : ""
            }`}
            onClick={() => setMode("scrape")}
          >
            🕷️ Scraper
          </button>
        </div>

        {mode !== "scrape" && (
          <button
            onClick={() => {
              if (mode === "csv") fetchCSV(1);
              else if (mode === "db_accessoire")
                fetchAccessories(1);
              else fetchDB(1);
            }}
            disabled={loading}
            className="pip-search-btn"
          >
            {loading ? "..." : "🔍 Rechercher"}
          </button>
        )}
      </div>

      {/* 🕷️ Zone Scraper */}
      {mode === "scrape" && (
        <div
          className="pip-card"
          style={{ marginBottom: 20, padding: 20 }}
        >
          <p
            style={{
              marginBottom: 15,
              fontWeight: "bold",
              color: "#1e293b",
            }}
          >
            Sélectionnez la catégorie à scraper :
          </p>

          {/* 🔥 Catégories */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "20px",
              maxWidth: "400px",
            }}
          >
            <button
              onClick={() => setScrapeCategory("laptop")}
              style={categoryBtnStyle(
                scrapeCategory === "laptop"
              )}
            >
              💻 Laptops
            </button>

            <button
              onClick={() => setScrapeCategory("accessoire")}
              style={categoryBtnStyle(
                scrapeCategory === "accessoire"
              )}
            >
              🎧 Accessoires
            </button>
          </div>

          <div
            className="scrape-buttons-group"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 15,
            }}
          >
            {/* Laptop */}
            {scrapeCategory === "laptop" && (
              <>
                <button
                  onClick={() => runScrape("jumia")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#f97316")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "jumia"
                    ? "⏳ En cours…"
                    : "Scraper Jumia"}
                </button>

                <button
                  onClick={() => runScrape("amazon")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#232f3e")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "amazon"
                    ? "⏳ En cours…"
                    : "Scraper Amazon"}
                </button>

                <button
                  onClick={() => runScrape("aliexpress")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#e62e04")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "aliexpress"
                    ? "⏳ En cours…"
                    : "Scraper AliExpress"}
                </button>

                <button
                  onClick={() => runScrape("all")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#1e293b")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "all"
                    ? "⏳ En cours…"
                    : "🔥 Tout Scraper"}
                </button>
              </>
            )}

            {/* Accessoires */}
            {scrapeCategory === "accessoire" && (
              <>
                <button
                  onClick={() => runScrape("souris")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#3b82f6")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "souris"
                    ? "⏳ En cours…"
                    : "🖱️ Souris"}
                </button>

                <button
                  onClick={() => runScrape("laptop_stand")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#3b82f6")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "laptop_stand"
                    ? "⏳ En cours…"
                    : "🏗️ Support PC"}
                </button>

                <button
                  onClick={() => runScrape("cooling_pad")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#3b82f6")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "cooling_pad"
                    ? "⏳ En cours…"
                    : "❄️ Refroidisseur"}
                </button>

                <button
                  onClick={() => runScrape("sac_laptop")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#3b82f6")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "sac_laptop"
                    ? "⏳ En cours…"
                    : "🎒 Sac PC"}
                </button>

                <button
                  onClick={() => runScrape("usb")}
                  disabled={loading || polling}
                  style={scrapeBtnStyle("#3b82f6")}
                >
                  {(loading || polling) &&
                  scrapeTarget === "usb"
                    ? "⏳ En cours…"
                    : "💾 Clé USB"}
                </button>
              </>
            )}
          </div>

          {/* STOP */}
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "15px",
            }}
          >
            <button
              onClick={handleStop}
              style={scrapeBtnStyle("#ef4444")}
            >
              <X
                size={18}
                style={{ marginRight: "8px" }}
              />
              STOP
            </button>
          </div>
        </div>
      )}

      {/* ── Barre de progression ── */}
      {(polling || progress > 0) && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              height: 8,
              background: "#e2e8f0",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                background:
                  "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                width: `${progress}%`,
                transition: "width 0.5s ease",
              }}
            />
          </div>

          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 4,
            }}
          >
            {scrapeMsg}
          </p>
        </div>
      )}

      {/* 💬 Messages */}
      {scrapeMsg && !polling && progress === 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 14,
            fontWeight: 500,
            fontSize: 13,
            color: scrapeMsg.startsWith("✅")
              ? "#166534"
              : scrapeMsg.startsWith("⏳") ||
                scrapeMsg.startsWith("🛑")
              ? "#0f172a"
              : "#991b1b",
            background: scrapeMsg.startsWith("✅")
              ? "#dcfce7"
              : scrapeMsg.startsWith("⏳") ||
                scrapeMsg.startsWith("🛑")
              ? "#f1f5f9"
              : "#fee2e2",
            border: `1px solid ${
              scrapeMsg.startsWith("✅")
                ? "#bbf7d0"
                : scrapeMsg.startsWith("⏳") ||
                  scrapeMsg.startsWith("🛑")
                ? "#e2e8f0"
                : "#fecaca"
            }`,
          }}
        >
          {scrapeMsg}
        </div>
      )}

      {/* 📊 Status */}
      <div
        className="pip-status-bar"
        style={{ marginBottom: 15 }}
      >
        <strong>{total.toLocaleString("fr-FR")}</strong>{" "}
        produits trouvés

        <span
          style={{
            marginLeft: 10,
            padding: "4px 8px",
            borderRadius: 4,
            background: "#e2e8f0",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {mode === "csv"
            ? "Fichier CSV"
            : mode === "db"
            ? "Base de données"
            : mode === "db_accessoire"
            ? "Accessoires"
            : "Scraping"}
        </span>
      </div>

      {/* 📦 Produits */}
      {loading && mode !== "scrape" ? (
        <div className="spinner-placeholder">
          Chargement...
        </div>
      ) : (
        <>
          <div className="pip-product-list">
            {products.map((item, i) => (
              <div className="pip-card" key={i}>
                {item.is_gaming && (
                  <span className="pip-gaming-tag">
                    🎮 Gaming
                  </span>
                )}

                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="pip-product-img"
                  />
                )}

                <div className="pip-card-content">
                  <span className="pip-brand-label">
                    {item.brand_detected ||
                      item.brand ||
                      "Inconnu"}
                  </span>

                  <h3 className="pip-card-title">
                    {item.title}
                  </h3>

                  <p className="pip-price">
                    {item.price?.toLocaleString("fr-FR")}{" "}
                    {item.currency &&
                    item.currency !== "N/A"
                      ? item.currency
                      : item.source
                          ?.toLowerCase()
                          .includes("amazon")
                      ? "€"
                      : "MAD"}
                  </p>

                  <div className="pip-card-footer">
                    <small style={{ color: "#64748b" }}>
                      {item.source}
                    </small>

                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="pip-view-btn"
                    >
                      Voir →
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {products.length === 0 && !loading && (
              <p
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  padding: 40,
                  fontSize: 14,
                }}
              >
                Aucun produit. Lancez un scraping ou
                cherchez un terme différent.
              </p>
            )}
          </div>

          {/* 📄 Pagination */}
          {pages > 1 && (
            <div className="pip-pagination">
              <button
                onClick={() => {
                  if (mode === "csv")
                    fetchCSV(page - 1);
                  else if (mode === "db_accessoire")
                    fetchAccessories(page - 1);
                  else fetchDB(page - 1);
                }}
                disabled={page <= 1}
              >
                ←
              </button>

              <span>
                {page} / {pages}
              </span>

              <button
                onClick={() => {
                  if (mode === "csv")
                    fetchCSV(page + 1);
                  else if (mode === "db_accessoire")
                    fetchAccessories(page + 1);
                  else fetchDB(page + 1);
                }}
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
// 📊 ONGLET STATISTIQUES — données réelles + Boxplot
// ══════════════════════════════════════════════════════════════════
function BoxplotSVG({ data }) {
  if (!data || data.length === 0) return null;
  const W = 620, H = 300, PL = 60, PR = 20, PT = 20, PB = 60;
  const CW = W - PL - PR, CH = H - PT - PB;
  const allVals = data.flatMap(d => [d.min, d.max].filter(Boolean));
  const minV = Math.min(...allVals) * 0.95, maxV = Math.max(...allVals) * 1.05;
  const range = maxV - minV || 1;
  const toY = v => PT + CH - ((v - minV) / range) * CH;
  const slotW = CW / data.length;
  const cx = i => PL + slotW * i + slotW / 2;
  const BOX = Math.min(40, slotW - 20);
  const yTicks = Array.from({ length: 6 }, (_, i) => minV + (i / 5) * range);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PL} y1={toY(t)} x2={W - PR} y2={toY(t)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={PL - 6} y={toY(t) + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{Math.round(t / 1000)}k</text>
        </g>
      ))}
      <text x={12} y={PT + CH / 2} fontSize="9" fill="#64748b" textAnchor="middle" transform={`rotate(-90,12,${PT + CH / 2})`}>Prix MAD</text>
      <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH} stroke="#e2e8f0" strokeWidth="1" />
      {data.map((d, i) => {
        const c = PLATFORM_COLORS[d.source?.toLowerCase()] || PLATFORM_COLORS.default;
        const half = BOX / 2, cap = BOX * 0.3;
        return (
          <g key={i}>
            <line x1={cx(i)} y1={toY(d.max)} x2={cx(i)} y2={toY(d.q3)} stroke={c.box} strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1={cx(i) - cap} y1={toY(d.max)} x2={cx(i) + cap} y2={toY(d.max)} stroke={c.box} strokeWidth="1.5" />
            <rect x={cx(i) - half} y={toY(d.q3)} width={BOX} height={toY(d.q1) - toY(d.q3)} fill={c.fill} stroke={c.box} strokeWidth="1.5" rx="2" />
            <line x1={cx(i) - half} y1={toY(d.median)} x2={cx(i) + half} y2={toY(d.median)} stroke={c.box} strokeWidth="2.5" />
            <line x1={cx(i)} y1={toY(d.q1)} x2={cx(i)} y2={toY(d.min)} stroke={c.box} strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1={cx(i) - cap} y1={toY(d.min)} x2={cx(i) + cap} y2={toY(d.min)} stroke={c.box} strokeWidth="1.5" />
            <text x={cx(i)} y={toY(d.median) - 5} fontSize="8" fill={c.box} textAnchor="middle" fontWeight="600">{Math.round(d.median / 1000)}k</text>
            <text x={cx(i)} y={PT + CH + 18} fontSize="10" fill="#374151" textAnchor="middle" fontWeight="500">{d.source}</text>
            <text x={cx(i)} y={PT + CH + 32} fontSize="9" fill="#94a3b8" textAnchor="middle">({d.count})</text>
          </g>
        );
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// 📊 ONGLET STATISTIQUES — version corrigée et améliorée
// Remplace entièrement TabStats dans App.jsx
// ══════════════════════════════════════════════════════════════════

function TabStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/stats/")
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} />;
  if (!data) return null;

  const { stats, by_brand, by_category, gaming, distribution, by_source } = data;

  const card = (bg, color) => ({
    background: bg,
    borderRadius: "var(--border-radius-lg)",
    padding: "1rem 1.25rem",
    border: "0.5px solid var(--color-border-tertiary)",
    color,
  });

  const fmt = (v) => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";

  // ── KPI Cards ────────────────────────────────────────────────────
  const kpis = [
    { label: "Produits",    value: stats.count?.toLocaleString("fr-FR"),         sub: "total scrappés",   bg: "#E6F1FB", color: "#0C447C" },
    { label: "Médiane",     value: `${fmt(stats.median)} MAD`,                   sub: "prix central",     bg: "#EAF3DE", color: "#27500A" },
    { label: "Moyenne",     value: `${fmt(stats.mean)} MAD`,                     sub: "prix moyen",       bg: "#FAEEDA", color: "#633806" },
    { label: "Écart-type",  value: `${fmt(stats.std)} MAD`,                      sub: "dispersion",       bg: "#FBEAF0", color: "#72243E" },
    { label: "CV",          value: `${stats.cv ?? "—"}%`,                        sub: "coeff. variation", bg: "#EEEDFE", color: "#3C3489" },
    { label: "Min",         value: `${fmt(stats.min)} MAD`,                      sub: "prix minimum",     bg: "#E1F5EE", color: "#085041" },
    { label: "Max",         value: `${fmt(stats.max)} MAD`,                      sub: "prix maximum",     bg: "#FCEBEB", color: "#791F1F" },
    { label: "Q1 / Q3",    value: `${fmt(stats.p25)} / ${fmt(stats.p75)}`,       sub: "quartiles MAD",    bg: "#F1EFE8", color: "#444441" },
  ];

  // ── Histogramme vertical ─────────────────────────────────────────
  const HistogrammeV = ({ distribution }) => {
    if (!distribution || distribution.length === 0) return null;
    const max = Math.max(...distribution.map(d => d.count));
    const COLORS_HIST = [
      "#185FA5","#1D6FAD","#2280B5","#2790BC","#2CA0C4",
      "#31B0CC","#36C0D4","#3BD0DC","#40E0E4","#45F0EC","#50FFD0","#60FFB0"
    ];
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1.5rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500,
          color: "var(--color-text-primary)", marginBottom: "1rem" }}>
          Histogramme — Distribution des prix
        </div>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 4,
          height: 180, padding: "0 4px"
        }}>
          {distribution.map((b, i) => {
            const h = Math.max(8, (b.count / max) * 160);
            return (
              <div key={i} style={{ flex: 1, display: "flex",
                flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-tertiary)",
                  fontWeight: 500, whiteSpace: "nowrap" }}>
                  {b.count > 100 ? `${Math.round(b.count/1000)}k` : b.count}
                </span>
                <div style={{
                  width: "100%", height: h,
                  background: COLORS_HIST[i % COLORS_HIST.length],
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.85,
                  transition: "opacity 0.2s",
                  cursor: "default",
                }}
                  title={`${b.label} : ${b.count.toLocaleString("fr-FR")} produits`}
                />
              </div>
            );
          })}
        </div>
        {/* Labels axe X */}
        <div style={{ display: "flex", gap: 4, padding: "6px 4px 0" }}>
          {distribution.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <span style={{
                fontSize: 9, color: "var(--color-text-tertiary)",
                display: "block", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis"
              }}>
                {b.label?.split("–")[0]}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)",
          textAlign: "center", marginTop: 6 }}>
          Plages de prix en MAD
        </div>
      </div>
    );
  };

  // ── Boxplot SVG amélioré ─────────────────────────────────────────
  const BoxplotV2 = ({ data: bdata }) => {
    if (!bdata || bdata.length === 0) return null;
    const W = 640, H = 300, PL = 70, PR = 20, PT = 20, PB = 70;
    const CW = W - PL - PR, CH = H - PT - PB;
    const allVals = bdata.flatMap(d => [d.min, d.q1, d.median, d.q3, d.max].filter(v => v != null));
    const minV = Math.min(...allVals), maxV = Math.max(...allVals);
    const range = maxV - minV || 1;
    const toY = v => PT + CH - ((v - minV) / range) * CH;
    const slotW = CW / bdata.length;
    const cx = i => PL + slotW * i + slotW / 2;
    const BOX_W = Math.min(50, slotW * 0.45);
    const PLT_COLORS = {
      aliexpress: { stroke: "#0F6E56", fill: "#9FE1CB" },
      amazon:     { stroke: "#BA7517", fill: "#FAC775" },
      jumia:      { stroke: "#185FA5", fill: "#B5D4F4" },
    };
    const yTicks = Array.from({ length: 6 }, (_, i) => minV + (i / 5) * range);

    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1.5rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500,
          color: "var(--color-text-primary)", marginBottom: "0.75rem" }}>
          Boxplot comparatif par plateforme
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          {/* Grille horizontale */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PL} y1={toY(t)} x2={W - PR} y2={toY(t)}
                stroke="var(--color-border-tertiary)" strokeWidth="1" />
              <text x={PL - 8} y={toY(t) + 4} fontSize="10"
                fill="var(--color-text-tertiary)" textAnchor="end">
                {Math.round(t / 1000)}k
              </text>
            </g>
          ))}
          {/* Label axe Y */}
          <text x={14} y={PT + CH / 2} fontSize="10"
            fill="var(--color-text-tertiary)" textAnchor="middle"
            transform={`rotate(-90,14,${PT + CH / 2})`}>Prix MAD</text>
          {/* Ligne base */}
          <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH}
            stroke="var(--color-border-secondary)" strokeWidth="1" />

          {bdata.map((d, i) => {
            if (!d.q1 || !d.q3 || !d.median) return null;
            const key = d.source?.toLowerCase();
            const c = PLT_COLORS[key] || { stroke: "#533AB7", fill: "#CECBF6" };
            const half = BOX_W / 2;
            const cap  = BOX_W * 0.35;

            return (
              <g key={i}>
                {/* Moustache haute */}
                {d.max && d.q3 && (
                  <>
                    <line x1={cx(i)} y1={toY(d.max)} x2={cx(i)} y2={toY(d.q3)}
                      stroke={c.stroke} strokeWidth="1.5" strokeDasharray="4,3" />
                    <line x1={cx(i) - cap} y1={toY(d.max)}
                      x2={cx(i) + cap} y2={toY(d.max)}
                      stroke={c.stroke} strokeWidth="2" />
                  </>
                )}
                {/* Boîte Q1-Q3 */}
                <rect
                  x={cx(i) - half} y={toY(d.q3)}
                  width={BOX_W} height={Math.max(4, toY(d.q1) - toY(d.q3))}
                  fill={c.fill} stroke={c.stroke} strokeWidth="1.5" rx="3" />
                {/* Médiane */}
                <line x1={cx(i) - half} y1={toY(d.median)}
                  x2={cx(i) + half} y2={toY(d.median)}
                  stroke={c.stroke} strokeWidth="2.5" />
                {/* Label médiane */}
                <text x={cx(i)} y={toY(d.median) - 6} fontSize="10"
                  fill={c.stroke} textAnchor="middle" fontWeight="500">
                  {Math.round(d.median / 1000)}k
                </text>
                {/* Moustache basse */}
                {d.min && d.q1 && (
                  <>
                    <line x1={cx(i)} y1={toY(d.q1)} x2={cx(i)} y2={toY(d.min)}
                      stroke={c.stroke} strokeWidth="1.5" strokeDasharray="4,3" />
                    <line x1={cx(i) - cap} y1={toY(d.min)}
                      x2={cx(i) + cap} y2={toY(d.min)}
                      stroke={c.stroke} strokeWidth="2" />
                  </>
                )}
                {/* Label source */}
                <text x={cx(i)} y={PT + CH + 20} fontSize="11"
                  fill="var(--color-text-primary)" textAnchor="middle" fontWeight="500">
                  {d.source}
                </text>
                <text x={cx(i)} y={PT + CH + 36} fontSize="10"
                  fill="var(--color-text-tertiary)" textAnchor="middle">
                  ({d.count?.toLocaleString("fr-FR")})
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", gap: 16, fontSize: 11,
          color: "var(--color-text-tertiary)", marginTop: 4 }}>
          <span>▬ Médiane &nbsp; □ Q1–Q3 &nbsp; ╌ Min/Max</span>
        </div>
      </div>
    );
  };

  // ── Tableau marques ───────────────────────────────────────────────
  const TableMarques = ({ by_brand }) => {
    if (!by_brand || by_brand.length === 0) return null;
    const max = Math.max(...by_brand.map(b => b.count));
    const BRAND_COLORS = ["#185FA5","#0F6E56","#BA7517","#993556",
      "#533AB7","#A32D2D","#0F6E56","#BA7517"];
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500,
          color: "var(--color-text-primary)", marginBottom: "1rem" }}>
          Top marques
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Marque","Produits","Part","Médiane","Moyenne"].map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 0 ? "left" : "right",
                  padding: "6px 10px", fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  borderBottom: "0.5px solid var(--color-border-tertiary)"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {by_brand.slice(0, 8).map((b, i) => {
              const pct = Math.round((b.count / max) * 100);
              const color = BRAND_COLORS[i % BRAND_COLORS.length];
              return (
                <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%",
                        background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 500,
                        color: "var(--color-text-primary)" }}>
                        {b.brand_detected || b.brand}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 10px",
                    color: "var(--color-text-primary)", fontWeight: 500 }}>
                    {b.count?.toLocaleString("fr-FR")}
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 6,
                        background: "var(--color-background-secondary)",
                        borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`,
                          background: color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)",
                        minWidth: 28, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 10px",
                    color: "var(--color-text-secondary)" }}>
                    {fmt(b.median)} MAD
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 10px",
                    color: "var(--color-text-secondary)" }}>
                    {fmt(b.mean)} MAD
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Gammes de prix ────────────────────────────────────────────────
  const GammesPrix = ({ by_category }) => {
    if (!by_category || by_category.length === 0) return null;
    const max = Math.max(...by_category.map(c => c.count));
    const GAMME_COLORS = {
      "très_bas":   { bg: "#E6F1FB", border: "#185FA5", text: "#0C447C" },
      "bas":        { bg: "#EAF3DE", border: "#3B6D11", text: "#27500A" },
      "moyen":      { bg: "#FAEEDA", border: "#BA7517", text: "#633806" },
      "haut":       { bg: "#FBEAF0", border: "#993556", text: "#72243E" },
      "très_haut":  { bg: "#EEEDFE", border: "#533AB7", text: "#3C3489" },
    };
    const labels = {
      "très_bas": "Très bas (< 1 500)",
      "bas": "Bas (1 500 – 4 000)",
      "moyen": "Moyen (4 000 – 10 000)",
      "haut": "Haut (10 000 – 25 000)",
      "très_haut": "Très haut (> 25 000)",
    };
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500,
          color: "var(--color-text-primary)", marginBottom: "1rem" }}>
          Gammes de prix
        </div>
        {by_category.map((c, i) => {
          const key = c.price_category?.toLowerCase().replace(/ /g, "_");
          const col = GAMME_COLORS[key] || { bg: "#F1EFE8", border: "#888780", text: "#444441" };
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                marginBottom: 5, fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {labels[key] || c.price_category?.replace(/_/g, " ")}
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {c.count?.toLocaleString("fr-FR")} produits
                </span>
              </div>
              <div style={{ height: 28, background: "var(--color-background-secondary)",
                borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: col.bg,
                  border: `1.5px solid ${col.border}`,
                  borderRadius: 4,
                  transition: "width 0.5s ease"
                }} />
                <span style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11, fontWeight: 500, color: col.text
                }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Gaming vs Standard ────────────────────────────────────────────
  const GamingSection = ({ gaming }) => {
    if (!gaming?.gaming) return null;
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1.5rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500,
          color: "var(--color-text-primary)", marginBottom: "1rem" }}>
          Gaming vs Standard
        </div>
        <div style={{ display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { label: "Gaming",   g: gaming.gaming,     color: "#533AB7", bg: "#EEEDFE" },
            { label: "Standard", g: gaming.non_gaming, color: "#0F6E56", bg: "#E1F5EE" },
          ].map(({ label, g, color, bg }, i) => (
            <div key={i} style={{
              padding: "1rem", borderRadius: "var(--border-radius-md)",
              background: bg, border: `1px solid ${color}30`
            }}>
              <div style={{ fontSize: 11, color, textTransform: "uppercase",
                letterSpacing: 1, fontWeight: 500, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 500,
                color: "var(--color-text-primary)", marginBottom: 4 }}>
                {g?.count?.toLocaleString("fr-FR")}
                <span style={{ fontSize: 12, fontWeight: 400,
                  color: "var(--color-text-secondary)", marginLeft: 4 }}>produits</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                Médiane : <strong style={{ color }}>
                  {fmt(g?.median)} MAD
                </strong>
              </div>
              {g?.mean && (
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  Moyenne : {fmt(g.mean)} MAD
                </div>
              )}
            </div>
          ))}
        </div>
        {gaming.mannwhitney && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--border-radius-md)",
            background: "var(--color-background-secondary)", fontSize: 12,
            color: "var(--color-text-secondary)"
          }}>
            Test Mann-Whitney — p-value : <strong>{gaming.mannwhitney.pvalue}</strong>
            {gaming.mannwhitney.pvalue < 0.05
              ? <span style={{ color: "#0F6E56", marginLeft: 6 }}>✓ Différence significative</span>
              : <span style={{ color: "#BA7517", marginLeft: 6 }}>⚠ Non significatif</span>
            }
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="stats-page">

      {/* KPI Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10, marginBottom: "1.5rem"
      }}>
        {kpis.map(({ label, value, sub, bg, color }, i) => (
          <div key={i} style={{
            background: bg,
            borderRadius: "var(--border-radius-lg)",
            padding: "0.875rem 1rem",
            border: `1px solid ${color}30`
          }}>
            <div style={{ fontSize: 11, color, textTransform: "uppercase",
              letterSpacing: 0.5, fontWeight: 500, marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color,
              marginBottom: 2, lineHeight: 1.2 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color, opacity: 0.7 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Histogramme vertical */}
      {distribution && <HistogrammeV distribution={distribution} />}

      {/* Boxplot */}
      {by_source && by_source.length > 0 && <BoxplotV2 data={by_source} />}

      {/* Marques + Gammes côte à côte */}
      <div style={{ display: "grid",
        gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>
        {by_brand && <TableMarques by_brand={by_brand} />}
        {by_category && <GammesPrix by_category={by_category} />}
      </div>

      {/* Gaming */}
      {gaming && <GamingSection gaming={gaming} />}

      {/* Export */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={() => window.open(`${API}/export/csv/`, "_blank")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", background: "#0F6E56", color: "#fff",
            border: "none", borderRadius: "var(--border-radius-md)",
            cursor: "pointer", fontWeight: 500, fontSize: 13
          }}>
          <Download size={15} /> Exporter CSV
        </button>
      </div>

    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// 🔵 ONGLET CLUSTERING — avec Radar SVG + PCA
// ══════════════════════════════════════════════════════════════════
function RadarSVG({ data }) {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length === 0) return null;
  const AXES = [
    { key: "median", label: "Prix médian" },
    { key: "ram_gb", label: "RAM" },
    { key: "storage_gb", label: "Stockage" },
    { key: "count", label: "Nb offres" },
    { key: "mean", label: "Prix moyen" },
  ].filter(a => data.some(d => d[a.key] > 0));
  const N = AXES.length;
  if (N < 3) return null;
  const ranges = {};
  AXES.forEach(a => {
    const vals = data.map(d => d[a.key] || 0);
    ranges[a.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  });
  const W = 460, H = 400, CX = 230, CY = 190, R = 130, LEVELS = 5;
  const angles = AXES.map((_, i) => (2 * Math.PI * i) / N);
  const polar = (r, a) => ({ x: CX + r * Math.cos(a - Math.PI / 2), y: CY + r * Math.sin(a - Math.PI / 2) });
  const norm = (v, key) => {
    const { min, max } = ranges[key];
    return max === min ? 0.5 : Math.max(0, Math.min(1, (v - min) / (max - min)));
  };
  const pts = (d) => AXES.map((a, i) => polar(norm(d[a.key] || 0, a.key) * R, angles[i]));
  const path = (ps) => ps.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {Array.from({ length: LEVELS }, (_, l) => (
        <path key={l} d={path(AXES.map((_, i) => polar(R * (l + 1) / LEVELS, angles[i])))} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {AXES.map((a, i) => {
        const end = polar(R, angles[i]);
        const lbl = polar(R + 28, angles[i]);
        return (
          <g key={i}>
            <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#cbd5e1" strokeWidth="1" />
            <text x={lbl.x} y={lbl.y + 4} fontSize="10" fill="#475569" textAnchor="middle" fontWeight="500">{a.label}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const p = pts(d);
        const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
        const isH = hovered === d.cluster;
        return (
          <path key={i} d={path(p)} fill={color} fillOpacity={isH ? 0.35 : 0.12} stroke={color} strokeWidth={isH ? 2.5 : 1.5}
            onMouseEnter={() => setHovered(d.cluster)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }} />
        );
      })}
      {data.map((d, i) => {
        const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
        const y = H - 20 - (data.length - i - 1) * 22;
        return (
          <g key={i}>
            <rect x={20} y={y - 11} width={12} height={12} rx="2" fill={color} fillOpacity={hovered === d.cluster ? 1 : 0.7} />
            <text x={38} y={y} fontSize="10" fill={hovered === d.cluster ? "#0f172a" : "#475569"}>
              {d.cluster} — {d.count} offres — {d.median?.toLocaleString("fr-FR")} MAD
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PCAScatterSVG({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const [active, setActive] = useState(null);
  if (!data || data.length === 0) return null;
  const W = 580, H = 340, PAD = 45;
  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const toX = x => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
  const toY = y => PAD + (H - PAD * 2) - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);
  const clusters = [...new Set(data.map(d => d.cluster))];
  const colorOf = (c) => CLUSTER_COLORS[clusters.indexOf(c) % CLUSTER_COLORS.length];
  const sample = data.length > 500 ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0) : data;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setActive(null)} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: !active ? "#0f172a" : "#f1f5f9", color: !active ? "#fff" : "#64748b", border: "none" }}>Tous</button>
        {clusters.map((c, i) => (
          <button key={i} onClick={() => setActive(active === c ? null : c)}
            style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: `1px solid ${colorOf(c)}`, background: active === c ? colorOf(c) : "#f1f5f9", color: active === c ? "#fff" : "#64748b" }}>
            {c}
          </button>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#fafafa", borderRadius: 8 }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#cbd5e1" strokeWidth="1" />
        <text x={W / 2} y={H - 8} fontSize="10" fill="#94a3b8" textAnchor="middle">PCA Axe 1</text>
        <text x={12} y={H / 2} fontSize="10" fill="#94a3b8" textAnchor="middle" transform={`rotate(-90,12,${H / 2})`}>PCA Axe 2</text>
        {sample.map((d, i) => (
          <circle key={i} cx={toX(d.x)} cy={toY(d.y)} r="4"
            fill={colorOf(d.cluster)} fillOpacity={active && active !== d.cluster ? 0.08 : 0.65}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setTooltip(d)} onMouseLeave={() => setTooltip(null)} />
        ))}
        {tooltip && (
          <g>
            <rect x={Math.min(toX(tooltip.x) + 8, W - 190)} y={Math.max(toY(tooltip.y) - 48, 4)} width="182" height="52" rx="5" fill="#0f172a" fillOpacity="0.88" />
            <text x={Math.min(toX(tooltip.x) + 16, W - 182)} y={Math.max(toY(tooltip.y) - 30, 20)} fontSize="10" fill="#fff" fontWeight="600">{tooltip.title?.slice(0, 24)}…</text>
            <text x={Math.min(toX(tooltip.x) + 16, W - 182)} y={Math.max(toY(tooltip.y) - 14, 36)} fontSize="9" fill="#94a3b8">{tooltip.price?.toLocaleString("fr-FR")} MAD — {tooltip.cluster}</text>
          </g>
        )}
      </svg>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
        {clusters.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorOf(c), display: "inline-block" }} />
            {c} ({data.filter(d => d.cluster === c).length})
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🔵 ONGLET CLUSTERING — KMeans + DBSCAN amélioré
// ══════════════════════════════════════════════════════════════════

function TabClustering() {
  const [algo, setAlgo]             = useState("kmeans");
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [eps, setEps]               = useState(0.1);
  const [minSamples, setMinSamples] = useState(3);

  const COLORS = ["#185FA5","#0F6E56","#BA7517","#993556","#533AB7","#A32D2D"];
  const LIGHT  = ["#B5D4F4","#9FE1CB","#FAC775","#F4C0D1","#CECBF6","#F7C1C1"];

  const fmtMAD  = (v) => v != null ? v.toLocaleString("fr-FR") + " MAD" : "—";
  const fmtNum  = (v) => v != null ? v.toLocaleString("fr-FR") : "—";

  const fetchClustering = async (a = algo, e = eps, ms = minSamples) => {
    setLoading(true);
    setError(null);
    try {
      const url = a === "dbscan"
        ? `/clustering/?algo=dbscan&eps=${e}&min_samples=${ms}`
        : "/clustering/?algo=kmeans";
      const json = await apiFetch(url);
      setData(json);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  useEffect(() => {
    fetchClustering();
  }, []);

  // ── Cartes clusters ──────────────────────────────────────────────
  const ClusterCards = ({ summary }) => {
    if (!summary || summary.length === 0) return null;
    const total = summary.reduce((s, c) => s + (c.count || 0), 0);
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
        gap: 12, marginBottom: "1.5rem"
      }}>
        {summary.map((c, i) => {
          const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
          return (
            <div key={i} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              borderTop: `3px solid ${COLORS[i % COLORS.length]}`,
              padding: "1rem"
            }}>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
                Segment {i + 1}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>
                {c.cluster}
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>
                {fmtNum(c.count)}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                Médiane : <strong>{fmtMAD(c.median)}</strong>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                Min {fmtMAD(c.min)} — Max {fmtMAD(c.max)}
              </div>
              <span style={{
                display: "inline-block", marginTop: 8,
                fontSize: 11, fontWeight: 500,
                padding: "2px 10px", borderRadius: 999,
                background: LIGHT[i % LIGHT.length],
                color: COLORS[i % COLORS.length]
              }}>
                {pct}% du marché
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Graphe barres horizontales ───────────────────────────────────
  const HBarChart = ({ summary, title }) => {
    if (!summary || summary.length === 0) return null;
    const max = Math.max(...summary.map(c => c.count));
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1.5rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem",
          color: "var(--color-text-primary)" }}>{title}</div>
        {summary.map((c, i) => {
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {c.cluster}
                </span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {fmtNum(c.count)} produits
                </span>
              </div>
              <div style={{ height: 28, background: "var(--color-background-secondary)",
                borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: COLORS[i % COLORS.length],
                  borderRadius: 4, transition: "width 0.6s ease",
                  opacity: 0.85
                }} />
                <span style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11, fontWeight: 500,
                  color: pct > 25 ? "#fff" : "var(--color-text-secondary)"
                }}>
                  Médiane : {fmtMAD(c.median)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Graphe plages de prix ────────────────────────────────────────
  const PriceRangeChart = ({ summary, title }) => {
  if (!summary || summary.length === 0) return null;
  const sorted  = [...summary].sort((a, b) => (a.median || 0) - (b.median || 0));
  const maxVal  = Math.max(...sorted.map(c => c.max || 0));
  const total   = sorted.reduce((s, c) => s + (c.count || 0), 0);
 
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "1.25rem", marginBottom: "1.5rem"
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)",
        marginBottom: "1rem" }}>{title}</div>
 
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Segment","Min","Plage de prix","Max","Produits"].map((h, i) => (
              <th key={i} style={{
                textAlign: i === 0 || i === 2 ? "left" : "right",
                padding: "6px 8px", fontWeight: 500,
                color: "var(--color-text-secondary)", fontSize: 11,
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                width: i === 2 ? "38%" : "auto"
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const color   = COLORS[summary.indexOf(c) % COLORS.length];
            const light   = LIGHT[summary.indexOf(c) % LIGHT.length];
            const minPct  = ((c.min || 0) / maxVal) * 100;
            const maxPct  = ((c.max || 0) / maxVal) * 100;
            const medPct  = ((c.median || 0) / maxVal) * 100;
            const pct     = total > 0 ? Math.round((c.count / total) * 100) : 0;
            const fmt     = v => v >= 1000
              ? Math.round(v / 1000) + "k MAD"
              : Math.round(v) + " MAD";
 
            return (
              <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "10px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2,
                      background: color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 500,
                      color: "var(--color-text-primary)" }}>{c.cluster}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right", padding: "10px 8px",
                  fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {fmt(c.min)}
                </td>
                <td style={{ padding: "10px 8px" }}>
                  <div style={{ position: "relative", height: 22,
                    background: "var(--color-background-secondary)", borderRadius: 4 }}>
                    <div style={{
                      position: "absolute", top: 0, height: "100%",
                      left: `${minPct}%`, width: `${maxPct - minPct}%`,
                      background: light,
                      border: `1.5px solid ${color}`, borderRadius: 4
                    }} />
                    <div style={{
                      position: "absolute", top: 0, height: "100%",
                      left: `${medPct - 0.5}%`, width: 3,
                      background: color, borderRadius: 2
                    }} />
                    <span style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      fontSize: 10, fontWeight: 500, color: color,
                      whiteSpace: "nowrap"
                    }}>
                      Médiane {fmt(c.median)}
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: "right", padding: "10px 8px",
                  fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {fmt(c.max)}
                </td>
                <td style={{ textAlign: "right", padding: "10px 8px" }}>
                  <span style={{ fontSize: 12, fontWeight: 500,
                    color: "var(--color-text-primary)" }}>
                    {fmtNum(c.count)}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)",
                    marginLeft: 4 }}>{pct}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
 
      <div style={{ display: "flex", gap: 16, fontSize: 11,
        color: "var(--color-text-tertiary)", marginTop: 10 }}>
        <span>▬ Médiane &nbsp; □ Plage min–max</span>
      </div>
    </div>
  );
};

  // ── Donut SVG ────────────────────────────────────────────────────
  const DonutChart = ({ summary }) => {
    if (!summary || summary.length === 0) return null;
    const total = summary.reduce((s, c) => s + (c.count || 0), 0);
    const R = 70, CX = 90, CY = 90, stroke = 30;
    let cumAngle = -Math.PI / 2;
    const slices = summary.map((c, i) => {
      const frac = c.count / total;
      const angle = frac * 2 * Math.PI;
      const x1 = CX + R * Math.cos(cumAngle);
      const y1 = CY + R * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = CX + R * Math.cos(cumAngle);
      const y2 = CY + R * Math.sin(cumAngle);
      const large = frac > 0.5 ? 1 : 0;
      return { x1, y1, x2, y2, large, color: COLORS[i % COLORS.length],
        pct: Math.round(frac * 100), name: c.cluster, count: c.count, frac };
    });
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1.5rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem",
          color: "var(--color-text-primary)" }}>Part de marché par segment</div>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            {slices.map((s, i) => (
              <path key={i}
                d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
                fill={s.color} opacity={0.85} stroke="var(--color-background-primary)"
                strokeWidth="2" />
            ))}
            <circle cx={CX} cy={CY} r={R - stroke}
              fill="var(--color-background-primary)" />
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="18"
              fontWeight="500" fill="var(--color-text-primary)">
              {total.toLocaleString("fr-FR")}
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10"
              fill="var(--color-text-secondary)">produits</text>
          </svg>
          <div style={{ flex: 1, minWidth: 160 }}>
            {slices.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center",
                gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2,
                  background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)",
                  flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 12, fontWeight: 500,
                  color: "var(--color-text-primary)" }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Scatter PCA ──────────────────────────────────────────────────
  const PCAScatter = ({ scatterData, summary }) => {
  const [active, setActive] = useState(null);
  const [tooltip, setTooltip] = useState(null);
 
  // Utilise les données scatter de l'API (price + cluster)
  // Si pas de coordonnées PCA, on simule via prix → axe X + bruit → axe Y
  const points = useMemo(() => {
    if (!scatterData || scatterData.length === 0) return [];
    const prices = scatterData.map(d => d.price);
    const minP   = Math.min(...prices);
    const maxP   = Math.max(...prices);
    const rng    = (seed) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
    return scatterData.map((d, i) => {
      const r   = rng(i * 31 + 7);
      const normX = ((d.price - minP) / (maxP - minP || 1));
      const noiseX = (r() - 0.5) * 0.15;
      const noiseY = (r() - 0.5) * 0.8;
      const clusterIdx = summary
        ? summary.findIndex(s => s.cluster === d.cluster)
        : -1;
      return {
        x: normX + noiseX,
        y: 0.5 + noiseY,
        cluster: d.cluster,
        color: COLORS[clusterIdx >= 0 ? clusterIdx % COLORS.length : i % COLORS.length],
        price: d.price,
        title: d.title,
      };
    });
  }, [scatterData, summary]);
 
  if (!points || points.length === 0) return null;
 
  const clusters = summary
    ? summary.map(s => s.cluster)
    : [...new Set(points.map(d => d.cluster))];
 
  const W = 580, H = 320, PAD = 45;
  const xs = points.map(d => d.x);
  const ys = points.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const toX  = x => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
  const toY  = y => PAD + (H - PAD * 2) - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);
 
  const sample = points.length > 500
    ? points.filter((_, i) => i % Math.ceil(points.length / 500) === 0)
    : points;
 
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "1.25rem", marginBottom: "1.5rem"
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)",
        marginBottom: 6 }}>PCA — Clusters projetés en 2D</div>
      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 12 }}>
        Chaque point = un produit. Couleur = gamme de prix. Axe horizontal = prix.
      </div>
 
      {/* Filtres */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setActive(null)} style={{
          padding: "3px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer",
          background: !active ? "#0f172a" : "var(--color-background-secondary)",
          color: !active ? "#fff" : "var(--color-text-secondary)",
          border: `1px solid ${!active ? "#0f172a" : "var(--color-border-secondary)"}`
        }}>Tous</button>
        {clusters.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          const isActive = active === c;
          return (
            <button key={i} onClick={() => setActive(isActive ? null : c)} style={{
              padding: "3px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer",
              background: isActive ? color : "var(--color-background-secondary)",
              color: isActive ? "#fff" : "var(--color-text-secondary)",
              border: `1px solid ${isActive ? color : "var(--color-border-secondary)"}`
            }}>{c}</button>
          );
        })}
      </div>
 
      {/* Légende */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        {clusters.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center",
            gap: 5, fontSize: 12, color: "var(--color-text-secondary)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%",
              background: COLORS[i % COLORS.length], display: "inline-block" }} />
            {c} ({points.filter(d => d.cluster === c).length})
          </div>
        ))}
      </div>
 
      {/* SVG scatter */}
      <div style={{ position: "relative" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", background: "var(--color-background-secondary)",
            borderRadius: 8 }}>
          {/* Grille */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i}
              x1={PAD + t * (W - PAD * 2)} y1={PAD}
              x2={PAD + t * (W - PAD * 2)} y2={H - PAD}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
          ))}
          {/* Axes */}
          <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD}
            stroke="#cbd5e1" strokeWidth="1" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD}
            stroke="#cbd5e1" strokeWidth="1" />
          <text x={W/2} y={H-10} fontSize="11" fill="#94a3b8" textAnchor="middle">
            Prix (faible → élevé)
          </text>
          <text x={14} y={H/2} fontSize="11" fill="#94a3b8"
            textAnchor="middle" transform={`rotate(-90,14,${H/2})`}>
            Variance
          </text>
 
          {/* Points */}
          {sample.map((d, i) => (
            <circle key={i}
              cx={Math.max(PAD+5, Math.min(W-PAD-5, toX(d.x)))}
              cy={Math.max(PAD+5, Math.min(H-PAD-5, toY(d.y)))}
              r="4.5"
              fill={d.color}
              fillOpacity={active && active !== d.cluster ? 0.05 : 0.72}
              stroke={active === d.cluster ? "#fff" : "none"}
              strokeWidth="1"
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => setTooltip({ d, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>
 
        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: "absolute",
            left: tooltip.x + 12, top: tooltip.y - 36,
            background: "#0f172a", color: "#fff",
            padding: "6px 10px", borderRadius: 6,
            fontSize: 11, pointerEvents: "none",
            maxWidth: 210, zIndex: 10
          }}>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>
              {tooltip.d.cluster}
            </div>
            <div style={{ color: "#94a3b8" }}>
              {tooltip.d.price?.toLocaleString("fr-FR")} MAD
            </div>
            {tooltip.d.title && (
              <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>
                {tooltip.d.title.slice(0, 30)}…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

  // ── Render principal ─────────────────────────────────────────────
  return (
    <div className="stats-page">

      {/* Sélecteur algo */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {["kmeans", "dbscan"].map(a => (
          <button key={a}
            onClick={() => { setAlgo(a); fetchClustering(a); }}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-secondary)",
              background: algo === a ? "#185FA5" : "var(--color-background-secondary)",
              color: algo === a ? "#E6F1FB" : "var(--color-text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 500
            }}>
            {a === "kmeans" ? "K-Means" : "DBSCAN"}
          </button>
        ))}
      </div>

      {/* Params DBSCAN */}
      {algo === "dbscan" && (
        <div style={{ display: "flex", gap: 12, alignItems: "center",
          marginBottom: "1rem", flexWrap: "wrap",
          background: "var(--color-background-secondary)",
          padding: "12px 16px", borderRadius: "var(--border-radius-md)" }}>
          <label style={{ fontSize: 13, color: "var(--color-text-secondary)",
            display: "flex", alignItems: "center", gap: 8 }}>
            eps
            <input type="number" value={eps} step="0.05" min="0.05"
              onChange={e => setEps(parseFloat(e.target.value))}
              style={{ width: 70 }} />
          </label>
          <label style={{ fontSize: 13, color: "var(--color-text-secondary)",
            display: "flex", alignItems: "center", gap: 8 }}>
            min_samples
            <input type="number" value={minSamples} step="1" min="1"
              onChange={e => setMinSamples(parseInt(e.target.value))}
              style={{ width: 70 }} />
          </label>
          <button onClick={() => fetchClustering("dbscan", eps, minSamples)}>
            Appliquer
          </button>
        </div>
      )}

      {error && <ErrMsg msg={error} />}

      {loading ? <Spinner /> : data && (
        <>
          {/* Badges métriques */}
          <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
            {data.best_k && (
              <span style={{ background: "#d1fae5", color: "#065f46",
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                k optimal = {data.best_k}
              </span>
            )}
            {data.n_clusters !== undefined && (
              <span style={{ background: "#ede9fe", color: "#5b21b6",
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                {data.n_clusters} clusters
              </span>
            )}
            {data.silhouette !== undefined && (
              <span style={{ background: "#dbeafe", color: "#1e40af",
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                Silhouette = {data.silhouette}
              </span>
            )}
          </div>

          {/* Cartes */}
          <ClusterCards summary={data.summary} />

          {/* Graphe barres horizontales */}
          <HBarChart summary={data.summary}
            title="Répartition des produits par segment" />

          {/* Plages de prix */}
          <PriceRangeChart summary={data.summary}
            title="Plages de prix par segment (min — médiane — max)" />

          {/* Donut (KMeans seulement) */}
          {algo === "kmeans" && <DonutChart summary={data.summary} />}
        </>
      )}

      {/* PCA — se recalcule selon algo et params */}
      {data?.scatter && data.scatter.length > 0 && (
        <PCAScatter
          scatterData={data.scatter}
          summary={data.summary}
        />
      )}

    </div>
  );
}
// ══════════════════════════════════════════════════════════════════
// 🚨 ONGLET ANOMALIES — version améliorée
// ══════════════════════════════════════════════════════════════════

function TabAnomalies() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState("all");
  const [sortBy, setSortBy]   = useState("price_desc");

  useEffect(() => {
    apiFetch("/anomalies/")
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ErrMsg msg={error} />;
  if (!data)   return null;

  const { summary = [], anomalies = [], total } = data;

  // ── Déduplication par titre + prix ───────────────────────────────
  const seen = new Set();
  const unique = anomalies.filter(a => {
    const key = `${a.title?.slice(0, 60)}_${a.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const categories = [...new Set(unique.map(a => a.price_category).filter(Boolean))];

  // ── Tri et filtre ────────────────────────────────────────────────
  const filtered = (filter === "all" ? unique : unique.filter(a => a.price_category === filter))
    .sort((a, b) => {
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "price_asc")  return a.price - b.price;
      return 0;
    });

  const fmt = v => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";

  const METHOD_STYLE = {
    "IQR":              { bg: "#FAEEDA", color: "#BA7517", border: "#BA7517" },
    "Z-score":          { bg: "#E6F1FB", color: "#185FA5", border: "#185FA5" },
    "Isolation Forest": { bg: "#FCEBEB", color: "#A32D2D", border: "#A32D2D" },
    "LOF":              { bg: "#EEEDFE", color: "#533AB7", border: "#533AB7" },
  };

  const CAT_STYLE = {
    "premium":          { bg: "#EEEDFE", color: "#533AB7" },
    "haut de gamme":    { bg: "#FBEAF0", color: "#993556" },
    "milieu de gamme":  { bg: "#FAEEDA", color: "#BA7517" },
    "milieu de gamme bas": { bg: "#EAF3DE", color: "#3B6D11" },
    "entrée de gamme":  { bg: "#E6F1FB", color: "#185FA5" },
  };

  // ── Graphe distribution prix anomalies ───────────────────────────
  const DistribChart = ({ anomalies }) => {
    if (!anomalies || anomalies.length === 0) return null;
    const bins = [
      { label: "< 3k",    min: 0,      max: 3000   },
      { label: "3–6k",    min: 3000,   max: 6000   },
      { label: "6–12k",   min: 6000,   max: 12000  },
      { label: "12–25k",  min: 12000,  max: 25000  },
      { label: "25–50k",  min: 25000,  max: 50000  },
      { label: "> 50k",   min: 50000,  max: Infinity },
    ];
    const counts = bins.map(b => ({
      ...b,
      count: anomalies.filter(a => a.price >= b.min && a.price < b.max).length
    }));
    const max = Math.max(...counts.map(c => c.count), 1);
    const COLORS = ["#185FA5","#0F6E56","#BA7517","#993556","#533AB7","#A32D2D"];

    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1.5rem"
      }}>
        <div style={{ fontSize: 14, fontWeight: 500,
          color: "var(--color-text-primary)", marginBottom: "1rem" }}>
          Distribution des anomalies par tranche de prix
        </div>
        <div style={{ display: "flex", alignItems: "flex-end",
          gap: 8, height: 140 }}>
          {counts.map((b, i) => {
            const h = Math.max(6, (b.count / max) * 120);
            return (
              <div key={i} style={{ flex: 1, display: "flex",
                flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-secondary)" }}>{b.count}</span>
                <div style={{
                  width: "100%", height: h,
                  background: COLORS[i % COLORS.length],
                  borderRadius: "3px 3px 0 0", opacity: 0.85
                }} title={`${b.label} : ${b.count} anomalies`} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {counts.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center",
              fontSize: 10, color: "var(--color-text-tertiary)" }}>
              {b.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="stats-page">

      {/* KPI */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 10, marginBottom: "1.5rem"
      }}>
        {/* Total unique */}
        <div style={{
          background: "#FCEBEB", borderRadius: "var(--border-radius-lg)",
          padding: "0.875rem 1rem", border: "1px solid #A32D2D30"
        }}>
          <div style={{ fontSize: 11, color: "#A32D2D", textTransform: "uppercase",
            letterSpacing: 0.5, fontWeight: 500, marginBottom: 4 }}>
            Anomalies uniques
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: "#A32D2D" }}>
            {unique.length}
          </div>
          <div style={{ fontSize: 11, color: "#A32D2D", opacity: 0.7 }}>
            sur {total} détectées
          </div>
        </div>

        {/* Par méthode */}
        {summary.map((m, i) => {
          const s = METHOD_STYLE[m.methode] ||
            { bg: "#F1EFE8", color: "#444441", border: "#444441" };
          return (
            <div key={i} style={{
              background: s.bg, borderRadius: "var(--border-radius-lg)",
              padding: "0.875rem 1rem", border: `1px solid ${s.border}30`
            }}>
              <div style={{ fontSize: 11, color: s.color, textTransform: "uppercase",
                letterSpacing: 0.5, fontWeight: 500, marginBottom: 4 }}>
                {m.methode}
              </div>
              <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}>
                {m.anomalies}
              </div>
              <div style={{ fontSize: 11, color: s.color, opacity: 0.7 }}>
                {m.pourcentage}% du dataset
              </div>
            </div>
          );
        })}
      </div>

      {/* Tableau méthodes */}
      {summary.length > 0 && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1.25rem", marginBottom: "1.5rem"
        }}>
          <div style={{ fontSize: 14, fontWeight: 500,
            color: "var(--color-text-primary)", marginBottom: "1rem" }}>
            Comparaison des méthodes de détection
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Méthode","Anomalies","Pourcentage","Type","Barre"].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i < 2 ? "left" : "right",
                    padding: "6px 10px", fontSize: 11, fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    borderBottom: "0.5px solid var(--color-border-tertiary)"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((m, i) => {
                const s = METHOD_STYLE[m.methode] ||
                  { bg: "#F1EFE8", color: "#444441" };
                const maxA = Math.max(...summary.map(x => x.anomalies), 1);
                const pct  = Math.round((m.anomalies / maxA) * 100);
                return (
                  <tr key={i} style={{
                    borderBottom: "0.5px solid var(--color-border-tertiary)"
                  }}>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        padding: "3px 10px", borderRadius: 999,
                        background: s.bg, color: s.color
                      }}>{m.methode}</span>
                    </td>
                    <td style={{ padding: "10px 10px", fontWeight: 500,
                      color: "var(--color-text-primary)" }}>
                      {m.anomalies}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 10px",
                      color: "var(--color-text-secondary)" }}>
                      {m.pourcentage}%
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 10px",
                      fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      {m.methode === "Isolation Forest" || m.methode === "LOF"
                        ? "Multivariée" : "Univariée"}
                    </td>
                    <td style={{ padding: "10px 10px", minWidth: 100 }}>
                      <div style={{ height: 6,
                        background: "var(--color-background-secondary)",
                        borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`,
                          background: s.color, borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Distribution */}
      <DistribChart anomalies={unique} />

      {/* Filtres + tri */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>

          {/* Filtres catégorie */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setFilter("all")} style={{
              padding: "5px 14px", borderRadius: 999, fontSize: 12,
              cursor: "pointer", border: "none", fontWeight: 500,
              background: filter === "all" ? "#A32D2D" : "var(--color-background-secondary)",
              color: filter === "all" ? "#fff" : "var(--color-text-secondary)"
            }}>
              Tous ({unique.length})
            </button>
            {categories.map((cat, i) => {
              const s = CAT_STYLE[cat] ||
                { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" };
              return (
                <button key={i} onClick={() => setFilter(cat)} style={{
                  padding: "5px 14px", borderRadius: 999, fontSize: 12,
                  cursor: "pointer", border: "none", fontWeight: 500,
                  background: filter === cat ? s.color : "var(--color-background-secondary)",
                  color: filter === cat ? "#fff" : "var(--color-text-secondary)"
                }}>
                  {cat?.replace(/_/g, " ")}
                  {" "}({unique.filter(a => a.price_category === cat).length})
                </button>
              );
            })}
          </div>

          {/* Tri */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px",
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-secondary)" }}>
            <option value="price_desc">Prix décroissant</option>
            <option value="price_asc">Prix croissant</option>
          </select>
        </div>

        {/* Tableau */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Produit","Marque","Prix","Gamme","Alerte"].map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 2 ? "right" : "left",
                  padding: "6px 10px", fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  borderBottom: "0.5px solid var(--color-border-tertiary)"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((a, i) => {
              const catKey = a.price_category?.toLowerCase().replace(/_/g, " ");
              const cs = CAT_STYLE[catKey] ||
                { bg: "#F1EFE8", color: "#444441" };
              const isHigh = a.price > 3000;
              return (
                <tr key={i} style={{
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                }}>
                  <td style={{
                    padding: "10px 10px", maxWidth: 280,
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", color: "var(--color-text-primary)"
                  }} title={a.title}>
                    {a.title?.slice(0, 55)}{a.title?.length > 55 ? "…" : ""}
                  </td>
                  <td style={{ padding: "10px 10px",
                    color: "var(--color-text-secondary)" }}>
                    {a.brand_detected || "—"}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right",
                    fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {fmt(a.price)} MAD
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 999,
                      background: cs.bg, color: cs.color, fontWeight: 500
                    }}>
                      {a.price_category?.replace(/_/g, " ") || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    {isHigh ? (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 999,
                        background: "#FCEBEB", color: "#A32D2D", fontWeight: 500
                      }}>⬆ Prix élevé</span>
                    ) : (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 999,
                        background: "#FAEEDA", color: "#BA7517", fontWeight: 500
                      }}>⬇ Prix bas</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length > 50 && (
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)",
            textAlign: "center", marginTop: 12, padding: "8px",
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)" }}>
            +{filtered.length - 50} anomalies supplémentaires — utilise le filtre pour affiner
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🔗 ONGLET ASSOCIATION — Laptops + Accessoires + Cross
// Remplace entièrement TabAssociation dans App.jsx
// ══════════════════════════════════════════════════════════════════

function TabAssociation() {
  const [tab, setTab]           = useState("laptops");
  const [dataLap, setDataLap]   = useState(null);
  const [dataAcc, setDataAcc]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [sortBy, setSortBy]     = useState("lift");
  const [filterText, setFilter] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/association/"),
      apiFetch("/association/accessories/"),
    ])
      .then(([lap, acc]) => { setDataLap(lap); setDataAcc(acc); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ErrMsg msg={error} />;

  // ── Nettoyage des labels ─────────────────────────────────────────
  const cleanLabel = (str) => {
    if (!str) return "—";
    return str
      .replace(/is_gaming=is_gaming=/g, "gaming=")
      .replace(/has_gpu=has_gpu=/g, "gpu=")
      .replace(/brand_detected=/g, "marque=")
      .replace(/price_category=/g, "gamme=")
      .replace(/accessory_category=/g, "catégorie=")
      .replace(/price_range=/g, "prix=")
      .replace(/source=/g, "source=")
      .replace(/_/g, " ");
  };

  const LIFT_COLOR = (lift) => {
    if (lift >= 5)   return { bg: "#FCEBEB", color: "#A32D2D", border: "#A32D2D" };
    if (lift >= 3)   return { bg: "#FAEEDA", color: "#BA7517", border: "#BA7517" };
    if (lift >= 1.5) return { bg: "#EAF3DE", color: "#3B6D11", border: "#3B6D11" };
    return             { bg: "#E6F1FB", color: "#185FA5", border: "#185FA5" };
  };

  const CONF_COLOR = (conf) => {
    if (conf >= 0.9) return "#0F6E56";
    if (conf >= 0.7) return "#BA7517";
    return "#185FA5";
  };

  // ── Tableau de règles ────────────────────────────────────────────
  const RulesTable = ({ rules, emptyMsg }) => {
    if (!rules || rules.length === 0) return (
      <div style={{ textAlign: "center", padding: 40,
        color: "var(--color-text-tertiary)", fontSize: 14 }}>
        {emptyMsg || "Aucune règle disponible."}
      </div>
    );

    const filtered = rules
      .filter(r => !filterText
        || cleanLabel(r.antecedent).toLowerCase().includes(filterText.toLowerCase())
        || cleanLabel(r.consequent).toLowerCase().includes(filterText.toLowerCase()))
      .sort((a, b) => b[sortBy] - a[sortBy]);

    return (
      <>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Si (antécédent)","","Alors (conséquent)","Support","Confiance","Lift"].map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 0 || i === 1 || i === 2 ? "left" : "right",
                  padding: "6px 10px", fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  borderBottom: "0.5px solid var(--color-border-tertiary)"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 40).map((r, i) => {
              const lc = LIFT_COLOR(r.lift);
              const cc = CONF_COLOR(r.confidence);
              return (
                <tr key={i} style={{
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background: i % 2 === 0
                    ? "transparent"
                    : "var(--color-background-secondary)"
                }}>
                  <td style={{ padding: "10px 10px", maxWidth: 220,
                    fontSize: 12, color: "var(--color-text-secondary)" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px",
                      borderRadius: 999, fontSize: 11,
                      background: "var(--color-background-secondary)",
                      border: "0.5px solid var(--color-border-secondary)",
                      color: "var(--color-text-secondary)"
                    }}>
                      {cleanLabel(r.antecedent)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 6px",
                    color: "var(--color-text-tertiary)", fontSize: 16 }}>→</td>
                  <td style={{ padding: "10px 10px", maxWidth: 220 }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px",
                      borderRadius: 999, fontSize: 11,
                      background: "#E6F1FB", color: "#185FA5",
                      fontWeight: 500
                    }}>
                      {cleanLabel(r.consequent)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 10px",
                    fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {(r.support * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "10px 10px", minWidth: 100 }}>
                    <div style={{ display: "flex", alignItems: "center",
                      gap: 6, justifyContent: "flex-end" }}>
                      <div style={{ width: 60, height: 5,
                        background: "var(--color-background-secondary)",
                        borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${(r.confidence * 100).toFixed(0)}%`,
                          background: cc, borderRadius: 3
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500,
                        color: cc, minWidth: 30, textAlign: "right" }}>
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 10px" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 500, padding: "2px 8px",
                      borderRadius: 999, background: lc.bg, color: lc.color,
                      border: `1px solid ${lc.border}40`
                    }}>×{r.lift?.toFixed(2)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 40 && (
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)",
            textAlign: "center", marginTop: 12, padding: 8,
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)" }}>
            Affichage limité à 40 règles sur {filtered.length}
          </div>
        )}
      </>
    );
  };

  // ── Stats accessoires par catégorie ──────────────────────────────
  const AccStats = ({ stats }) => {
    if (!stats || stats.length === 0) return null;
    const CAT_COLORS = {
      mouse:          { bg: "#E6F1FB", color: "#185FA5" },
      souris:         { bg: "#E6F1FB", color: "#185FA5" },
      stand:          { bg: "#EAF3DE", color: "#3B6D11" },
      laptop_stand:   { bg: "#EAF3DE", color: "#3B6D11" },
      usb:            { bg: "#FAEEDA", color: "#BA7517" },
      usb_flash_drive:{ bg: "#FAEEDA", color: "#BA7517" },
      cooling_pad:    { bg: "#EEEDFE", color: "#533AB7" },
      sac_laptop:     { bg: "#FBEAF0", color: "#993556" },
    };
    const fmt = v => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10, marginBottom: "1.5rem"
      }}>
        {stats.map((s, i) => {
          const key = s.category?.toLowerCase().replace(/ /g, "_");
          const c = CAT_COLORS[key] ||
            { bg: "#F1EFE8", color: "#444441" };
          return (
            <div key={i} style={{
              background: c.bg, borderRadius: "var(--border-radius-lg)",
              padding: "0.875rem 1rem", border: `1px solid ${c.color}30`
            }}>
              <div style={{ fontSize: 11, color: c.color,
                textTransform: "uppercase", letterSpacing: 0.5,
                fontWeight: 500, marginBottom: 6 }}>
                {s.category?.replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: 20, fontWeight: 500,
                color: c.color, marginBottom: 4 }}>
                {s.count?.toLocaleString("fr-FR")}
              </div>
              <div style={{ fontSize: 12, color: c.color, opacity: 0.8 }}>
                Médiane : {fmt(s.median)} MAD
              </div>
              <div style={{ fontSize: 11, color: c.color, opacity: 0.6, marginTop: 2 }}>
                {fmt(s.min)} – {fmt(s.max)} MAD
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const lapRules   = dataLap?.rules || [];
  const accRules   = dataAcc?.rules_accessories || [];
  const crossRules = dataAcc?.rules_cross || [];
  const accStats   = dataAcc?.stats_by_category || [];

  const TABS_ASSOC = [
    { id: "laptops",      label: `Laptops (${lapRules.length})` },
    { id: "accessoires",  label: `Accessoires (${accRules.length})` },
    { id: "cross",        label: `Cross laptop×accessoires (${crossRules.length})` },
  ];

  return (
    <div className="stats-page">

      {/* KPI */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10, marginBottom: "1.5rem"
      }}>
        {[
          { label: "Règles laptops",       value: lapRules.length,   bg: "#E6F1FB", color: "#185FA5" },
          { label: "Règles accessoires",   value: accRules.length,   bg: "#EAF3DE", color: "#3B6D11" },
          { label: "Règles croisées",      value: crossRules.length, bg: "#EEEDFE", color: "#533AB7" },
        ].map(({ label, value, bg, color }, i) => (
          <div key={i} style={{
            background: bg, borderRadius: "var(--border-radius-lg)",
            padding: "0.875rem 1rem", border: `1px solid ${color}30`
          }}>
            <div style={{ fontSize: 11, color, textTransform: "uppercase",
              letterSpacing: 0.5, fontWeight: 500, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Explication */}
      <div style={{
        background: "#E6F1FB", border: "0.5px solid #185FA530",
        borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem",
        marginBottom: "1.5rem", fontSize: 13, color: "#0C447C", lineHeight: 1.6
      }}>
        Les règles d'association révèlent les liens entre caractéristiques
        et gammes de prix.<br />
        Ex : <strong>marque=HP ∧ gaming=Oui → gamme=haut de gamme</strong><br />
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          support ≥ 8% &nbsp;|&nbsp; confiance ≥ 60% &nbsp;|&nbsp; lift ≥ 1.2
        </span>
      </div>

      {/* Onglets internes */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        paddingBottom: 12 }}>
        {TABS_ASSOC.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "6px 16px", borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)",
            background: tab === t.id
              ? "#185FA5"
              : "var(--color-background-secondary)",
            color: tab === t.id ? "#E6F1FB" : "var(--color-text-secondary)",
            cursor: "pointer", fontSize: 13, fontWeight: 500
          }}>{t.label}</button>
        ))}
      </div>

      {/* Filtre + tri */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16,
        flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="Filtrer les règles…"
          value={filterText} onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, minWidth: 180 }} />
        <label style={{ fontSize: 13, color: "var(--color-text-secondary)",
          display: "flex", alignItems: "center", gap: 8 }}>
          Trier par :
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="lift">Lift ↓</option>
            <option value="confidence">Confiance ↓</option>
            <option value="support">Support ↓</option>
          </select>
        </label>
      </div>

      {/* Contenu par onglet */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)", padding: "1.25rem"
      }}>
        {tab === "laptops" && (
          <RulesTable rules={lapRules}
            emptyMsg="Aucune règle laptop. Vérifiez le pipeline." />
        )}

        {tab === "accessoires" && (
          <>
            <AccStats stats={accStats} />
            <RulesTable rules={accRules}
              emptyMsg="Aucune règle accessoire. Vérifiez l'endpoint /association/accessories/." />
          </>
        )}

        {tab === "cross" && (
          <>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)",
              marginBottom: 16, padding: "10px 14px",
              background: "var(--color-background-secondary)",
              borderRadius: "var(--border-radius-md)" }}>
              Règles croisées entre gammes de laptops et catégories d'accessoires.
              Ex : <strong>gamme=premium → souris=haut</strong>
            </div>
            <RulesTable rules={crossRules}
              emptyMsg="Aucune règle croisée. Vérifiez le pipeline." />
          </>
        )}
      </div>

      {/* Légende lift */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap",
        marginTop: 12, fontSize: 12, color: "var(--color-text-tertiary)" }}>
        {[
          { label: "Lift ≥ 5 — très fort", color: "#A32D2D", bg: "#FCEBEB" },
          { label: "Lift ≥ 3 — fort",      color: "#BA7517", bg: "#FAEEDA" },
          { label: "Lift ≥ 1.5 — moyen",   color: "#3B6D11", bg: "#EAF3DE" },
          { label: "Lift ≥ 1.2 — faible",  color: "#185FA5", bg: "#E6F1FB" },
        ].map((l, i) => (
          <span key={i} style={{
            padding: "2px 10px", borderRadius: 999,
            background: l.bg, color: l.color, fontWeight: 500
          }}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🏠 DASHBOARD — quick stats depuis API + onglets branchés
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { id: "products",    label: "Produits",     icon: ShoppingBag   },
  { id: "stats",       label: "Statistiques", icon: TrendingUp    },
  { id: "clustering",  label: "Clustering",   icon: BarChart2     },
  { id: "anomalies",   label: "Anomalies",    icon: AlertTriangle },
  { id: "association", label: "Association",  icon: Link2         },
];

function Dashboard() {
  const [tab, setTab]             = useState("products");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout }          = useAuth();

  // ── Quick stats depuis l'API (étape 4.2) ──────────────────────
  const [quickStats, setQuickStats] = useState([
    { title: "Produits trackés",    value: "—", icon: Package,       color: "#3b82f6" },
    { title: "Prix médian",         value: "—", icon: TrendingUp,    color: "#f97316" },
    { title: "Marques analysées",   value: "—", icon: ShoppingBag,   color: "#10b981" },
    { title: "Anomalies détectées", value: "—", icon: AlertTriangle, color: "#8b5cf6" },
  ]);

  useEffect(() => {
    apiFetch("/stats/").then(d => {
      const s = d.stats || {};
      setQuickStats([
        { title: "Produits trackés",    value: s.count?.toLocaleString("fr-FR") || "—", icon: Package,       color: "#3b82f6" },
        { title: "Prix médian",         value: s.median ? `${s.median.toLocaleString("fr-FR")} MAD` : "—",  icon: TrendingUp,    color: "#f97316" },
        { title: "Marques analysées",   value: String(d.by_brand?.length || "—"),        icon: ShoppingBag,   color: "#10b981" },
        { title: "Anomalies détectées", value: "—",                                      icon: AlertTriangle, color: "#8b5cf6" },
      ]);
    }).catch(() => {});
    apiFetch("/anomalies/").then(d => {
      setQuickStats(prev => prev.map((s, i) => i === 3 ? { ...s, value: String(d.total || "—") } : s));
    }).catch(() => {});
  }, []);

  const currentTabLabel = TABS.find(t => t.id === tab)?.label || "";

  return (
    <div className="pip-layout">
      {/* ═══ SIDEBAR ═══ */}
      <aside className={`pip-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="pip-sidebar-logo">
          <div className="pip-logo-icon"><ShoppingBag size={22} color="#fff" /></div>
          {sidebarOpen && <div className="pip-logo-text"><span className="pip-logo-name">PriceIntel</span></div>}
          <button className="pip-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className="pip-nav">
          {sidebarOpen && <div className="pip-nav-section-label">Navigation</div>}
          {TABS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`pip-nav-item ${tab === item.id ? "active" : ""}`} title={!sidebarOpen ? item.label : ""}>
              <item.icon className="pip-nav-icon" size={18} />
              {sidebarOpen && <span className="pip-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div className="pip-sidebar-footer">
            <div className="pip-nav-section-label"><Activity size={14} /><span>Statut système</span></div>
            <div className="pip-system-status">
              <div className="pip-status-item">
                <div className="pip-status-dot active"></div>
                <span className="pip-status-label">API Django</span>
                <span className="pip-status-value active">Actif</span>
              </div>
              <div className="pip-status-divider"></div>
              <div className="pip-status-item">
                <Database size={14} className="pip-status-icon" />
                <span className="pip-status-label">MySQL</span>
                <span className="pip-status-value active">Connectée</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ MAIN ═══ */}
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
            <button className="pip-header-icon-btn" title="Actualiser" onClick={() => window.location.reload()}>
              <RefreshCw size={17} />
            </button>
            {user && (
              <div className="pip-user-menu">
                <span className="pip-username">👋 {user?.first_name || user?.username}</span>
                <button onClick={logout} className="pip-logout-btn" title="Déconnexion"><LogOut size={16} /></button>
              </div>
            )}
            <div className="pip-avatar">{(user?.first_name?.[0] || user?.username?.[0] || "A").toUpperCase()}</div>
          </div>
        </header>

        <main className="pip-content">
          {/* Quick stats (onglet produits uniquement) */}
          {tab === "products" && (
            <>
              <div className="pip-welcome-banner">
                <div className="pip-welcome-text">
                  <h1>Bonjour 👋{user?.first_name ? ` ${user.first_name}` : ""}</h1>
                  <p>Bienvenue sur <strong>Price Intelligence Platform</strong></p>
                </div>
              </div>
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
            </>
          )}

          {/* ── Onglets branchés (étape 4.1) ── */}
          <div className="pip-tab-content">
            {tab === "products"    && <TabProducts    />}
            {tab === "stats"       && <TabStats       />}
            {tab === "clustering"  && <TabClustering  />}
            {tab === "anomalies"   && <TabAnomalies   />}
            {tab === "association" && <TabAssociation />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🚀 ROUTING
// ══════════════════════════════════════════════════════════════════
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