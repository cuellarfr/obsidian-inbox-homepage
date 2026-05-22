import { App, Component, MarkdownRenderer, TFile, normalizePath } from "obsidian";

export async function renderNotesWall(container: HTMLElement, app: App, component: Component) {
  const section = container.createEl("div", { cls: "hp-section hp-notes-section" });

  // Compose form
  const form = section.createEl("div", { cls: "hp-compose-form" });

  const textarea = form.createEl("textarea", {
    cls: "hp-compose-textarea",
    attr: { placeholder: "Your thoughts…", rows: "4" },
  }) as HTMLTextAreaElement;

  const formFooter = form.createEl("div", { cls: "hp-compose-footer" });

  const tagsInput = formFooter.createEl("input", {
    type: "text",
    placeholder: "Add tags (comma-separated)…",
    cls: "hp-compose-tags",
  }) as HTMLInputElement;

  const submitBtn = formFooter.createEl("button", { cls: "hp-compose-submit" });
  submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  const createNote = async () => {
    const content = textarea.value.trim();
    if (!content) return;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fileTs = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const rawTags = tagsInput.value.trim();
    const tags = rawTags ? rawTags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const tagsFm = tags.length > 0 ? `[${tags.map((t) => `"${t}"`).join(", ")}]` : `[]`;

    const noteContent = `---\ntags: ${tagsFm}\ncreated: ${now.toISOString()}\n---\n\n${content}`;

    const path = normalizePath(`_notes/Note - ${fileTs}.md`);
    await app.vault.create(path, noteContent);

    textarea.value = "";
    tagsInput.value = "";
  };

  submitBtn.addEventListener("click", createNote);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) createNote();
  });

  // Notes feed
  const feed = section.createEl("div", { cls: "hp-notes-feed" });

  const notes = app.vault
    .getFiles()
    .filter((f) => f.path.startsWith("_notes/"))
    .sort((a, b) => b.stat.mtime - a.stat.mtime);

  if (notes.length === 0) {
    feed.createEl("p", { text: "No notes yet. Share your first thought above.", cls: "hp-empty" });
    return;
  }

  for (const note of notes.slice(0, 10)) {
    const card = feed.createEl("div", { cls: "hp-feed-card" });

    // Header: timestamp + open button
    const cardHeader = card.createEl("div", { cls: "hp-feed-card-header" });
    cardHeader.createEl("span", {
      text: `Updated at ${new Date(note.stat.mtime).toLocaleString()}`,
      cls: "hp-feed-card-time",
    });

    // Read content
    const raw = await app.vault.read(note);

    // Parse frontmatter tags
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    let tags: string[] = [];
    if (fmMatch) {
      const tagsMatch = fmMatch[1].match(/tags:\s*\[([^\]]*)\]/);
      if (tagsMatch && tagsMatch[1].trim()) {
        tags = tagsMatch[1]
          .split(",")
          .map((t) => t.trim().replace(/["']/g, ""))
          .filter(Boolean);
      }
    }

    if (tags.length > 0) {
      const tagsRow = card.createEl("div", { cls: "hp-feed-card-tags" });
      for (const tag of tags) {
        tagsRow.createEl("span", { text: tag, cls: "hp-feed-card-tag" });
      }
    }

    // Render body (strip frontmatter, truncate to 500 chars)
    let body = raw.replace(/^---\n[\s\S]*?\n---\n\n?/, "").trim();
    if (body.length > 500) {
      body = body.slice(0, 500);
      const lastSpace = body.lastIndexOf(" ");
      if (lastSpace > 400) body = body.slice(0, lastSpace);
      body += "…";
    }
    const contentEl = card.createEl("div", { cls: "hp-feed-card-content" });
    await MarkdownRenderer.render(app, body, contentEl, note.path, component);

    card.addEventListener("click", () => {
      app.workspace.getLeaf(false).openFile(note);
    });
  }

  const baseFile = app.vault.getAbstractFileByPath("Notes.base");
  const footer = section.createEl("div", { cls: "hp-tasks-footer" });
  const openLink = footer.createEl("a", {
    text: "Open Notes.base →",
    cls: "hp-tasks-open-link",
  });
  if (baseFile instanceof TFile) {
    openLink.addEventListener("click", (e) => {
      e.preventDefault();
      app.workspace.getLeaf(false).openFile(baseFile as TFile);
    });
  }
}
