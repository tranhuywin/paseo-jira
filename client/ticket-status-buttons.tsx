import type { PluginButtonContentProps, PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { findIssueKey, findLeadingBranchIssueKey } from "../shared/jira";
import { TicketStatusPopover } from "./ticket-status-popover";

type WorkspaceListResult = Awaited<ReturnType<PluginClientContext["paseo"]["workspaces"]["list"]>>;
type Workspace = WorkspaceListResult["entries"][number];

interface TicketStatusButton {
  issueKey: string;
  registration: PluginButtonRegistration;
}

/**
 * Prefers an uppercase key in the branch, which survives a workspace rename, then the title.
 * A lowercase key leading the branch comes last because slug words such as `node-20` also match it.
 */
function findWorkspaceIssueKey(workspace: Workspace): string | null {
  const branchName = workspace.gitRuntime?.currentBranch ?? "";
  return findIssueKey(branchName) ?? findIssueKey(workspace.title ?? "") ?? findLeadingBranchIssueKey(branchName);
}

/** Adds a header button that moves the workspace's Jira ticket through its workflow. */
export function addTicketStatusButtons(client: PluginClientContext): () => void {
  const buttons = new Map<string, TicketStatusButton>();
  let releaseSubscription: (() => void) | null = null;
  let isDisposed = false;

  const removeButton = (workspaceId: string) => {
    buttons.get(workspaceId)?.registration.remove();
    buttons.delete(workspaceId);
  };

  const syncButton = (workspace: Workspace) => {
    const issueKey = findWorkspaceIssueKey(workspace);
    if (buttons.get(workspace.id)?.issueKey === issueKey) return;
    removeButton(workspace.id);
    if (!issueKey) return;
    const registration = client.addHeaderButton({
      id: "ticket-status",
      workspaceId: workspace.id,
      button: {
        title: `Update ${issueKey} status`,
        icon: "SquareKanban",
        label: issueKey,
        behavior: {
          kind: "popover",
          Content: (props: PluginButtonContentProps) => <TicketStatusPopover {...props} issueKey={issueKey} />,
        },
      },
    });
    buttons.set(workspace.id, { issueKey, registration });
  };

  void client.paseo.workspaces
    .list({ subscribe: {} })
    .then(({ subscription }) => {
      const unsubscribe = subscription.subscribe({
        snapshot: ({ entries }) => {
          const liveIds = new Set(entries.map((workspace) => workspace.id));
          for (const workspaceId of buttons.keys()) if (!liveIds.has(workspaceId)) removeButton(workspaceId);
          for (const workspace of entries) syncButton(workspace);
        },
        update: (message) => {
          if (message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "upsert") syncButton(update.workspace);
          else removeButton(update.id);
        },
      });
      releaseSubscription = () => {
        unsubscribe();
        void subscription.release();
      };
      if (isDisposed) releaseSubscription();
      return undefined;
    })
    .catch((error: unknown) => {
      if (!isDisposed) console.error("[paseo-jira] Workspace observation failed", error);
    });

  return () => {
    isDisposed = true;
    releaseSubscription?.();
    for (const workspaceId of [...buttons.keys()]) removeButton(workspaceId);
  };
}
