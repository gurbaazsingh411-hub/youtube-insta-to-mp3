import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Temporary directory for downloads
    const tempDir = path.join(process.cwd(), "temp_downloads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const fileName = `audio-${Date.now()}.mp3`;
    const outputPath = path.join(tempDir, fileName);

    // Resolve ffmpeg path manually because next.js mangles the import
    const ffmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");

    // yt-dlp command to extract audio as mp3
    // We use --force-overwrites to ensure we don't get stuck
    // --no-playlist to avoid downloading entire playlists if a link points to one
    // --ffmpeg-location to use the locally installed ffmpeg binary
    // Note: We use -o tempDir/%(id)s.%(ext)s first, then we can find the downloaded mp3
    // However, specifying the exact path works if we only expect 1 file
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-playlist --ffmpeg-location "${ffmpegPath}" "${url}"`;

    console.log(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execPromise(command);
      console.log("yt-dlp stdout:", stdout);
      if (stderr) console.error("yt-dlp stderr:", stderr);
    } catch (execError: any) {
      console.error("Exec error details:", execError);
      return NextResponse.json(
        { error: `Extraction failed: ${execError.stderr || execError.message}` },
        { status: 500 }
      );
    }

    if (!fs.existsSync(outputPath)) {
      return NextResponse.json({ error: "Output file not found after extraction" }, { status: 500 });
    }

    // Read the file and stream it
    const fileBuffer = fs.readFileSync(outputPath);

    // Clean up the file after reading it into memory
    // In a real production app, you might want a more robust cleanup or streaming
    fs.unlinkSync(outputPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="audio.mp3"`,
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
