"use client"

import { RotateCcwIcon } from "lucide-react"

import { Thread } from "@/components/assistant-ui/elements/thread.aui"
import { Button } from "@/components/ui/button"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"
import { useAgent } from "@/components/playground/agent-runtime"
import { Wordmark } from "@/components/playground/brand"

export function AgentSidebar() {
  const { startOver } = useAgent()

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center gap-2 border-b px-4 py-3">
        <Wordmark />
        <span className="text-sm text-muted-foreground">Onstage agent</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label="Start over"
          title="Start over"
          onClick={startOver}
        >
          <RotateCcwIcon />
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <Thread components={{ Welcome: AgentWelcome }} autoFocus={false} />
      </SidebarContent>
    </Sidebar>
  )
}

function AgentWelcome() {
  return (
    <div className="mb-4 grid gap-3 px-2 text-sm text-muted-foreground">
      <p>
        Describe the release, or drop every file on the page at once. I lay out
        the page the way fans will see it and suggest extras that fit the
        record.
      </p>
    </div>
  )
}
