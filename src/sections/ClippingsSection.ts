import { App, TFile } from "obsidian";

export async function renderClippingsSection(container: HTMLElement, app: App) {
  const section = container.createEl("div", { cls: "hp-section hp-clippings-section" });

  section.createEl("h2", { text: "Recent Clippings" });

  const clippings = app.vault
    .getFiles()
    .filter((f) => f.path.startsWith("Clippings/"))
    .sort((a, b) => b.stat.mtime - a.stat.mtime)
    .slice(0, 8);

  if (clippings.length === 0) {
    section.createEl("p", { text: "No clippings yet.", cls: "hp-empty" });
    return;
  }

  const list = section.createEl("ul", { cls: "hp-tasks-list" });

  for (const clip of clippings) {
    const fm = app.metadataCache.getFileCache(clip)?.frontmatter;
    const isRead = fm?.read === true || fm?.read === "true";
    const title = (fm?.title as string) || clip.basename;

    const item = list.createEl("li", { cls: "hp-tasks-item" });

    const checkbox = item.createEl("input", { type: "checkbox", cls: "hp-tasks-checkbox" });
    checkbox.checked = isRead;
    checkbox.disabled = true;

    item.createEl("span", { text: title, cls: "hp-tasks-label" });

    item.addEventListener("click", () => {
      app.workspace.getLeaf(false).openFile(clip);
    });
  }

  const baseFile = app.vault.getAbstractFileByPath("Clippings.base");
  const footer = section.createEl("div", { cls: "hp-tasks-footer" });
  const openLink = footer.createEl("a", {
    text: "Open Clippings.base →",
    cls: "hp-tasks-open-link",
  });
  if (baseFile instanceof TFile) {
    openLink.addEventListener("click", (e) => {
      e.preventDefault();
      app.workspace.getLeaf(false).openFile(baseFile);
    });
  }
}
