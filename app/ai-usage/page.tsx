import { redirect } from 'next/navigation';

/**
 * Moved under Statistics. Kept as a redirect rather than deleted: this path was
 * linked from the sidebar for months and is the kind of URL people bookmark.
 */
export default function LegacyAiUsagePage() {
  redirect('/statistics/ai-usage');
}
