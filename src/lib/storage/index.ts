import fs from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface StorageProvider {
  upload(file: File): Promise<{ url: string; filename: string }>;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: File): Promise<{ url: string; filename: string }> {
    const sanitizedFilename = file.name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "")
      .replace(/\.{2,}/g, ".") // Prevent multiple dots
      .toLowerCase(); // Normalization
    const uniqueFilename = `${uuidv4()}-${sanitizedFilename}`;
    const filePath = path.join(this.uploadDir, uniqueFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return {
      url: `/uploads/${uniqueFilename}`,
      filename: uniqueFilename,
    };
  }
}

// Factory to get the configured provider
export function getStorageProvider(): StorageProvider {
  // In the future, this can switch based on env vars (e.g., S3)
  return new LocalStorageProvider();
}
