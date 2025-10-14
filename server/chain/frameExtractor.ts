import { spawn } from 'child_process';

/**
 * Extract the last frame from a video file using FFmpeg
 * @param videoPath - Path to input video file
 * @param outJpgPath - Path for output JPEG file
 */
export async function extractLastFrame(
  videoPath: string, 
  outJpgPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    console.log(`Extracting last frame from ${videoPath} to ${outJpgPath}`);

    // Use -sseof to seek from end of file (0.1 seconds before end)
    // This is safer than relying on frame count which can vary by codec
    const ffmpeg = spawn('ffmpeg', [
      '-y',                    // Overwrite output file
      '-sseof', '-0.1',        // Seek to 0.1s before end of file
      '-i', videoPath,         // Input file
      '-vframes', '1',         // Extract 1 frame
      '-q:v', '2',             // High quality JPEG (2 is near-lossless)
      outJpgPath               // Output file
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (error) => {
      console.error('FFmpeg spawn error:', error);
      reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
    });

    ffmpeg.on('exit', (code) => {
      if (code === 0) {
        console.log(`Successfully extracted last frame to ${outJpgPath}`);
        resolve();
      } else {
        console.error(`FFmpeg exited with code ${code}`);
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`FFmpeg extraction failed with exit code ${code}`));
      }
    });
  });
}

