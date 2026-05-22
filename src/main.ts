import { Plugin } from "obsidian";
import { HomeView, HOME_VIEW_TYPE } from "./HomeView";

export default class HomepagePlugin extends Plugin {
  async onload() {
    this.registerView(HOME_VIEW_TYPE, (leaf) => new HomeView(leaf, this.app));

    this.addRibbonIcon("home", "Open homepage", () => this.openHomepage());

    this.addCommand({
      id: "open-homepage",
      name: "Open homepage",
      callback: () => this.openHomepage(),
    });

    this.app.workspace.onLayoutReady(() => this.activateHomepage());

    // Intercept manual opens of Inbox.md
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file?.path === "Inbox.md") {
          setTimeout(() => {
            const leaf = this.app.workspace.getLeavesOfType("markdown").find(
              (l) => (l.view as any).file?.path === "Inbox.md"
            );
            if (leaf) {
              leaf.setViewState({ type: HOME_VIEW_TYPE, active: true });
              this.app.workspace.revealLeaf(leaf);
            }
          }, 30);
        }
      })
    );
  }

  private async activateHomepage() {
    // If homepage is already open (e.g. session restored), just reveal it
    const existing = this.app.workspace.getLeavesOfType(HOME_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    // Replace a leaf showing Inbox.md, otherwise use the active leaf
    const inboxLeaf = this.app.workspace
      .getLeavesOfType("markdown")
      .find((l) => (l.view as any).file?.path === "Inbox.md");

    const target = inboxLeaf ?? this.app.workspace.getLeaf(false);
    await target.setViewState({ type: HOME_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(target);
  }

  async openHomepage() {
    const existing = this.app.workspace.getLeavesOfType(HOME_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.setViewState({ type: HOME_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(HOME_VIEW_TYPE);
  }
}
