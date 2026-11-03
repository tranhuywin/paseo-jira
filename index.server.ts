import type { PluginServerContext } from "@getpaseo/plugin/server";
import { fetchCurrentUserName, fetchIssueStatus, searchIssues, transitionIssue } from "./server/jira-client";
import { getIssueStatusRpc, searchIssuesRpc, testConnectionRpc, transitionIssueRpc } from "./shared/jira";
import { jiraSettings } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(jiraSettings);

  async function readSettings() {
    const state = await settings.read();
    if (state.status !== "ready") throw new Error(`Jira settings are invalid: ${state.error}`);
    return state.values;
  }

  server.handle(searchIssuesRpc, async ({ scope, query }) => ({
    issues: await searchIssues({ settings: await readSettings(), scope, query }),
  }));
  server.handle(getIssueStatusRpc, async ({ key }) => fetchIssueStatus({ settings: await readSettings(), key }));
  server.handle(transitionIssueRpc, async ({ key, transitionId }) => {
    await transitionIssue({ settings: await readSettings(), key, transitionId });
    return {};
  });
  server.handle(testConnectionRpc, async () => ({
    displayName: await fetchCurrentUserName(await readSettings()),
  }));
  return () => {};
}
