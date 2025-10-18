// Agent Types and Interfaces

export interface AgentConfig {
  name: string;
  description: string;
  instruction: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface Agent {
  uuid: string;
  name: string;
  description: string;
  instruction: string;
  model: {
    name: string;
    provider: string;
    uuid: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AgentSetup {
  aggregator: Agent;
  repoContentFetch: Agent;
  riskDetection: Agent;
  scoring: Agent;
  summary: Agent | null; // Null when using Gemini API directly
  review: Agent;
}

export interface FindingObject {
  item: string;
  location: string;
  issue: string;
  severity: "warning" | "severe";
  [key: string]: any; // Allow flexible additional fields
}

export interface Findings {
  maliciousCode: FindingObject[];
  dependencies: FindingObject[];
  networkActivity: FindingObject[];
  fileSystemSafety: FindingObject[];
  credentialSafety: FindingObject[];
}

export interface ScanResult {
  repoUrl: string;
  repoMetadata?: {
    owner: string;
    name: string;
    stars: number;
    lastUpdated: string;
    contributors: number;
  };
  findings: Findings;
  safetyLevel: "safe" | "warning" | "severe";
  aiSummary: string;
  scannedAt: string;
  validated: boolean;
}
