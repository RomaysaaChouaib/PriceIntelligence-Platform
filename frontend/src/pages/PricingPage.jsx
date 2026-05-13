import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Target, Clock, History, Bell, Shield, PieChart, LineChart, Box, Layers, Tag, GitCompare, MapPin, Zap } from 'lucide-react';
import './DetailPages.css';

export default function PricingPage() {
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
          <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
          Analyse des Prix
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
          Analyse des Prix
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
          Transformez des données brutes en indicateurs stratégiques clairs et actionnables.
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
          
          {/* Section 1: Suivi en temps réel */}
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
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Clock size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Suivi en temps réel
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Notre plateforme surveille en continu les évolutions tarifaires sur les marchés marocains (Avito, Jumia) et internationaux (Amazon, eBay). Chaque variation de prix est enregistrée et horodatée pour garantir une traçabilité parfaite.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: Clock, text: 'Surveillance 24/7 des marchés e-commerce' },
                { icon: History, text: 'Historique complet des variations de prix' },
                { icon: Bell, text: 'Alertes automatiques sur les changements significatifs' },
                { icon: Shield, text: 'Traçabilité et audit des données' }
              ].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: 500
                }}>
                  <item.icon size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
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

          {/* Section 2: Visualisation avancée */}
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
                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <PieChart size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Visualisation avancée
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Nous générons automatiquement des histogrammes de distribution, des boxplots comparatifs par plateforme, et des courbes de tendances temporelles. Les métriques statistiques clés (médiane, moyenne, écart-type, quartiles) sont calculées en temps réel.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: BarChart3, text: 'Histogrammes de distribution des prix' },
                { icon: Box, text: 'Boxplots comparatifs par plateforme' },
                { icon: LineChart, text: 'Courbes de tendances temporelles' },
                { icon: Target, text: 'Métriques statistiques avancées (médiane, moyenne, écart-type)' }
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

          {/* Divider */}
          <div className="divider" style={{
            height: '1px',
            background: 'var(--border)',
            margin: 0
          }} />

          {/* Section 3: Segmentation intelligente */}
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
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Layers size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Segmentation intelligente
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Grâce à des algorithmes de clustering, les produits sont automatiquement classés par gamme de prix (entrée, milieu, haut de gamme, premium). Cela permet aux utilisateurs de comparer des produits équivalents et d'identifier précisément leur positionnement concurrentiel.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: Tag, text: 'Classification automatique par gamme de prix' },
                { icon: Zap, text: 'Algorithmes de clustering (K-Means)' },
                { icon: GitCompare, text: 'Comparaison de produits équivalents' },
                { icon: MapPin, text: 'Positionnement concurrentiel précis' }
              ].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: 500
                }}>
                  <item.icon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
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