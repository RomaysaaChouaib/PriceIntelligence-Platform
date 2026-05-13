import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Database, Code2, Brain, Mail, GitBranch, User } from 'lucide-react';
import './LandingPage.css';

// ══════════════════════════════════════════════════════════════════
// 🎨 DESIGN TOKENS — Fond Blanc + Texte Noir/Bleu
// ══════════════════════════════════════════════════════════════════
const DS = {
  bg0: "#ffffff",
  bg1: "#f8fafc",
  bg2: "#ffffff",
  bg3: "#f1f5f9",
  border: "#e2e8f0",
  borderGlow: "#2563eb",
  blue: "#2563eb",
  blueDim: "#004d99",
  blueGlow: "rgba(0, 102, 204, 0.15)",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  sans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${DS.bg0};
    color: ${DS.textPrimary};
    font-family: ${DS.sans};
    font-size: 14px;
    line-height: 1.5;
  }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${DS.bg3}; }
  ::-webkit-scrollbar-thumb { background: ${DS.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${DS.borderGlow}; }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 8px ${DS.blueGlow}; }
    50%       { box-shadow: 0 0 20px ${DS.blue}40; }
  }
  .fade-in { animation: fadeSlideUp 0.35s ease both; }
  .fade-in-d1 { animation: fadeSlideUp 0.35s ease 0.05s both; }
  .fade-in-d2 { animation: fadeSlideUp 0.35s ease 0.10s both; }
  .fade-in-d3 { animation: fadeSlideUp 0.35s ease 0.15s both; }
  .glow { animation: glow-pulse 2s ease-in-out infinite; }
