import { redirect } from 'next/navigation';

export default function LegacyAiUsagePage() {
  redirect('/statistics/ai-usage');
}
