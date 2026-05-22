import { App, Component, MarkdownRenderer, TFile, normalizePath } from "obsidian";

const ATTACHMENT_FOLDER = "_attachments";
const WEBP_QUALITY = 0.85;
const SKIP_WEBP_CONVERT = new Set(["image/gif", "image/svg+xml", "image/webp"]);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function attachmentTimestamp(now: Date): string {
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  const sub = (mime.split("/")[1] || "bin").toLowerCase();
  return sub.replace(/[^a-z0-9]/g, "");
}

async function ensureAttachmentsFolder(app: App): Promise<void> {
  if (!app.vault.getAbstractFileByPath(ATTACHMENT_FOLDER)) {
    await app.vault.createFolder(ATTACHMENT_FOLDER);
  }
}

async function uniqueAttachmentPath(app: App, baseName: string, ext: string): Promise<string> {
  let candidate = normalizePath(`${ATTACHMENT_FOLDER}/${baseName}.${ext}`);
  let i = 1;
  while (app.vault.getAbstractFileByPath(candidate)) {
    candidate = normalizePath(`${ATTACHMENT_FOLDER}/${baseName}-${i}.${ext}`);
    i += 1;
  }
  return candidate;
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
  const caret = start + text.length;
  textarea.selectionStart = textarea.selectionEnd = caret;
  textarea.focus();
}

async function convertToWebp(file: File): Promise<{ data: ArrayBuffer; ext: string }> {
  if (SKIP_WEBP_CONVERT.has(file.type)) {
    return { data: await file.arrayBuffer(), ext: extFromMime(file.type) };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to decode image"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { data: await file.arrayBuffer(), ext: extFromMime(file.type) };
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });
    if (!blob) return { data: await file.arrayBuffer(), ext: extFromMime(file.type) };
    return { data: await blob.arrayBuffer(), ext: "webp" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function attachImageFile(app: App, file: File, textarea: HTMLTextAreaElement): Promise<void> {
  if (!file.type.startsWith("image/")) return;
  await ensureAttachmentsFolder(app);
  const { data, ext } = await convertToWebp(file);
  const baseName = `Pasted image ${attachmentTimestamp(new Date())}`;
  const path = await uniqueAttachmentPath(app, baseName, ext);
  await app.vault.createBinary(path, data);
  const filename = path.slice(ATTACHMENT_FOLDER.length + 1);
  insertAtCursor(textarea, `\n![[${filename}]]\n`);
}

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

  const fileInput = formFooter.createEl("input", {
    type: "file",
    cls: "hp-compose-file-input",
    attr: { accept: "image/*", multiple: "true" },
  }) as HTMLInputElement;

  const attachBtn = formFooter.createEl("button", { cls: "hp-compose-attach", attr: { "aria-label": "Attach image" } });
  attachBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;

  const submitBtn = formFooter.createEl("button", { cls: "hp-compose-submit", attr: { "aria-label": "Post note" } });
  submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files ?? []);
    for (const file of files) await attachImageFile(app, file, textarea);
    fileInput.value = "";
  });

  textarea.addEventListener("paste", async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const images: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) images.push(f);
      }
    }
    if (images.length === 0) return;
    e.preventDefault();
    for (const file of images) await attachImageFile(app, file, textarea);
  });

  form.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
  });
  form.addEventListener("drop", async (e) => {
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    for (const file of files) await attachImageFile(app, file, textarea);
  });

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
