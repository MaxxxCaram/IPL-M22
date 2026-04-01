import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import './App.css';

function App() {
  const [treatments, setTreatments] = useState([]);
  const [stats, setStats] = useState({ total: 0, success: 0, accuracy: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/treatments');
      setTreatments(res.data);
      
      const successful = res.data.filter(t => t.outcome === 'success').length;
      const total = res.data.length;
      setStats({
        total: total,
        success: successful,
        accuracy: total > 0 ? ((successful / total) * 100).toFixed(1) : 0
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">M22 AI Assistant</div>
        <nav>
          <div className="nav-item active"><Activity size={20} /> Dashboard</div>
          <div className="nav-item"><Users size={20} /> Pacientes</div>
          <div className="nav-item"><TrendingUp size={20} /> Analytics</div>
          <div className="nav-item" onClick={() => window.open('/terms', '_blank')}>
            <AlertTriangle size={20} /> Términos
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <h1>Resumen del Sistema</h1>
          <p style={{color: 'var(--text-muted)'}}>Monitoreo de tratamientos y aprendizaje continuo de la IA.</p>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Tratamientos Totales</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: 'var(--success)'}}>{stats.success}</div>
            <div className="stat-label">Éxitos Confirmados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: 'var(--primary)'}}>{stats.accuracy}%</div>
            <div className="stat-label">Tasa de Precisión</div>
          </div>
        </div>

        <div className="chart-container">
          <h3>Tratamientos Recientes</h3>
          <table className="recent-table">
            <thead>
              <tr>
                <th>Diagnóstico</th>
                <th>Parámetros</th>
                <th>Resultado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((t) => (
                <tr key={t.id}>
                  <td>{t.diagnosis}</td>
                  <td>{t.recommended_parameters.substring(0, 50)}...</td>
                  <td>
                    <span className={`status-badge status-${t.outcome === 'success' ? 'success' : 'pending'}`}>
                      {t.outcome || 'Pendiente'}
                    </span>
                  </td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {treatments.length === 0 && (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>Aún no hay tratamientos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;
