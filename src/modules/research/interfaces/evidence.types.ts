export interface SourceEvidence {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  retrievedAt: string;
  reliabilityScore?: number;
}

export interface WebSearchResult {
  query: string;
  totalFound: number;
  sources: SourceEvidence[];
}

export interface ExtractedPageContent {
  url: string;
  title?: string;
  domain: string;
  textContent: string;
  characterCount: number;
  retrievedAt: string;
  isTruncated: boolean;
}
