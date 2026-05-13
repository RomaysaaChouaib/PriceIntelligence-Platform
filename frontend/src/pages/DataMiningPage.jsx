import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Hook pour charger la police Inter
function useFont() {
  useEffect(() => {
    if (document.getElementById("pip-font")) return;
    const link = document.createElement("link");
    link.id = "pip-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// Composant Tag simplifié
function Tag({ children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "4px 10px",
      borderRadius: 6, border: "1px solid #2563EB",
      background: "#FFFFFF", color: "#2563EB",
    }}>
      {children}
    </span>
  );
}

// Composant Feature simplifié
function Feature({ label, desc }) {
  return (
    <div style={{
      display: "flex", gap: "1rem", padding: "1rem 1.5rem",
      borderBottom: "1px solid #00000020",
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "#2563EB", color: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2,
      }}>
        ✓
      </div>
      <div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: "#000000", marginBottom: 2,
        }}>
          {label}
        </div>
        <p style={{ fontSize: 13, color: "#000000", lineHeight: 1.6, margin: 0, opacity: 0.85 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

export default function DataMiningPage() {
  useFont();

  const features = [
    {
      label: "Clustering (K-Means & DBSCAN)",
      desc: "Partitionnement et analyse de densité pour regrouper les offres similaires. Visualisation des segments de marché et détection des niches sous-exploitées.",
    },
    {
      label: "Détection d'anomalies",
      desc: "Isolation Forest et LOF pour identifier automatiquement les prix aberrants, offres suspectes et erreurs de saisie dans les datasets.",
    },
    {
      label: "Règles d'association",
      desc: "Algorithmes Apriori et FP-Growth pour extraire les corrélations entre caractéristiques produits et fourchettes de prix.",
    },
    {
      label: "Analyse prédictive",
      desc: "Projections PCA et modèles de tendance pour anticiper les évolutions de prix et optimiser les stratégies de positioning.",
    },
  ];

  const methods = ["K-Means", "DBSCAN", "Isolation Forest", "LOF", "Apriori", "FP-Growth"];

  return (
    <div style={{
      minHeight: "100vh", background: "#FFFFFF",
      fontFamily: "'Inter', sans-serif", color: "#000000",
    }}>
      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#FFFFFF", borderBottom: "1px solid #00000020",
        padding: "0 1.5rem", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/" style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 600, color: "#000000",
          textDecoration: "none",
        }}>
          ← Retour
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: "#2563EB",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FFFFFF", fontSize: 12,
          }}>
            DM
          </div>
          Data Mining
        </div>

        <div style={{ width: 60 }} />
      </nav>

      {/* Hero */}
      <header style={{
        padding: "3rem 1.5rem 2rem", maxWidth: 800, margin: "0 auto",
        borderBottom: "1px solid #00000020",
      }}>
        <h1 style={{
          fontSize: "2rem", fontWeight: 700, lineHeight: 1.2,
          color: "#000000", margin: "0 0 1rem",
        }}>
          Data Mining
        </h1>
        <p style={{ fontSize: 14, color: "#000000", lineHeight: 1.7, margin: 0, maxWidth: 500 }}>
          De la donnée brute à l'intelligence décisionnelle grâce aux algorithmes d'analyse statistique et de segmentation avancée.
        </p>
      </header>

      {/* Main */}
      <main style={{ padding: "2rem 1.5rem", maxWidth: 800, margin: "0 auto" }}>
        <div style={{
          border: "1px solid #00000020", borderRadius: 12,
          background: "#FFFFFF",
        }}>
          {/* Header */}
          <div style={{
            padding: "1rem 1.5rem", borderBottom: "1px solid #00000020",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 8,
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#000000", margin: 0 }}>
              Algorithmes & Méthodes
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {methods.map((m) => (
                <Tag key={m}>{m}</Tag>
              ))}
            </div>
          </div>

          {/* Features */}
          {features.map((f, i) => (
            <Feature key={i} {...f} />
          ))}

          {/* Metrics box */}
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #00000020" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#2563EB", marginBottom: 8 }}>
              Performance des modèles
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Isolation Forest", val: "5.0%" },
                { label: "IQR", val: "6.9%" },
                { label: "Z-Score", val: "4.3%" },
                { label: "LOF", val: "3.3%" },
              ].map((item) => (
                <div key={item.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", borderRadius: 6,
                  border: "1px solid #2563EB", background: "#FFFFFF",
                }}>
                  <span style={{ fontSize: 11, color: "#000000" }}>{item.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB" }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}