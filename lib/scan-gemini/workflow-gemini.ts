/**
 * Gemini-Based Repository Scan Workflow
 * Orchestrates the multi-step scanning process using Gemini API directly
 */

import { GeminiService, SchemaType } from "./gemini-service";
import { GitHubClient } from "../github/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      console.log("📦 Step 1/5: Fetching repository content...");
      const repoData = await this.fetchRepoContent(repoUrl);
      console.log("✅ Repository data fetched\n");

      // Step 2: Detect security risks (using Gemini)
      console.log("🔎 Step 2/5: Analyzing for security risks with Gemini...");
      const { findings, scanFolderPath: step2FolderPath } =
        await this.detectRisks(repoData, repoUrl);
      console.log("✅ Risk analysis complete\n");

      // Step 3: Calculate safety score (using Gemini)
      console.log("📊 Step 3/5: Calculating safety level with Gemini...");
      const { safetyLevel, scanFolderPath } = await this.calculateSafetyLevel(
        findings,
        repoUrl,
        repoData.repoMetadata,
        step2FolderPath
      );
      console.log(`✅ Safety level: ${safetyLevel.toUpperCase()}\n`);

      // Step 4: Validation and final summary generation (using Gemini)
      console.log("✔️  Step 4/4: Validating scan results with Gemini...");
      const validatedResult = await this.reviewResults({
        repoUrl,
        repoMetadata: repoData.repoMetadata,
        findings,
        safetyLevel,
      });
      console.log("✅ Validation complete\n");

      // Save Step 4 findings
      this.saveScanFindings(
        repoUrl,
        validatedResult,
        "step-4-findings.json",
        scanFolderPath
      );
      console.log(`💾 All step findings saved to: ${scanFolderPath}\n`);

      return validatedResult;
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

    // Divide files into batches (5 files per batch)
    const BATCH_SIZE = 5;
    const batches: string[][] = [];
    for (let i = 0; i < scannedFilesList.length; i += BATCH_SIZE) {
      batches.push(scannedFilesList.slice(i, i + BATCH_SIZE));
    }

    log(
      `   📦 Processing ${batches.length} batches (${BATCH_SIZE} files per batch)`
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

Context:
- Total files in repo: ${repoData.treeSize}
- This is batch ${batchNum} of ${batches.length}
- Production deps: ${repoData.dependencies.production.length}
- Dev deps: ${repoData.dependencies.dev.length}

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
- Be concise: Keep "issue" explanations to one sentence maximum
- codeSnippet: MAXIMUM 1-2 lines, only the exact line with the issue (no context)
- Context matters: CI/CD and dev tooling are normal, not threats
- If no moderate/severe issues found in a category, return empty array

REQUIRED JSON SCHEMA - Each finding MUST include:
{
  "item": "Short label/title for issue (max 4-5 words)",
  "location": "Exact file path",
  "issue": "Brief explanation of threat to contributors (one sentence max)",
  "severity": "moderate" | "severe",
  "codeSnippet": "ONLY the specific line with issue - 1-2 lines MAX, no surrounding context",
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
          temperature: 0.2,
          thinkingBudget: 8000, // Limit thinking tokens to ~8K, leaving ~57K for JSON output
          maxTokens: 65536, // Maximum limit to prevent JSON truncation on complex batches
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
   * Step 3: Calculate safety level using Gemini
   */
  private async calculateSafetyLevel(
    findings: Findings,
    repoUrl: string,
    repoMetadata: any,
    existingFolderPath: string
  ): Promise<{ safetyLevel: string; scanFolderPath: string }> {
    const log = (msg: string) => console.log(`   ${msg}`);

    log(`🤖 Calling Gemini for Safety Scoring...`);

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

    const prompt = `Analyze these security findings and determine the overall safety level FOR CONTRIBUTORS:

${JSON.stringify(findings, null, 2)}

CONTEXT: These findings represent threats to open source contributors who clone/install/contribute to this repository.
Only "moderate" or "severe" findings are reported - "low" severity issues are filtered out.

YOUR TASK:
1. Analyze all findings across all categories
2. Determine safety level for contributors based on severity
3. Return ONLY a JSON object with the safetyLevel field

SAFETY LEVEL RULES:
- "unsafe": Has ANY severe findings - immediate threat to contributors (malware, credential theft, system compromise)
- "caution": Has ONLY moderate findings - potential concerns, generally safe but requires contributor awareness
- "safe": NO moderate or severe findings - completely safe for contributors to clone/install/contribute

Return JSON in this exact format:
{
  "safetyLevel": "safe" | "caution" | "unsafe"
}`;

    log(`   ⏳ Waiting for Gemini response...`);
    const result = await this.geminiService.callGeminiJSON<{
      safetyLevel: string;
    }>(prompt, {
      temperature: 0.1,
      maxTokens: 32768, // High limit for thinking and response
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          safetyLevel: {
            type: SchemaType.STRING,
            description: "Overall safety level: safe, caution, or unsafe",
          },
        },
        required: ["safetyLevel"],
      },
    });

    log(`   ✅ Safety level determined: ${result.safetyLevel.toUpperCase()}`);

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
      scanFolderPath: existingFolderPath,
    };
  }

  /**
   * Step 4: Review and validate results using Gemini
   * Generates final summary after all corrections
   */
  private async reviewResults(scanData: any): Promise<ScanResult> {
    const log = (msg: string) => console.log(`   ${msg}`);

    log(`🤖 Calling Gemini for Result Validation...`);
    log(`   🔍 Validating scan results and generating final summary`);
    log(`   📊 Initial Safety Level: ${scanData.safetyLevel.toUpperCase()}`);

    const prompt = `Validate this security scan result for CONTRIBUTOR SAFETY:

${JSON.stringify(scanData, null, 2)}

CONTEXT: This scan evaluates threats to open source contributors who clone, install dependencies, or contribute to this repository.

YOUR RESPONSIBILITIES:
1. REMOVE findings that are NOT threats to contributors:
   - GitHub Actions workflows (run on GitHub servers, not contributor machines)
   - Release/publish scripts (only run by maintainers, not contributors)
   - CI/CD tooling and dev scripts (not executed during clone/install)
   - Legitimate dev/test/build tools

2. REMOVE any "low" severity findings (only keep "moderate" or "severe")

3. VERIFY remaining findings are actual contributor threats:
   - Malicious code that runs on npm install (preinstall, postinstall, install scripts)
   - Malicious dependencies
   - Credential harvesting from contributor environments
   - System compromise threats (malware, backdoors, crypto miners)

4. PRESERVE all fields for remaining findings:
   - CRITICAL: For findings you keep, preserve ALL original fields including: item, location, issue, severity, codeSnippet, batchId, dependencyUrl
   - Do NOT drop the "issue" or "codeSnippet" fields - these are essential for displaying findings to users
   - Only remove entire findings that aren't threats, but keep all fields for findings that remain

5. EVALUATE repository reputation and apply reputation-based safety rules:

   REPUTABLE:
   - GitHub accounts known to be trustworthy (reputable companies or organizations)
   - Well-known open source projects and foundations
   - Official repositories of major programming languages, frameworks, or tools

   REPUTATION-BASED SAFETY RULES:
   - If repo is reputable:
     → DISREGARD any moderate findings (likely false positives)
     → Mark as "safe" unless severe findings exist

   - If repo belongs to unknown/unverified account:
     → Keep moderate findings and mark as "caution"
     → Keep severe findings and mark as "unsafe"

6. ADJUST safetyLevel based on reputation and remaining findings:
   - "safe": Reputable repo with only moderate findings, OR no moderate/severe findings
   - "caution": Unknown repo with moderate findings
   - "unsafe": Any severe findings (regardless of reputation)

7. GENERATE aiSummary to reflect corrected findings, reputation, and safety level

   For safe repositories, follow this format:
   """
   This repository appears to be safe for cloning and installation. It's the official {Repository Name} repository from {Company Name},
   with no detected threats to contributors. No malicious code patterns, suspicious dependencies, hidden scripts, or
   credential harvesting attempts were found.
   """

   For caution/unsafe repositories, state the specific threats to contributors.

8. Note all corrections you make

Return JSON in this exact format:
{
  "validated": true,
  "corrections": ["List of all corrections made, or empty array if none"],
  "scanResult": {
    "repoUrl": "same as input",
    "findings": "corrected findings with non-contributor threats removed - PRESERVE all fields (item, location, issue, severity, codeSnippet, batchId, dependencyUrl) for remaining findings",
    "safetyLevel": "corrected safety level based on remaining findings and reputation",
    "aiSummary": "generated summary reflecting contributor safety, reputation, and final safety level"
  }
}

EXAMPLE of preserving all fields when keeping a finding:
Original finding:
{
  "item": "Malicious Script Creation",
  "location": "scripts/init.js",
  "issue": "Creates script that collects and exfiltrates sensitive data.",
  "severity": "severe",
  "codeSnippet": "fs.writeFileSync(trackerPath, trackerContent);",
  "batchId": 1
}

Validated finding (ALL FIELDS PRESERVED):
{
  "item": "Malicious Script Creation",
  "location": "scripts/init.js",
  "issue": "Creates script that collects and exfiltrates sensitive data.",
  "severity": "severe",
  "codeSnippet": "fs.writeFileSync(trackerPath, trackerContent);",
  "batchId": 1
}

NOTE: Do NOT include "repoMetadata" in your response - it will be preserved from the original scan data.`;

    log(`   ⏳ Waiting for Gemini response...`);
    const result = await this.geminiService.callGeminiJSON<any>(prompt, {
      temperature: 0.2,
      maxTokens: 65536, // Maximum output tokens - room for unlimited thinking and full scan results
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          validated: {
            type: SchemaType.BOOLEAN,
            description: "Whether the scan result has been validated",
          },
          corrections: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING,
            },
            description: "List of corrections made during validation",
          },
          scanResult: {
            type: SchemaType.OBJECT,
            properties: {
              repoUrl: { type: SchemaType.STRING },
              repoMetadata: {
                type: SchemaType.OBJECT,
                properties: {
                  owner: { type: SchemaType.STRING },
                  name: { type: SchemaType.STRING },
                  defaultBranch: { type: SchemaType.STRING },
                  language: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  stars: { type: SchemaType.NUMBER },
                  forks: { type: SchemaType.NUMBER },
                  lastUpdated: { type: SchemaType.STRING },
                },
              },
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
              safetyLevel: {
                type: SchemaType.STRING,
                description: "Overall safety level: safe, warning, or severe",
              },
              aiSummary: {
                type: SchemaType.STRING,
                description:
                  "Human-readable summary of the security assessment",
              },
            },
            required: ["repoUrl", "findings", "safetyLevel", "aiSummary"],
          },
        },
        required: ["validated", "corrections", "scanResult"],
      },
    });

    const correctionCount = result.corrections?.length || 0;
    if (correctionCount > 0) {
      log(`   ⚠️  ${correctionCount} correction(s) made by review`);
    } else {
      log(`   ✅ No corrections needed`);
    }

    // Extract the validated scan result
    // Always use original metadata - don't let Gemini modify it
    const validatedResult: ScanResult = {
      repoUrl: scanData.repoUrl,
      repoMetadata: scanData.repoMetadata, // Use original metadata with language, defaultBranch, etc.
      findings: result.scanResult?.findings || scanData.findings,
      safetyLevel:
        result.scanResult?.safetyLevel || scanData.safetyLevel || "warning",
      aiSummary: result.scanResult?.aiSummary || scanData.aiSummary,
      scannedAt: new Date().toISOString(),
      validated: result.validated || true,
      corrections: result.corrections || [],
    };

    return validatedResult;
  }
}
