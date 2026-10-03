'use client'

import Link from 'next/link'

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5] text-brand-textPrimary">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Account Pending Approval</h1>
            <p className="mt-2 text-sm text-brand-textMuted">
              Your account is currently under review by our admin team.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-6">
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-400"></div>
                <div>
                  <p className="font-semibold">What happens next?</p>
                  <p className="text-sm text-brand-textMuted">Our admin team will review your application and approve it within 24-48 hours.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400"></div>
                <div>
                  <p className="font-semibold">How will I know?</p>
                  <p className="text-sm text-brand-textMuted">You will receive an email notification once your account is approved.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-green-400"></div>
                <div>
                  <p className="font-semibold">Need help?</p>
                  <p className="text-sm text-brand-textMuted">Contact us at <a href="mailto:support@nccamp.in" className="text-[#B9A8FF] hover:underline">support@nccamp.in</a> for any questions.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-white border border-brand-border shadow-sm px-4 py-2.5 text-sm font-semibold hover:bg-white border border-brand-border shadow-sm transition-colors"
              >
                Check Status
              </button>
              
              <Link
                href="/partner/login"
                className="block w-full rounded-xl border border-brand-border px-4 py-2.5 text-center text-sm font-semibold hover:bg-white border border-brand-border shadow-sm transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-brand-border bg-[#F0F2F5] px-4 py-4 text-center text-xs text-[#A9A9BE]">
        (c) 2026 NCCamp. All rights reserved.
      </footer>
    </div>
  )
}

