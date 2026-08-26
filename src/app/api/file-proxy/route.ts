import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// Proxy route to fetch files from external URLs (avoids CORS issues and forces correct extensions for viewers)
// We avoid using file extensions in the URL path to prevent IDM (Internet Download Manager) from intercepting and downloading the file instead of viewing it.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const type = req.nextUrl.searchParams.get("type"); // e.g. pdf, pptx, docx, xlsx

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    // Determine content type based on the query parameter
    let contentType = "application/octet-stream";
    if (type === "pdf") contentType = "application/pdf";
    else if (type === "pptx") contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (type === "ppt") contentType = "application/vnd.ms-powerpoint";
    else if (type === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (type === "doc") contentType = "application/msword";
    else if (type === "xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the response directly without buffering it into memory
    // This dramatically improves performance for large files like PPTX
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        // Force inline display instead of attachment, to allow iframes to render it.
        // We do NOT provide a filename ending with an extension here to avoid aggressive download managers.
        "Content-Disposition": `inline; filename="document_proxy"`,
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 500 });
  }
}
