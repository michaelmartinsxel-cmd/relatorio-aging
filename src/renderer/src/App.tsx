import { useAppStore } from './state/store'
import UploadScreen from './components/UploadScreen'
import MappingDialog from './components/MappingDialog'
import AgingDateBar from './components/AgingDateBar'
import StatusScreen from './components/StatusScreen'
import ErrorScreen from './components/ErrorScreen'
import ReportShell from './components/ReportShell'

export default function App(): JSX.Element {
  const stage = useAppStore((s) => s.stage)

  if (stage === 'upload' || stage === 'sheet') return <UploadScreen />
  if (stage === 'mapping') return <MappingDialog />
  if (stage === 'agingDate') return <AgingDateBar />
  if (stage === 'processing') return <StatusScreen />
  if (stage === 'error') return <ErrorScreen />
  return <ReportShell />
}
