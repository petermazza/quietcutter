import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { writeFile, unlink, readFile, mkdir, rm } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import clientPromise from '@/lib/mongodb';
import { decrypt } from '@/lib/auth';
import { 
  rateLimit, 
  validateVideoFile, 
  sanitizeFilename,
  sanitizeThreshold,
  sanitizeDuration,
  getClientIP,
  FILE_LIMITS,
  SECURITY_HEADERS 
} from '@/lib/security';

const execAsync = promisify(exec);

// Plan limits
const PLAN_LIMITS = {
  free: { videosPerDay: 3, maxDurationMinutes: 10 },
  pro: { videosPerDay: Infinity, maxDurationMinutes: 120 }
};

// Maximum file size (500MB for this endpoint - can be adjusted per tier)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export async function POST(request) {
  let inputPath = null;
  let outputPath = null;
  let tempDir = null;
  let detectPath = null;
  
  try {
    // ============ SECURITY: Authentication Required ============
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    const payload = await decrypt(session);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session. Please sign in again.' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    // Get user from database
    const client = await clientPromise;
    let user = null;
    let db = null;
    
    if (client) {
      db = client.db();
      user = await db.collection('users').findOne({ email: payload.email });
    }
    
    const userPlan = user?.plan || payload.plan || 'free';
    const limits = PLAN_LIMITS[userPlan];
    
    // Check daily usage
    const today = new Date().toDateString();
    let videosProcessedToday = 0;
    
    if (user) {
      if (user.lastVideoDate === today) {
        videosProcessedToday = user.videosProcessedToday || 0;
      }
      
      // Check if limit exceeded
      if (videosProcessedToday >= limits.videosPerDay) {
        return NextResponse.json(
          { 
            error: `Daily limit reached (${limits.videosPerDay} videos). Upgrade to Pro for unlimited videos.`,
            upgradeRequired: true
          },
          { status: 403, headers: SECURITY_HEADERS }
        );
      }
    }
    
    // ============ SECURITY: Rate Limiting ============
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(clientIP, 5, 60000); // 5 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before processing more videos.',
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
          }
        }
      );
    }

    // ============ SECURITY: Parse and Validate Input ============
    const formData = await request.formData();
    const videoFile = formData.get('video');
    
    // Sanitize FFmpeg parameters to prevent injection
    const threshold = sanitizeThreshold(formData.get('threshold') || '-30');
    const minDuration = sanitizeDuration(formData.get('minDuration') || '0.5');
    
    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // ============ SECURITY: File Size Validation ============
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413, headers: SECURITY_HEADERS }
      );
    }

    // Read file buffer for validation
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ============ SECURITY: Magic Bytes Validation ============
    const validation = validateVideoFile(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid video file. Please upload a valid MP4, MOV, AVI, or MKV file.' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // ============ SECURITY: Sanitize Filename ============
    const safeFilename = sanitizeFilename(videoFile.name);
    
    // Generate unique paths with crypto-random suffix for security
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const uniqueId = `${timestamp}_${randomSuffix}`;
    
    inputPath = `/tmp/qc_input_${uniqueId}.mp4`;
    outputPath = `/tmp/qc_output_${uniqueId}.mp4`;
    detectPath = `/tmp/qc_detect_${uniqueId}.txt`;
    tempDir = `/tmp/qc_segments_${uniqueId}`;
    
    await writeFile(inputPath, buffer);
    
    // Step 1: Get video duration first (fast)
    // Using parameterized command - no user input in command string
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
    const { stdout: durationStr } = await execAsync(durationCmd, { timeout: 30000 });
    const duration = parseFloat(durationStr.trim());
    
    // ============ SECURITY: Duration Validation ============
    if (isNaN(duration) || duration <= 0) {
      throw new Error('Could not determine video duration. File may be corrupted.');
    }
    
    // Check duration against user's plan limit
    const maxDurationSeconds = limits.maxDurationMinutes * 60;
    if (duration > maxDurationSeconds) {
      await cleanup(inputPath, outputPath, detectPath, tempDir);
      return NextResponse.json(
        { 
          error: `Video too long. Your plan allows up to ${limits.maxDurationMinutes} minutes. Upgrade to Pro for up to 2 hours.`,
          upgradeRequired: true
        },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    // Step 2: Detect silence using native FFmpeg
    // Parameters are sanitized - safe to use in command
    const detectCmd = `ffmpeg -i "${inputPath}" -af silencedetect=noise=${threshold}dB:d=${minDuration} -f null - 2> "${detectPath}"`;
    await execAsync(detectCmd, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
    
    // Step 3: Parse silence timestamps
    const detectOutput = await readFile(detectPath, 'utf-8');
    const silenceRanges = [];
    let currentStart = null;
    
    const lines = detectOutput.split('\n');
    for (const line of lines) {
      if (line.includes('silence_start:')) {
        const match = line.match(/silence_start: ([\d.]+)/);
        if (match) currentStart = parseFloat(match[1]);
      }
      if (line.includes('silence_end:') && currentStart !== null) {
        const match = line.match(/silence_end: ([\d.]+)/);
        if (match) {
          silenceRanges.push({ start: currentStart, end: parseFloat(match[1]) });
          currentStart = null;
        }
      }
    }
    
    if (silenceRanges.length === 0) {
      // No silence found - copy file
      await execAsync(`cp "${inputPath}" "${outputPath}"`);
    } else {
      // Step 4: Build non-silent segments
      const segments = [];
      let lastEnd = 0;
      
      silenceRanges.sort((a, b) => a.start - b.start);
      
      for (const silence of silenceRanges) {
        if (silence.start > lastEnd + 0.1) {
          segments.push({ start: lastEnd, end: silence.start });
        }
        lastEnd = silence.end;
      }
      
      if (lastEnd < duration - 0.1) {
        segments.push({ start: lastEnd, end: duration });
      }
      
      // Step 5: Use segment-based approach with stream copy (FAST!)
      if (segments.length === 0) {
        await execAsync(`cp "${inputPath}" "${outputPath}"`);
      } else {
        // Create temp directory for segments
        await mkdir(tempDir, { recursive: true });
        
        // Cut each segment with stream copy (no re-encoding = FAST)
        const segmentFiles = [];
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const segFile = `${tempDir}/seg_${i.toString().padStart(4, '0')}.ts`;
          segmentFiles.push(segFile);
          
          // Use -c copy for speed, output to .ts for lossless concat
          await execAsync(
            `ffmpeg -ss ${seg.start.toFixed(3)} -i "${inputPath}" -t ${(seg.end - seg.start).toFixed(3)} -c copy -bsf:v h264_mp4toannexb -f mpegts -y "${segFile}"`,
            { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }
          );
        }
        
        // Concat all segments
        const concatList = segmentFiles.map(f => `"${f}"`).join('|');
        await execAsync(
          `ffmpeg -i "concat:${concatList}" -c copy -bsf:a aac_adtstoasc -y "${outputPath}"`,
          { maxBuffer: 50 * 1024 * 1024, timeout: 120000 }
        );
      }
    }
    
    // Read processed video
    const outputBuffer = await readFile(outputPath);
    
    // Get output duration
    const outputDurationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
    const { stdout: outputDurationStr } = await execAsync(outputDurationCmd, { timeout: 30000 });
    const outputDuration = parseFloat(outputDurationStr.trim());
    
    // ============ SECURITY: Secure Cleanup ============
    await cleanup(inputPath, outputPath, detectPath, tempDir);
    
    // Return video with metadata and security headers
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="processed_${safeFilename}"`,
        'X-Original-Duration': duration.toString(),
        'X-Processed-Duration': outputDuration.toString(),
        'X-Removed-Duration': (duration - outputDuration).toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    
    // Secure cleanup on error
    await cleanup(inputPath, outputPath, detectPath, tempDir);
    
    // Don't expose internal error details to client
    const safeErrorMessage = error.message?.includes('timeout') 
      ? 'Processing timed out. Please try a shorter video.'
      : 'Processing failed. Please try again with a different video.';
    
    return NextResponse.json(
      { error: safeErrorMessage },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * Securely cleanup all temporary files
 */
async function cleanup(inputPath, outputPath, detectPath, tempDir) {
  const cleanupPromises = [];
  
  if (inputPath) {
    cleanupPromises.push(unlink(inputPath).catch(() => {}));
  }
  if (outputPath) {
    cleanupPromises.push(unlink(outputPath).catch(() => {}));
  }
  if (detectPath) {
    cleanupPromises.push(unlink(detectPath).catch(() => {}));
  }
  if (tempDir) {
    // Use rm with recursive to remove directory and contents
    cleanupPromises.push(rm(tempDir, { recursive: true, force: true }).catch(() => {}));
  }
  
  await Promise.all(cleanupPromises);
}
