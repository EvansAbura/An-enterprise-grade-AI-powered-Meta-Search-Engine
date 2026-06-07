export interface GroundingChunk {
  title: string;
  uri: string;
}

export interface SearchSource {
  id: string;
  title: string;
  url: string;
  credibilityScore: number; // 0-100
  type: 'official' | 'academic' | 'industry' | 'news' | 'other';
  snippet: string;
}

export interface AIConsensus {
  chatgptAgreement: number; // 0-100
  geminiAgreement: number; // 0-100
  perplexityAgreement: number; // 0-100
  overallConfidence: number; // 0-100
  summary: string;
}

export interface Contradiction {
  topic: string;
  description: string;
  sourceViews: {
    source: string;
    view: string;
  }[];
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'entity' | 'concept' | 'date' | 'source' | 'fact';
  val: number; // size factor e.g. 5 to 15
}

export interface KnowledgeLink {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

export interface CitationFormat {
  apa: string;
  mla: string;
  chicago: string;
  harvard: string;
}

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  citations: CitationFormat;
}

export interface AlternativePerspective {
  title: string;
  description: string;
  supportingArguments: string[];
}

export interface AgentFindings {
  researchAgent: string[];
  factCheckerAgent: string[];
  academicAgent: string[];
  newsAgent: string[];
  technicalAgent: string[];
}

export interface MetaSearchResponse {
  query: string;
  classification: 'Research' | 'Shopping' | 'Technical' | 'Medical' | 'Legal' | 'Educational' | 'News' | 'Programming';
  executiveSummary: string;
  detailedAnalysis: string; // Markdown string
  consensus: AIConsensus;
  contradictions: Contradiction[];
  sources: SearchSource[];
  knowledgeGraph: KnowledgeGraph;
  citations: Citation[];
  perspectives: AlternativePerspective[];
  recommendations: string[];
  agentFindings: AgentFindings;
}

export interface ResearchSession {
  id: string;
  query: string;
  timestamp: string;
  result: MetaSearchResponse;
}
