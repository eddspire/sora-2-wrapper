// Reference: javascript_object_storage blueprint
import { Storage } from "@google-cloud/storage";
import type { Response } from "express";

export class ObjectNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStorageService {
  private storage: Storage;
  private bucketId: string;
  private privateDir: string;

  constructor() {
    this.storage = new Storage();
    this.bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
    this.privateDir = process.env.PRIVATE_OBJECT_DIR || ".private";

    if (!this.bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable is not set");
    }
  }

  async uploadVideo(videoId: string, buffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket(this.bucketId);
    const filePath = `${this.privateDir}/videos/${videoId}.mp4`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: "video/mp4",
      },
    });

    return `/objects/${filePath}`;
  }

  async uploadThumbnail(videoId: string, buffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket(this.bucketId);
    const filePath = `${this.privateDir}/thumbnails/${videoId}.jpg`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    return `/objects/${filePath}`;
  }

  async getObjectEntityFile(objectPath: string) {
    const bucket = this.storage.bucket(this.bucketId);
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", "") 
      : objectPath;
    
    const file = bucket.file(normalizedPath);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectNotFoundError(`Object not found: ${normalizedPath}`);
    }

    return file;
  }

  async downloadObject(file: any, res: Response) {
    const readStream = file.createReadStream();
    const [metadata] = await file.getMetadata();

    res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
    res.setHeader("Content-Length", metadata.size);

    readStream.pipe(res);
  }
}
