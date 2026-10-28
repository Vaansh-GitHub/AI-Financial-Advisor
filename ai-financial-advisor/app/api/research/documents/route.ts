import { NextResponse } from "next/server";
import { getResearchDocuments, createResearchDocument } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fundName = searchParams.get("fundName") || undefined;
    const type = searchParams.get("type") || undefined;

    const docs = await getResearchDocuments({ fundName, type });
    return NextResponse.json({ success: true, count: docs.length, data: docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch research documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      title,
      fundName,
      schemeCode = "",
      amc,
      documentType = "FACTSHEET",
      publicationDate = new Date().toISOString().split("T")[0],
      fileUrl = "/documents/sample.pdf",
      fileSizeBytes = 1048576,
      pageCount = 4,
      extractedTextPreview = "Raw document text parsed for regulatory disclosures and fund holdings.",
    } = body;

    if (!title || !fundName || !amc) {
      return NextResponse.json(
        { error: "Missing required document attributes: title, fundName, amc" },
        { status: 400 }
      );
    }

    const doc = await createResearchDocument({
      title,
      fundName,
      schemeCode,
      amc,
      documentType,
      publicationDate,
      fileUrl,
      fileSizeBytes,
      pageCount,
      extractedTextPreview,
      uploadedBy: user?.name || "Priya Sharma, CFA",
      processingStatus: "UPLOADED",
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "DOCUMENT_UPLOADED",
      entityType: "DOCUMENT",
      entityId: String(doc._id),
      metadata: { title, fundName, documentType },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}
