import { useAppStore } from '../state/store'
import type { PipelineStage } from '@shared/ipc-contract'

const STEPS: { stage: PipelineStage; label: string }[] = [
  { stage: 'reading', label: 'Reading Excel' },
  { stage: 'validating', label: 'Validating Data' },
  { stage: 'calculating', label: 'Calculating Aging' },
  { stage: 'reconciling', label: 'Reconciling' },
  { stage: 'generating', label: 'Generating Report' },
  { stage: 'ready', label: 'Ready' }
]

export default function StatusScreen(): JSX.Element {
  const progressStage = useAppStore((s) => s.progressStage)
  const currentIndex = STEPS.findIndex((s) => s.stage === progressStage)

  return (
    <div className="center-screen">
      <div className="card upload-card">
        <h1 style={{ fontSize: 18 }}>Processing…</h1>
        <div className="status-list">
          {STEPS.map((step, i) => {
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''
            return (
              <div className={`status-item ${state}`} key={step.stage}>
                <span className="status-dot" />
                {step.label}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
