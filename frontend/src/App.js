import { useState } from "react";

function App() {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/search/");
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.log("Erreur:", error);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Price Intelligence Platform</h1>

      <button className="btn" onClick={loadProducts}>
        Load Products
      </button>

      <div className="product-list">
        {products.map((item, index) => (
          <div className="card" key={index}>
            <h3>{item.title}</h3>
            <p>{item.price} MAD</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;