import { NextResponse } from "next/server";
import { getResearchDocumentById } from "@/lib/db/repo";
import { researchService } from "@/lib/research/service";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const doc = await getResearchDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const result = await researchService.ingestDocument(doc as any);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process document" }, { status: 500 });
  }
}
