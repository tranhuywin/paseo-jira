import { type PluginSurfaceProps, useRpc, useSettings } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import {
  SettingsAction,
  SettingsCard,
  SettingsInput,
  SettingsSection,
} from "@getpaseo/plugin/client/ui";
import { useState } from "react";
import { Text, View } from "react-native";
import { testConnectionRpc } from "../shared/jira";
import { type JiraSettings, jiraSettings } from "../shared/settings";

interface SettingsField {
  field: keyof JiraSettings;
  label: string;
  hint?: string;
  isSecret?: boolean;
}

const CONNECTION_FIELDS: SettingsField[] = [
  { field: "siteUrl", label: "Site URL", hint: "https://your-site.atlassian.net" },
  { field: "email", label: "Email" },
  {
    field: "apiToken",
    label: "API token",
    hint: "id.atlassian.com → Security → API tokens. Stored as plain JSON in ~/.paseo.",
    isSecret: true,
  },
];

const QUERY_FIELDS: SettingsField[] = [
  { field: "myIssuesJql", label: "My issues JQL" },
  { field: "searchScopeJql", label: "Search scope JQL", hint: "Must be bounded, for example project in (ABC)." },
];

const WORKTREE_FIELDS: SettingsField[] = [
  { field: "defaultProjectPath", label: "Default project path", hint: "Empty picks the first git project." },
  { field: "bugBranchPrefix", label: "Bug branch prefix", hint: "Branch becomes <prefix>/<KEY>-<slug>." },
  { field: "featureBranchPrefix", label: "Other branch prefix" },
  { field: "baseRef", label: "Base ref" },
  { field: "agentProvider", label: "Agent provider", hint: "provider/model" },
  { field: "agentPromptTemplate", label: "Agent prompt", hint: "{key} becomes the ticket key." },
];

export function JiraSettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(jiraSettings);
  const testConnection = useRpc(testConnectionRpc);
  const toast = useToast();
  const [draft, setDraft] = useState<JiraSettings | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (settings.status === "loading") {
    return <Text style={{ color: theme.colors.foregroundMuted }}>Loading…</Text>;
  }
  if (settings.status !== "ready") {
    return (
      <SettingsCard>
        <SettingsAction label={settings.error} actionLabel="Reset" onPress={() => void settings.reset()} />
      </SettingsCard>
    );
  }

  const values = draft ?? settings.values;
  const { revision } = settings;

  async function handleSave() {
    if (!(await settings.save(values, revision))) return;
    setDraft(null);
    toast.show("Jira settings saved", { variant: "success" });
  }

  async function handleTestConnection() {
    setIsTesting(true);
    try {
      const { displayName } = await testConnection({});
      toast.show(`Connected as ${displayName}`, { variant: "success" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(false);
    }
  }

  function renderFields(fields: SettingsField[]) {
    return fields.map(({ field, label, hint, isSecret }) => (
      <SettingsInput
        key={field}
        label={label}
        hint={hint}
        initialValue={values[field]}
        secureTextEntry={isSecret}
        onChangeText={(text) => setDraft({ ...values, [field]: text })}
      />
    ));
  }

  return (
    <View style={{ gap: 24 }}>
      <SettingsSection title="Connection">
        <SettingsCard>{renderFields(CONNECTION_FIELDS)}</SettingsCard>
      </SettingsSection>
      <SettingsSection title="Queries">
        <SettingsCard>{renderFields(QUERY_FIELDS)}</SettingsCard>
      </SettingsSection>
      <SettingsSection title="Worktree">
        <SettingsCard>{renderFields(WORKTREE_FIELDS)}</SettingsCard>
      </SettingsSection>
      <SettingsCard>
        <SettingsAction
          label="Save changes"
          error={settings.saveError}
          actionLabel={settings.saving ? "Saving…" : "Save"}
          disabled={!draft || settings.saving}
          onPress={() => void handleSave()}
        />
        <SettingsAction
          label="Test connection"
          hint="Uses the saved values."
          actionLabel={isTesting ? "Testing…" : "Test"}
          disabled={isTesting || Boolean(draft)}
          onPress={() => void handleTestConnection()}
        />
      </SettingsCard>
    </View>
  );
}
