import { Fragment } from 'react';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function HighlightedText({ text, words }: { text: string; words: string[] }) {
  const clean = words.map((w) => w.trim()).filter(Boolean);
  if (!text || clean.length === 0) return <>{text}</>;

  const wordSet = new Set(clean.map((w) => w.toLowerCase()));
  const pattern = clean
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const parts = text.split(new RegExp(`\\b(${pattern})\\b`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        wordSet.has(part.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded bg-amber-400/25 px-1 font-semibold text-amber-300"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
