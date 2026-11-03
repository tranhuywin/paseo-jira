import { type PluginButtonContentProps, useRpc } from "@getpaseo/plugin/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { getIssueStatusRpc, transitionIssueRpc } from "../shared/jira";
import { StatusBadge } from "./issue-visuals";

type TicketStatusPopoverProps = PluginButtonContentProps & { issueKey: string };

export function TicketStatusPopover({ theme, issueKey, close }: TicketStatusPopoverProps) {
  const getIssueStatus = useRpc(getIssueStatusRpc);
  const transitionIssue = useRpc(transitionIssueRpc);
  const queryClient = useQueryClient();
  const issueStatus = useQuery({
    queryKey: ["issue-status", issueKey],
    queryFn: () => getIssueStatus({ key: issueKey }),
  });
  const transition = useMutation({
    mutationFn: (transitionId: string) => transitionIssue({ key: issueKey, transitionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["issue-status", issueKey] });
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
      close();
    },
  });
  const mutedText = { color: theme.colors.foregroundMuted, fontSize: 12 };

  if (issueStatus.isPending) return <Text style={mutedText}>Loading {issueKey}…</Text>;
  if (issueStatus.error) return <Text style={mutedText}>{issueStatus.error.message}</Text>;

  const { status, statusCategory, transitions } = issueStatus.data;
  return (
    <View style={{ gap: 8, minWidth: 220 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: theme.colors.foreground, fontSize: 13, fontWeight: "600" }}>{issueKey}</Text>
        <StatusBadge theme={theme} status={status} category={statusCategory} />
      </View>
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}>
        MOVE TO
      </Text>
      {transitions.length === 0 ? <Text style={mutedText}>No transitions available.</Text> : null}
      {transitions.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          accessibilityLabel={`Move ${issueKey} to ${option.toStatus}`}
          disabled={transition.isPending}
          onPress={() => transition.mutate(option.id)}
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
          {option.name === option.toStatus ? null : <Text style={mutedText}>{option.name}</Text>}
        </Pressable>
      ))}
      {transition.isPending ? <Text style={mutedText}>Moving…</Text> : null}
      {transition.error ? <Text style={{ color: theme.colors.statusDanger, fontSize: 12 }}>{transition.error.message}</Text> : null}
    </View>
  );
}
