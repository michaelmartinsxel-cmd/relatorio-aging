import { useAppStore } from '../state/store'

export default function ErrorScreen(): JSX.Element {
  const errorMessage = useAppStore((s) => s.errorMessage)
  const reset = useAppStore((s) => s.reset)

  return (
    <div className="center-screen">
      <div className="card upload-card">
        <h1 style={{ fontSize: 18, color: 'var(--danger)' }}>Something went wrong</h1>
        <p className="error-text">{errorMessage}</p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={reset}>
            Start Over
          </button>
        </div>
      </div>
    </div>
  )
}
