import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Brain, Network, AlertTriangle, Link2, 
  Target, Radar, GitBranch, Search, Lightbulb,
  TreePine, MapPin, AlertOctagon, Bell, Trash,
  FileSearch, Sliders, Coins, TrendingUp 
} from 'lucide-react';
import './DetailPages.css';

export default function DataMiningPage() {
  return (
    <div className="detail-container">
      
      {/* Navigation */}
      <nav className="detail-nav" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        width: '100%'
      }}>
        <Link 
          to="/" 
          className="back-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text2)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'color 0.15s',
            padding: '8px 12px',
            borderRadius: 'var(--radius)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text2)'}
        >
          <ArrowLeft size={16} />
          Retour à l'accueil
        </Link>
        <div className="nav-title" style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Brain size={18} style={{ color: 'var(--accent)' }} />
          Data Mining & IA
        </div>
        <div style={{ width: 120 }} /> {/* Spacer pour centrer le titre */}
      </nav>

      {/* Hero Section */}
      <header className="detail-hero" style={{
        background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #1e293b 100%)',
        padding: '48px 24px',
        textAlign: 'center',
        color: '#fff',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          margin: '0 0 12px',
          letterSpacing: '-0.5px'
        }}>
          Data Mining & IA
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          margin: 0,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6
        }}>
          De la donnée brute à l'intelligence décisionnelle grâce au Machine Learning.
        </p>
      </header>

      {/* Content Section */}
      <section className="detail-content" style={{
        padding: '32px 24px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div className="detail-card single-card" style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          width: '100%'
        }}>
          
          {/* Section 1: Clustering */}
          <div className="card-section" style={{
            padding: '24px',
            borderBottom: '1px solid var(--border)'
          }}>
            <div className="card-header" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: '16px'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                {/* ✅ Remplacé Cluster par Network */}
                <Network size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Clustering (K-Means & DBSCAN)
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Nous appliquons des algorithmes de partitionnement et de densité pour regrouper naturellement les offres similaires. La visualisation radar et les projections PCA permettent d'observer les segments de marché.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: Target, text: 'Algorithmes K-Means et DBSCAN' },
                { icon: Radar, text: 'Visualisation radar des clusters' },
                { icon: GitBranch, text: 'Projections PCA (Analyse en Composantes Principales)' },
                { icon: Search, text: 'Identification des segments de marché' },
                { icon: Lightbulb, text: 'Détection des niches sous-exploitées' }
              ].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: 500
                }}>
                  <item.icon size={16} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="divider" style={{
            height: '1px',
            background: 'var(--border)',
            margin: 0
          }} />

          {/* Section 2: Détection d'anomalies */}
          <div className="card-section" style={{
            padding: '24px',
            borderBottom: '1px solid var(--border)'
          }}>
            <div className="card-header" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: '16px'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444, #f87171)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Détection d'anomalies
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Les algorithmes Isolation Forest et LOF analysent les distributions multidimensionnelles pour flaguer automatiquement les prix aberrants, les offres suspectes ou les erreurs de saisie.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: TreePine, text: 'Isolation Forest pour détection d\'outliers' },
                { icon: MapPin, text: 'LOF (Local Outlier Factor)' },
                { icon: AlertOctagon, text: 'Détection automatique des prix aberrants' },
                { icon: Bell, text: 'Alertes sur offres suspectes' },
                { icon: Trash, text: 'Nettoyage automatique des datasets' }
              ].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: 500
                }}>
                  <item.icon size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="divider" style={{
            height: '1px',
            background: 'var(--border)',
            margin: 0
          }} />

          {/* Section 3: Règles d'association */}
          <div className="card-section" style={{
            padding: '24px'
          }}>
            <div className="card-header" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: '16px'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Link2 size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Règles d'association
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Via Apriori et FP-Growth, nous extrayons des corrélations fortes entre caractéristiques produits (marque, RAM, stockage, accessoires) et fourchettes de prix pour révéler des combinaisons gagnantes.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: FileSearch, text: 'Algorithmes Apriori et FP-Growth' },
                { icon: Network, text: 'Extraction de corrélations fortes' },
                { icon: Sliders, text: 'Analyse des caractéristiques produits (marque, RAM, stockage)' },
                { icon: Coins, text: 'Corrélations avec les fourchettes de prix' },
                { icon: TrendingUp, text: 'Stratégies de pricing optimisées' }
              ].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: 500
                }}>
                  <item.icon size={16} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>
    </div>
  );
}