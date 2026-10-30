"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  AudioLinesIcon,
  FileTextIcon,
  ImageIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { Wordmark } from "@/components/playground/brand"
import {
  usePlayground,
  type ChatMessage,
} from "@/components/playground/playground-provider"
import { DROP_PROMPT, INTENT_STATUS } from "@/lib/mock-agent"
import { DEMO_FILES, SUGGESTED_PROMPTS } from "@/lib/mock-data"
import { isEmpty, type DroppedFile } from "@/lib/release"

export function AgentSidebar() {
  const { release, messages, pending, sendToAgent, startOver, composerRef } =
    usePlayground()
  const [text, setText] = React.useState("")
  const [attached, setAttached] = React.useState<DroppedFile[]>([])
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
  }, [messages.length, pending])

  function submit(value: string, files: DroppedFile[] = attached) {
    const prompt = value.trim() || (files.length ? DROP_PROMPT : "")
    if (!prompt || pending) return
    sendToAgent(prompt, files)
    setText("")
    setAttached([])
  }

  const suggestions = isEmpty(release)
    ? SUGGESTED_PROMPTS.start
    : SUGGESTED_PROMPTS.draft

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center gap-2 border-b px-4 py-3">
        <Wordmark />
        <span className="text-sm text-muted-foreground">Onstage agent</span>
        <Badge variant="outline" className="ml-auto text-muted-foreground">
          Mock
        </Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Start over"
          title="Start over"
          onClick={startOver}
        >
          <RotateCcwIcon />
        </Button>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-4 py-4">
        {messages.length === 0 && (
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>
              Describe the release, or drop every file on the page at once. I
              lay out the page the way fans will see it and suggest extras that
              fit the record.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              disabled={Boolean(pending)}
              onClick={() => submit("", DEMO_FILES)}
            >
              <PaperclipIcon />
              Use the demo files
            </Button>
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {pending && (
          <div className="flex items-center gap-2 text-sm text-ai">
            <LoaderCircleIcon className="size-4 animate-spin" />
            {INTENT_STATUS[pending]}…
          </div>
        )}
        <div ref={endRef} />
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t p-3">
        {!pending && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="xs"
                className="h-auto max-w-full shrink py-1 text-left whitespace-normal"
                onClick={() => submit(s, [])}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        <form
          className="grid gap-2 rounded-lg border bg-background p-2 focus-within:border-ai/70"
          onSubmit={(e) => {
            e.preventDefault()
            submit(text)
          }}
        >
          {attached.length > 0 && (
            <div className="flex items-center gap-2">
              <FileSummary files={attached} />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remove files"
                onClick={() => setAttached([])}
              >
                <XIcon />
              </Button>
            </div>
          )}
          <Textarea
            ref={composerRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault()
                submit(text)
              }
            }}
            placeholder="Describe the release, or ask for a change…"
            className="max-h-40 min-h-12 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setAttached(DEMO_FILES)}
            >
              <PaperclipIcon />
              Attach demo files
            </Button>
            <Button
              type="submit"
              size="icon-sm"
              aria-label="Send"
              disabled={Boolean(pending) || (!text.trim() && !attached.length)}
            >
              <ArrowUpIcon />
            </Button>
          </div>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}

function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="grid justify-items-end gap-1.5">
        {message.files && message.files.length > 0 && (
          <FileSummary files={message.files} />
        )}
        <div className="max-w-[90%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 text-sm">
      <SparklesIcon className="mt-0.5 size-4 text-ai" />
      <div className="whitespace-pre-wrap text-foreground/90">
        {message.text}
      </div>
    </div>
  )
}

const KIND_ICON = {
  audio: AudioLinesIcon,
  image: ImageIcon,
  text: FileTextIcon,
} as const

function FileSummary({ files }: { files: DroppedFile[] }) {
  const counts = (["audio", "image", "text"] as const)
    .map((kind) => ({ kind, n: files.filter((f) => f.kind === kind).length }))
    .filter((c) => c.n > 0)

  return (
    <div
      className="flex items-center gap-2.5 text-xs text-muted-foreground"
      title={files.map((f) => f.name).join("\n")}
    >
      {counts.map(({ kind, n }) => {
        const Icon = KIND_ICON[kind]
        return (
          <span key={kind} className="flex items-center gap-1">
            <Icon className="size-3.5" />
            {n}
          </span>
        )
      })}
      <span>
        {files.length} file{files.length === 1 ? "" : "s"}
      </span>
    </div>
  )
}
