import React from 'react';
import humsafarPreview from '../assests/images/humsafar1.png';
import Exhibit1 from '../assests/images/pic1.jpg';
import Exhibit2 from '../assests/images/pic2.jpg';
import Exhibit3 from '../assests/images/pic3.jpg';
import ConsentSection from './ConsentSection.jsx';

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
          Archiving  Care, Distance, and Connection
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
            >
              Open Site
            </a>
          </div>
          <a
            href="https://humsafar.sandbox.library.columbia.edu/"
            className="group block max-w-3xl mx-auto overflow-hidden rounded-2xl shadow-2xl shadow-rose-500/20 ring-1 ring-white/10 transition hover:-translate-y-1"
          >
            <div className="relative flex items-center justify-center bg-black/20 p-3">
              <img
                src={humsafarPreview}
                alt="Preview of the Humsafar website interface"
                className="h-auto w-full max-h-[38rem] rounded-xl object-contain"
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
          {/* Carousel */}
          {(() => {
            const [currentIdx, setCurrentIdx] = React.useState(0);
            const imageCount = exhibitImages.length;

            const goTo = React.useCallback(
              (n) => {
                setCurrentIdx((prev) =>
                  n < 0 ? imageCount - 1 :
                  n >= imageCount ? 0 : n
                );
              },
              [imageCount]
            );

            return (
              <div className="relative max-w-xl mx-auto">
                <div className="overflow-hidden rounded-2xl bg-gray-800 ring-1 ring-white/10">
                  <figure className="relative aspect-[4/3] flex items-center justify-center transition">
                    <img
                      src={exhibitImages[currentIdx].src}
                      alt={exhibitImages[currentIdx].alt}
                      className="h-full w-full object-cover transition duration-700"
                    />
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-900/70 text-white p-2 rounded-full shadow-md hover:bg-rose-400/70 focus:outline-none focus:ring-2 ring-rose-400"
                      style={{ zIndex: 5 }}
                      type="button"
                      tabIndex={0}
                      aria-label="Previous image"
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(currentIdx - 1);
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                        <path d="M12.5 16L7.5 10L12.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-900/70 text-white p-2 rounded-full shadow-md hover:bg-rose-400/70 focus:outline-none focus:ring-2 ring-rose-400"
                      style={{ zIndex: 5 }}
                      type="button"
                      tabIndex={0}
                      aria-label="Next image"
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(currentIdx + 1);
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                        <path d="M7.5 4L12.5 10L7.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    {/* Removed 'View Full Image' link and full image access as per instructions */}
                  </figure>
                  <figcaption className="p-4 text-sm text-gray-200 text-center">
                    {exhibitImages[currentIdx].caption}
                  </figcaption>
                  <div className="flex justify-center gap-2 pb-4">
                    {exhibitImages.map((_, idx) => (
                      <button
                        key={idx}
                        className={`h-2 w-2 rounded-full ${
                          idx === currentIdx
                            ? 'bg-rose-400'
                            : 'bg-gray-500/40 hover:bg-rose-200'
                        }`}
                        style={{ transition: 'background 0.2s' }}
                        aria-label={`Go to image ${idx + 1}`}
                        onClick={() => setCurrentIdx(idx)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
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
              <span className="font-semibold text-rose-300">01 · Booth Page</span> — The booth stages a stylized digital dial pad, numbered 1–29. Each number corresponds to a 
voice note recorded on the day of the exhibition. Selecting a number opens a small acoustic 
vignette: the audio itself alongside an ethnopoetic transcription I have composed for each note, 
attentive to cadence, pause, repetition, and the grain of the voice
            </p>
            <p className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 leading-7">
              <span className="font-semibold text-rose-300">02 · Record Page</span> — Here, the work continues with you. 
You are invited to leave a message of your own—to record, to listen back, to revise. You may edit 
the transcript, title the piece, and attach an image of your choosing. In doing so, you do not 
simply add content; you co‑author the archive, extending what I think of as an archive in motion 
—built incrementally, through the situated gestures of those who pass through it.
            </p>
            <p className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 leading-7">
              <span className="font-semibold text-rose-300">03 · Archive Page</span> — The archive gathers all recordings made on the day of the exhibition together with the 
messages you leave on this site. It is an evolving repository of voices and texts, a layered record 
of speech, listening, and inscription over time. 
            </p>
          </ol>
        </section>

        <ConsentSection />
        
      </main>
    </div>
  );
}