`;

function InjectStyle() {
  if (typeof document !== 'undefined' && !document.getElementById("pip-landing-style")) {
    const s = document.createElement("style");
    s.id = "pip-landing-style";
    s.textContent = GLOBAL_STYLE;
    document.head.appendChild(s);
  }
  return null;
}

function Card({ children, glow = false, className = "" }) {
  return (
    <div className={className} style={{
      background: DS.bg2,
      border: `1px solid ${glow ? DS.borderGlow : DS.border}`,
      borderRadius: 12,
      padding: "1.5rem",
      position: "relative",
      overflow: "hidden",
      boxShadow: glow ? `0 0 30px ${DS.blueGlow}` : "0 1px 3px rgba(0,0,0,0.05)",
      transition: "all 0.3s ease",
      cursor: "pointer",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = DS.borderGlow;
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 8px 40px ${DS.blue}15`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = glow ? DS.borderGlow : DS.border;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = glow ? `0 0 30px ${DS.blueGlow}` : "0 1px 3px rgba(0,0,0,0.05)";
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${DS.blue}, transparent)`,
      }} />
      {children}
    </div>
  );
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
      {Icon && <Icon size={18} color={DS.blue} />}
      <span style={{ fontSize: 14, fontWeight: 600, color: DS.textPrimary, letterSpacing: 0.5 }}>
        {children}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 👥 TEAM MEMBER CARD COMPONENT
// ══════════════════════════════════════════════════════════════════
function TeamCard({ name, email, github, avatar }) {
  return (
    <div style={{
      background: DS.bg2,
      border: `1px solid ${DS.border}`,
      borderRadius: 12,
      padding: "1.5rem",
      textAlign: "center",
      transition: "all 0.3s ease",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = DS.borderGlow;
        e.currentTarget.style.boxShadow = `0 8px 24px ${DS.blue}10`;
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = DS.border;
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: `${DS.blue}10`,
        border: `2px solid ${DS.blue}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 1rem",
        fontSize: "1.5rem", fontWeight: 700, color: DS.blue,
        fontFamily: DS.mono,
      }}>
        {avatar || name.charAt(0).toUpperCase()}
      </div>
      
      {/* Name */}
      <h4 style={{
        fontSize: "1.1rem", fontWeight: 700, color: DS.textPrimary,
        margin: "0 0 0.5rem",
      }}>
        {name}
      </h4>
      
      {/* Email */}
      <a 
        href={`mailto:${email}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, color: DS.textSecondary, fontSize: "0.9rem",
          textDecoration: "none", marginBottom: "0.75rem",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = DS.blue}
        onMouseLeave={e => e.currentTarget.style.color = DS.textSecondary}
      >
        <Mail size={14} />
        {email}
      </a>
      
      {/* GitHub */}
      <a 
        href={github}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 6,
          background: `${DS.blue}10`, color: DS.blue,
          textDecoration: "none", fontSize: "0.85rem",
          fontWeight: 600, fontFamily: DS.mono,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = DS.blue;
          e.currentTarget.style.color = DS.bg0;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = `${DS.blue}10`;
          e.currentTarget.style.color = DS.blue;
        }}
      >
        <GitBranch size={14} />
        GitHub
      </a>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🏠 LANDING PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function LandingPage() {
  // ═══════════════════════════════════════════════════════════════
  // 👥 DONNÉES ÉQUIPE
  // ═══════════════════════════════════════════════════════════════
  const teamMembers = [
    {
      name: "Salma Belaicha",
      email: "s.belaicha4164@uca.ac.ma",
      github: "https://github.com/salma-code-it",
      avatar: "SB",
    },
    {
      name: "Romaysaa Chouaib",
      email: "r.chouaib0921@uca.ac.ma",
      github: "https://github.com/romaysaachouaib",
      avatar: "RC",
    },
    {
      name: "Halima Driouch",
      email: "h.driouch9534@uca.ac.ma",
      github: "https://github.com/halimadriouch",
      avatar: "HD",
    },
  ];

  return (
    <>
      <InjectStyle />
      <div style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${DS.bg0} 0%, ${DS.bg1} 100%)`,
        backgroundImage: `radial-gradient(ellipse at 50% 10%, ${DS.blue}08 0%, transparent 60%)`,
      }}>
        {/* ══ NAVBAR ══ */}
        <nav style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1rem 5%", background: DS.bg0,
          borderBottom: `1px solid ${DS.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${DS.blue}15`,
              border: `1px solid ${DS.blue}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "glow-pulse 2.5s ease-in-out infinite",
            }}>
              <Zap size={18} color={DS.blue} />
            </div>
            <span style={{
              fontSize: "1.3rem", fontWeight: 700, color: DS.textPrimary,
              letterSpacing: "-0.3px", fontFamily: DS.sans,
            }}>PriceIntel</span>
          </div>
          <Link to="/signup" style={{
            padding: "0.6rem 1.4rem",
            background: `${DS.blue}cc`,
            color: DS.bg0, textDecoration: "none", borderRadius: 8,
            fontWeight: 700, fontSize: "0.9rem", fontFamily: DS.mono,
            letterSpacing: 1, transition: "all 0.2s",
            border: `1px solid ${DS.blue}40`,
          }}
            onMouseEnter={e => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = `0 4px 20px ${DS.blue}40`;
            }}
            onMouseLeave={e => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            S'INSCRIRE →
          </Link>
        </nav>

        {/* ══ HERO SECTION ══ */}
        <header style={{
          textAlign: "center", padding: "5rem 2rem 4rem",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
            width: "600px", height: "600px", borderRadius: "50%",
            background: `radial-gradient(circle, ${DS.blue}08 0%, transparent 70%)`,
            filter: "blur(40px)", pointerEvents: "none",
          }} />
          
          <div className="fade-in" style={{ position: "relative", zIndex: 2, maxWidth: 800, margin: "0 auto" }}>
            <h1 className="fade-in-d1" style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 800, color: DS.textPrimary,
              lineHeight: 1.1, margin: "1.5rem 0 1.2rem",
              letterSpacing: "-0.5px",
            }}>
              Market Research &{" "}
              <span style={{ color: DS.blue }}>Pricing Analysis</span>
            </h1>
            
            <p className="fade-in-d2" style={{
              fontSize: "1.15rem", color: DS.textSecondary,
              maxWidth: 650, margin: "0 auto 2.5rem", lineHeight: 1.7,
            }}>
              Plateforme académique & professionnelle d'analyse intelligente des prix e-commerce
              basée sur les techniques de{" "}
              <strong style={{ color: DS.blue, fontFamily: DS.mono }}>Data Mining</strong>{" "}
              et de{" "}
              <strong style={{ color: DS.blue, fontFamily: DS.mono }}>Web Scraping</strong>.
            </p>
            
            <div className="fade-in-d3" style={{ display: "flex", justifyContent: "center" }}>
              <Link to="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "1rem 2rem",
                background: `${DS.blue}cc`,
                color: DS.bg0, textDecoration: "none", borderRadius: 10,
                fontWeight: 700, fontSize: "1rem", fontFamily: DS.mono,
                letterSpacing: 1, transition: "all 0.3s",
                border: `1px solid ${DS.blue}40`,
                boxShadow: `0 4px 20px ${DS.blue}30`,
              }}
                onMouseEnter={e => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = `0 8px 30px ${DS.blue}50`;
                }}
                onMouseLeave={e => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = `0 4px 20px ${DS.blue}30`;
                }}
              >
                Commencer l'analyse <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </header>

        {/* ══ PILLARS SECTION ══ */}
        <section style={{ padding: "3rem 5% 5rem", maxWidth: 1200, margin: "0 auto" }}>
          <div className="fade-in-d2" style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionTitle icon={Database}>MODULES PRINCIPAUX</SectionTitle>
            <p style={{ color: DS.textMuted, fontSize: "0.95rem", marginTop: "0.5rem" }}>
              Trois piliers technologiques pour une analyse de marché complète
            </p>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}>
            {/* Card 1: Price Analysis */}
            <Link to="/pricing" style={{ textDecoration: "none", color: "inherit" }}>
              <Card glow>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `${DS.blue}15`, border: `1px solid ${DS.blue}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 12L12 22L2 12L12 2Z" fill={DS.blue} opacity="0.3" />
                    <path d="M12 7L17 12L12 17L7 12L12 7Z" fill={DS.blue} />
                  </svg>
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: DS.textPrimary, margin: "0 0 0.5rem" }}>
                  Analyse des Prix
                </h3>
                <p style={{ color: DS.textSecondary, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1rem" }}>
                  Visualisation, segmentation et suivi en temps réel des marchés e-commerce.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: DS.blue, fontFamily: DS.mono, fontSize: "0.9rem", fontWeight: 600 }}>
                  En savoir plus →
                </div>
              </Card>
            </Link>

            {/* Card 2: Scraping */}
            <Link to="/scraping" style={{ textDecoration: "none", color: "inherit" }}>
              <Card glow>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `${DS.blue}15`, border: `1px solid ${DS.blue}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <Code2 size={24} color={DS.blue} />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: DS.textPrimary, margin: "0 0 0.5rem" }}>
                  Scraping Automatisé
                </h3>
                <p style={{ color: DS.textSecondary, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1rem" }}>
                  Collecte asynchrone, multi-plateformes et mise à jour continue des données.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: DS.blue, fontFamily: DS.mono, fontSize: "0.9rem", fontWeight: 600 }}>
                  En savoir plus →
                </div>
              </Card>
            </Link>

            {/* Card 3: Data Mining */}
            <Link to="/datamining" style={{ textDecoration: "none", color: "inherit" }}>
              <Card glow>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `${DS.blue}15`, border: `1px solid ${DS.blue}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <Brain size={24} color={DS.blue} />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: DS.textPrimary, margin: "0 0 0.5rem" }}>
                  Data Mining & IA
                </h3>
                <p style={{ color: DS.textSecondary, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1rem" }}>
                  Clustering, détection d'anomalies et règles d'association intelligentes.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: DS.blue, fontFamily: DS.mono, fontSize: "0.9rem", fontWeight: 600 }}>
                  En savoir plus →
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            👥 SECTION ÉQUIPE DU PROJET
            ═══════════════════════════════════════════════════════════════ */}
        <section style={{ 
          padding: "4rem 5% 6rem", 
          background: DS.bg1,
          borderTop: `1px solid ${DS.border}`,
          borderBottom: `1px solid ${DS.border}`,
        }}>
          <div className="fade-in" style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionTitle icon={User}>ÉQUIPE DU PROJET</SectionTitle>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem", maxWidth: 1000, margin: "0 auto",
          }}>
            {teamMembers.map((member, index) => (
              <div key={index} className={`fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
                <TeamCard {...member} />
              </div>
            ))}
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer style={{
          background: DS.bg0, borderTop: `1px solid ${DS.border}`,
          padding: "3rem 5% 2rem", marginTop: "2rem",
        }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "1.5rem", textAlign: "center", marginBottom: "2rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${DS.blue}15`,
                border: `1px solid ${DS.blue}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={14} color={DS.blue} />
              </div>
              <span style={{
                fontSize: "1.2rem", fontWeight: 700, color: DS.textPrimary,
                letterSpacing: "-0.3px",
              }}>PriceIntel</span>
            </div>
            <p style={{ color: DS.textMuted, fontSize: "0.9rem", fontFamily: DS.mono }}>
              Projet de fin de matière Data Mining
            </p>
          </div>
          
          <div style={{
            borderTop: `1px solid ${DS.border}`, paddingTop: "1.5rem",
            textAlign: "center", color: DS.textMuted, fontSize: "0.85rem",
            fontFamily: DS.mono,
          }}>
            PriceIntel Platform
          </div>
        </footer>
      </div>
    </>
  );
}