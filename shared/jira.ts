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

export const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

const EMBEDDED_ISSUE_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/;

const LEADING_ISSUE_KEY_PATTERN = /^[a-z][a-z0-9]+-\d+(?=-|$)/i;

/** Finds an uppercase ticket key such as `ABC-123` inside a branch name or workspace title. */
export function findIssueKey(text: string): string | null {
  return text.match(EMBEDDED_ISSUE_KEY_PATTERN)?.[0] ?? null;
}

/** Reads a key of any case that starts the branch's last segment: `fix/abc-123-login` gives `ABC-123`. */
export function findLeadingBranchIssueKey(branchName: string): string | null {
  const lastSegment = branchName.split("/").pop() ?? "";
  return lastSegment.match(LEADING_ISSUE_KEY_PATTERN)?.[0].toUpperCase() ?? null;
}

const issueKeySchema = z.string().regex(ISSUE_KEY_PATTERN);

export const jiraTransitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  toStatus: z.string(),
  toStatusCategory: statusCategorySchema,
});

export type JiraTransition = z.output<typeof jiraTransitionSchema>;

export const getIssueStatusRpc = defineRpc({
  name: "jira.get-issue-status",
  input: z.object({ key: issueKeySchema }),
  output: z.object({
    status: z.string(),
    statusCategory: statusCategorySchema,
    transitions: z.array(jiraTransitionSchema),
  }),
});

export const transitionIssueRpc = defineRpc({
  name: "jira.transition-issue",
  input: z.object({ key: issueKeySchema, transitionId: z.string().min(1) }),
  output: z.object({}),
});

export const testConnectionRpc = defineRpc({
  name: "jira.test-connection",
  input: z.object({}),
  output: z.object({ displayName: z.string() }),
});
