import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const jiraSettings = defineSettings({
  id: "jira",
  scope: "host",
  version: 1,
  schema: z.object({
    siteUrl: z.string().default(""),
    email: z.string().default(""),
    apiToken: z.string().default(""),
    myIssuesJql: z.string().default("assignee = currentUser() AND statusCategory != Done"),
    searchScopeJql: z.string().default("updated >= -90d"),
    defaultProjectPath: z.string().default(""),
    bugBranchPrefix: z.string().default("fix"),
    featureBranchPrefix: z.string().default("feature"),
    baseRef: z.string().default("main"),
    namingPrompt: z.string().default(""),
    namingProvider: z.string().default("claude/claude-haiku-5-5"),
    agentProvider: z.string().default("claude/claude-opus-5-5"),
    agentPromptTemplate: z.string().default("Work on Jira ticket {key}."),
  }),
});

export type JiraSettings = z.output<typeof jiraSettings.schema>;
