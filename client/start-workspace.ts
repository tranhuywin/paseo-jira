import { type PluginScreenProps, usePaseo, useSettings } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { JiraIssue } from "../shared/jira";
import { renderAgentPrompt, suggestWorktreeNames } from "../shared/naming";
import { type JiraSettings, jiraSettings } from "../shared/settings";

type PaseoApi = ReturnType<typeof usePaseo>;

export interface WorktreeDraft {
  issueKey: string;
  projectId: string;
  branchName: string;
  worktreeSlug: string;
  title: string;
  baseRef: string;
  shouldStartAgent: boolean;
}

interface CreateTicketWorkspaceParams {
  paseo: PaseoApi;
  draft: WorktreeDraft;
  settings: JiraSettings;
}

async function fetchGitProjects(paseo: PaseoApi) {
  const { projects } = await paseo.projects.list();
  return projects.filter((project) => project.projectKind === "git");
}

async function createTicketWorkspace({ paseo, draft, settings }: CreateTicketWorkspaceParams) {
  const workspace = await paseo.workspaces.create({
    source: {
      kind: "worktree",
      projectId: draft.projectId,
      action: "branch-off",
      refName: draft.baseRef,
      branchName: draft.branchName,
      worktreeSlug: draft.worktreeSlug,
    },
    title: draft.title,
  });
  if (draft.shouldStartAgent) {
    await workspace.agents.create({
      config: { provider: settings.agentProvider },
      prompt: renderAgentPrompt({ template: settings.agentPromptTemplate, key: draft.issueKey }),
    });
  }
  return workspace;
}

export function useStartTicketWorkspace({ navigation }: Pick<PluginScreenProps, "navigation">) {
  const paseo = usePaseo();
  const settings = useSettings(jiraSettings);
  const projects = useQuery({ queryKey: ["git-projects"], queryFn: () => fetchGitProjects(paseo) });
  const toast = useToast();
  const startMutation = useMutation({
    mutationFn: (draft: WorktreeDraft) => {
      if (settings.status !== "ready") throw new Error("Jira settings are not loaded yet.");
      return createTicketWorkspace({ paseo, draft, settings: settings.values });
    },
    onSuccess: (workspace) => {
      toast.show(`Created ${workspace.name}`, { variant: "success" });
      navigation?.openWorkspace({ workspaceId: workspace.id });
    },
    onError: (error) => toast.error(error.message),
  });

  const projectList = projects.data ?? [];
  const settingsValues = settings.status === "ready" ? settings.values : null;
  const defaultProject =
    projectList.find((project) => project.projectRootPath === settingsValues?.defaultProjectPath) ?? projectList[0];

  function buildDefaultDraft(issue: JiraIssue): WorktreeDraft | null {
    if (!settingsValues || !defaultProject) return null;
    return {
      issueKey: issue.key,
      projectId: defaultProject.projectId,
      baseRef: settingsValues.baseRef,
      shouldStartAgent: false,
      ...suggestWorktreeNames({
        ...issue,
        bugBranchPrefix: settingsValues.bugBranchPrefix,
        featureBranchPrefix: settingsValues.featureBranchPrefix,
      }),
    };
  }

  return {
    projects: projectList,
    agentPromptTemplate: settingsValues?.agentPromptTemplate ?? "",
    buildDefaultDraft,
    start: startMutation.mutate,
    startingIssueKey: startMutation.isPending ? startMutation.variables.issueKey : null,
  };
}

export type TicketWorkspaceStarter = ReturnType<typeof useStartTicketWorkspace>;
