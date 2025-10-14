import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Concatenate multiple video files into one using FFmpeg
 * @param videoPaths - Array of paths to input video files (in order)
 * @param outputPath - Path for output concatenated video
 */
export async function concatVideos(
  videoPaths: string[], 
  outputPath: string
): Promise<void> {
  if (videoPaths.length === 0) {
    throw new Error('No video paths provided for concatenation');
  }

  if (videoPaths.length === 1) {
    // If only one video, just copy it
    await fs.copyFile(videoPaths[0], outputPath);
    console.log(`Single video, copied to ${outputPath}`);
    return;
  }

  return new Promise<void>(async (resolve, reject) => {
    try {
      // Create concat list file for FFmpeg
      const listFile = path.join(path.dirname(outputPath), 'concat_list.txt');
      const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
      await fs.writeFile(listFile, listContent);

      console.log(`Concatenating ${videoPaths.length} videos to ${outputPath}`);
      console.log('Concat list:', videoPaths);

      // Try concat with copy codec first (fastest, no re-encoding)
      const ffmpeg = spawn('ffmpeg', [
        '-y',                    // Overwrite output file
        '-f', 'concat',          // Use concat demuxer
        '-safe', '0',            // Allow absolute paths
        '-i', listFile,          // Input concat list
        '-c', 'copy',            // Copy codec (no re-encoding)
        outputPath               // Output file
      ]);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('error', (error) => {
        console.error('FFmpeg spawn error:', error);
        // Clean up list file
        fs.unlink(listFile).catch(() => {});
        reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
      });

      ffmpeg.on('exit', async (code) => {
        // Clean up list file
        await fs.unlink(listFile).catch(() => {});

        if (code === 0) {
          console.log(`Successfully concatenated ${videoPaths.length} videos to ${outputPath}`);
          resolve();
        } else {
          console.error(`FFmpeg concat failed with exit code ${code}`);
          console.error('FFmpeg stderr:', stderr);

          // If copy codec failed, try re-encoding as fallback
          if (stderr.includes('different codec') || stderr.includes('Filtergraph')) {
            console.log('Copy codec failed, attempting re-encode fallback...');
            try {
              await concatWithReencode(videoPaths, outputPath);
              resolve();
            } catch (reencodeError) {
              reject(reencodeError);
            }
          } else {
            reject(new Error(`FFmpeg concatenation failed with exit code ${code}`));
          }
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fallback concatenation with re-encoding (slower but more compatible)
 */
async function concatWithReencode(
  videoPaths: string[], 
  outputPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    console.log('Re-encoding videos for concatenation...');

    // Build filter_complex for concatenation with re-encoding
    const filterComplex = videoPaths
      .map((_, i) => `[${i}:v][${i}:a]`)
      .join('') + `concat=n=${videoPaths.length}:v=1:a=1[outv][outa]`;

    const args = [
      '-y',  // Overwrite output
    ];

    // Add all input files
    videoPaths.forEach(p => {
      args.push('-i', p);
    });

    // Add filter and output settings
    args.push(
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[outa]',
      '-r', '24',                    // Force 24 fps
      '-c:v', 'libx264',            // H.264 codec
      '-preset', 'medium',           // Balance speed/quality
      '-crf', '18',                  // High quality
      '-pix_fmt', 'yuv420p',        // Compatibility
      '-c:a', 'aac',                // AAC audio
      '-b:a', '192k',               // Audio bitrate
      outputPath
    );

    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (error) => {
      console.error('FFmpeg re-encode error:', error);
      reject(new Error(`Failed to re-encode: ${error.message}`));
    });

    ffmpeg.on('exit', (code) => {
      if (code === 0) {
        console.log('Successfully concatenated with re-encoding');
        resolve();
      } else {
        console.error(`FFmpeg re-encode failed with code ${code}`);
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`FFmpeg re-encode failed with exit code ${code}`));
      }
    });
  });
}

