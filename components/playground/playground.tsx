import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AgentRuntime } from "@/components/playground/agent-runtime"
import { AgentSidebar } from "@/components/playground/agent-sidebar"
import { BuilderToolbar } from "@/components/playground/builder-toolbar"
import { PlaygroundProvider } from "@/components/playground/playground-provider"
import { ReleaseCanvas } from "@/components/playground/release-page"

/** Agent chat on the left, the release being built on the right. */
export function Playground() {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
    >
      <PlaygroundProvider>
        <AgentRuntime>
          <AgentSidebar />
          <SidebarInset className="h-svh overflow-hidden">
            <BuilderToolbar />
            <ReleaseCanvas />
          </SidebarInset>
        </AgentRuntime>
      </PlaygroundProvider>
    </SidebarProvider>
  )
}
