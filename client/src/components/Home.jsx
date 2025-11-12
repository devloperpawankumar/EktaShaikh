import React from 'react';
import humsafarPreview from '../assests/images/humsafar.png';
import Exhibit1 from '../assests/images/pic1.jpg';
import Exhibit2 from '../assests/images/pic2.jpg';
import Exhibit3 from '../assests/images/pic3.jpg';

const sections = [
  {
    id: 'about',
    title: 'About the Project',
    description:
      'This website extends an at-home exhibition held on April 26, 2025, which explored how memory, care, and distance intersect through acts of listening. The exhibit unfolded in two parts: an online archive of family oral histories, Humsafar, and an in-person phone booth that invited visitors to “invite the one you cannot touch.”',
  },
  {
    id: 'how-to',
    title: 'How to Use the Website',
    description:
      'The voice messages recorded in the booth now form the heart of this digital archive.',
  },
  {
    id: 'consent',
    title: 'Consent & Removal',
    description:
      'By submitting a recording, you consent to its inclusion in this project for research, presentation, and publication purposes. You may request the removal of your recording or transcript at any time by contacting ektashaikh24@gmail.com',
  },
];

const exhibitImages = [
  {
    src: Exhibit1,
 
  },
  {
    src: Exhibit2,

  },
  {
    src: Exhibit3,
  
  },
];

export default function Home() {
  return (
    <div className="bg-black text-white">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-20 px-6 py-16 md:px-10 lg:px-16">
        <header className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-rose-300">
            Geographies of Intimacy
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
             An Archive of Care, Distance, and Connection
          </h1>
          {/* <p className="mx-auto max-w-3xl text-lg text-gray-300">
            Map desire lines, domestic rituals, and cross-border kinships. This home
            page orients visitors before they explore the immersive archive.
          </p> */}
        </header>

        <section
          className="grid gap-10 rounded-3xl bg-gray-900/60 p-10 "
          id="about"
        >
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">About the Project</h2>
            <p className="text-gray-300">
              {sections.find((section) => section.id === 'about')?.description}
            </p>
          </div>
          {/* <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-400/20 via-rose-200/10 to-sky-400/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.25),_transparent_60%)]" />
            <div className="relative p-8">
              <blockquote className="text-lg italic text-gray-200">
                “We make a path by walking it. Every memory becomes a desire line.”
              </blockquote>
              <p className="mt-6 text-sm uppercase tracking-[0.3em] text-gray-400">
                Sara Ahmed · Queer Phenomenology
              </p>
            </div>
          </div> */}
        </section>

        <section
          className="space-y-6 rounded-3xl border border-white/10 bg-gray-900/40 p-10"
          id="embed"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Experience Humsafar</h2>
              <br />
              <p className="max-w-3xl text-gray-300">
                Before entering the booth, you are welcome to scroll through the Humsafar
                website below and browse images from the event to get a sense of how the
                physical installation was spatialized and experienced.
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full border border-rose-400/40 px-6 py-3 text-sm uppercase tracking-[0.25em] text-rose-300 transition hover:-translate-y-0.5 hover:border-rose-300 hover:text-rose-200"
              href="https://humsafar.sandbox.library.columbia.edu/"
              target="_blank"
              rel="noreferrer"
            >
              Open Site
            </a>
          </div>
          <a
            href="https://humsafar.sandbox.library.columbia.edu/"
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden rounded-2xl shadow-2xl shadow-rose-500/20 ring-1 ring-white/10 transition hover:-translate-y-1"
          >
            <div className="relative">
              <img
                src={humsafarPreview}
                alt="Preview of the Humsafar website interface"
                className="w-full rounded-2xl object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full border border-white/40 px-5 py-2 text-xs uppercase tracking-[0.35em] text-white">
                  View Live
                </span>
              </div>
            </div>
          </a>
        </section>

        <section
          className="space-y-8 rounded-3xl bg-gray-900/60 p-10"
          id="exhibit"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold uppercase tracking-[0.18em]">
                At-Home Exhibit
              </h2>
              {/* <p className="text-gray-300">
                Curate three domestic vignettes that mirror the textures of companionship.
              </p> */}
            </div>
            {/* <span className="text-xs uppercase tracking-[0.35em] text-gray-400">
              Swap these with your archival stills
            </span> */}
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {exhibitImages.map((image) => (
              <a
                key={image.caption}
                href={image.src}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-2xl bg-gray-800 ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-rose-400/40"
              >
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="rounded-full border border-white/40 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white">
                        View Full Image
                      </span>
                    </div>
                  </div>
                  <figcaption className="p-4 text-sm text-gray-200">
                    {image.caption}
                  </figcaption>
                </figure>
              </a>
            ))}
          </div>
        </section>

        <section
          className="grid gap-10 rounded-3xl border border-white/10 bg-gray-900/40 p-10 lg:grid-cols-2"
          id="how-to-use"
        >
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">How to Use the Website</h2>
            <p className="text-gray-300">
              {sections.find((section) => section.id === 'how-to')?.description}
            </p>
          </div>
          <ol className="space-y-5 text-gray-300">
            <p className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 leading-7">
              <span className="font-semibold text-rose-300">01 · Booth Page</span> — The booth features a digital dial pad with numbers 1–29. Each number corresponds to one of the voice notes recorded on the day of the exhibition. Cpcking a number allows you to psten to the audio and read an ethnopoetic transcription I created for each note—attentive to rhythm, pauses, and tone.
            </p>
            <p className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 leading-7">
              <span className="font-semibold text-rose-300">02 · Record Page</span> — This page extends the booth into the digital realm. Here, you can record your own message, edit its transcript, and in doing so, co-create and contribute to the pving archive.
            </p>
            <p className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 leading-7">
              <span className="font-semibold text-rose-300">03 · Archive Page</span> — The Archive Page holds 29 voice notes from the original exhibit, alongside new recordings added here on the Record Page, creating an evolving digital archive of care, distance, and connection.
            </p>
          </ol>
        </section>

        <section
          className="space-y-4 rounded-3xl bg-gradient-to-br from-gray-900/70 via-black to-gray-900/70 p-10 ring-1 ring-white/10"
          id="consent"
        >
          <h2 className="text-2xl font-semibold">Consent & Removal</h2>
          <p className="text-gray-300">
            {sections.find((section) => section.id === 'consent')?.description}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm uppercase tracking-[0.22em] text-gray-400">
                Contact
              </h3>
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
              <h3 className="text-sm uppercase tracking-[0.22em] text-gray-400">
                Process
              </h3>
              <p className="mt-3 text-gray-200">
                Removal or revision requests are acknowledged within 72 hours. Together we
                will confirm details, document the change, and honor the update in the
                archive and any future presentations.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
