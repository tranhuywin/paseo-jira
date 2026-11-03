import { type PluginButtonContentProps, useRpc } from "@getpaseo/plugin/client";
import { ExternalLink } from "@getpaseo/plugin/client/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { getIssueStatusRpc, type JiraTransition, transitionIssueRpc } from "../shared/jira";
import { StatusBadge } from "./issue-visuals";

type TicketStatusPopoverProps = PluginButtonContentProps & { issueKey: string; onMoved(status: string): void };

export function TicketStatusPopover({ theme, issueKey, close, onMoved }: TicketStatusPopoverProps) {
  const getIssueStatus = useRpc(getIssueStatusRpc);
  const transitionIssue = useRpc(transitionIssueRpc);
  const queryClient = useQueryClient();
  const issueStatus = useQuery({
    queryKey: ["issue-status", issueKey],
    queryFn: () => getIssueStatus({ key: issueKey }),
  });
  const transition = useMutation({
    mutationFn: (option: JiraTransition) => transitionIssue({ key: issueKey, transitionId: option.id }),
    onSuccess: (_, option) => {
      onMoved(option.toStatus);
      void queryClient.invalidateQueries({ queryKey: ["issue-status", issueKey] });
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
      close();
    },
  });
  const mutedText = { color: theme.colors.foregroundMuted, fontSize: 12 };

  if (issueStatus.isPending) return <Text style={mutedText}>Loading {issueKey}…</Text>;
  if (issueStatus.error) return <Text style={mutedText}>{issueStatus.error.message}</Text>;

  const { url, status, statusCategory, transitions } = issueStatus.data;
  // Jira can offer several transitions into one status; one row per target status is enough.
  const targetTransitions = transitions.filter(
    (option, index) => transitions.findIndex(({ toStatus }) => toStatus === option.toStatus) === index,
  );
  return (
    <View style={{ gap: 8, minWidth: 220 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: theme.colors.foreground, fontSize: 13, fontWeight: "600" }}>{issueKey}</Text>
        <StatusBadge theme={theme} status={status} category={statusCategory} />
      </View>
      <ExternalLink href={url}>Open in Jira</ExternalLink>
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}>
        MOVE TO
      </Text>
      {targetTransitions.length === 0 ? <Text style={mutedText}>No transitions available.</Text> : null}
      {targetTransitions.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          accessibilityLabel={`Move ${issueKey} to ${option.toStatus}`}
          disabled={transition.isPending}
          onPress={() => transition.mutate(option)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: pressed ? theme.colors.surface2 : "transparent",
            opacity: transition.isPending ? 0.5 : 1,
          })}
        >
          <StatusBadge theme={theme} status={option.toStatus} category={option.toStatusCategory} />
        </Pressable>
      ))}
      {transition.isPending ? <Text style={mutedText}>Moving…</Text> : null}
      {transition.error ? <Text style={{ color: theme.colors.statusDanger, fontSize: 12 }}>{transition.error.message}</Text> : null}
    </View>
  );
}
