import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/matches');
  return (
    <div className="mx-auto max-w-sm pt-12">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Sign in</h1>
      <LoginForm />
    </div>
  );
}
