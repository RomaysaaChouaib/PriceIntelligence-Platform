import React, { useState } from 'react';
import { Search } from 'lucide-react';

function SearchBar({ placeholder, onSearch, defaultValue = "" }) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pip-search-bar">
      <div className="pip-search-input-wrap">
        <Search className="pip-search-icon" size={18} />
        <input
          type="text"
          placeholder={placeholder || "Rechercher..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pip-search-input"
        />
      </div>
      <button type="submit" className="pip-search-btn">
        Rechercher
      </button>
    </form>
  );
}

export default SearchBar;