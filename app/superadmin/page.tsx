import { getSession } from '@/lib/auth';
import { fetchUsers } from '@/lib/admin';
import { UserRow } from '@/app/components/user-row';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();
  const users = await fetchUsers().catch(() => []);
  const pending = users.filter((u) => u.role === 'guest').length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">User management</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Approve new sign-ups by assigning a role. {pending > 0 ? `${pending} awaiting approval.` : 'No one is waiting.'}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 text-right font-medium">Balance</th>
              <th className="pb-2 pr-4 font-medium">Last login</th>
              <th className="pb-2 pr-4 font-medium">Joined</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} actorRole={session!.role} selfId={session!.sub} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
