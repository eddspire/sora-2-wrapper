// Reference: javascript_openai blueprint
import OpenAI, { toFile } from "openai";

// The newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function createVideo(
  prompt: string, 
  model: string = "sora-2-pro", 
  size: string = "1280x720", 
  seconds: number = 8, 
  inputReferenceBuffer?: { buffer: Buffer; filename: string; contentType: string }
) {
  const videoParams: any = {
    model: model as any,
    prompt,
    size: size as any,
    seconds: String(seconds) as any, // Convert to string as OpenAI expects "4", "8", or "12"
  };

  // Add input_reference if provided - must be a file, not a URL
  if (inputReferenceBuffer) {
    const file = await toFile(
      inputReferenceBuffer.buffer, 
      inputReferenceBuffer.filename,
      { type: inputReferenceBuffer.contentType }
    );
    videoParams.input_reference = file;
  }

  const video = await openai.videos.create(videoParams);

  return video;
}

export async function getVideoStatus(videoId: string) {
  const video = await openai.videos.retrieve(videoId);
  return video;
}

export async function downloadVideoContent(videoId: string, variant: "video" | "thumbnail" | "spritesheet" = "video") {
  const content = await openai.videos.downloadContent(videoId, { variant });
  return content;
}

export { openai };
