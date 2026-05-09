import React, { useEffect, useState, useCallback } from 'react';
import {
  getProducts, startScraping, checkScrapingStatus, addHistory
} from '../../services/api';
import ProductCard from '../dashboard/ProductCard';
import { Search, Play, Square, ChevronLeft, ChevronRight } from 'lucide-react';

const SOURCES = ['jumia', 'amazon', 'aliexpress'];

export default function ProductsTab() {
  const [products, setProducts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [query, setQuery]           = useState('');
  const [inputVal, setInputVal]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // Scraping state
  const [source, setSource]         = useState('jumia');
  const [scraping, setScraping]     = useState(false);
  const [taskId, setTaskId]         = useState(null);
  const [scrapStatus, setScrapStatus] = useState('');
  const [progress, setProgress]     = useState(0);

  // Charger les produits
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

  // Lancer le scraping
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
        // Pas de tâche Celery (ex: Amazon synchrone)
        setScrapStatus(`✅ ${res.inserted || 0} produits récupérés`);
        setProgress(100);
        setQuery(q);
        setPage(1);
        loadProducts(q, 1);
        await addHistory(q, source, res.inserted || 0);
        setTimeout(() => { setScraping(false); setProgress(0); }, 2000);
        return;
      }

      setTaskId(res.task_id);
      setScrapStatus('Scraping en cours…');
      setProgress(30);

      // Polling du statut Celery
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
            // PENDING ou PROGRESS
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

  // Filtrage local (sans nouveau scraping)
  const handleFilter = () => {
    setQuery(inputVal.trim().toLowerCase());
    setPage(1);
    loadProducts(inputVal.trim().toLowerCase(), 1);
  };

  return (
    <div className="pip-tab-inner">

      <div className="pip-tab-header">
        <div>
          <h2 className="pip-tab-title">Recherche de produits</h2>
          <p className="pip-tab-subtitle">{total.toLocaleString('fr-FR')} produits en base</p>
        </div>
      </div>

      {/* ── Barre de recherche / scraping ── */}
      <div className="pip-search-zone">
        <div className="pip-search-row">
          <div className="pip-search-input-wrap">
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

          <select
            className="pip-select"
            value={source}
            onChange={e => setSource(e.target.value)}
            disabled={scraping}
          >
            {SOURCES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

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
            <Search size={14} /> Filtrer base
          </button>
        </div>

        {/* ── Barre de progression ── */}
        {scraping && (
          <div className="pip-progress-zone">
            <div className="pip-progress-bar-bg">
              <div
                className="pip-progress-bar-fill"
                style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
              />
            </div>
            <p className="pip-progress-label">{scrapStatus}</p>
          </div>
        )}
      </div>

      {error   && <div className="pip-error">Erreur : {error}</div>}
      {loading && <div className="pip-loading">Chargement des produits…</div>}

      {/* ── Grille produits ── */}
      {!loading && products.length === 0 && (
        <div className="pip-empty">
          Aucun produit trouvé.
          {query && ` Essayez de scraper "${query}" via l'un des scrapers.`}
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
          <span className="pip-page-info">Page {page} / {pages}</span>
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
