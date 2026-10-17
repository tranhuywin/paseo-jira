import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { Image, Text, View } from "react-native";
import type { StatusCategory } from "../shared/jira";

const AVATAR_SIZE_PX = 20;

const ISSUE_TYPE_ICONS: Record<string, string> = {
  bug: "Bug",
  story: "BookOpen",
  enhancement: "Sparkles",
  task: "SquareCheck",
  "sub-task": "ListTree",
  subtask: "ListTree",
  epic: "Zap",
};

const STATUS_CATEGORY_ICONS: Record<StatusCategory, string> = {
  new: "Circle",
  indeterminate: "CircleDot",
  done: "CircleCheck",
};

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  indeterminate: "In progress",
  new: "To do",
  done: "Done",
};

export function getStatusColor({ theme, category }: { theme: PluginTheme; category: StatusCategory }): string {
  if (category === "indeterminate") return theme.colors.accent;
  if (category === "done") return theme.colors.statusSuccess;
  return theme.colors.foregroundMuted;
}

export function IssueTypeIcon({ theme, issueType }: { theme: PluginTheme; issueType: string }) {
  const isBug = issueType.toLowerCase() === "bug";
  return (
    <Icon
      name={ISSUE_TYPE_ICONS[issueType.toLowerCase()] ?? "Circle"}
      size={14}
      color={isBug ? theme.colors.statusDanger : theme.colors.foregroundMuted}
    />
  );
}

export function StatusBadge({ theme, status, category }: { theme: PluginTheme; status: string; category: StatusCategory }) {
  const color = getStatusColor({ theme, category });
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Icon name={STATUS_CATEGORY_ICONS[category]} size={11} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

export function AssigneeAvatar({ theme, name, avatarUrl }: { theme: PluginTheme; name: string; avatarUrl: string | null }) {
  const size = { width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX, borderRadius: AVATAR_SIZE_PX / 2 };
  if (avatarUrl) return <Image accessibilityLabel={name} source={{ uri: avatarUrl }} style={size} />;
  return (
    <View style={[size, { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface2 }]}>
      <Text style={{ color: theme.colors.foreground, fontSize: 10 }}>{name.charAt(0)}</Text>
    </View>
  );
}
