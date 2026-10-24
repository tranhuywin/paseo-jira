import { type PluginScreenProps, useRpc } from "@getpaseo/plugin/client";
import { FlatList, Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type IssueScope, type JiraIssue, type StatusCategory, searchIssuesRpc } from "../shared/jira";
import { formatRelativeTime } from "../shared/relative-time";
import { IssueDetailModal } from "./issue-detail-modal";
import { AssigneeAvatar, IssueTypeIcon, STATUS_CATEGORY_LABELS, StatusBadge } from "./issue-visuals";
import { useStartTicketWorkspace } from "./start-workspace";

const SEARCH_DEBOUNCE_MS = 400;

const COLUMN_WIDTHS = { key: 120, assignee: 160, status: 170, updated: 110, action: 84 };

const SCOPE_TABS: { scope: IssueScope; label: string }[] = [
  { scope: "mine", label: "Assigned to me" },
  { scope: "all", label: "Search all" },
];

const STATUS_CATEGORY_ORDER: StatusCategory[] = ["indeterminate", "new", "done"];

type StatusFilter = StatusCategory | "all";

interface IssuesScreenProps extends PluginScreenProps {
  openSettings(): void;
}

function sortByStatusCategory(issues: JiraIssue[]): JiraIssue[] {
  return issues.toSorted(
    (a, b) => STATUS_CATEGORY_ORDER.indexOf(a.statusCategory) - STATUS_CATEGORY_ORDER.indexOf(b.statusCategory),
  );
}

function countByStatusCategory(issues: JiraIssue[]): Record<StatusCategory, number> {
  const countsByCategory: Record<StatusCategory, number> = { indeterminate: 0, new: 0, done: 0 };
  for (const issue of issues) countsByCategory[issue.statusCategory] += 1;
  return countsByCategory;
}

function useDebouncedValue(value: string): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debouncedValue;
}

