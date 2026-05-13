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

export default function ScrapingPage() {
  useFont();

  const features = [
    {
      label: "Collecte asynchrone",
      desc: "Architecture Celery pour exécuter le scraping en arrière-plan sans bloquer l'interface. Progression en temps réel et logs détaillés.",
    },
    {
      label: "Multi-plateformes",
      desc: "Support adaptatif de Jumia, Amazon, AliExpress. Sélecteurs HTML intelligents et gestion automatique des rate limits.",
    },
    {
      label: "Pipeline de nettoyage",
      desc: "Injection directe dans MySQL avec déduplication, normalisation des devises (MAD/EUR/USD) et validation des données.",
    },
    {
      label: "Archivage & Historique",
      desc: "Conservation des données temporelles pour analyses d'évolution des prix et détection de tendances marché.",
    },
  ];

  const platforms = ["Jumia", "Amazon", "AliExpress"];

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
            S
          </div>
          Scraping Automatisé
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
          Scraping <span style={{ color: "#2563EB" }}>Automatisé</span>
        </h1>
        <p style={{ fontSize: 14, color: "#000000", lineHeight: 1.7, margin: 0, maxWidth: 500 }}>
          Collecte de données robuste et entièrement automatisée pour alimenter vos analyses de marché en temps réel.
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
              Fonctionnalités
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {platforms.map((p) => (
                <Tag key={p}>{p}</Tag>
              ))}
            </div>
          </div>

          {/* Features */}
          {features.map((f, i) => (
            <Feature key={i} {...f} />
          ))}

          {/* Pipeline visual */}
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #00000020" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#2563EB", marginBottom: 8 }}>
              Pipeline de traitement
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["FETCH", "PARSE", "CLEAN", "DEDUP", "STORE"].map((step, i, arr) => (
                <span key={step} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: "#2563EB", border: "1px solid #2563EB",
                    borderRadius: 4, padding: "2px 8px",
                  }}>
                    {step}
                  </span>
                  {i < arr.length - 1 && <span style={{ color: "#00000040" }}>→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}