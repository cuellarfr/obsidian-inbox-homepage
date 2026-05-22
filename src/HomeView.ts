import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { renderNotesWall } from "./sections/NotesWall";
import { renderClippingsSection } from "./sections/ClippingsSection";
import { renderTasksSection } from "./sections/TasksSection";

export const HOME_VIEW_TYPE = "homepage-view";

export class HomeView extends ItemView {
  private _app: App;

  constructor(leaf: WorkspaceLeaf, app: App) {
    super(leaf);
    this._app = app;
  }

  getViewType(): string {
    return HOME_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Inbox";
  }

  getIcon(): string {
    return "home";
  }

  async onOpen() {
    await this.render();

    // Refresh the notes wall when _notes/ changes
    this.registerEvent(
      this._app.vault.on("create", (file) => {
        if (file.path.startsWith("_notes/") || file.path.startsWith("Clippings/")) {
          this.render();
        }
      })
    );
    this.registerEvent(
      this._app.vault.on("delete", (file) => {
        if (file.path.startsWith("_notes/") || file.path.startsWith("Clippings/")) {
          this.render();
        }
      })
    );
    this.registerEvent(
      this._app.vault.on("rename", () => this.render())
    );
    this.registerEvent(
      this._app.vault.on("modify", (file) => {
        if (
          file.path === "Personal/Personal Tasks.md" ||
          file.path === "Trimble/Work Tasks.md"
        ) {
          this.render();
        }
      })
    );
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("hp-container");

    const header = container.createEl("div", { cls: "hp-header" });
    const now = new Date();
    header.createEl("h1", { text: "Inbox" });
    header.createEl("span", {
      text: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      cls: "hp-date",
    });

    const grid = container.createEl("div", { cls: "hp-grid" });

    const left = grid.createEl("div", { cls: "hp-col hp-col-left" });
    await renderNotesWall(left, this._app, this);

    const right = grid.createEl("div", { cls: "hp-col hp-col-right" });
    await renderClippingsSection(right, this._app);
    if (this._app.vault.getAbstractFileByPath("Personal")) {
      await renderTasksSection(right, this._app, {
        title: "Personal — Focus",
        filePath: "Personal/Personal Tasks.md",
        columns: ["🎯  Focus"],
      });
    }
    await renderTasksSection(right, this._app, {
      title: "Work — Focus & Review",
      filePath: "Trimble/Work Tasks.md",
      columns: ["🎯  Focus", "🔍  In Review"],
    });
  }

  async onClose() {}
}
