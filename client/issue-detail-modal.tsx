import type { PluginTheme } from "@getpaseo/plugin";
import { Modal } from "@getpaseo/plugin/client/react-native";
import { ExternalLink, SettingsCard, SettingsInput, SettingsSelect, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { JiraIssue } from "../shared/jira";
import { renderAgentPrompt } from "../shared/naming";
import { formatRelativeTime } from "../shared/relative-time";
import { AssigneeAvatar, IssueTypeIcon, StatusBadge } from "./issue-visuals";
import type { TicketWorkspaceStarter, WorktreeDraft } from "./start-workspace";

interface IssueDetailModalProps {
  theme: PluginTheme;
  issue: JiraIssue | null;
  starter: TicketWorkspaceStarter;
  onClose(): void;
}

export function IssueDetailModal({ theme, issue, starter, onClose }: IssueDetailModalProps) {
  return (
    <Modal title={issue?.key ?? "Issue"} open={Boolean(issue)} onOpenChange={(open) => !open && onClose()}>
      <Modal.Content>
        {issue ? <IssueDetail key={issue.key} theme={theme} issue={issue} starter={starter} onClose={onClose} /> : null}
      </Modal.Content>
    </Modal>
  );
}

function MetaRow({ theme, label, children }: { theme: PluginTheme; label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 24 }}>
      <Text style={{ width: 80, color: theme.colors.foregroundMuted, fontSize: 12 }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>{children}</View>
    </View>
  );
}

function IssueDetail({ theme, issue, starter, onClose }: IssueDetailModalProps & { issue: JiraIssue }) {
  const [draftOverrides, setDraftOverrides] = useState<Partial<WorktreeDraft>>({});
  const defaultDraft = starter.buildDefaultDraft(issue);
  const valueText = { color: theme.colors.foreground, fontSize: 13 };

  if (!defaultDraft) {
    return <Text style={{ color: theme.colors.foregroundMuted }}>Loading projects…</Text>;
  }

  const draft = { ...defaultDraft, ...draftOverrides };
  const updateDraft = (change: Partial<WorktreeDraft>) => setDraftOverrides({ ...draftOverrides, ...change });
  const isStarting = starter.startingIssueKey === issue.key;
  const canStart = Boolean(draft.branchName && draft.worktreeSlug) && !isStarting;

  return (
    <>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <IssueTypeIcon theme={theme} issueType={issue.issueType} />
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>{issue.issueType}</Text>
          <StatusBadge theme={theme} status={issue.status} category={issue.statusCategory} />
        </View>
        <Text style={{ color: theme.colors.foreground, fontSize: 17, fontWeight: "600" }}>{issue.summary}</Text>
        <ExternalLink href={issue.url}>Open in Jira</ExternalLink>
      </View>

      <View style={{ gap: 6 }}>
        <MetaRow theme={theme} label="Assignee">
          {issue.assigneeName ? (
            <>
              <AssigneeAvatar theme={theme} name={issue.assigneeName} avatarUrl={issue.assigneeAvatarUrl} />
              <Text style={valueText}>{issue.assigneeName}</Text>
            </>
          ) : (
            <Text style={valueText}>Unassigned</Text>
          )}
        </MetaRow>
        <MetaRow theme={theme} label="Priority">
          <Text style={valueText}>{issue.priority ?? "None"}</Text>
        </MetaRow>
        <MetaRow theme={theme} label="Context">
          <Text style={valueText} numberOfLines={1}>
            {issue.context}
          </Text>
        </MetaRow>
        <MetaRow theme={theme} label="Updated">
          <Text style={valueText}>{formatRelativeTime({ isoDate: issue.updatedAt, nowMs: Date.now() })}</Text>
        </MetaRow>
      </View>

      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}>
        WORKTREE
      </Text>
      <SettingsCard>
        <SettingsSelect
          label="Project"
          value={draft.projectId}
          options={starter.projects.map((project) => ({ label: project.projectDisplayName, value: project.projectId }))}
          onValueChange={(projectId) => updateDraft({ projectId })}
        />
        <SettingsInput label="Branch" initialValue={draft.branchName} onChangeText={(branchName) => updateDraft({ branchName })} />
        <SettingsInput label="Worktree" initialValue={draft.worktreeSlug} onChangeText={(worktreeSlug) => updateDraft({ worktreeSlug })} />
        <SettingsInput label="Title" initialValue={draft.title} onChangeText={(title) => updateDraft({ title })} />
        <SettingsInput label="Base ref" initialValue={draft.baseRef} onChangeText={(baseRef) => updateDraft({ baseRef })} />
        <SettingsSwitch
          label="Start agent"
          hint={renderAgentPrompt({ template: starter.agentPromptTemplate, key: issue.key })}
          value={draft.shouldStartAgent}
          onValueChange={(shouldStartAgent) => updateDraft({ shouldStartAgent })}
        />
      </SettingsCard>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start workspace for ${issue.key}`}
        disabled={!canStart}
        onPress={() => starter.start(draft, { onSuccess: onClose })}
        style={{
          alignItems: "center",
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: theme.colors.accent,
          opacity: canStart ? 1 : 0.5,
        }}
      >
        <Text style={{ color: theme.colors.accentForeground, fontWeight: "600" }}>
          {isStarting ? "Starting…" : "Start →"}
        </Text>
      </Pressable>
    </>
  );
}
