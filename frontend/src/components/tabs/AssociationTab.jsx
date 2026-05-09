import React, { useEffect, useState } from 'react';
import { getAssociation, getAssociationAccessories } from '../../services/api';
import { Link2, ArrowRight, ShoppingBag } from 'lucide-react';

// ── Barre de confiance ───────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  return (
    <div className="pip-conf-bar-bg">
      <div
        className="pip-conf-bar-fill"
        style={{ width: `${value * 100}%`, background: value > 0.8 ? '#10b981' : '#3b82f6' }}
      />
      <span className="pip-conf-label">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function LiftBadge({ lift }) {
  const color = lift >= 2 ? '#10b981' : lift >= 1.5 ? '#f59e0b' : '#64748b';
  return (
    <span className="pip-lift-badge" style={{ color, borderColor: color }}>
      ×{lift?.toFixed(2)}
    </span>
  );
}

// ── Tableau de règles réutilisable ───────────────────────────────────────────
function RulesTable({ rules, sortBy, filterText }) {
  const filtered = rules
    .filter(r =>
      !filterText ||
      r.antecedent?.toLowerCase().includes(filterText.toLowerCase()) ||
      r.consequent?.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => b[sortBy] - a[sortBy]);

  if (filtered.length === 0)
    return <div className="pip-empty">Aucune règle pour ce filtre.</div>;

  return (
    <div className="pip-table-wrapper">
      <table className="pip-table">
        <thead>
          <tr>
            <th>Si (antécédent)</th>
            <th></th>
            <th>Alors (conséquent)</th>
            <th>Support</th>
            <th>Confiance</th>
            <th>Lift</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 50).map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'pip-row-even' : ''}>
              <td className="pip-rule-ant">{r.antecedent}</td>
              <td><ArrowRight size={14} color="#64748b" /></td>
              <td className="pip-rule-cons">{r.consequent}</td>
              <td>{(r.support * 100).toFixed(1)}%</td>
              <td><ConfidenceBar value={r.confidence} /></td>
              <td><LiftBadge lift={r.lift} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 50 && (
        <p className="pip-more-note">
          Affichage limité à 50 règles sur {filtered.length}. Utilisez le filtre pour affiner.
        </p>
      )}
    </div>
  );
}

export default function AssociationTab() {
  const [laptopData,  setLaptopData]  = useState(null);
  const [accData,     setAccData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingAcc,  setLoadingAcc]  = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('laptops');
  const [sortBy,      setSortBy]      = useState('lift');
  const [filterText,  setFilterText]  = useState('');

  useEffect(() => {
    getAssociation()
      .then(setLaptopData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    getAssociationAccessories()
      .then(setAccData)
      .catch(() => setAccData(null))
      .finally(() => setLoadingAcc(false));
  }, []);

  if (loading) return <div className="pip-loading">Extraction des règles d'association…</div>;
  if (error)   return <div className="pip-error">Erreur : {error}</div>;

  const laptopRules = laptopData?.rules || [];
  const accRules    = accData?.rules_accessories || [];
  const crossRules  = accData?.rules_cross || [];

  return (
    <div className="pip-tab-inner">

      <div className="pip-tab-header">
        <div>
          <h2 className="pip-tab-title">Règles d'association</h2>
          <p className="pip-tab-subtitle">
            Algorithme Apriori — Laptops &amp; Accessoires
            <span className="pip-param-badge">support ≥ 5%</span>
            <span className="pip-param-badge">confiance ≥ 50%</span>
            <span className="pip-param-badge">lift ≥ 1.0</span>
          </p>
        </div>
        <Link2 size={28} color="#3b82f6" />
      </div>

      {/* ── Explication ── */}
      <div className="pip-section pip-info-box">
        <p>
          Les règles d'association révèlent les liens entre caractéristiques produits et gammes de prix.<br />
          Ex : <em>marque=HP ∧ gaming=true → haut_de_gamme</em> avec confiance 85%.
        </p>
        <div className="pip-legend-row">
          <span><strong>Support</strong> = fréquence de la règle dans les données</span>
          <span><strong>Confiance</strong> = P(conséquent | antécédent)</span>
          <span><strong>Lift</strong> = force de la règle (&gt;1 = corrélation positive)</span>
        </div>
      </div>

      {/* ── Onglets internes ── */}
      <div className="pip-section">
        <div className="pip-inner-tabs">
          {[
            { key: 'laptops', label: `💻 Laptops (${laptopRules.length})` },
            { key: 'accessories', label: `🖱️ Accessoires (${accRules.length})` },
            { key: 'cross', label: `🔗 Croisées (${crossRules.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              className={`pip-inner-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contrôles ── */}
      <div className="pip-controls-row pip-section">
        <input
          type="text"
          className="pip-search-input"
          placeholder="Filtrer les règles…"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <label className="pip-control-label">
          Trier par :
          <select
            className="pip-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="lift">Lift ↓</option>
            <option value="confidence">Confiance ↓</option>
            <option value="support">Support ↓</option>
          </select>
        </label>
      </div>

      {/* ── Contenu selon onglet ── */}
      {activeTab === 'laptops' && (
        <div className="pip-section">
          <h3 className="pip-section-title">
            Règles laptops — {laptopRules.length} règles générées
          </h3>
          {laptopRules.length === 0
            ? <div className="pip-empty">Aucune règle. Vérifiez les données en base.</div>
            : <RulesTable rules={laptopRules} sortBy={sortBy} filterText={filterText} />
          }
        </div>
      )}

      {activeTab === 'accessories' && (
        <div className="pip-section">
          <h3 className="pip-section-title">
            <ShoppingBag size={16} /> Règles accessoires — {accRules.length} règles
          </h3>
          <p className="pip-tab-subtitle" style={{ marginBottom: 12 }}>
            Liens entre catégorie d'accessoire (souris, stand, USB), source et gamme de prix.
          </p>
          {loadingAcc
            ? <div className="pip-loading">Chargement accessoires…</div>
            : accRules.length === 0
              ? <div className="pip-empty">Aucune règle accessoire disponible.</div>
              : <RulesTable rules={accRules} sortBy={sortBy} filterText={filterText} />
          }
        </div>
      )}

      {activeTab === 'cross' && (
        <div className="pip-section">
          <h3 className="pip-section-title">
            🔗 Association croisée Laptop × Accessoires — {crossRules.length} règles
          </h3>
          <p className="pip-tab-subtitle" style={{ marginBottom: 12 }}>
            Liens entre les caractéristiques d'un laptop et le type d'accessoire associé.
            Ex : <em>laptop gaming → souris gaming AliExpress</em>.
          </p>
          {loadingAcc
            ? <div className="pip-loading">Chargement…</div>
            : crossRules.length === 0
              ? <div className="pip-empty">Aucune règle croisée disponible.</div>
              : <RulesTable rules={crossRules} sortBy={sortBy} filterText={filterText} />
          }
        </div>
      )}

    </div>
  );
}
