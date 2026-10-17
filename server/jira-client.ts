/// <reference types="node" />
import type { IssueScope, JiraIssue, StatusCategory } from "../shared/jira";
import type { JiraSettings } from "../shared/settings";

const ISSUE_FIELDS = ["summary", "issuetype", "status", "updated", "priority", "assignee", "parent", "project"];
const MAX_RESULTS = 50;
const ERROR_BODY_PREVIEW_CHARS = 300;
const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

interface JiraSearchResponse {
  issues: {
    key: string;
    fields: {
      summary: string;
      issuetype: { name: string };
      status: { name: string; statusCategory: { key: string } };
      updated: string;
      priority: { name: string } | null;
      assignee: { displayName: string; avatarUrls: Record<string, string> } | null;
      parent?: { fields: { summary: string } };
      project: { name: string };
    };
  }[];
}

interface JiraRequest {
  settings: JiraSettings;
  path: string;
  body?: unknown;
}

interface SearchIssuesParams {
  settings: JiraSettings;
  scope: IssueScope;
  query: string;
}

function getSiteUrl(settings: JiraSettings): string {
  return settings.siteUrl.trim().replace(/\/+$/, "");
}

async function requestJira<T>({ settings, path, body }: JiraRequest): Promise<T> {
  if (!settings.siteUrl || !settings.email || !settings.apiToken) {
    throw new Error("Set the Jira site URL, email and API token in Settings → Plugins → Jira.");
  }
  const credentials = Buffer.from(`${settings.email}:${settings.apiToken}`).toString("base64");
  const response = await fetch(`${getSiteUrl(settings)}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, ERROR_BODY_PREVIEW_CHARS);
    throw new Error(`Jira ${response.status} on ${path}: ${detail}`);
  }
  return (await response.json()) as T;
}

function toStatusCategory(key: string): StatusCategory {
  if (key === "done" || key === "indeterminate") return key;
  return "new";
}

function buildSearchJql({ settings, scope, query }: SearchIssuesParams): string {
  const trimmedQuery = query.trim();
  if (ISSUE_KEY_PATTERN.test(trimmedQuery)) return `key = ${trimmedQuery.toUpperCase()}`;
  const scopeJql = scope === "mine" ? settings.myIssuesJql : settings.searchScopeJql;
  const clauses = [scopeJql.trim()].filter(Boolean).map((clause) => `(${clause})`);
  if (trimmedQuery) clauses.push(`text ~ "${trimmedQuery.replace(/["\\]/g, "\\$&")}"`);
  return `${clauses.join(" AND ")} ORDER BY updated DESC`;
}

export async function searchIssues(params: SearchIssuesParams): Promise<JiraIssue[]> {
  const { settings } = params;
  const response = await requestJira<JiraSearchResponse>({
    settings,
    path: "/rest/api/3/search/jql",
    body: { jql: buildSearchJql(params), fields: ISSUE_FIELDS, maxResults: MAX_RESULTS },
  });
  return response.issues.map(({ key, fields }) => ({
    key,
    summary: fields.summary,
    issueType: fields.issuetype.name,
    status: fields.status.name,
    statusCategory: toStatusCategory(fields.status.statusCategory.key),
    priority: fields.priority?.name ?? null,
    assigneeName: fields.assignee?.displayName ?? null,
    assigneeAvatarUrl: fields.assignee?.avatarUrls["24x24"] ?? null,
    context: fields.parent?.fields.summary ?? fields.project.name,
    url: `${getSiteUrl(settings)}/browse/${key}`,
    updatedAt: fields.updated,
  }));
}

export async function fetchCurrentUserName(settings: JiraSettings): Promise<string> {
  const user = await requestJira<{ displayName: string }>({ settings, path: "/rest/api/3/myself" });
  return user.displayName;
}
