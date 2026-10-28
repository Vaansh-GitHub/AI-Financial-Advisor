import { NextResponse } from "next/server";
import { getFunds } from "@/lib/db/repo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const subCategory = searchParams.get("subCategory") || undefined;
    const search = searchParams.get("search") || undefined;
    const planType = searchParams.get("planType") || undefined;
    const maxExpenseRatio = searchParams.get("maxExpenseRatio")
      ? Number(searchParams.get("maxExpenseRatio"))
      : undefined;

    const funds = await getFunds({ category, subCategory, search, planType, maxExpenseRatio });
    return NextResponse.json({ success: true, count: funds.length, data: funds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch funds" }, { status: 500 });
  }
}
