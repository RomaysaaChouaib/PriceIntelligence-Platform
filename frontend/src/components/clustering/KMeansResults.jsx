import React from 'react';

function KMeansResults({ kScores, bestK }) {
  // Normaliser les scores pour les barres visuelles
  const maxSilhouette = Math.max(...kScores.map(s => s.silhouette));
  const maxDB = Math.max(...kScores.map(s => s.davies_bouldin));
  const minInertia = Math.min(...kScores.map(s => s.inertia));
  const maxInertia = Math.max(...kScores.map(s => s.inertia));

  const normalize = (value, min, max) => {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  };

  return (
    <div className="pip-kmeans-results">
      <div className="pip-kmeans-header">
        <h3>🔍 Recherche du k optimal</h3>
        {bestK && (
          <span className="pip-best-k-badge">
            ⭐ k = {bestK} recommandé
          </span>
        )}
      </div>

      <div className="pip-k-grid">
        {kScores.map((score, index) => {
          const isBest = score.k === bestK;
          const silhouettePercent = normalize(score.silhouette, 0, maxSilhouette);
          const dbPercent = normalize(score.davies_bouldin, 0, maxDB);
          const inertiaPercent = 100 - normalize(score.inertia, minInertia, maxInertia);

          return (
            <div 
              key={index} 
              className={`pip-k-card ${isBest ? 'pip-k-card-best' : ''}`}
            >
              {/* En-tête de la carte */}
              <div className="pip-k-card-header">
                <div className="pip-k-value">
                  <span className="pip-k-number">k = {score.k}</span>
                  {isBest && <span className="pip-k-star">⭐</span>}
                </div>
                {isBest && <span className="pip-k-recommended">Recommandé</span>}
              </div>

              {/* Métriques visuelles */}
              <div className="pip-k-metrics">
                
                {/* Silhouette Score */}
                <div className="pip-k-metric">
                  <div className="pip-k-metric-label">
                    <span className="pip-metric-name">Silhouette ↑</span>
                    <span className="pip-metric-value">{score.silhouette.toFixed(3)}</span>
                  </div>
                  <div className="pip-k-bar-bg">
                    <div 
                      className="pip-k-bar-fill pip-bar-silhouette"
                      style={{ width: `${silhouettePercent}%` }}
                      title={`Silhouette: ${score.silhouette.toFixed(3)}`}
                    ></div>
                  </div>
                </div>

                {/* Davies-Bouldin */}
                <div className="pip-k-metric">
                  <div className="pip-k-metric-label">
                    <span className="pip-metric-name">Davies-Bouldin ↓</span>
                    <span className="pip-metric-value">{score.davies_bouldin.toFixed(3)}</span>
                  </div>
                  <div className="pip-k-bar-bg">
                    <div 
                      className="pip-k-bar-fill pip-bar-db"
                      style={{ width: `${100 - dbPercent}%` }}
                      title={`Davies-Bouldin: ${score.davies_bouldin.toFixed(3)}`}
                    ></div>
                  </div>
                </div>

                {/* Inertie */}
                <div className="pip-k-metric">
                  <div className="pip-k-metric-label">
                    <span className="pip-metric-name">Inertie ↓</span>
                    <span className="pip-metric-value">{Math.round(score.inertia).toLocaleString()}</span>
                  </div>
                  <div className="pip-k-bar-bg">
                    <div 
                      className="pip-k-bar-fill pip-bar-inertia"
                      style={{ width: `${inertiaPercent}%` }}
                      title={`Inertie: ${Math.round(score.inertia).toLocaleString()}`}
                    ></div>
                  </div>
                </div>

              </div>

              {/* Score composite */}
              <div className="pip-k-score-summary">
                <span className="pip-score-label">Score global :</span>
                <div className="pip-score-value">
                  {((score.silhouette / (score.davies_bouldin + 0.01)) * 100).toFixed(1)}
                  <span className="pip-score-unit">/100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="pip-k-legend">
        <div className="pip-legend-item">
          <span className="pip-legend-color pip-bar-silhouette"></span>
          <span>Silhouette (plus élevé = mieux)</span>
        </div>
        <div className="pip-legend-item">
          <span className="pip-legend-color pip-bar-db"></span>
          <span>Davies-Bouldin (plus bas = mieux)</span>
        </div>
        <div className="pip-legend-item">
          <span className="pip-legend-color pip-bar-inertia"></span>
          <span>Inertie (plus bas = mieux)</span>
        </div>
      </div>
    </div>
  );
}

export default KMeansResults;