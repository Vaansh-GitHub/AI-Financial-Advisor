import { describe, it, expect } from "vitest";
import { parseAmfiNavAll, filterAmfiSchemes, AmfiSchemeRecord } from "@/lib/services/amfiService";

describe("AMFI Mutual Fund Feed Parser & Service", () => {
  const sampleAmfiFeed = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date

Open Ended Schemes(Equity Scheme - Large Cap Fund)

HDFC Mutual Fund

128629;INF179KA1IZ7;-;HDFC Top 100 Fund;Direct Plan;Growth Option;1124.5678;29-Oct-2026
128628;INF179KA1JC4;-;HDFC Top 100 Fund;Regular Plan;Growth Option;1045.1234;29-Oct-2026
128626;INF179KA1JA8;INF179KA1JB6;HDFC Top 100 Fund;Direct Plan;IDCW Option;65.4321;29-Oct-2026

Open Ended Schemes(Equity Scheme - Small Cap Fund)

Nippon India Mutual Fund

118778;INF204K01W16;-;Nippon India Small Cap Fund;Direct Plan;Growth;165.7890;29-Oct-2026
118777;INF204K01W08;-;Nippon India Small Cap Fund;Regular Plan;Growth;152.3450;29-Oct-2026
118779;INF204K01W24;INF204K01W32;Nippon India Small Cap Fund;Direct Plan;IDCW;42.5000;29-Oct-2026

Close Ended Schemes(Debt Scheme - Fixed Term Plan)

UTI Mutual Fund

151485;INF789F1AXP7;-;UTI Fixed Term Income Fund Series XXXVI;Direct Plan;Growth;N.A.;29-Oct-2026
151486;INF789F1AXM4;-;UTI Fixed Term Income Fund Series XXXVI;Regular Plan;IDCW;;29-Oct-2026
`;

  it("should accurately parse semicolon-separated AMFI records with categories and AMC", () => {
    const { schemes, latestDataDate } = parseAmfiNavAll(sampleAmfiFeed);

    expect(schemes.length).toBe(8);
    expect(latestDataDate).toBe("29-Oct-2026");

    const hdfcDirect = schemes.find((s) => s.schemeCode === "128629");
    expect(hdfcDirect).toBeDefined();
    expect(hdfcDirect?.schemeName).toBe("HDFC Top 100 Fund");
    expect(hdfcDirect?.isinGrowth).toBe("INF179KA1IZ7");
    expect(hdfcDirect?.planType).toBe("Direct");
    expect(hdfcDirect?.optionType).toBe("Growth");
    expect(hdfcDirect?.nav).toBe(1124.5678);
    expect(hdfcDirect?.navDate).toBe("29-Oct-2026");
    expect(hdfcDirect?.category).toContain("Large Cap Fund");
    expect(hdfcDirect?.amc).toBe("HDFC Mutual Fund");
  });

  it("should handle missing, empty, or 'N.A.' NAV values by assigning null rather than fake numbers", () => {
    const { schemes } = parseAmfiNavAll(sampleAmfiFeed);

    const naNavScheme = schemes.find((s) => s.schemeCode === "151485");
    expect(naNavScheme).toBeDefined();
    expect(naNavScheme?.nav).toBeNull();

    const emptyNavScheme = schemes.find((s) => s.schemeCode === "151486");
    expect(emptyNavScheme).toBeDefined();
    expect(emptyNavScheme?.nav).toBeNull();
  });

  it("should correctly distinguish Direct vs Regular and Growth vs IDCW", () => {
    const { schemes } = parseAmfiNavAll(sampleAmfiFeed);

    const directGrowth = schemes.filter((s) => s.planType === "Direct" && s.optionType === "Growth");
    expect(directGrowth.length).toBe(3); // HDFC Top 100, Nippon Small Cap, UTI Fixed Term

    const regularIdcw = schemes.filter((s) => s.planType === "Regular" && s.optionType === "IDCW");
    expect(regularIdcw.length).toBe(1); // UTI Fixed Term
  });

  it("should filter schemes by multi-word search query, plan, and option", () => {
    const { schemes } = parseAmfiNavAll(sampleAmfiFeed);

    // Search for "small cap"
    const smallCapResult = filterAmfiSchemes(schemes, { search: "small cap" });
    expect(smallCapResult.totalMatched).toBe(3);
    expect(smallCapResult.filtered.every((s) => s.category.includes("Small Cap") || s.schemeName.includes("Small Cap"))).toBe(true);

    // Filter Direct + Growth only
    const directGrowthFilter = filterAmfiSchemes(schemes, { plan: "Direct", option: "Growth" });
    expect(directGrowthFilter.totalMatched).toBe(3);
    expect(directGrowthFilter.filtered.every((s) => s.planType === "Direct" && s.optionType === "Growth")).toBe(true);

    // Search by ISIN code
    const isinResult = filterAmfiSchemes(schemes, { search: "INF204K01W16" });
    expect(isinResult.totalMatched).toBe(1);
    expect(isinResult.filtered[0].schemeCode).toBe("118778");
  });

  it("should handle malformed, blank, or 6-column records gracefully", () => {
    const legacyFeed = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
122639;INF879O01027;INF879O01035;Parag Parikh Flexi Cap Fund - Direct Plan - Growth;78.4321;29-Oct-2026
malformed line with no semicolons or proper columns
; ; ; ; ;
122640;INF879O01019;-;Parag Parikh Flexi Cap Fund - Regular Plan - IDCW;61.1200;29-Oct-2026
`;
    const { schemes } = parseAmfiNavAll(legacyFeed);
    expect(schemes.length).toBe(2);

    expect(schemes[0].schemeCode).toBe("122639");
    expect(schemes[0].planType).toBe("Direct");
    expect(schemes[0].optionType).toBe("Growth");
    expect(schemes[0].nav).toBe(78.4321);

    expect(schemes[1].schemeCode).toBe("122640");
    expect(schemes[1].planType).toBe("Regular");
    expect(schemes[1].optionType).toBe("IDCW");
    expect(schemes[1].nav).toBe(61.12);
  });
});

