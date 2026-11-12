import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(() => (mode === 'signin' ? signIn(email, password) : signUp(email, password)))
  }

  return (
    <div className="login card">
      <h1>{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h1>
      <p className="muted">Vos listes d'armée sont enregistrées dans votre compte et accessibles partout.</p>
      <button className="btn wide" onClick={() => run(signInWithGoogle)} disabled={busy}>
        Continuer avec Google
      </button>
      <div className="sep">ou</div>
      <form onSubmit={submit} className="stack">
        <label>
          Adresse email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="btn primary wide" disabled={busy}>
          {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
        </button>
      </form>
      <div className="row between small">
        <button className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Pas de compte ? En créer un' : "J'ai déjà un compte"}
        </button>
        {mode === 'signin' && (
          <button
            className="link"
            onClick={() =>
              email
                ? run(async () => {
                    await resetPassword(email)
                    setInfo('Un email de réinitialisation a été envoyé.')
                  })
                : setError("Saisissez d'abord votre adresse email.")
            }
          >
            Mot de passe oublié
          </button>
        )}
      </div>
    </div>
  )
}
