'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [status, setStatus] = useState('idle') // idle, sending, success, error
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setStatus('success')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/quietcutter-logo.png" alt="QuietCutter" className="h-10 w-auto" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
            <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">Blog</Link>
            <Link href="/" className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Try Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Contact Us
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Have a question, feedback, or just want to say hi? We'd love to hear from you.
        </p>
      </section>

      {/* Contact Form & Info */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/50">
            <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
            
            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✉️</div>
                <h3 className="text-xl font-semibold text-green-400 mb-2">Message Sent!</h3>
                <p className="text-slate-400 mb-6">Thanks for reaching out. We'll get back to you soon.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-cyan-400 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500 transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500 transition-colors resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                {status === 'error' && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status === 'sending' ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info & FAQ */}
          <div className="space-y-8">
            {/* Direct Contact */}
            <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a href="mailto:pmazza@quietcutter.com" className="text-cyan-400 hover:underline">
                      pmazza@quietcutter.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Response Time</h3>
                    <p className="text-slate-400">We typically respond within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-6">FAQ</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-cyan-400 mb-1">What video formats are supported?</h3>
                  <p className="text-slate-400 text-sm">We support MP4, MOV, AVI, and MKV formats.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-cyan-400 mb-1">Is my video data secure?</h3>
                  <p className="text-slate-400 text-sm">Yes! Videos are processed securely and deleted immediately after download.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-cyan-400 mb-1">How long does processing take?</h3>
                  <p className="text-slate-400 text-sm">Most videos process in 1-5 minutes depending on length and size.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-cyan-400 mb-1">Can I cancel my Pro subscription?</h3>
                  <p className="text-slate-400 text-sm">Yes, you can cancel anytime. Contact us for assistance.</p>
                </div>
              </div>
            </div>
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
