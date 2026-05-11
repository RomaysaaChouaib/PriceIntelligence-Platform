import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="logo">
          {/* 👇 LOGO SVG MODERNE (Losange Orange #e85d04) */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="#e85d04" />
            {/* Petit détail intérieur pour l'effet "Diamant/Intelligence" */}
            <path d="M12 7L17 12L12 17L7 12L12 7Z" fill="#ffffff" fillOpacity="0.3" />
          </svg>
          PriceIntel
        </div>
        <Link to="/signup" className="btn-signup-nav">S'inscrire</Link>
      </nav>

      <header className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="hero-badge">Licence IASD 2025/2026</span>
          <h1>Market Research & Pricing Analysis</h1>
          <p className="hero-subtitle">
            Plateforme académique & professionnelle d'analyse intelligente des prix e-commerce 
            basée sur les techniques de <strong>Data Mining</strong> et de <strong>Web Scraping</strong>.
          </p>
          <Link to="/signup" className="btn-primary">Commencer l'analyse →</Link>
        </div>
      </header>

      <section className="pillars-section">
        {/* 👇 SUPPRESSION DU TITRE ET SOUS-TITRE ICI */}
        
        <div className="cards-grid">
          <Link to="/pricing" className="pillar-card-link">
            <div className="pillar-card">
              <div className="card-icon">⊿</div>
              <h3>Analyse des Prix</h3>
              <p className="card-summary">Visualisation, segmentation et suivi en temps réel des marchés e-commerce.</p>
              <span className="read-more">En savoir plus →</span>
            </div>
          </Link>

          <Link to="/scraping" className="pillar-card-link">
            <div className="pillar-card highlight">
              <div className="card-icon">⊛</div>
              <h3>Scraping Automatisé</h3>
              <p className="card-summary">Collecte asynchrone, multi-plateformes et mise à jour continue des données.</p>
              <span className="read-more">En savoir plus →</span>
            </div>
          </Link>

          <Link to="/datamining" className="pillar-card-link">
            <div className="pillar-card">
              <div className="card-icon">◈</div>
              <h3>Data Mining & IA</h3>
              <p className="card-summary">Clustering, détection d'anomalies et règles d'association intelligentes.</p>
              <span className="read-more">En savoir plus →</span>
            </div>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
             {/* 👇 MÊME LOGO DANS LE FOOTER POUR COHÉRENCE */}
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="#e85d04" />
            </svg>
            PriceIntel
          </div>
          <p>Projet de fin de matière Data Mining • Licence IASD</p>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 PriceIntel. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}