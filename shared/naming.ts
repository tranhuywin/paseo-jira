const SLUG_WORD_LIMIT = 5;

const STOP_WORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "for", "and", "or",
  "with", "is", "are", "be", "when", "from", "by", "at", "as", "not",
]);

interface TicketNameInput {
  key: string;
  summary: string;
  issueType: string;
  bugBranchPrefix: string;
  featureBranchPrefix: string;
}

export interface WorktreeNameSuggestion {
  branchName: string;
  worktreeSlug: string;
  title: string;
}

function computeSummarySlug(summary: string): string {
  const words = summary
    .replace(/\[[^\]]*\]/g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !STOP_WORDS.has(word));
  return words.slice(0, SLUG_WORD_LIMIT).join("-") || "work";
}

export function suggestWorktreeNames({
  key,
  summary,
  issueType,
  bugBranchPrefix,
  featureBranchPrefix,
}: TicketNameInput): WorktreeNameSuggestion {
  const ticketKey = key.toUpperCase();
  const slug = computeSummarySlug(summary);
  const prefix = issueType.toLowerCase() === "bug" ? bugBranchPrefix : featureBranchPrefix;
  return {
    branchName: `${prefix}/${ticketKey}-${slug}`,
    worktreeSlug: `${ticketKey.toLowerCase()}-${slug}`,
    title: `${ticketKey} ${summary}`,
  };
}

export function renderAgentPrompt({ template, key }: { template: string; key: string }): string {
  return template.replaceAll("{key}", key.toUpperCase());
}
