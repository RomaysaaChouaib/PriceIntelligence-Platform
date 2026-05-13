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

// Composant Step avec checkmark
function Step({ label, desc, last }) {
  return (
    <div style={{
      display: "flex", gap: "1rem", padding: "1.25rem 1.5rem",
      borderBottom: last ? "none" : "1px solid #00000020",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "#2563EB", color: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>
        ✓
      </div>
      <div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: "#000000", marginBottom: 4,
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

export default function PricingPage() {
  useFont();

  const steps = [
    {
      label: "Collecte & Prétraitement",
      desc: "Scraping automatisé depuis Jumia, Amazon, AliExpress. Nettoyage : normalisation des devises, déduplication, validation des données.",
    },
    {
      label: "Analyse & Segmentation",
      desc: "Calcul des statistiques (médiane, écarts) et clustering automatique pour identifier les segments de marché : entrée, milieu, premium.",
    },
    {
      label: "Détection d'Anomalies",
      desc: "Repérage des prix suspects et analyse des corrélations entre attributs produits et fourchettes de prix.",
    },
    {
      label: "Visualisation",
      desc: "Tableau de bord interactif avec histogrammes, boxplots et courbes de tendance — filtrables par catégorie ou période.",
    },
  ];

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
            PI
          </div>
          PriceIntel
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
          Analyse des <span style={{ color: "#2563EB" }}>Prix</span> de marché
        </h1>
        <p style={{ fontSize: 14, color: "#000000", lineHeight: 1.7, margin: 0, maxWidth: 500 }}>
          Pipeline complet de Data Mining pour comprendre et surveiller les dynamiques tarifaires — du scraping à la décision.
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
            background: "#FFFFFF",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#000000", margin: 0 }}>
              Processus d'analyse
            </p>
          </div>

          {/* Steps */}
          {steps.map((s, i) => (
            <Step key={i} {...s} last={i === steps.length - 1} />
          ))}
        </div>
      </main>
    </div>
  );
}