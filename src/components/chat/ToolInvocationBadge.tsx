"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>,
  isDone: boolean
): string {
  const filename = args.path ? basename(args.path as string) : null;

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return isDone ? `Created ${filename}` : `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return isDone ? `Edited ${filename}` : `Editing ${filename}`;
      case "view":
        return isDone ? `Read ${filename}` : `Reading ${filename}`;
      case "undo_edit":
        return isDone ? `Undid edit in ${filename}` : `Undoing edit in ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    const newFilename = args.new_path ? basename(args.new_path as string) : null;
    switch (args.command) {
      case "rename":
        return isDone
          ? `Renamed ${filename} to ${newFilename}`
          : `Renaming ${filename} to ${newFilename}`;
      case "delete":
        return isDone ? `Deleted ${filename}` : `Deleting ${filename}`;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isDone = toolInvocation.state === "result" && !!toolInvocation.result;
  const label = getToolLabel(
    toolInvocation.toolName,
    (toolInvocation.args ?? {}) as Record<string, unknown>,
    isDone
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
