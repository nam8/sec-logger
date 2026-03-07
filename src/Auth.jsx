import { useState } from 'react'
import { supabase } from './supabase'

/**
 * Authentication screen with safe-area padding for iPhones with notches.
 */
export default function Auth({ dark }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const bg = dark ? '#1a1a1e' : '#faf9f7'
  const text = dark ? '#e8e6e1' : '#2c2c2c'
  const muted = dark ? '#8a8a8e' : '#7a7a7e'
  const accent = dark ? '#c9a96e' : '#8b6914'
  const iBg = dark ? '#2f2f34' : '#f5f4f0'
  const iBdr = dark ? '#404046' : '#ddd9d0'

  const handleSubmit = async () => {
    setLoading(true); setError(null); setMessage(null)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    border: `1px solid ${iBdr}`, borderRadius: 10,
    background: iBg, color: text,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '1.1rem', outline: 'none', marginBottom: 14,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: bg,
      padding: 'calc(env(safe-area-inset-top, 20px) + 20px) 24px env(safe-area-inset-bottom, 20px)',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />

      <h1 style={{ fontSize: '2rem', fontWeight: 300, color: text, margin: '0 0 6px', letterSpacing: '0.04em' }}>
        Service Logger
      </h1>
      <p style={{ fontSize: '0.85rem', color: muted, margin: '0 0 32px', fontFamily: '-apple-system, sans-serif' }}>
        Scottish Episcopal Church
      </p>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} style={inputStyle} />

        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          style={inputStyle} />

        {error && (
          <p style={{ fontSize: '0.85rem', color: '#c0392b', margin: '0 0 14px', fontFamily: '-apple-system, sans-serif' }}>
            {error}
          </p>
        )}
        {message && (
          <p style={{ fontSize: '0.85rem', color: accent, margin: '0 0 14px', fontFamily: '-apple-system, sans-serif' }}>
            {message}
          </p>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%', padding: '14px', marginBottom: 14,
            background: accent, color: '#fff', border: 'none',
            borderRadius: 12, fontSize: '1.05rem', fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            letterSpacing: '0.05em', opacity: loading ? 0.7 : 1,
          }}>
          {loading ? '…' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>

        <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}
          style={{
            width: '100%', padding: '12px',
            background: 'none', border: 'none',
            color: muted, fontSize: '0.85rem', cursor: 'pointer',
            fontFamily: '-apple-system, sans-serif',
          }}>
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </div>
    </div>
  )
}
