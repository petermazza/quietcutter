/**
 * Security utilities for QuietCutter
 */

// Rate limiting store (in-memory - for production use Redis)
const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

/**
 * Rate limiter - limits requests per IP
 * @param {string} ip - Client IP address
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window size in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function rateLimit(ip, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = `rate:${ip}`;
  
  let data = rateLimitStore.get(key);
  
  if (!data || now - data.windowStart > windowMs) {
    data = { count: 0, windowStart: now };
  }
  
  data.count++;
  rateLimitStore.set(key, data);
  
  const remaining = Math.max(0, maxRequests - data.count);
  const resetIn = Math.max(0, windowMs - (now - data.windowStart));
  
  return {
    allowed: data.count <= maxRequests,
    remaining,
    resetIn,
  };
}

/**
 * Video file magic bytes signatures
 */
const VIDEO_SIGNATURES = [
  { ext: 'mp4', signatures: [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp
  ]},
  { ext: 'mp4', offset: 4, signatures: [
    [0x66, 0x74, 0x79, 0x70], // ftyp at offset 4
  ]},
  { ext: 'mov', offset: 4, signatures: [
    [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // ftypqt (QuickTime)
    [0x6D, 0x6F, 0x6F, 0x76], // moov
  ]},
  { ext: 'avi', signatures: [
    [0x52, 0x49, 0x46, 0x46], // RIFF
  ]},
  { ext: 'mkv', signatures: [
    [0x1A, 0x45, 0xDF, 0xA3], // EBML
  ]},
  { ext: 'webm', signatures: [
    [0x1A, 0x45, 0xDF, 0xA3], // EBML (same as MKV)
  ]},
];

/**
 * Validate file is a real video by checking magic bytes
 * @param {Buffer} buffer - File buffer
 * @returns {{ valid: boolean, detectedType: string | null }}
 */
export function validateVideoFile(buffer) {
  if (!buffer || buffer.length < 12) {
    return { valid: false, detectedType: null };
  }

  for (const format of VIDEO_SIGNATURES) {
    const offset = format.offset || 0;
    
    for (const signature of format.signatures) {
      let matches = true;
      
      for (let i = 0; i < signature.length; i++) {
        if (buffer[offset + i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        return { valid: true, detectedType: format.ext };
      }
    }
  }

  // Additional check: look for 'ftyp' anywhere in first 32 bytes (common for MP4)
  const first32 = buffer.slice(0, 32).toString('ascii');
  if (first32.includes('ftyp')) {
    return { valid: true, detectedType: 'mp4' };
  }

  return { valid: false, detectedType: null };
}

/**
 * Sanitize filename to prevent path traversal and injection
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'video.mp4';
  }
  
  // Remove path components
  let safe = filename.replace(/^.*[\\\/]/, '');
  
  // Remove dangerous characters
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (safe.length > 100) {
    safe = safe.substring(0, 100);
  }
  
  // Ensure has extension
  if (!safe.includes('.')) {
    safe += '.mp4';
  }
  
  return safe;
}

/**
 * Sanitize numeric input for FFmpeg parameters
 * @param {string|number} value - Input value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default if invalid
 * @returns {number}
 */
export function sanitizeNumeric(value, min, max, defaultValue) {
  const num = parseFloat(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate FFmpeg threshold parameter (in dB)
 * @param {string|number} threshold 
 * @returns {string} - Safe threshold string
 */
export function sanitizeThreshold(threshold) {
  const num = sanitizeNumeric(threshold, -60, 0, -30);
  return num.toString();
}

/**
 * Validate FFmpeg duration parameter
 * @param {string|number} duration 
 * @returns {string} - Safe duration string
 */
export function sanitizeDuration(duration) {
  const num = sanitizeNumeric(duration, 0.1, 10, 0.5);
  return num.toFixed(2);
}

/**
 * Get client IP from request
 * @param {Request} request 
 * @returns {string}
 */
export function getClientIP(request) {
  // Check various headers for real IP (behind proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * File size limits
 */
export const FILE_LIMITS = {
  FREE_MAX_SIZE: 100 * 1024 * 1024,    // 100MB for free users
  PRO_MAX_SIZE: 2 * 1024 * 1024 * 1024, // 2GB for pro users
  FREE_MAX_DURATION: 10 * 60,           // 10 minutes
  PRO_MAX_DURATION: 2 * 60 * 60,        // 2 hours
};

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Create a secure response with security headers
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function secureJsonResponse(data, status = 200) {
  const { NextResponse } = require('next/server');
  return NextResponse.json(data, {
    status,
    headers: SECURITY_HEADERS,
  });
}
