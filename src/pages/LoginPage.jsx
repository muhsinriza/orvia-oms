import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { login } from '../lib/auth'

export default function LoginPage() {
  const { setUser } = useAuth()
  const navigate    = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      setUser(data)
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0 }

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0f1f18;
        }

        /* ── LEFT PANEL ─────────────────────────────────── */
        .login-left {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 56px;
          background: linear-gradient(160deg, #133728 0%, #0f2b1e 40%, #091a11 100%);
          overflow: hidden;
        }

        /* Decorative circles */
        .login-left::before {
          content: '';
          position: absolute;
          width: 480px; height: 480px;
          border-radius: 50%;
          border: 1px solid rgba(74,179,110,.12);
          top: -120px; left: -120px;
          pointer-events: none;
        }
        .login-left::after {
          content: '';
          position: absolute;
          width: 700px; height: 700px;
          border-radius: 50%;
          border: 1px solid rgba(74,179,110,.07);
          top: -240px; left: -240px;
          pointer-events: none;
        }

        .left-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        .left-logo-img {
          width: 40px; height: 40px;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255,255,255,.08);
        }
        .left-logo-img img { width: 100%; height: 100%; object-fit: cover }
        .left-logo-name {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .left-logo-sub {
          font-size: 10px;
          color: rgba(255,255,255,.4);
          letter-spacing: .1em;
          text-transform: uppercase;
          margin-top: 1px;
        }

        .left-hero {
          position: relative;
          z-index: 1;
        }
        .left-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(74,179,110,.15);
          border: 1px solid rgba(74,179,110,.25);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #4ab36e;
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .left-badge::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #4ab36e;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1) }
          50% { opacity: .5; transform: scale(.7) }
        }

        .left-headline {
          font-size: clamp(28px, 3vw, 42px);
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -.02em;
          margin-bottom: 18px;
        }
        .left-headline em {
          font-style: normal;
          color: #4ab36e;
        }

        .left-desc {
          font-size: 15px;
          color: rgba(255,255,255,.5);
          line-height: 1.7;
          max-width: 380px;
          margin-bottom: 48px;
        }

        .left-stats {
          display: flex;
          gap: 32px;
        }
        .stat-item {}
        .stat-num {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -.02em;
          line-height: 1;
        }
        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,.35);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }
        .stat-divider {
          width: 1px;
          background: rgba(255,255,255,.1);
          align-self: stretch;
        }

        .left-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,.2);
        }
        .left-footer a {
          color: rgba(255,255,255,.35);
          text-decoration: none;
          transition: color .2s;
        }
        .left-footer a:hover { color: rgba(255,255,255,.6) }

        /* ── RIGHT PANEL ─────────────────────────────────── */
        .login-right {
          width: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 56px;
          background: #ffffff;
          position: relative;
        }

        .login-form-wrap {
          width: 100%;
          max-width: 360px;
        }

        .form-header {
          margin-bottom: 36px;
        }
        .form-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f1f18;
          letter-spacing: -.02em;
          margin-bottom: 8px;
        }
        .form-sub {
          font-size: 14px;
          color: #7a9080;
          line-height: 1.5;
        }

        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #2d4a38;
          margin-bottom: 7px;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .form-input-wrap {
          position: relative;
        }
        .form-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid #d8e8dc;
          border-radius: 10px;
          font-size: 14px;
          color: #0f1f18;
          background: #f6faf7;
          transition: border-color .2s, background .2s, box-shadow .2s;
          outline: none;
        }
        .form-input::placeholder { color: #a3bfab }
        .form-input:focus {
          border-color: #2d6a4f;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(45,106,79,.1);
        }
        .form-input.has-icon { padding-right: 44px }

        .input-icon-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #7a9080;
          display: flex;
          align-items: center;
          padding: 2px;
          transition: color .2s;
        }
        .input-icon-btn:hover { color: #2d6a4f }

        .form-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #dc2626;
          margin-bottom: 20px;
        }

        .btn-login {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #2d6a4f 0%, #1a4731 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity .2s, transform .15s, box-shadow .2s;
          letter-spacing: .01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(26,71,49,.3);
          margin-top: 8px;
        }
        .btn-login:hover:not(:disabled) {
          opacity: .92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26,71,49,.4);
        }
        .btn-login:active:not(:disabled) { transform: translateY(0) }
        .btn-login:disabled { opacity: .6; cursor: not-allowed }

        .btn-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg) } }

        .form-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #eef4f0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #7a9080;
        }
        .form-footer svg { flex-shrink: 0 }

        /* ── RESPONSIVE ─────────────────────────────────── */
        @media (max-width: 900px) {
          .login-root { flex-direction: column }
          .login-left {
            padding: 36px 28px 40px;
            flex: none;
          }
          .left-headline { font-size: 28px }
          .left-stats { gap: 20px }
          .login-right {
            width: 100%;
            padding: 40px 28px;
          }
        }
      `}</style>

      <div className="login-root">
        {/* ── LEFT ── */}
        <div className="login-left">
          <div className="left-logo">
            <div className="left-logo-img">
              <img src="/logo.svg" alt="Orvia" />
            </div>
            <div>
              <div className="left-logo-name">Orvia OMS</div>
              <div className="left-logo-sub">Order Management System</div>
            </div>
          </div>

          <div className="left-hero">
            <div className="left-badge">Live System</div>
            <h1 className="left-headline">
              Global Trade,<br />
              <em>Digitally Managed</em>
            </h1>
            <p className="left-desc">
              End-to-end visibility of every purchase order, sales contract,
              shipment and packing list — from farm to final delivery.
            </p>
            <div className="left-stats">
              <div className="stat-item">
                <div className="stat-num">3</div>
                <div className="stat-label">Continents</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-num">10+</div>
                <div className="stat-label">Product Lines</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-num">100%</div>
                <div className="stat-label">Traceable</div>
              </div>
            </div>
          </div>

          <div className="left-footer">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 8.5a5.25 5.25 0 0 1-4.375-2.362C3.625 8.3 6.125 7.5 8 7.5s4.375.8 4.375 2.138A5.25 5.25 0 0 1 8 12z" fill="currentColor"/>
            </svg>
            Authorised personnel only &nbsp;·&nbsp;
            <a href="https://orviatropical.com" target="_blank" rel="noreferrer">orviatropical.com</a>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="login-right">
          <div className="login-form-wrap">
            <div className="form-header">
              <h2 className="form-title">Welcome back</h2>
              <p className="form-sub">Sign in to access your operations dashboard.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-input-wrap">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@orviatropical.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input has-icon"
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="form-error">
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? (
                  <><div className="btn-spinner" /> Signing in…</>
                ) : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="form-footer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secured access · Orvia Tropical Sebze Meyve San. ve Tic. Ltd. Şti.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
