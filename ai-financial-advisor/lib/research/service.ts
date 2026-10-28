/**
 * Research Service Interface & Implementation Scaffolding
 * AI-ready modular interface.
 * IMPORTANT: In accordance with project requirements, AI/LLM, embeddings, and RAG are NOT yet implemented.
 * Methods explicitly return a structured NOT_IMPLEMENTED response with clear TODO markers.
 */

export type DocumentType =
  | "FACTSHEET"
  | "SID_SCHEME_INFORMATION_DOCUMENT"
  | "KIM_KEY_INFORMATION_MEMORANDUM"
  | "PORTFOLIO_DISCLOSURE"
  | "ANNUAL_REPORT"
  | "RESEARCH_NOTE";

export type DocumentProcessingStatus =
  | "UPLOADED"
  | "PENDING_PROCESSING"
  | "INDEXED"
  | "FAILED";

export interface ResearchDocumentMetadata {
  id: string;
  title: string;
  fundName: string;
  schemeCode?: string;
  amc: string;
  documentType: DocumentType;
  publicationDate: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  processingStatus: DocumentProcessingStatus;
  pageCount?: number;
  extractedTextPreview?: string;
  pageSnippets?: Array<{ pageNumber: number; text: string }>;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PassageRetrievalQuery {
  documentIds?: string[];
  queryText: string;
  maxResults?: number;
}

export interface RetrievedPassage {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  score: number;
  textSnippet: string;
}

export interface QuestionAnsweringResponse {
  status: "NOT_IMPLEMENTED";
  message: string;
  query: string;
  suggestedAction: string;
  timestamp: string;
}

export interface IResearchService {
  ingestDocument(doc: Partial<ResearchDocumentMetadata>): Promise<{
    status: "ACCEPTED" | "NOT_IMPLEMENTED";
    message: string;
    documentId?: string;
  }>;
  retrieveRelevantPassages(query: PassageRetrievalQuery): Promise<{
    status: "NOT_IMPLEMENTED";
    message: string;
    passages: RetrievedPassage[];
  }>;
  answerQuestionWithCitations(question: string, contextDocIds: string[]): Promise<QuestionAnsweringResponse>;
}

/**
 * Concrete ResearchService with explicit Phase 2 placeholders
 */
export class ResearchService implements IResearchService {
  /**
   * Placeholder for future Document Ingestion, PDF Parsing, and Vector Embedding Pipeline
   */
  async ingestDocument(doc: Partial<ResearchDocumentMetadata>): Promise<{
    status: "ACCEPTED";
    message: string;
    documentId?: string;
  }> {
    // TODO (Phase 2):
    // 1. Extract text using PDF parser (e.g. unpdf or pdf-parse)
    // 2. Chunk text with page-level metadata preserved
    // 3. Generate embeddings via text-embedding-004 or similar model
    // 4. Upsert into vector database (e.g. Atlas Vector Search or Pinecone)

    return {
      status: "ACCEPTED",
      message: "Document metadata saved. Background vector embedding & text extraction will be executed in Phase 2.",
      documentId: doc.id,
    };
  }

  /**
   * Placeholder for future Vector Similarity Search
   */
  async retrieveRelevantPassages(query: PassageRetrievalQuery): Promise<{
    status: "NOT_IMPLEMENTED";
    message: string;
    passages: RetrievedPassage[];
  }> {
    // TODO (Phase 2):
    // 1. Generate embedding for query.queryText
    // 2. Perform cosine similarity search over chunk vectors filtered by documentIds
    // 3. Return ranked passages with exact page numbers

    return {
      status: "NOT_IMPLEMENTED",
      message: "Semantic vector retrieval is disabled until AI/RAG integration is activated in Phase 2.",
      passages: [],
    };
  }

  /**
   * Placeholder for future Grounded LLM Question Answering with Citations
   */
  async answerQuestionWithCitations(
    question: string,
    contextDocIds: string[]
  ): Promise<QuestionAnsweringResponse> {
    // TODO (Phase 2):
    // 1. Retrieve top passages using retrieveRelevantPassages()
    // 2. Construct grounded prompt with system instructions prohibiting hallucination
    // 3. Query LLM model with temperature=0.0
    // 4. Parse response and attach verifiable citation links [DocName, Page X]

    return {
      status: "NOT_IMPLEMENTED",
      message: "AI question answering with citations is scheduled for Phase 2. No synthetic AI text is generated.",
      query: question,
      suggestedAction: "Please review the raw PDF documents in the Research Library directly.",
      timestamp: new Date().toISOString(),
    };
  }
}

export const researchService = new ResearchService();
