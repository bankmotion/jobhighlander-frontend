import { proxy } from '@/lib/proxy';

/** Which of ?jobIds= already have a letter for ?profileId=. */
export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/cover-letters/status?${qs}`);
}
