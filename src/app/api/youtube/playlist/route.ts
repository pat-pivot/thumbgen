import { NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const PLAYLIST_ID = process.env.YOUTUBE_PLAYLIST_ID || "";

type PlaylistItem = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  addedAt: string;
};

export async function GET() {
  if (!API_KEY || !PLAYLIST_ID) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY or YOUTUBE_PLAYLIST_ID not configured" },
      { status: 500 }
    );
  }

  const items: PlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: PLAYLIST_ID,
      maxResults: "50",
      key: API_KEY,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    for (const item of data.items || []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      items.push({
        videoId,
        title: item.snippet.title || "Untitled",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        addedAt: item.snippet.publishedAt || "",
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return NextResponse.json({ items });
}
