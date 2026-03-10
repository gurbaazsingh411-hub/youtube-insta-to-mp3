import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

// Since Next.js requires the route runtime to be Node.js to use child_process and fs
// We don't need to specify runtime edge
export const maxDuration = 60; // Allow 60 seconds max for conversion if serverless

const execPromise = promisify(exec);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".mp4") && !file.type.includes("video/mp4")) {
      return NextResponse.json({ error: "File must be an MP4 video" }, { status: 400 });
    }

    // Temporary directory for uploads
    const tempDir = path.join(process.cwd(), "temp_downloads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const uniqueId = Date.now();
    const inputPath = path.join(tempDir, `input-${uniqueId}.mp4`);
    const outputPath = path.join(tempDir, `output-${uniqueId}.mp3`);

    // Write the uploaded file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(inputPath, buffer);

    // Resolve ffmpeg path manually
    const ffmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");

    if (!fs.existsSync(ffmpegPath)) {
      // Cleanup
      fs.unlinkSync(inputPath);
      return NextResponse.json({ error: "ffmpeg not found on server" }, { status: 500 });
    }

    // FFmpeg command to extract high quality audio and convert to MP3
    // -i input file
    // -vn ignore video stream
    // -acodec libmp3lame use mp3 codec
    // -q:a 2 high quality VBR (approx 190 kbps)
    const command = `"${ffmpegPath}" -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`;

    console.log(`Executing conversion: ${command}`);

    try {
      const { stderr } = await execPromise(command);
      // ffmpeg writes output to stderr by default
      console.log("ffmpeg log:", stderr);
    } catch (execError: any) {
      console.error("FFmpeg error details:", execError);
      fs.unlinkSync(inputPath);
      return NextResponse.json(
        { error: `Conversion failed: ${execError.message}` },
        { status: 500 }
      );
    }

    if (!fs.existsSync(outputPath)) {
      fs.unlinkSync(inputPath);
      return NextResponse.json({ error: "Output file not generated" }, { status: 500 });
    }

    // Read the converted file
    const fileBuffer = fs.readFileSync(outputPath);

    // Clean up temporary files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // Stream the result back
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.mp4$/i, "")}.mp3"`,
      },
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
