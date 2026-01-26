import { NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { exec } from 'child_process';
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
    
    // Step 1: Detect silence using native FFmpeg
    const detectCmd = `ffmpeg -i ${inputPath} -af silencedetect=noise=${threshold}dB:d=0.5 -f null - 2> ${detectPath}`;
    await execAsync(detectCmd);
    
    // Step 2: Parse silence timestamps
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
    
    // Step 3: Get video duration
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath}`;
    const { stdout: durationStr } = await execAsync(durationCmd);
    const duration = parseFloat(durationStr.trim());
    
    if (silenceRanges.length === 0) {
      // No silence, just copy the file
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
      
      // Step 5: Cut and concatenate segments
      if (segments.length === 0) {
        await execAsync(`cp ${inputPath} ${outputPath}`);
      } else if (segments.length === 1) {
        // Single segment - just trim
        const seg = segments[0];
        await execAsync(`ffmpeg -i ${inputPath} -ss ${seg.start} -to ${seg.end} -c copy -y ${outputPath}`);
      } else {
        // Multiple segments - cut and concat
        const segmentFiles = [];
        
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const segPath = `/tmp/seg_${timestamp}_${i}.mp4`;
          await execAsync(`ffmpeg -i ${inputPath} -ss ${seg.start} -to ${seg.end} -c copy -y ${segPath}`);
          segmentFiles.push(segPath);
        }
        
        // Create concat file
        const concatPath = `/tmp/concat_${timestamp}.txt`;
        const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
        await writeFile(concatPath, concatContent);
        
        // Concatenate
        await execAsync(`ffmpeg -f concat -safe 0 -i ${concatPath} -c copy -y ${outputPath}`);
        
        // Cleanup segment files
        await Promise.all(segmentFiles.map(f => unlink(f).catch(() => {})));
        await unlink(concatPath).catch(() => {});
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