export function IssuesScreen({ theme, layout, navigation, openSettings }: IssuesScreenProps) {
  const searchIssues = useRpc(searchIssuesRpc);
  const starter = useStartTicketWorkspace({ navigation });
  const [scope, setScope] = useState<IssueScope>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const debouncedQuery = useDebouncedValue(query);
  const issues = useQuery({
    queryKey: ["issues", scope, debouncedQuery],
    queryFn: () => searchIssues({ scope, query: debouncedQuery }),
  });
  const allIssues = issues.data?.issues ?? [];
  const countsByCategory = useMemo(() => countByStatusCategory(allIssues), [allIssues]);
  const visibleIssues = useMemo(
    () => sortByStatusCategory(allIssues.filter((issue) => statusFilter === "all" || issue.statusCategory === statusFilter)),
    [allIssues, statusFilter],
  );
  const isWide = !layout.compact;
  const nowMs = Date.now();

  const styles = useMemo(
    () => ({
      screen: { flex: 1, padding: layout.compact ? 12 : 20, gap: 10, backgroundColor: theme.colors.surface0 },
      toolbar: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
      chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
      activeChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: theme.colors.surface2 },
      chipText: { color: theme.colors.foregroundMuted, fontSize: 13 },
      activeChipText: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600" as const },
      search: {
        flex: 1,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: theme.colors.surface1,
      },
      searchInput: { flex: 1, height: 34, color: theme.colors.foreground, fontSize: 13 },
      iconButton: {
        width: 34,
        height: 34,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      table: { flex: 1, minHeight: 0, borderRadius: 10, backgroundColor: theme.colors.surface1 },
      headerRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      headerText: { color: theme.colors.foregroundMuted, fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      keyCell: { width: layout.compact ? 96 : COLUMN_WIDTHS.key, flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
      keyText: { color: theme.colors.foregroundMuted, fontSize: 12 },
      titleCell: { flex: 1, gap: 2 },
      title: { color: theme.colors.foreground, fontSize: 13, fontWeight: "500" as const },
      context: { color: theme.colors.foregroundMuted, fontSize: 12 },
      assigneeCell: { width: COLUMN_WIDTHS.assignee, flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
      mutedText: { color: theme.colors.foregroundMuted, fontSize: 12 },
      statusCell: { width: layout.compact ? undefined : COLUMN_WIDTHS.status },
      updatedCell: { width: COLUMN_WIDTHS.updated },
      actionCell: { width: COLUMN_WIDTHS.action, alignItems: "flex-end" as const },
      startButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
      },
      startText: { color: theme.colors.foreground, fontSize: 12, fontWeight: "600" as const },
      hint: { color: theme.colors.foregroundMuted, padding: 14 },
      error: { color: theme.colors.statusDanger },
      link: { color: theme.colors.accent },
    }),
    [theme, layout.compact],
  );

  const statusChips: { filter: StatusFilter; label: string }[] = [
    { filter: "all", label: `All ${allIssues.length}` },
    ...STATUS_CATEGORY_ORDER.filter((category) => countsByCategory[category] > 0).map((category) => ({
      filter: category,
      label: `${STATUS_CATEGORY_LABELS[category]} ${countsByCategory[category]}`,
    })),
  ];

  function renderChip({ isActive, label, onPress }: { isActive: boolean; label: string; onPress(): void }) {
    return (
      <Pressable
        key={label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        style={isActive ? styles.activeChip : styles.chip}
        onPress={onPress}
      >
        <Text style={isActive ? styles.activeChipText : styles.chipText}>{label}</Text>
      </Pressable>
    );
  }

  function renderStartButton(issue: JiraIssue) {
    const isStarting = starter.startingIssueKey === issue.key;
    const canStart = Boolean(starter.buildDefaultDraft(issue)) && !starter.startingIssueKey;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start workspace for ${issue.key}`}
        disabled={!canStart}
        onPress={() => starter.start({ issue })}
        style={({ pressed }) => [styles.startButton, (pressed || isStarting) && { backgroundColor: theme.colors.surface2 }]}
      >
        <Text style={styles.startText}>{isStarting ? "Starting…" : "Start →"}</Text>
      </Pressable>
    );
  }

  function renderIssue({ item }: { item: JiraIssue }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.key}, ${item.status}. Open details`}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surface2 }]}
        onPress={() => setSelectedIssue(item)}
      >
        <View style={styles.keyCell}>
          <IssueTypeIcon theme={theme} issueType={item.issueType} />
          <Text style={styles.keyText}>{item.key}</Text>
        </View>
        <View style={styles.titleCell}>
          <Text style={styles.title} numberOfLines={1}>
            {item.summary}
          </Text>
          <Text style={styles.context} numberOfLines={1}>
            {item.issueType} · {item.context}
          </Text>
        </View>
        {isWide ? (
          <View style={styles.assigneeCell}>
            {item.assigneeName ? (
              <>
                <AssigneeAvatar theme={theme} name={item.assigneeName} avatarUrl={item.assigneeAvatarUrl} />
                <Text style={styles.mutedText} numberOfLines={1}>
                  {item.assigneeName}
                </Text>
              </>
            ) : (
              <Text style={styles.mutedText}>–</Text>
            )}
          </View>
        ) : null}
        <View style={styles.statusCell}>
          <StatusBadge theme={theme} status={item.status} category={item.statusCategory} />
        </View>
        {isWide ? (
          <Text style={[styles.mutedText, styles.updatedCell]}>
            {formatRelativeTime({ isoDate: item.updatedAt, nowMs })}
          </Text>
        ) : null}
        <View style={styles.actionCell}>{renderStartButton(item)}</View>
      </Pressable>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.keyCell]}>ID</Text>
        <Text style={[styles.headerText, styles.titleCell]}>TITLE / CONTEXT</Text>
        {isWide ? <Text style={[styles.headerText, styles.assigneeCell]}>ASSIGNEE</Text> : null}
        <Text style={[styles.headerText, styles.statusCell]}>STATUS</Text>
        {isWide ? <Text style={[styles.headerText, styles.updatedCell]}>UPDATED</Text> : null}
        <View style={styles.actionCell} />
      </View>
    );
  }

  function renderEmptyList() {
    if (issues.isPending) return <Text style={styles.hint}>Loading…</Text>;
    if (issues.isSuccess) return <Text style={styles.hint}>No issues.</Text>;
    return null;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        {SCOPE_TABS.map((tab) =>
          renderChip({ isActive: tab.scope === scope, label: tab.label, onPress: () => {
            setScope(tab.scope);
            setStatusFilter("all");
          },
        }),
        )}
      </View>
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Icon name="Search" size={14} color={theme.colors.foregroundMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="ABC-123 or text"
            placeholderTextColor={theme.colors.foregroundMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")}>
              <Icon name="X" size={14} color={theme.colors.foregroundMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh issues"
          style={styles.iconButton}
          onPress={() => void issues.refetch()}
        >
          <Icon name="RefreshCw" size={14} color={theme.colors.foreground} />
        </Pressable>
      </View>
      <View style={styles.toolbar}>
        {statusChips.map((chip) =>
          renderChip({ isActive: chip.filter === statusFilter, label: chip.label, onPress: () => setStatusFilter(chip.filter) }),
        )}
      </View>
      {issues.error ? (
        <View style={{ gap: 4 }}>
          <Text style={styles.error}>{issues.error.message}</Text>
          <Pressable accessibilityRole="link" onPress={openSettings}>
            <Text style={styles.link}>Open Jira settings</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.table}>
        {renderHeader()}
        <FlatList
          style={{ flex: 1, minHeight: 0 }}
          data={visibleIssues}
          keyExtractor={(issue) => issue.key}
          renderItem={renderIssue}
          ListEmptyComponent={renderEmptyList()}
        />
      </View>
      <IssueDetailModal theme={theme} issue={selectedIssue} starter={starter} onClose={() => setSelectedIssue(null)} />
    </View>
  );
}
