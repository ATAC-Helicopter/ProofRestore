import type { InterpretInput, InterpretedRecoveryRequest } from "./types";

function tokens(value: string): string[] {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function resolveCandidate(
  query: string,
  candidates: string[],
): string | undefined {
  const queryTokens = new Set(tokens(query));
  const aliases = query.toLowerCase().includes("thesis") ? ["thesis"] : [];

  return candidates
    .map((candidate) => {
      const candidateTokens = tokens(candidate);
      const score = candidateTokens.filter(
        (token) => queryTokens.has(token) || aliases.includes(token),
      ).length;
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate),
    )[0]?.candidate;
}

function previousWeekdayEvening(reference: Date, weekday: number): Date {
  const result = new Date(reference);
  const delta = (result.getUTCDay() - weekday + 7) % 7;
  result.setUTCDate(result.getUTCDate() - delta);
  result.setUTCHours(19, 0, 0, 0);
  if (result.getTime() > reference.getTime())
    result.setUTCDate(result.getUTCDate() - 7);
  return result;
}

function parseRequestedDate(
  query: string,
  reference: Date,
): {
  value?: string;
  interpretation?: string;
} {
  const iso = query.match(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?Z)?\b/);
  if (iso) {
    const normalized = iso[0].includes("T")
      ? iso[0]
      : `${iso[0]}T23:59:59.000Z`;
    const value = new Date(normalized);
    if (!Number.isNaN(value.getTime())) {
      return {
        value: value.toISOString(),
        interpretation: `Explicit date ${iso[0]}`,
      };
    }
  }

  if (/\btuesday(?: evening)?\b/i.test(query)) {
    return {
      value: previousWeekdayEvening(reference, 2).toISOString(),
      interpretation:
        "Tuesday evening interpreted as 19:00 UTC on the latest prior Tuesday",
    };
  }

  return {};
}

export function interpretWithoutModel(
  input: InterpretInput,
): InterpretedRecoveryRequest {
  const query = input.query.trim();
  const reference = new Date(input.referenceDateTime);
  const resolvedPath = resolveCandidate(query, input.pathCandidates);
  const requested = parseRequestedDate(query, reference);
  const isConflictQuery = /overwrite|conflict/i.test(query);
  const isUnrecoverableQuery =
    /unrecoverable|cannot recover|no longer recover/i.test(query);
  const isHistoryQuery = /history|versions?|timeline/i.test(query);
  const needsPath = !isConflictQuery && !isUnrecoverableQuery;
  const needsClarification =
    query.length === 0 ||
    Number.isNaN(reference.getTime()) ||
    (needsPath && !resolvedPath);

  return {
    intent: isConflictQuery
      ? "show_conflicts"
      : isUnrecoverableQuery
        ? "find_unrecoverable"
        : isHistoryQuery
          ? "inspect_history"
          : "recover_path",
    ...(query ? { pathQuery: query } : {}),
    ...(resolvedPath ? { resolvedPath } : {}),
    ...(requested.value ? { requestedDateTime: requested.value } : {}),
    ...(requested.interpretation
      ? { dateInterpretation: requested.interpretation }
      : {}),
    includeChildren: resolvedPath?.endsWith("/") ?? false,
    destinationMode: /original location|overwrite/i.test(query)
      ? "original_location"
      : "safe_copy",
    needsClarification,
    ...(needsClarification
      ? {
          clarificationQuestion: query.length
            ? "Which protected file or folder do you mean?"
            : "What do you need to recover?",
        }
      : {}),
  };
}
