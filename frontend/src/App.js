import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchProducts = async () => {
    if (!query) return; // Évite de chercher si le champ est vide
    setLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/search/?query=${query}`
      );
      const data = await response.json();
      
      // On s'assure de récupérer la liste des produits
      setProducts(data.products || []);
    } catch (error) {
      console.error("Erreur de recherche:", error);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1 className="title">Jumia Data Scraper</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Ex: laptop, pc portable..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchProducts()} // Recherche avec Entrée
        />
        <button onClick={searchProducts} disabled={loading}>
          {loading ? "Chargement..." : "Rechercher"}
        </button>
      </div>

      <div className="status-bar">
        <p><strong>Total trouvés :</strong> {products.length}</p>
      </div>

      <div className="product-list">
        {products.map((item, index) => (
          <div className="card" key={index}>
            <div className="badge">Page {item.page}</div>
            
            {item.image && (
              <img
                src={item.image}
                alt={item.title}
                className="product-img"
              />
            )}

            <div className="card-content">
              <span className="brand-label">{item.brand}</span>
              <h3>{item.title}</h3>
              <p className="price">{item.price} MAD</p>
              
              <div className="card-footer">
                <small>Source: {item.source}</small>
                <a href={item.link} target="_blank" rel="noreferrer" className="view-btn">
                  Voir sur Jumia
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;