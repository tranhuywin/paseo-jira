import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const statusCategorySchema = z.enum(["new", "indeterminate", "done"]);

export type StatusCategory = z.output<typeof statusCategorySchema>;

export const jiraIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  issueType: z.string(),
  status: z.string(),
  statusCategory: statusCategorySchema,
  priority: z.string().nullable(),
  assigneeName: z.string().nullable(),
  assigneeAvatarUrl: z.string().nullable(),
  context: z.string(),
  url: z.string(),
  updatedAt: z.string(),
});

export type JiraIssue = z.output<typeof jiraIssueSchema>;

export const issueScopeSchema = z.enum(["mine", "all"]);

export type IssueScope = z.output<typeof issueScopeSchema>;

export const searchIssuesRpc = defineRpc({
  name: "jira.search-issues",
  input: z.object({ scope: issueScopeSchema, query: z.string() }),
  output: z.object({ issues: z.array(jiraIssueSchema) }),
});

export const testConnectionRpc = defineRpc({
  name: "jira.test-connection",
  input: z.object({}),
  output: z.object({ displayName: z.string() }),
});
