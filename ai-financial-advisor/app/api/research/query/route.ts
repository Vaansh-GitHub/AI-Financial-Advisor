import { NextResponse } from "next/server";
import { researchService } from "@/lib/research/service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question = "", contextDocIds = [] } = body;

    const answer = await researchService.answerQuestionWithCitations(question, contextDocIds);

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to query research service" }, { status: 500 });
  }
}
