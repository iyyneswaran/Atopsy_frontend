'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Fingerprint, ShieldCheck, ScanLine } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { Button, Logo, SuccessMark } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';

export function AuthForm({ signup = false }: { signup?: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (auth.user) router.replace('/overview');
  }, [auth.user, router]);
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Logo />
        <div className="auth-story-main">
          <div className="eyebrow">
            <span className="status-dot" /> FORENSIC INVESTIGATION SUITE
          </div>
          <h1>
            Every detail.
            <br />A clearer picture.
          </h1>
          <p>
            A considered workspace for complex investigations.
            <br />
            Connect evidence. Examine findings. Build understanding.
          </p>
          <div className="forensic-motif" aria-hidden="true">
            <div className="motif-ring">
              <Fingerprint size={110} strokeWidth={0.7} />
            </div>
            <span className="motif-label one">SOURCE INTEGRITY</span>
            <span className="motif-label two">EVIDENCE → INSIGHT</span>
            <div className="motif-axis" />
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={17} /> Traceable evidence. Accountable decisions.
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          {success ? (
            <div className="success-panel">
              <SuccessMark />
              <h2>Account created successfully</h2>
              <p>Sign in to begin your first investigation.</p>
              <Link href="/login" className="button button-primary">
                Continue to sign in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-symbol">
                <ScanLine size={26} />
              </div>
              <div className="eyebrow">WELCOME TO ATOPSY</div>
              <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
              <p className="muted">
                {signup
                  ? 'Your investigation workspace starts here.'
                  : 'Sign in to continue your investigations.'}
              </p>
              <form
                className="stack-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  setError('');
                  setBusy(true);
                  const form = new FormData(event.currentTarget);
                  try {
                    if (signup) {
                      await api(
                        '/auth/signup',
                        {
                          method: 'POST',
                          body: JSON.stringify({
                            email: String(form.get('email')).trim(),
                            password: form.get('password'),
                            firstName: String(form.get('firstName')).trim(),
                            lastName: String(form.get('lastName')).trim(),
                          }),
                        },
                        false,
                      );
                      setSuccess(true);
                    } else {
                      await auth.login(
                        String(form.get('email')).trim(),
                        String(form.get('password')),
                      );
                    }
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {signup && (
                  <div className="form-grid">
                    <label>
                      First name
                      <input name="firstName" required maxLength={100} autoComplete="given-name" />
                    </label>
                    <label>
                      Last name
                      <input name="lastName" required maxLength={100} autoComplete="family-name" />
                    </label>
                  </div>
                )}
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@organization.com"
                  />
                </label>
                <label>
                  Password
                  <div className="password-input">
                    <input
                      name="password"
                      aria-label="Password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={signup ? 8 : 1}
                      maxLength={128}
                      pattern={
                        signup
                          ? '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,128}'
                          : undefined
                      }
                      autoComplete={signup ? 'new-password' : 'current-password'}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {signup && (
                    <small className="field-hint">
                      8–128 characters with uppercase, lowercase, a number and one of @$!%*?&.
                    </small>
                  )}
                </label>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" busy={busy} disabled={auth.loading} className="w-full">
                  {signup ? 'Create account' : 'Sign in to workspace'}
                  <ArrowRight size={16} />
                </Button>
              </form>
              <p className="auth-alternate">
                {signup ? 'Already have an account?' : 'New to ATOPSY?'}{' '}
                <Link href={signup ? '/login' : '/signup'}>
                  {signup ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
            </>
          )}
          <div className="auth-note">
            <ShieldCheck size={15} />
            <span>Access is limited to your authorized investigations.</span>
          </div>
        </div>
        <small className="auth-copyright">ATOPSY · Forensic Investigation Suite</small>
      </div>
    </div>
  );
}
