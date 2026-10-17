import type { PluginServerContext } from "@getpaseo/plugin/server";
import { fetchCurrentUserName, searchIssues } from "./server/jira-client";
import { searchIssuesRpc, testConnectionRpc } from "./shared/jira";
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
  server.handle(testConnectionRpc, async () => ({
    displayName: await fetchCurrentUserName(await readSettings()),
  }));
  return () => {};
}
