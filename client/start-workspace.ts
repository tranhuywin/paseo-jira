import { type PluginScreenProps, usePaseo, useSettings } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { JiraIssue } from "../shared/jira";
import { suggestWorktreeNames, type WorktreeNameSuggestion } from "../shared/naming";
import { type JiraSettings, jiraSettings } from "../shared/settings";

type PaseoApi = ReturnType<typeof usePaseo>;

const NAMING_TIMEOUT_MS = 60_000;

const agentNamesSchema = z.object({
  branchName: z.string().min(1),
  worktreeSlug: z.string().min(1),
  title: z.string().min(1),
});

const AGENT_NAMES_JSON_SCHEMA = {
  type: "object",
  properties: {
    branchName: { type: "string" },
    worktreeSlug: { type: "string" },
    title: { type: "string" },
  },
  required: ["branchName", "worktreeSlug", "title"],
  additionalProperties: false,
};

export interface WorktreeDraft {
  issueKey: string;
  projectId: string;
  branchName: string;
  worktreeSlug: string;
  title: string;
  baseRef: string;
  shouldStartAgent: boolean;
}

interface StartTicketInput {
  issue: JiraIssue;
  /** Omitted when starting from the list: the draft is built from the suggested names. */
  draft?: WorktreeDraft;
}

interface SuggestNamesWithAgentParams {
  paseo: PaseoApi;
  issue: JiraIssue;
  settings: JiraSettings;
  cwd: string;
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

/** The agent wraps its JSON reply in a ```json fence. */
function stripJsonFence(text: string): string {
  return text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text;
}

function suggestRuleNames(issue: JiraIssue, values: JiraSettings): WorktreeNameSuggestion {
  return suggestWorktreeNames({
    ...issue,
    bugBranchPrefix: values.bugBranchPrefix,
    featureBranchPrefix: values.featureBranchPrefix,
  });
}

async function suggestNamesWithAgent({ paseo, issue, settings, cwd }: SuggestNamesWithAgentParams) {
  const agent = await paseo.agents.create({
    cwd,
    title: `Name ${issue.key}`,
    config: { provider: settings.namingProvider },
    prompt: `${settings.namingPrompt}\n\nKey: ${issue.key}\nType: ${issue.issueType}\nSummary: ${issue.summary}`,
    outputSchema: AGENT_NAMES_JSON_SCHEMA,
  });
  try {
    const result = await agent.waitForFinish(NAMING_TIMEOUT_MS);
    if (result.status !== "idle" || !result.lastMessage) {
      throw new Error(result.error ?? `Naming agent stopped with status ${result.status}.`);
    }
    return agentNamesSchema.parse(JSON.parse(stripJsonFence(result.lastMessage)));
  } finally {
    await agent.archive();
  }
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
  if (!draft.shouldStartAgent) return { workspace, agent: null };
  const agent = await workspace.agents.create({ config: { provider: settings.agentProvider } });
  return { workspace, agent };
}

export function useStartTicketWorkspace({ navigation }: Pick<PluginScreenProps, "navigation">) {
  const paseo = usePaseo();
  const settings = useSettings(jiraSettings);
  const projects = useQuery({ queryKey: ["git-projects"], queryFn: () => fetchGitProjects(paseo) });
  const queryClient = useQueryClient();
  const toast = useToast();
  const startMutation = useMutation({
    mutationFn: async ({ issue, draft }: StartTicketInput) => {
      if (settings.status !== "ready") throw new Error("Jira settings are not loaded yet.");
      const agentNames =
        !draft && isAgentNamingEnabled ? await queryClient.fetchQuery(buildNamesQuery(issue)) : undefined;
      const resolvedDraft = draft ?? buildDefaultDraft(issue, agentNames);
      if (!resolvedDraft) throw new Error("No git project to branch from.");
      return createTicketWorkspace({ paseo, draft: resolvedDraft, settings: settings.values });
    },
    onSuccess: ({ workspace, agent }) => {
      toast.show(`Created ${workspace.name}`, { variant: "success" });
      if (agent) navigation?.openAgent({ agentId: agent.id });
      else navigation?.openWorkspace({ workspaceId: workspace.id });
    },
    onError: (error) => toast.error(error.message),
  });

  const projectList = projects.data ?? [];
  const settingsValues = settings.status === "ready" ? settings.values : null;
  const defaultProject =
    projectList.find((project) => project.projectRootPath === settingsValues?.defaultProjectPath) ?? projectList[0];

  const isAgentNamingEnabled = Boolean(settingsValues?.namingPrompt.trim());

  /** One naming agent per ticket and naming setup: the list and the ticket detail share the cached answer. */
  function buildNamesQuery(issue: JiraIssue) {
    return {
      queryKey: [
        "agent-names",
        issue.key,
        defaultProject?.projectRootPath,
        settingsValues?.namingProvider,
        settingsValues?.namingPrompt,
      ],
      queryFn: () => {
        if (!settingsValues || !defaultProject) throw new Error("Jira settings or projects are not loaded yet.");
        return suggestNamesWithAgent({ paseo, issue, settings: settingsValues, cwd: defaultProject.projectRootPath });
      },
      staleTime: Infinity,
      retry: false,
    };
  }

  function buildDefaultDraft(issue: JiraIssue, names?: WorktreeNameSuggestion): WorktreeDraft | null {
    if (!settingsValues || !defaultProject) return null;
    return {
      issueKey: issue.key,
      projectId: defaultProject.projectId,
      baseRef: settingsValues.baseRef,
      shouldStartAgent: true,
      ...(names ?? suggestRuleNames(issue, settingsValues)),
    };
  }

  return {
    projects: projectList,
    agentPromptTemplate: settingsValues?.agentPromptTemplate ?? "",
    isAgentNamingEnabled,
    buildNamesQuery,
    buildDefaultDraft,
    start: startMutation.mutate,
    startingIssueKey: startMutation.isPending ? startMutation.variables.issue.key : null,
  };
}

export type TicketWorkspaceStarter = ReturnType<typeof useStartTicketWorkspace>;
