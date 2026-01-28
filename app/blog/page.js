'use client'

import Link from 'next/link'

const blogPosts = [
  {
    slug: 'how-to-remove-silence-from-videos',
    title: 'How to Remove Silence from Videos Automatically',
    excerpt: 'Learn the fastest way to cut dead air and awkward pauses from your videos without spending hours in editing software.',
    date: 'January 25, 2026',
    readTime: '5 min read',
    category: 'Tutorial',
    categoryColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    slug: 'tips-for-better-podcast-audio',
    title: '5 Tips for Better Podcast Audio Quality',
    excerpt: 'Discover professional techniques to improve your podcast audio, from recording setup to post-production polish.',
    date: 'January 20, 2026',
    readTime: '7 min read',
    category: 'Tips',
    categoryColor: 'bg-purple-500/20 text-purple-400',
  },
  {
    slug: 'why-silence-hurts-engagement',
    title: 'Why Silent Sections Hurt Your Video Engagement',
    excerpt: 'Studies show viewers drop off during long pauses. Learn why removing silence can dramatically improve watch time.',
    date: 'January 15, 2026',
    readTime: '4 min read',
    category: 'Insights',
    categoryColor: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    slug: 'quietcutter-vs-manual-editing',
    title: 'QuietCutter vs Manual Video Editing: Time Comparison',
    excerpt: 'We compared the time it takes to remove silence manually versus using QuietCutter. The results might surprise you.',
    date: 'January 10, 2026',
    readTime: '6 min read',
    category: 'Comparison',
    categoryColor: 'bg-green-500/20 text-green-400',
  },
]

export default function BlogPage() {
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
            <Link href="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
            <Link href="/blog" className="text-white font-medium">Blog</Link>
            <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          QuietCutter Blog
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Tips, tutorials, and insights on video editing, content creation, and making every second of your content count.
        </p>
      </section>

      {/* Blog Posts Grid */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid gap-6">
          {blogPosts.map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="block bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${post.categoryColor}`}>
                      {post.category}
                    </span>
                    <span className="text-slate-500 text-sm">{post.date}</span>
                    <span className="text-slate-500 text-sm">•</span>
                    <span className="text-slate-500 text-sm">{post.readTime}</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-slate-400">{post.excerpt}</p>
                </div>
                <div className="flex items-center text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">Read more</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 text-center border border-slate-700/50">
          <h2 className="text-2xl font-bold mb-3">Stay Updated</h2>
          <p className="text-slate-300 mb-6">Get the latest tips and updates delivered to your inbox.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500"
            />
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
              Subscribe
            </button>
          </div>
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
