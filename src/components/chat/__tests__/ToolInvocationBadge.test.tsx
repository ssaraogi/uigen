import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("getToolLabel", () => {
  describe("str_replace_editor", () => {
    test("create in-progress", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: "src/App.jsx" }, false)).toBe("Creating App.jsx");
    });

    test("create done", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: "src/App.jsx" }, true)).toBe("Created App.jsx");
    });

    test("str_replace in-progress", () => {
      expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/Counter.tsx" }, false)).toBe("Editing Counter.tsx");
    });

    test("str_replace done", () => {
      expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/Counter.tsx" }, true)).toBe("Edited Counter.tsx");
    });

    test("insert in-progress", () => {
      expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/index.ts" }, false)).toBe("Editing index.ts");
    });

    test("insert done", () => {
      expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/index.ts" }, true)).toBe("Edited index.ts");
    });

    test("view in-progress", () => {
      expect(getToolLabel("str_replace_editor", { command: "view", path: "src/utils.ts" }, false)).toBe("Reading utils.ts");
    });

    test("view done", () => {
      expect(getToolLabel("str_replace_editor", { command: "view", path: "src/utils.ts" }, true)).toBe("Read utils.ts");
    });

    test("undo_edit in-progress", () => {
      expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "src/App.jsx" }, false)).toBe("Undoing edit in App.jsx");
    });

    test("undo_edit done", () => {
      expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "src/App.jsx" }, true)).toBe("Undid edit in App.jsx");
    });
  });

  describe("file_manager", () => {
    test("rename in-progress", () => {
      expect(getToolLabel("file_manager", { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" }, false)).toBe("Renaming Old.tsx to New.tsx");
    });

    test("rename done", () => {
      expect(getToolLabel("file_manager", { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" }, true)).toBe("Renamed Old.tsx to New.tsx");
    });

    test("delete in-progress", () => {
      expect(getToolLabel("file_manager", { command: "delete", path: "src/Unused.tsx" }, false)).toBe("Deleting Unused.tsx");
    });

    test("delete done", () => {
      expect(getToolLabel("file_manager", { command: "delete", path: "src/Unused.tsx" }, true)).toBe("Deleted Unused.tsx");
    });
  });

  test("unknown tool falls back to tool name", () => {
    expect(getToolLabel("some_other_tool", {}, false)).toBe("some_other_tool");
    expect(getToolLabel("some_other_tool", {}, true)).toBe("some_other_tool");
  });
});

describe("ToolInvocationBadge", () => {
  test("shows spinner when in-progress", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          state: "call",
          toolCallId: "1",
          toolName: "str_replace_editor",
          args: { command: "create", path: "src/App.jsx" },
        }}
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
    // green dot should not be present
    const dot = document.querySelector(".bg-emerald-500");
    expect(dot).toBeNull();
  });

  test("shows green dot when done", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          state: "result",
          toolCallId: "1",
          toolName: "str_replace_editor",
          args: { command: "create", path: "src/App.jsx" },
          result: "ok",
        }}
      />
    );
    expect(screen.getByText("Created App.jsx")).toBeDefined();
    const dot = document.querySelector(".bg-emerald-500");
    expect(dot).toBeDefined();
  });

  test("shows correct label for file_manager rename", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          state: "result",
          toolCallId: "2",
          toolName: "file_manager",
          args: { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" },
          result: "ok",
        }}
      />
    );
    expect(screen.getByText("Renamed Old.tsx to New.tsx")).toBeDefined();
  });

  test("falls back to tool name for unknown tools", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          state: "call",
          toolCallId: "3",
          toolName: "unknown_tool",
          args: {},
        }}
      />
    );
    expect(screen.getByText("unknown_tool")).toBeDefined();
  });
});
