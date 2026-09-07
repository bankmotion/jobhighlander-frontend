import { Fragment } from 'react';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wrap a keyword in word boundaries ONLY where its own edge is a word
 * character.
 *
 * The whole pattern used to be `\b(a|b|c)\b`, which quietly broke every keyword
 * that starts or ends with punctuation. `\b` is the boundary between a word
 * character and a non-word one, so for "$" it asks for a word character
 * immediately outside a symbol — in "Budget: $120,000" the "$" is preceded by a
 * space, and the match fails. The same took out "C++", "C#" and ".NET": they
 * looked like ordinary keywords in the manager and simply never highlighted.
 *
 * Deciding per edge keeps what the boundaries were there for — "cat" must not
 * light up inside "concatenate" — while letting a symbol match where it sits.
 */
function bounded(word: string): string {
  const escaped = escapeRegExp(word);
  const left = /^\w/.test(word) ? '\\b' : '';
  const right = /\w$/.test(word) ? '\\b' : '';
  return `${left}${escaped}${right}`;
}

export function HighlightedText({ text, words }: { text: string; words: string[] }) {
  const clean = words.map((w) => w.trim()).filter(Boolean);
  if (!text || clean.length === 0) return <>{text}</>;

  const wordSet = new Set(clean.map((w) => w.toLowerCase()));
  // Longest first so "Node.js" wins over a bare "Node" — alternation takes the
  // first branch that matches, not the longest.
  const pattern = clean
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(bounded)
    .join('|');
  const parts = text.split(new RegExp(`(${pattern})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part && wordSet.has(part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-amber-400/25 px-1 font-semibold text-amber-300">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
