import type { PluginClientContext, PluginScreenProps, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { IssuesScreen } from "./client/issues-screen";
import { JiraSettingsScreen } from "./client/settings-screen";

const ISSUES_SCREEN_ID = "issues";
const SETTINGS_SCREEN_ID = "jira";

function JiraSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="SquareKanban"
      active={currentScreen?.screenId === ISSUES_SCREEN_ID}
      onPress={() => openScreen({ screenId: ISSUES_SCREEN_ID })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const openSettings = () => client.openSettings(SETTINGS_SCREEN_ID);
  client.addScreen({
    id: ISSUES_SCREEN_ID,
    title: "Jira",
    Component: (props: PluginScreenProps) => <IssuesScreen {...props} openSettings={openSettings} />,
  });
  client.addSettingsScreen({ id: SETTINGS_SCREEN_ID, title: "Jira", icon: "KeyRound", Component: JiraSettingsScreen });
  client.addSidebarHeaderItem({ id: ISSUES_SCREEN_ID, title: "Jira", Component: JiraSidebarItem });
  client.addCommandCenterItem({
    id: "worktree-from-ticket",
    title: "Jira: worktree from ticket",
    icon: "GitBranchPlus",
    keywords: ["jira", "ticket", "worktree", "branch"],
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: ISSUES_SCREEN_ID });
    },
  });
  return () => {};
}
