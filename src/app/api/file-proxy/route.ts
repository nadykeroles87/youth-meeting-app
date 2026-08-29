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
    let targetUrl = url;
    if (targetUrl.startsWith("/")) {
      targetUrl = new URL(targetUrl, req.nextUrl.origin).toString();
    }

    const response = await fetch(targetUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status}` },
        { status: response.status }
      );
    }

    const originContentType = response.headers.get("content-type");
    let contentType = originContentType || "application/octet-stream";
    if (type === "pdf" || targetUrl.toLowerCase().includes(".pdf")) {
      contentType = "application/pdf";
    } else if (type === "pptx" || targetUrl.toLowerCase().includes(".pptx")) {
      contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    } else if (type === "docx" || targetUrl.toLowerCase().includes(".docx")) {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (type === "xlsx" || targetUrl.toLowerCase().includes(".xlsx")) {
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    // Stream the response directly without buffering into memory
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        // No Content-Disposition header at all - prevents download prompts
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 500 });
  }
}
