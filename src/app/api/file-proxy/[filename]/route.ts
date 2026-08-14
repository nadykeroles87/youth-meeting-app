import { NextRequest, NextResponse } from "next/server";

// Proxy route to fetch files from external URLs (avoids CORS issues and forces correct extensions for viewers)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const { filename } = await params;
    
    // Determine content type based on the filename extension requested
    let contentType = "application/octet-stream";
    if (filename.endsWith(".pdf")) contentType = "application/pdf";
    else if (filename.endsWith(".pptx")) contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (filename.endsWith(".ppt")) contentType = "application/vnd.ms-powerpoint";
    else if (filename.endsWith(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (filename.endsWith(".doc")) contentType = "application/msword";

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        // Force inline display instead of attachment, to allow iframes to render it
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 500 });
  }
}
