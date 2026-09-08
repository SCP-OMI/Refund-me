import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { apiLogger } from "@/lib/logger";
import { getStorageProvider } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "application/pdf"
];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"];

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: images (PNG, JPG, GIF, WebP) and PDF" },
                { status: 400 }
            );
        }

        // Validate file extension
        const fileExtension = path.extname(file.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
            return NextResponse.json(
                { error: "Invalid file extension. Allowed: .png, .jpg, .jpeg, .gif, .webp, .pdf" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Additional validation: Check magic bytes for common file types
        const isValidMagicBytes = validateMagicBytes(buffer, fileExtension);
        if (!isValidMagicBytes) {
            return NextResponse.json(
                { error: "File content doesn't match its extension" },
                { status: 400 }
            );
        }
        
        const storage = getStorageProvider();
        const result = await storage.upload(file);

        return NextResponse.json(result);
    } catch (error) {
        apiLogger.error({ err: error }, "Local upload error");
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}

// Validate file magic bytes to prevent extension spoofing
function validateMagicBytes(buffer: Buffer, extension: string): boolean {
    if (buffer.length < 8) return false;

    const magicBytes: Record<string, number[][]> = {
        ".png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        ".jpg": [[0xFF, 0xD8, 0xFF]],
        ".jpeg": [[0xFF, 0xD8, 0xFF]],
        ".gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
        ".webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF)
        ".pdf": [[0x25, 0x50, 0x44, 0x46]] // %PDF
    };

    const expectedBytes = magicBytes[extension];
    if (!expectedBytes) return true; // Unknown extension, skip validation

    return expectedBytes.some(expected =>
        expected.every((byte, index) => buffer[index] === byte)
    );
}
