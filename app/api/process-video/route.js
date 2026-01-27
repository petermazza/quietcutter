import { NextResponse } from 'next/server';
import { writeFile, unlink, readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request) {
  let inputPath = null;
  let outputPath = null;
  let tempDir = null;
  
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video');
    const threshold = formData.get('threshold') || '-30';
    const minDuration = formData.get('minDuration') || '0.5';
    
    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Save uploaded file
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    inputPath = `/tmp/input_${timestamp}.mp4`;
    outputPath = `/tmp/output_${timestamp}.mp4`;
    const detectPath = `/tmp/detect_${timestamp}.txt`;
    tempDir = `/tmp/segments_${timestamp}`;
    
    await writeFile(inputPath, buffer);
    
    // Step 1: Get video duration first (fast)
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
    const { stdout: durationStr } = await execAsync(durationCmd);
    const duration = parseFloat(durationStr.trim());
    
    // Step 2: Detect silence using native FFmpeg
    const detectCmd = `ffmpeg -i "${inputPath}" -af silencedetect=noise=${threshold}dB:d=${minDuration} -f null - 2> "${detectPath}"`;
    await execAsync(detectCmd, { maxBuffer: 50 * 1024 * 1024 });
    
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
            { maxBuffer: 10 * 1024 * 1024 }
          );
        }
        
        // Concat all segments
        const concatList = segmentFiles.map(f => `"${f}"`).join('|');
        await execAsync(
          `ffmpeg -i "concat:${concatList}" -c copy -bsf:a aac_adtstoasc -y "${outputPath}"`,
          { maxBuffer: 50 * 1024 * 1024 }
        );
        
        // Cleanup segment files
        for (const f of segmentFiles) {
          await unlink(f).catch(() => {});
        }
        await unlink(tempDir).catch(() => {});
      }
    }
    
    // Read processed video
    const outputBuffer = await readFile(outputPath);
    
    // Get output duration
    const outputDurationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
    const { stdout: outputDurationStr } = await execAsync(outputDurationCmd);
    const outputDuration = parseFloat(outputDurationStr.trim());
    
    // Cleanup
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    await unlink(detectPath).catch(() => {});
    
    // Return video with metadata
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="processed_${videoFile.name}"`,
        'X-Original-Duration': duration.toString(),
        'X-Processed-Duration': outputDuration.toString(),
        'X-Removed-Duration': (duration - outputDuration).toString(),
      },
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    
    // Cleanup on error
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});
    
    return NextResponse.json({ 
      error: 'Processing failed', 
      details: error.message 
    }, { status: 500 });
  }
}
