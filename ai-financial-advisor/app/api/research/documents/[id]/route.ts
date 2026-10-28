import { NextResponse } from "next/server";
import { getResearchDocumentById, deleteResearchDocument } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const doc = await getResearchDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...doc,
        aiIntegrationStatus: {
          phase: "Phase 1 - Structured Document Archive",
          embeddingModel: "Pending Phase 2 (Text-Embedding-004)",
          vectorIndexStatus: "Ready for Ingestion",
          isIndexed: doc.processingStatus === "INDEXED",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch document" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const doc = await getResearchDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deleteResearchDocument(params.id);

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "DOCUMENT_DELETED",
      entityType: "DOCUMENT",
      entityId: params.id,
      metadata: { title: doc.title },
    });

    return NextResponse.json({ success: true, message: "Document removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
  }
}
