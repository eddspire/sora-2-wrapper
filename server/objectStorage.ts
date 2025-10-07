// Reference: javascript_object_storage blueprint
import { Storage } from "@google-cloud/storage";
import type { Response } from "express";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Initialize Storage client with Replit-specific authentication
const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

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
    this.storage = objectStorageClient;
    this.bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
    
    // Strip bucket ID prefix from PRIVATE_OBJECT_DIR if present
    // Replit sets it as "/bucket-id/.private" but we only need ".private"
    let privateDir = process.env.PRIVATE_OBJECT_DIR || ".private";
    if (privateDir.includes("/.private")) {
      privateDir = ".private";
    } else if (!privateDir.startsWith(".")) {
      privateDir = "." + privateDir;
    }
    this.privateDir = privateDir;

    console.log(`ObjectStorageService initialized: bucketId=${this.bucketId}, privateDir=${this.privateDir}`);

    if (!this.bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable is not set");
    }
  }

  async uploadVideo(videoId: string, buffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket(this.bucketId);
    const filePath = `${this.privateDir}/videos/${videoId}.mp4`;
    const file = bucket.file(filePath);

    console.log(`Uploading video to bucket ${this.bucketId}, path: ${filePath}`);
    
    await file.save(buffer, {
      metadata: {
        contentType: "video/mp4",
      },
    });

    // Verify the file was saved and log the actual stored path
    const [exists] = await file.exists();
    console.log(`Video upload complete. Exists: ${exists}, file.name: ${file.name}`);
    
    // Return URL using the intended path (without bucket ID)
    // file.name may include bucket ID with Replit's sidecar, so we use our intended path
    const urlPath = `${this.privateDir}/videos/${videoId}.mp4`;
    return `/objects/${urlPath}`;
  }

  async uploadThumbnail(videoId: string, buffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket(this.bucketId);
    const filePath = `${this.privateDir}/thumbnails/${videoId}.jpg`;
    const file = bucket.file(filePath);

    console.log(`Uploading thumbnail to bucket ${this.bucketId}, path: ${filePath}`);
    
    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    // Verify the file was saved
    const [exists] = await file.exists();
    console.log(`Thumbnail upload complete. Exists: ${exists}, file name: ${file.name}`);
    
    return `/objects/${filePath}`;
  }

  async uploadInputReference(filename: string, buffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket(this.bucketId);
    const filePath = `${this.privateDir}/references/${filename}`;
    const file = bucket.file(filePath);

    // Determine content type from filename extension
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
    };
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

    await file.save(buffer, {
      metadata: {
        contentType,
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
