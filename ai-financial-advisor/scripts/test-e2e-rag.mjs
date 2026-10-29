import fs from "fs";
import {
  retrieveRelevantPassages,
  formatCitationsForPrompt,
  validateCitations,
} from "../lib/services/ragService.ts";

const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf-8") : "";
const conf = {};
for (const line of env.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx > 0) {
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    conf[k] = v;
  }
}

const accId = conf.CLOUDFLARE_ACCOUNT_ID;
const token = conf.AI_API_KEY;
const model = conf.AI_MODEL || "@cf/meta/llama-3.1-70b-instruct";
const url = `https://api.cloudflare.com/client/v4/accounts/${accId}/ai/v1/chat/completions`;

async function testRAGQuery(query, description) {
  console.log(`\n======================================================`);
  console.log(`TEST: ${description}`);
  console.log(`QUERY: "${query}"`);
  console.log(`======================================================`);

  // 1. RAG Retrieval
  const citations = retrieveRelevantPassages(query, { maxResults: 3 });
  console.log(`\n[RAG Retrieval] Retrieved ${citations.length} verified passages:`);
  citations.forEach((c, idx) => {
    console.log(`  Source #${idx + 1}: ${c.docTitle} (Page ${c.pageNumber}) | Category: ${c.sourceCategory} | Cosine: ${c.cosineScore}`);
    console.log(`    Excerpt: "${c.snippet.slice(0, 110)}..."`);
    console.log(`    Origin URL: ${c.sourceUrl}`);
  });

  const formattedCitations = formatCitationsForPrompt(citations);

  // 2. Call Live Cloudflare Workers AI Model
  const systemPrompt = `You are "ArthaAdvisor Co-Pilot", an elite AI investment adviser assistant designed for a SEBI-registered Investment Adviser (RIA) in India.
Answer the adviser's query strictly based on the verified documents retrieved by the RAG system below. Cite your sources accurately.

### VERIFIED RETRIEVED SOURCES:
${formattedCitations}`;

  console.log(`\n[Live Model Dispatch] Sending grounded prompt to Cloudflare ${model}...`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      max_tokens: 350,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    console.error(`API Error: ${res.status} ${res.statusText}`);
    const errText = await res.text();
    console.error(errText);
    return;
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || "";
  console.log(`\n[Model Response]:\n${reply}\n`);

  // 3. Server-Side Citation Validation
  const validation = validateCitations(reply, citations);
  console.log(`[Citation Validation Check]:`);
  console.log(`  IsValid: ${validation.isValid ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Validated Citations Count: ${validation.validatedCitations.length}`);
  if (validation.unsupportedClaims.length > 0) {
    console.log(`  Unsupported Claims Flagged:`, validation.unsupportedClaims);
  } else {
    console.log(`  Flagged Claims: None (100% Grounded in RAG Passages)`);
  }
}

async function run() {
  // Query 1: Regulatory & SEBI RIA suitability mandate
  await testRAGQuery(
    "What is the SEBI RIA suitability mandate and how should conflict between risk capacity and tolerance be resolved?",
    "SEBI Statutory Fiduciary Grounding"
  );

  // Query 2: AMFI Market Data for Parag Parikh Flexi Cap Fund
  await testRAGQuery(
    "What is the current NAV, expense ratio TER, and 5Y return for Parag Parikh Flexi Cap Fund from AMFI data?",
    "Authentic AMFI Scheme Master & Performance Data"
  );
}

run();

