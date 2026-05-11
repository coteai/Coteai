import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; info: React.ErrorInfo | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('🔴 [ErrorBoundary] Erro capturado:', error);
    console.error('🔴 [ErrorBoundary] Info do componente:', info.componentStack);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#020617',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', fontFamily: 'monospace', color: '#f8fafc', zIndex: 9999
        }}>
          <div style={{
            maxWidth: '800px', width: '100%',
            background: '#0f172a', border: '1px solid #ef4444',
            borderRadius: '12px', padding: '2rem',
            boxShadow: '0 0 40px rgba(239,68,68,0.2)'
          }}>
            <h1 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              ⚠️ Erro de Renderização
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Um erro aconteceu ao renderizar a aplicação. Detalhes abaixo:
            </p>
            <div style={{
              background: '#020617', borderRadius: '8px', padding: '1rem',
              border: '1px solid #1e293b', marginBottom: '1rem'
            }}>
              <p style={{ color: '#f87171', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {this.state.error?.name}: {this.state.error?.message}
              </p>
              <pre style={{
                color: '#64748b', fontSize: '0.75rem', overflow: 'auto',
                maxHeight: '300px', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
              }}>
                {this.state.error?.stack}
              </pre>
            </div>
            {this.state.info && (
              <div style={{
                background: '#020617', borderRadius: '8px', padding: '1rem',
                border: '1px solid #1e293b'
              }}>
                <p style={{ color: '#7dd3fc', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Stack de Componentes:</p>
                <pre style={{
                  color: '#475569', fontSize: '0.7rem', overflow: 'auto',
                  maxHeight: '200px', whiteSpace: 'pre-wrap'
                }}>
                  {this.state.info.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem', padding: '0.75rem 2rem',
                background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold'
              }}
            >
              🔄 Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

