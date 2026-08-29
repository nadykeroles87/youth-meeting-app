import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// Proxy route to fetch files from external URLs (avoids CORS issues)
// IMPORTANT: We use proper content types where required (like PDF for react-pdf),
// but we avoid using .pdf extensions in the URL to prevent Internet Download Manager (IDM) 
// from intercepting the response.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const type = req.nextUrl.searchParams.get("type");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    let fetchUrl = url;
    if (url.startsWith("/")) {
      fetchUrl = new URL(url, req.nextUrl.origin).toString();
    }
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status}` },
        { status: response.status }
      );
    }

    let contentType = "application/octet-stream";
    if (type === "pdf") {
      contentType = "application/pdf";
    }

    // Stream the response directly without buffering into memory
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        // No Content-Disposition header at all - prevents download prompts
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 500 });
  }
}
