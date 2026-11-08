import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Modal from './Modal'
import { api } from './api-client'
type User = { username: string }
type Mode = 'login' | 'register'
const Context = createContext<{user: User | null; loading: boolean; open: (mode: Mode) => void; logout: () => Promise<void>}>({user:null,loading:true,open:()=>{},logout:async()=>{}})
export const useAuth = () => useContext(Context)
export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api<{user: User | null}>('/api/auth/me').then(r => setUser(r.user)).catch(() => {}).finally(() => setLoading(false)) }, [])
  const open = useCallback((next: Mode) => { setError(''); setPassword(''); setMode(next) }, [])
  const close = useCallback(() => { setMode(null); setPassword(''); setError('') }, [])
  const logout = async () => { await api('/api/auth/logout', {}); setUser(null) }
  return <Context.Provider value={{user,loading,open,logout}}>{children}
    {mode && <Modal title={mode === 'register' ? 'JOIN THE EXPLORERS' : 'WELCOME BACK'} onClose={close}>
      <h2>{mode === 'register' ? 'Give your score a name.' : 'Sign in to GalaxyGuessr.'}</h2>
      <p className="modal-intro">{mode === 'register' ? 'Create an account to save your completed score to the public leaderboard and compete across devices. Playing is always open to everyone.' : 'Your leaderboard scores stay with your account.'}</p>
      <form onSubmit={async e => {
        e.preventDefault(); if (busy) return; setBusy(true); setError('')
        try { const r = await api<{user: User}>('/api/auth/' + mode, {username,password}); setUser(r.user); close() }
        catch(e) { setError(e instanceof Error ? e.message : 'Unable to sign in.') }
        finally { setBusy(false) }
      }}>
        <label className="explorer-name">Username<input required autoComplete="username" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_-]+" value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/><small>3-20 letters, numbers, hyphens or underscores. Shown on the leaderboard.</small></label>
        <label className="explorer-name">Password<input required type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><small>At least 8 characters.</small></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="submission-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'}</button><button type="button" className="text-button" disabled={busy} onClick={()=>open(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Already have an account?' : 'Create an account'}</button></div>
        <button type="button" className="text-button" style={{marginTop:20}} onClick={close}>Maybe later</button>
      </form>
    </Modal>}
  </Context.Provider>
}
export function AccountButton() {
  const { user, loading, open, logout } = useAuth()
  const [error, setError] = useState('')
  return <div className="account-actions">{user ? <><span>{user.username}</span><button className="text-button" onClick={()=>{setError('');void logout().catch(()=>setError('Unable to sign out. Try again.'))}}>Sign out</button></> : <button className="text-button" disabled={loading} onClick={()=>open('login')}>Sign in</button>}{error && <span role="alert">{error}</span>}</div>
}
