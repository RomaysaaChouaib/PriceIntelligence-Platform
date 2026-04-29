import axios from 'axios';

const API_BASE = "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Statistiques
export const getStats = async () => {
  const response = await api.get('/stats/');
  return response.data;
};

// Produits
export const getProducts = async (query = "", page = 1, limit = 20) => {
  const response = await api.get('/products/', {
    params: { query, page, limit }
  });
  return response.data;
};

// Search/Scraping
export const searchProducts = async (query) => {
  const response = await api.get(`/search/?query=${query}`);
  return response.data;
};

// Clustering
export const getClustering = async (algo = 'kmeans', eps = 0.5, minSamples = 5) => {
  const url = algo === 'dbscan'
    ? `/clustering/?algo=dbscan&eps=${eps}&min_samples=${minSamples}`
    : `/clustering/?algo=kmeans`;
  const response = await api.get(url);
  return response.data;
};

// Anomalies
export const getAnomalies = async () => {
  const response = await api.get('/anomalies/');
  return response.data;
};

// Association
export const getAssociation = async () => {
  const response = await api.get('/association/');
  return response.data;
};

export default api;