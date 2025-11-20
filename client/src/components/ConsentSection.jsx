import React from 'react'

const CONSENT_DESCRIPTION =
  'By submitting a recording, you consent to its inclusion in this project for research, presentation, and publication purposes. You may request the removal of your recording or transcript at any time by contacting ektashaikh24@gmail.com.'

export default function ConsentSection({ id = 'consent', className = '' }) {
  const sectionClassName = [
    'space-y-4 rounded-3xl bg-gradient-to-br from-gray-900/70 via-black to-gray-900/70 p-10 ring-1 ring-white/10',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section id={id} className={sectionClassName}>
      <h2 className="text-2xl font-semibold">Consent & Removal</h2>
      <p className="text-gray-300">{CONSENT_DESCRIPTION}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-6">
          <h3 className="text-sm uppercase tracking-[0.22em] text-gray-400">Contact</h3>
          <p className="mt-3 text-gray-200">
            Reach out anytime at{' '}
            <a
              href="mailto:ektashaikh24@gmail.com"
              className="text-rose-300 underline-offset-4 hover:underline"
            >
              ektashaikh24@gmail.com
            </a>{' '}
            to ask questions or request edits.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 p-6">
          <h3 className="text-sm uppercase tracking-[0.22em] text-gray-400">Process</h3>
          <p className="mt-3 text-gray-200">
            Removal or revision requests are acknowledged within 72 hours. Together we will confirm
            details, document the change, and honor the update in the archive and any future
            presentations.
          </p>
        </div>
      </div>
    </section>
  )
}

