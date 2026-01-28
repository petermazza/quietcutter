'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/quietcutter-logo.png" alt="QuietCutter" className="h-10 w-auto" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="text-white font-medium">About</Link>
            <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">Blog</Link>
            <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          About QuietCutter
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          We believe every second of your content should matter. That's why we built the simplest way to remove silence from videos.
        </p>
      </section>

      {/* Mission Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-800/50 rounded-2xl p-8 md:p-12 border border-slate-700/50">
          <h2 className="text-2xl font-bold mb-6 text-center">Our Mission</h2>
          <p className="text-slate-300 text-lg leading-relaxed text-center max-w-3xl mx-auto">
            <span className="text-cyan-400 font-semibold">Make every second count.</span> We're on a mission to help content creators, educators, and professionals save time and deliver more engaging content by automatically removing awkward pauses and dead air from their videos.
          </p>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center">Who QuietCutter Is For</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 text-center">
            <div className="text-4xl mb-4">🎙️</div>
            <h3 className="text-lg font-semibold mb-3 text-cyan-400">Podcasters</h3>
            <p className="text-slate-400 text-sm">
              Remove long pauses and "umms" to create tighter, more professional podcast episodes that keep listeners engaged.
            </p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-lg font-semibold mb-3 text-purple-400">Educators</h3>
            <p className="text-slate-400 text-sm">
              Make lectures and tutorials more concise. Students learn better when content flows smoothly without dead air.
            </p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 text-center">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Content Creators</h3>
            <p className="text-slate-400 text-sm">
              Speed up your editing workflow. Let QuietCutter handle the tedious task of cutting silence so you can focus on creativity.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
            <h3 className="font-semibold mb-2">Upload</h3>
            <p className="text-slate-400 text-sm">Upload your video file (MP4, MOV, AVI, MKV)</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
            <h3 className="font-semibold mb-2">Analyze</h3>
            <p className="text-slate-400 text-sm">Our AI detects silent segments automatically</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
            <h3 className="font-semibold mb-2">Process</h3>
            <p className="text-slate-400 text-sm">Silent sections are removed seamlessly</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
            <h3 className="font-semibold mb-2">Download</h3>
            <p className="text-slate-400 text-sm">Get your tighter, more engaging video</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center">Why Choose QuietCutter</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="text-green-400 text-2xl">✓</div>
            <div>
              <h3 className="font-semibold mb-1">No Software to Install</h3>
              <p className="text-slate-400 text-sm">Works entirely in your browser. No downloads, no plugins.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-green-400 text-2xl">✓</div>
            <div>
              <h3 className="font-semibold mb-1">Privacy First</h3>
              <p className="text-slate-400 text-sm">Your videos are processed securely and deleted after download.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-green-400 text-2xl">✓</div>
            <div>
              <h3 className="font-semibold mb-1">Customizable Settings</h3>
              <p className="text-slate-400 text-sm">Adjust silence threshold and minimum duration to your needs.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-green-400 text-2xl">✓</div>
            <div>
              <h3 className="font-semibold mb-1">Free to Start</h3>
              <p className="text-slate-400 text-sm">Process 3 videos per day free. Upgrade for unlimited access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 md:p-12 border border-slate-700/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Make Every Second Count?</h2>
          <p className="text-slate-300 mb-8">Start removing silence from your videos today — it's free.</p>
          <Link href="/" className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity">
            Try QuietCutter Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/quietcutter-logo.png" alt="QuietCutter" className="h-8 w-auto" />
              <span className="text-slate-400 text-sm">© 2026 QuietCutter. All rights reserved.</span>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">Home</Link>
              <Link href="/about" className="text-slate-400 hover:text-white transition-colors">About</Link>
              <Link href="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link>
              <Link href="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
