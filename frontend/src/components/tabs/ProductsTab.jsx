import React, { useEffect, useState, useCallback } from 'react';
import {
  getProducts, startScraping, checkScrapingStatus, addHistory
} from '../../services/api';
import ProductCard from '../dashboard/ProductCard';
import { Search, Play, ChevronLeft, ChevronRight, Database } from 'lucide-react';

const SOURCES = ['jumia', 'amazon', 'aliexpress'];

const SOURCE_COLORS = {
  jumia:      { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  amazon:     { bg: '#fff8f0', color: '#d97706', border: '#fde68a' },
  aliexpress: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export default function ProductsTab() {
  const [products, setProducts]       = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pages, setPages]             = useState(1);
  const [query, setQuery]             = useState('');
  const [inputVal, setInputVal]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // Scraping state
  const [source, setSource]           = useState('jumia');
  const [scraping, setScraping]       = useState(false);
  const [scrapStatus, setScrapStatus] = useState('');
  const [progress, setProgress]       = useState(0);

  const loadProducts = useCallback((q = query, p = page) => {
    setLoading(true);
    setError(null);
    getProducts(q, p, 20)
      .then(d => {
        setProducts(d.products || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, page]);

  useEffect(() => { loadProducts(); }, [page]);

  const handleSearch = async () => {
    if (!inputVal.trim()) return;
    const q = inputVal.trim().toLowerCase();

    setScraping(true);
    setScrapStatus('Lancement du scraping…');
    setProgress(10);
    setError(null);

    try {
      const res = await startScraping(q, source);
      if (!res.task_id) {
        setScrapStatus(`✅ ${res.inserted || 0} produits récupérés`);
        setProgress(100);
        setQuery(q);
        setPage(1);
        loadProducts(q, 1);
        await addHistory(q, source, res.inserted || 0);
        setTimeout(() => { setScraping(false); setProgress(0); }, 2000);
        return;
      }

      setScrapStatus('Scraping en cours…');
      setProgress(30);

      const poll = setInterval(async () => {
        try {
          const status = await checkScrapingStatus(res.task_id);
          if (status.status === 'SUCCESS') {
            clearInterval(poll);
            setProgress(100);
            setScrapStatus('✅ Scraping terminé !');
            setQuery(q);
            setPage(1);
            loadProducts(q, 1);
            await addHistory(q, source, status.result?.inserted || 0);
            setTimeout(() => { setScraping(false); setProgress(0); setScrapStatus(''); }, 2000);
          } else if (status.status === 'FAILURE') {
            clearInterval(poll);
            setScrapStatus('❌ Échec du scraping');
            setScraping(false);
            setProgress(0);
          } else {
            setProgress(p => Math.min(p + 10, 90));
          }
        } catch {
          clearInterval(poll);
          setScraping(false);
        }
      }, 2000);

    } catch (e) {
      setError(e.message);
      setScraping(false);
      setProgress(0);
    }
  };

  const handleFilter = () => {
    const q = inputVal.trim().toLowerCase();
    setQuery(q);
    setPage(1);
    loadProducts(q, 1);
  };

  const srcStyle = SOURCE_COLORS[source] || {};

  return (
    <div className="pip-tab-inner">

      {/* ── En-tête ── */}
      <div className="pip-tab-header">
        <div>
          <h2 className="pip-tab-title">Recherche de produits</h2>
          <p className="pip-tab-subtitle">
            <span className="pip-count-badge">{total.toLocaleString('fr-FR')}</span> produits en base
          </p>
        </div>
        <div className="pip-header-icon pip-header-icon--green">
          <Database size={20} />
        </div>
      </div>

      {/* ── Barre de recherche ── */}
      <div className="pip-search-zone">
        <div className="pip-search-row">
          <div className="pip-search-input-wrap" style={{ flex: 1 }}>
            <Search size={16} className="pip-search-icon" />
            <input
              type="text"
              className="pip-search-field"
              placeholder='Ex : "hp pc portable", "redmi 14 pro"…'
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              disabled={scraping}
            />
          </div>

          <div className="pip-source-selector">
            {SOURCES.map(s => (
              <button
                key={s}
                className={`pip-source-btn ${source === s ? 'active' : ''}`}
                style={source === s ? { background: SOURCE_COLORS[s]?.bg, color: SOURCE_COLORS[s]?.color, borderColor: SOURCE_COLORS[s]?.border } : {}}
                onClick={() => setSource(s)}
                disabled={scraping}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <button
            className="pip-btn pip-btn-primary"
            onClick={handleSearch}
            disabled={scraping || !inputVal.trim()}
          >
            <Play size={14} /> Scraper
          </button>

          <button
            className="pip-btn pip-btn-outline"
            onClick={handleFilter}
            disabled={scraping}
          >
            <Search size={14} /> Filtrer
          </button>
        </div>

        {/* ── Barre de progression ── */}
        {scraping && (
          <div className="pip-progress-zone">
            <div className="pip-progress-bar-bg">
              <div
                className="pip-progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="pip-progress-label">{scrapStatus}</p>
          </div>
        )}
      </div>

      {error   && <div className="pip-error">{error}</div>}
      {loading && <div className="pip-loading"><span className="pip-spinner" />Chargement des produits…</div>}

      {/* ── Grille produits ── */}
      {!loading && products.length === 0 && (
        <div className="pip-empty-state">
          <span className="pip-empty-icon">📦</span>
          <p>Aucun produit trouvé.{query && ` Essayez de scraper "${query}".`}</p>
        </div>
      )}

      <div className="pip-product-grid">
        {products.map((p, i) => (
          <ProductCard key={i} product={p} />
        ))}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="pip-pagination">
          <button
            className="pip-page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="pip-page-pills">
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`pip-page-pill ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            {pages > 7 && <span className="pip-page-dots">…</span>}
          </div>
          <button
            className="pip-page-btn"
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

    </div>
  );
}