import { proxy } from '@/lib/proxy';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/job-queries/${id}`, { method: 'DELETE' });
}
