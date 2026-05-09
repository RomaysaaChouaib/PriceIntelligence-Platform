import axios from 'axios';

const API_BASE = "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur JWT — ajoute le token automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Authentification ────────────────────────────────────────────────────────
export const login = async (username, password) => {
  const res = await api.post('/auth/login/', { username, password });
  return res.data;
};

// ── Produits ────────────────────────────────────────────────────────────────
export const getProducts = async (query = "", page = 1, limit = 20) => {
  const res = await api.get('/products/', { params: { query, page, limit } });
  return res.data;
};

// ── Statistiques ─────────────────────────────────────────────────────────────
export const getStats = async () => {
  const res = await api.get('/stats/');
  return res.data;
};

// ── Scraping (Jumia — Celery tâche asynchrone) ──────────────────────────────
export const startScraping = async (query, source = 'jumia') => {
  const endpoints = {
    jumia:      `/scrape/jumia/?query=${encodeURIComponent(query)}`,
    amazon:     `/scrape/amazon/?query=${encodeURIComponent(query)}`,
    aliexpress: `/scrape/aliexpress/?query=${encodeURIComponent(query)}`,
  };
  const res = await api.get(endpoints[source] || endpoints.jumia);
  return res.data; // { task_id, message }
};

export const checkScrapingStatus = async (taskId) => {
  const res = await api.get(`/status/${taskId}/`);
  return res.data; // { status: 'PENDING'|'PROGRESS'|'SUCCESS', result }
};

// ── Clustering ───────────────────────────────────────────────────────────────
export const getClustering = async (algo = 'kmeans', eps = 2.0, minSamples = 30) => {
  const url = algo === 'dbscan'
    ? `/clustering/?algo=dbscan&eps=${eps}&min_samples=${minSamples}`
    : `/clustering/?algo=kmeans`;
  const res = await api.get(url);
  return res.data;
};

// ── Anomalies ────────────────────────────────────────────────────────────────
export const getAnomalies = async () => {
  const res = await api.get('/anomalies/');
  return res.data;
};

// ── Règles d'association ──────────────────────────────────────────────────────
export const getAssociation = async () => {
  const res = await api.get('/association/');
  return res.data;
};

export const getAssociationAccessories = async () => {
  const res = await api.get('/association/accessories/');
  return res.data;
};

// ── PCA (réduction de dimension) ─────────────────────────────────────────────
export const getPCA = async () => {
  const res = await api.get('/pca/');
  return res.data;
};

// ── Export CSV ───────────────────────────────────────────────────────────────
export const exportCSV = () => {
  // Ouvre directement le téléchargement dans le navigateur
  window.open(`${API_BASE}/export/csv/`, '_blank');
};

// ── Historique des recherches ─────────────────────────────────────────────────
export const getHistory = async () => {
  const res = await api.get('/history/');
  return res.data;
};

export const addHistory = async (query, source, count) => {
  const res = await api.post('/history/', { query, source, count });
  return res.data;
};

export const clearHistory = async () => {
  const res = await api.delete('/history/');
  return res.data;
};

export default api;