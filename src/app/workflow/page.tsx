import Header from '@/components/layout/Header'
import LeftSidebar from '@/components/layout/LeftSidebar'
import RightSidebar from '@/components/layout/RightSidebar'
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas'

export default function WorkflowPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 relative">
          <WorkflowCanvas />
        </main>
        <RightSidebar />
      </div>
    </div>
  )
}
