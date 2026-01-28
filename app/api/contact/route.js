import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/security'

// Initialize Resend only if API key is available
let resend = null
async function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function POST(request) {
  try {
    // Rate limiting: 5 contact form submissions per hour per IP
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    const rateLimitResult = rateLimit(`contact_${clientIP}`, 5, 3600000) // 5 per hour
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimitResult.retryAfter / 1000)) } }
      )
    }

    const body = await request.json()
    const { name, email, message } = body

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be less than 5000 characters' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedName = name.slice(0, 100).trim()
    const sanitizedEmail = email.slice(0, 254).trim().toLowerCase()
    const sanitizedMessage = message.slice(0, 5000).trim()

    // Get Resend instance
    const resendClient = await getResend()
    
    if (!resendClient) {
      console.error('Resend not configured - RESEND_API_KEY missing')
      return NextResponse.json(
        { error: 'Email service not configured. Please try again later.' },
        { status: 500 }
      )
    }

    const emailFrom = process.env.EMAIL_FROM || 'noreply@quietcutter.com'

    // Send notification email to business
    await resendClient.emails.send({
      from: emailFrom,
      to: 'pmazza@quietcutter.com',
      subject: `[QuietCutter Contact] New message from ${sanitizedName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">New Contact Form Submission</h2>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${sanitizedName}</p>
            <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${sanitizedMessage}</div>
          </div>
          <p style="color: #64748b; font-size: 12px;">
            This message was sent from the QuietCutter contact form.
          </p>
        </div>
      `,
      replyTo: sanitizedEmail,
    })

    // Send confirmation email to user
    await resendClient.emails.send({
      from: emailFrom,
      to: sanitizedEmail,
      subject: 'Thanks for contacting QuietCutter!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px;">
            <h1 style="color: #0891b2; margin-bottom: 10px;">QuietCutter</h1>
            <p style="color: #64748b;">Make every second count.</p>
          </div>
          <div style="padding: 20px;">
            <p>Hi ${sanitizedName},</p>
            <p>Thanks for reaching out! We've received your message and will get back to you within 24 hours.</p>
            <p>In the meantime, feel free to:</p>
            <ul>
              <li><a href="https://quietcutter.com" style="color: #0891b2;">Try QuietCutter</a> - Remove silence from your videos</li>
              <li><a href="https://quietcutter.com/blog" style="color: #0891b2;">Read our blog</a> - Tips for better video content</li>
            </ul>
            <p>Best,<br>The QuietCutter Team</p>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
            <p style="color: #64748b; font-size: 12px;">
              © 2026 QuietCutter. All rights reserved.<br>
              <a href="https://quietcutter.com" style="color: #0891b2;">quietcutter.com</a>
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully' 
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
}
