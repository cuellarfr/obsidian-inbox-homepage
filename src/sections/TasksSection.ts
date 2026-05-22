import { App, TFile } from "obsidian";

interface TasksSectionOptions {
  title: string;
  filePath: string;
  columns: string[];
}

interface Task {
  text: string;
  done: boolean;
}

export async function renderTasksSection(
  container: HTMLElement,
  app: App,
  options: TasksSectionOptions
) {
  const section = container.createEl("div", { cls: "hp-section hp-tasks-section" });

  section.createEl("h2", { text: options.title });

  const file = app.vault.getAbstractFileByPath(options.filePath);
  if (!(file instanceof TFile)) {
    section.createEl("p", { text: `File not found: ${options.filePath}`, cls: "hp-error" });
    return;
  }

  const content = await app.vault.read(file);
  const tasks = parseKanbanTasks(content, options.columns);

  if (tasks.length === 0) {
    section.createEl("p", { text: "Nothing in focus.", cls: "hp-empty" });
  } else {
    const list = section.createEl("ul", { cls: "hp-tasks-list" });

    for (const task of tasks) {
      const item = list.createEl("li", { cls: "hp-tasks-item" });

      const checkbox = item.createEl("input", { type: "checkbox", cls: "hp-tasks-checkbox" });
      checkbox.checked = task.done;
      checkbox.disabled = true;

      const label = item.createEl("span", { cls: "hp-tasks-label" });
      renderTaskText(label, task.text, options.filePath, app);

      item.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).tagName !== "A") {
          app.workspace.getLeaf(false).openFile(file);
        }
      });
    }
  }

  const footer = section.createEl("div", { cls: "hp-tasks-footer" });
  const openLink = footer.createEl("a", {
    text: `Open ${file.basename} →`,
    cls: "hp-tasks-open-link",
  });
  openLink.addEventListener("click", (e) => {
    e.preventDefault();
    app.workspace.getLeaf(false).openFile(file);
  });
}

function renderTaskText(el: HTMLElement, text: string, sourcePath: string, app: App) {
  // Handle [[Link|Display]] and [[Link]] wikilinks
  const wikilinkRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = wikilinkRe.exec(text)) !== null) {
    if (match.index > last) {
      el.appendText(text.slice(last, match.index));
    }
    const target = match[1];
    const display = match[2] ?? target;
    const link = el.createEl("a", { text: display, cls: "hp-tasks-wikilink" });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      app.workspace.openLinkText(target, sourcePath);
    });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    el.appendText(text.slice(last));
  }
}

function parseKanbanTasks(content: string, columns: string[]): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");
  let inTarget = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      const heading = trimmed.slice(3);
      inTarget = columns.some((col) => heading === col);
      continue;
    }

    if (!inTarget) continue;

    // Only match top-level tasks (no leading whitespace)
    const incomplete = line.match(/^- \[ \] (.+)$/);
    if (incomplete) {
      tasks.push({ text: incomplete[1].trim(), done: false });
      continue;
    }

    const complete = line.match(/^- \[x\] (.+)$/i);
    if (complete) {
      tasks.push({ text: complete[1].trim(), done: true });
    }
  }

  return tasks;
}
