import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, Globe, RefreshCw, Zap, ListChecks, FileText, AlertCircle, Database, Coins, Trash2, Archive, Server, Shield, Clock, Target } from 'lucide-react';
import './DetailPages.css';

export default function ScrapingPage() {
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
          <Bot size={18} style={{ color: 'var(--accent)' }} />
          Scraping Automatisé
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
          Scraping Automatisé
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
          Une collecte de données robuste, rapide et entièrement automatisée.
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
          
          {/* Section 1: Collecte asynchrone */}
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
                <Zap size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Collecte asynchrone
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              L'architecture repose sur Celery pour exécuter les tâches de scraping en arrière-plan sans bloquer l'interface. Une barre de progression en temps réel et un système de logs permettent de suivre l'avancement.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: Server, text: 'Traitement asynchrone avec Celery' },
                { icon: ListChecks, text: 'Barre de progression en temps réel' },
                { icon: FileText, text: 'Système de logs détaillés' },
                { icon: AlertCircle, text: 'Gestion automatique des erreurs' }
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

          {/* Section 2: Multi-plateformes adaptatif */}
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
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Globe size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Multi-plateformes adaptatif
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Nos spiders s'adaptent automatiquement aux structures HTML de Jumia, Amazon, AliExpress, Avito et eBay. La gestion intelligente des sélecteurs et des headers HTTP garantit une collecte stable.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: Globe, text: 'Support de 5+ plateformes (Jumia, Amazon, AliExpress, Avito, eBay)' },
                { icon: Target, text: 'Sélecteurs HTML adaptatifs' },
                { icon: Shield, text: 'Gestion intelligente des headers HTTP' },
                { icon: Clock, text: 'Respect des rate limits' }
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

          {/* Section 3: Mise à jour continue & Nettoyage */}
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
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <RefreshCw size={20} color="#fff" />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0
              }}>
                Mise à jour continue & Nettoyage
              </h3>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text2)',
              lineHeight: 1.7,
              margin: '0 0 16px'
            }}>
              Les données sont directement injectées dans MySQL avec détection automatique des doublons. Le pipeline intègre une phase de prétraitement : normalisation des devises, suppression des caractères spéciaux.
            </p>
            <ul className="feature-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10
            }}>
              {[
                { icon: Database, text: 'Injection directe dans MySQL' },
                { icon: RefreshCw, text: 'Détection automatique des doublons' },
                { icon: Coins, text: 'Normalisation des devises (MAD, EUR, USD)' },
                { icon: Trash2, text: 'Nettoyage et validation des données' },
                { icon: Archive, text: 'Archivage historique pour analyses temporelles' }
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

        </div>
      </section>
    </div>
  );
}