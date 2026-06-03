import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supportedExtensions = new Set([".mp3", ".ogg", ".wav", ".m4a", ".webm"]);

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), "public", "music");
    const entries = await readdir(musicDir, { withFileTypes: true });
    const tracks = entries
      .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({
        name: path.basename(entry.name, path.extname(entry.name)),
        url: `/music/${encodeURIComponent(entry.name)}`,
      }));

    return NextResponse.json({ tracks });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ tracks: [] });
    }
    return NextResponse.json({ error: "Could not list local music tracks." }, { status: 500 });
  }
}
