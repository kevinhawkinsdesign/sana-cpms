'use client';

/** Invitation accept page (KAB-133). Opened from the invite email
 *  (/{country}/invite?token=…). Reads the public preview endpoint (KAB-132) and
 *  branches into five states:
 *    1. invalid / expired / revoked / accepted  → error card
 *    2. logged in + email matches               → one-click Accept
 *    3. logged in + wrong email                 → switch-account
 *    4. logged out + has account                → Login CTA (token preserved)
 *    5. logged out + no account                 → signup-with-token (email locked)
 *  On success we adopt the joined org and land in the console. */
import React, { Suspense, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import {
  registerWithInvite,
  useAcceptInvitation,
  usePreviewInvitation,
  verifyInviteSignup,
  roleLabel,
  type InvitationPreview,
} from '@/lib/console/team';
import { useSwitchOrg } from '@/lib/console/orgs';

function Spinner() {
  return (
    <svg className="mx-auto h-7 w-7 animate-spin text-[#0E159A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Shell({
  title,
  body,
  spinning,
  children,
}: Readonly<{ title: string; body?: string; spinning?: boolean; children?: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-[#111111]">
        {spinning ? <Spinner /> : null}
        <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        {body ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{body}</p> : null}
        {children}
      </div>
    </div>
  );
}

const btnPrimary =
  'mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#0E159A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60';
const inputCls =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0E159A] disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-[#0c0c0c] dark:text-white dark:disabled:bg-[#181818]';

/** State 5: brand-new invitee — email-code signup with the email locked to the
 *  invite, carrying the token through register + verify so the org auto-joins. */
function SignupWithToken({
  token,
  preview,
  onDone,
}: Readonly<{ token: string; preview: InvitationPreview; onDone: () => void }>) {
  const email = preview.email ?? '';
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { applyExternalSession } = useAuth();

  const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await registerWithInvite({ email, firstName, lastName, inviteToken: token });
      setStep('code');
    } catch (err) {
      setError(errMsg(err, "Couldn't start your sign-up. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await verifyInviteSignup({ email, code: code.trim(), inviteToken: token });
      const joined = !res.invite || res.invite.joined;
      // Adopting the session flips isAuthenticated, which re-renders the parent
      // and unmounts THIS form — so we must not touch local state afterwards.
      applyExternalSession(res.user, res.tokens);
      if (joined) {
        onDone(); // org joined → straight to the console
      }
      // If the auto-join didn't apply (rare: invite revoked/expired in the gap),
      // we intentionally do nothing here: the parent now re-renders authenticated
      // with a matching email and shows the Accept flow, which retries the join
      // and surfaces the real error there.
    } catch (err) {
      setError(errMsg(err, 'That code was not accepted. Check it and try again.'));
      setBusy(false);
    }
  };

  return (
    <Shell
      title={`Join ${preview.orgName ?? 'the organization'}`}
      body={
        step === 'details'
          ? `You're invited as ${preview.role ? roleLabel(preview.role) : 'a member'}. Create your account to continue.`
          : `We emailed a 6-digit code to ${email}. Enter it to finish.`
      }
    >
      {step === 'details' ? (
        <form onSubmit={submitDetails} className="mt-6 text-left">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Email
            <input className={inputCls} type="email" value={email} disabled readOnly />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              First name
              <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </label>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Last name
              <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          </div>
          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Sending code…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-6 text-left">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Verification code
            <input
              className={`${inputCls} tracking-[0.4em]`}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
            />
          </label>
          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          <button type="submit" className={btnPrimary} disabled={busy || code.trim().length < 6}>
            {busy ? 'Verifying…' : 'Verify & join'}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            Didn&apos;t get the code? Check your spam folder, or refresh this page to sign in instead.
          </p>
        </form>
      )}
    </Shell>
  );
}

function InviteFlow() {
  const params = useParams();
  const country = typeof params?.country === 'string' ? params.country : 'rw';
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const preview = usePreviewInvitation(token || null);
  const accept = useAcceptInvitation();
  const switchOrg = useSwitchOrg();

  const base = `/${country}`;
  const toConsole = () => router.replace(`${base}/console`);
  const callbackUrl = `${base}/invite?token=${encodeURIComponent(token)}`;
  const loginHref = `${base}/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  // ---- guards / loading ----
  if (!token) {
    return <Shell title="Invalid invitation link" body="This link is missing its token. Ask an admin to resend the invitation." />;
  }
  if (preview.isPending) {
    return <Shell title="Loading your invitation…" spinning />;
  }
  if (preview.isError || !preview.data) {
    return (
      <Shell title="Couldn't load this invitation" body="Please try again in a moment.">
        <button type="button" onClick={() => preview.refetch()} className={btnPrimary}>Retry</button>
      </Shell>
    );
  }

  const p = preview.data;

  // ---- state 1: non-actionable token ----
  if (p.status !== 'PENDING') {
    const copy: Record<string, { title: string; body: string }> = {
      EXPIRED: { title: 'This invitation has expired', body: 'Ask an admin to send you a fresh invitation.' },
      REVOKED: { title: 'This invitation was revoked', body: 'Ask an admin to send you a new one if this is unexpected.' },
      ACCEPTED: { title: 'This invitation was already used', body: 'You may already be a member — try signing in.' },
      INVALID: { title: 'Invalid invitation link', body: 'This invitation link is not valid. Ask an admin to resend it.' },
    };
    const c = copy[p.status] ?? copy.INVALID;
    return (
      <Shell title={c.title} body={c.body}>
        <a href={loginHref} className={btnPrimary}>Go to sign in</a>
      </Shell>
    );
  }

  // A PENDING invite must carry an email; a null here is a degraded backend state
  // — treat it as invalid rather than rendering "null" or driving a broken
  // (empty-email) signup form below.
  if (!p.email) {
    return <Shell title="Invalid invitation link" body="This invitation is missing required details. Ask an admin to resend it." />;
  }

  // ---- pending: wait for auth to resolve ----
  if (authLoading) {
    return <Shell title="One moment…" spinning />;
  }

  const roleText = p.role ? roleLabel(p.role) : 'a member';

  // ---- authenticated ----
  if (isAuthenticated) {
    // Match only on a real email. A user with no email (e.g. phone-only signup)
    // can never satisfy the backend's email-match check, so they fall through to
    // the "different account" path and are guided to sign in with the invited
    // email — never silently compared against an empty string.
    const myEmail = user?.email?.toLowerCase() || null;
    const myIdentity = user?.email ?? user?.phone ?? 'another account';
    const matches = !!p.email && !!myEmail && myEmail === p.email.toLowerCase();

    // state 3: wrong account
    if (!matches) {
      return (
        <Shell
          title="This invite is for a different account"
          body={`It was sent to ${p.email}, but you're signed in as ${myIdentity}. Sign in with the invited email to accept.`}
        >
          <button
            type="button"
            onClick={() => logout(loginHref)}
            className={btnPrimary}
          >
            Sign in with a different account
          </button>
        </Shell>
      );
    }

    // state 2: matching account → one-click accept
    if (accept.isError) {
      const msg = accept.error instanceof Error && accept.error.message ? accept.error.message : 'The invitation may have expired or already been used.';
      return (
        <Shell title="Couldn't accept the invitation" body={msg}>
          <button type="button" onClick={toConsole} className={btnPrimary}>Go to console</button>
        </Shell>
      );
    }
    if (switchOrg.isError) {
      return (
        <Shell title="You've joined the organization" body="We couldn't switch you to it automatically — pick it from the organization switcher in the console.">
          <button type="button" onClick={toConsole} className={btnPrimary}>Go to console</button>
        </Shell>
      );
    }
    if (accept.isSuccess || switchOrg.isPending) {
      return <Shell title="Joining…" body="Taking you to the console." spinning />;
    }

    return (
      <Shell title={`Join ${p.orgName ?? 'the organization'}`} body={`You've been invited as ${roleText}.`}>
        <button
          type="button"
          disabled={accept.isPending}
          onClick={() =>
            accept.mutate(token, {
              onSuccess: ({ orgId }) => switchOrg.mutate(orgId, { onSuccess: toConsole }),
            })
          }
          className={btnPrimary}
        >
          {accept.isPending ? 'Accepting…' : 'Accept invitation'}
        </button>
      </Shell>
    );
  }

  // ---- not authenticated ----
  // state 4: existing account → login (token preserved via callbackUrl)
  if (p.hasAccount) {
    return (
      <Shell title={`Join ${p.orgName ?? 'the organization'}`} body={`You've been invited as ${roleText}. Sign in to accept — we'll bring you right back.`}>
        <a href={loginHref} className={btnPrimary}>Log in to accept</a>
      </Shell>
    );
  }

  // state 5: brand-new invitee → signup with token
  return <SignupWithToken token={token} preview={p} onDone={toConsole} />;
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<Shell title="Loading…" spinning />}>
      <InviteFlow />
    </Suspense>
  );
}
