import { NextResponse } from "next/server";
import { getLiveAmfiSchemes, filterAmfiSchemes } from "@/lib/services/amfiService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const plan = (searchParams.get("plan") as any) || "All";
    const option = (searchParams.get("option") as any) || "All";
    const category = searchParams.get("category") || undefined;
    const amc = searchParams.get("amc") || undefined;
    const forceRefresh = searchParams.get("refresh") === "true" || searchParams.get("refresh") === "1";
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const { schemes, fromCache, latestDataDate, lastFetchedAt } = await getLiveAmfiSchemes(forceRefresh);

    const { filtered, totalMatched } = filterAmfiSchemes(schemes, {
      search,
      plan,
      option,
      category,
      amc,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      totalSchemes: schemes.length,
      totalMatched,
      count: filtered.length,
      data: filtered,
      latestDataDate,
      lastFetchedAt,
      fromCache,
      source: "https://portal.amfiindia.com/spages/NAVAll.txt",
      fiduciaryNotice:
        "Official AMFI NAV Master Feed. Mutual fund schemes must not be ranked by NAV alone. TER, AUM, and portfolio holdings require AMC factsheets.",
    });
  } catch (error: any) {
    console.error("AMFI NAV Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve official AMFI NAV data",
        source: "https://portal.amfiindia.com/spages/NAVAll.txt",
      },
      { status: 502 }
    );
  }
}

