import { NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request) {
  let inputPath = null;
  let outputPath = null;
  
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
    
    await writeFile(inputPath, buffer);
    
    // Step 1: Get video duration first (fast)
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath}`;
    const { stdout: durationStr } = await execAsync(durationCmd);
    const duration = parseFloat(durationStr.trim());
    
    // Step 2: Detect silence using native FFmpeg
    const detectCmd = `ffmpeg -i ${inputPath} -af silencedetect=noise=${threshold}dB:d=${minDuration} -f null - 2> ${detectPath}`;
    await execAsync(detectCmd);
    
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
      await execAsync(`cp ${inputPath} ${outputPath}`);
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
      
      // Step 5: Process segments
      if (segments.length === 0) {
        await execAsync(`cp ${inputPath} ${outputPath}`);
      } else if (segments.length === 1) {
        // Single segment - use ultrafast preset for speed
        const seg = segments[0];
        await execAsync(`ffmpeg -ss ${seg.start} -i ${inputPath} -t ${seg.end - seg.start} -c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 128k -y ${outputPath}`);
      } else {
        // OPTIMIZED: Build complex filter for single-pass processing
        // This is MUCH faster than cutting individual segments
        
        // Build select filter for non-silent parts
        const videoSelects = segments.map(seg => 
          `between(t,${seg.start.toFixed(3)},${seg.end.toFixed(3)})`
        ).join('+');
        
        const audioSelects = segments.map(seg => 
          `between(t,${seg.start.toFixed(3)},${seg.end.toFixed(3)})`
        ).join('+');
        
        // Single-pass filter that selects and concatenates non-silent parts
        const filterComplex = `[0:v]select='${videoSelects}',setpts=N/FRAME_RATE/TB[v];[0:a]aselect='${audioSelects}',asetpts=N/SR/TB[a]`;
        
        // Use ultrafast preset for maximum speed
        await execAsync(
          `ffmpeg -i ${inputPath} -filter_complex "${filterComplex}" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 128k -y ${outputPath}`,
          { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer for large videos
        );
      }
    }
    
    // Read processed video
    const outputBuffer = await readFile(outputPath);
    
    // Get output duration
    const outputDurationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${outputPath}`;
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
