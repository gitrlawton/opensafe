/**
 * Mock Data for Development and Testing
 *
 * This file contains mock repository data that was used during development.
 * These are preserved for reference but should NOT be used in production.
 */

export const mockRepos = [
  {
    id: '1',
    name: 'vue',
    owner: 'vuejs',
    language: 'TypeScript',
    safetyScore: 92,
    lastScanned: '5 hours ago',
  },
  {
    id: '2',
    name: 'suspicious-package',
    owner: 'unknown-dev',
    language: 'Python',
    safetyScore: 45,
    lastScanned: '1 day ago',
  },
  {
    id: '3',
    name: 'next.js',
    owner: 'vercel',
    language: 'TypeScript',
    safetyScore: 98,
    lastScanned: '3 hours ago',
  },
  {
    id: '4',
    name: 'tensorflow',
    owner: 'tensorflow',
    language: 'Python',
    safetyScore: 'SAFE',
    lastScanned: '6 hours ago',
  },
  {
    id: '5',
    name: 'malicious-script',
    owner: 'bad-actor',
    language: 'JavaScript',
    safetyScore: 12,
    lastScanned: '2 days ago',
  },
  {
    id: '6',
    name: 'svelte',
    owner: 'sveltejs',
    language: 'TypeScript',
    safetyScore: 94,
    lastScanned: '4 hours ago',
  },
  {
    id: '7',
    name: 'express',
    owner: 'expressjs',
    language: 'JavaScript',
    safetyScore: 'SAFE',
    lastScanned: '8 hours ago',
  },
  {
    id: '8',
    name: 'example-repo',
    owner: 'test-user',
    language: 'JavaScript',
    safetyScore: 'CAUTION',
    lastScanned: '1 hour ago',
  },
];

export const mockRepoDetails = {
  name: 'react',
  owner: 'facebook',
  language: 'JavaScript',
  safetyScore: 95,
  lastScanned: '2 hours ago',
  aiSummary:
    "This repository appears to be safe for cloning and installation. It's the official React library from Meta (Facebook), with verified maintainers and no detected security threats. No malicious code patterns, suspicious dependencies, hidden scripts, or credential harvesting attempts were found. The repository follows security best practices and has an active security policy.",
  findings: [
    {
      type: 'success',
      title: 'No Malicious Code Detected',
      description:
        'Code analysis found no obfuscated code, crypto miners, keyloggers, or backdoor patterns.',
    },
    {
      type: 'success',
      title: 'Dependencies Verified',
      description:
        'All dependencies are from trusted sources with no known vulnerabilities or suspicious install scripts.',
    },
    {
      type: 'success',
      title: 'No Suspicious Network Activity',
      description:
        'No unauthorized network calls, data exfiltration attempts, or connections to unknown domains detected.',
    },
    {
      type: 'info',
      title: 'Active Security Policy',
      description:
        'Repository includes SECURITY.md with vulnerability reporting guidelines and active security monitoring.',
    },
    {
      type: 'success',
      title: 'Verified Maintainers',
      description:
        'All maintainers are verified accounts from established organizations with strong security track records.',
    },
  ],
};

export const mockExampleRepo = {
  ID: 'mock-1',
  REPO_OWNER: 'test-user',
  REPO_NAME: 'example-repo',
  LANGUAGE: 'JavaScript',
  SAFETY_SCORE: 'CAUTION',
  SCANNED_AT: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  SCANNED_BY: 'demo-user',
  FINDINGS: {
    repoUrl: 'https://github.com/test-user/example-repo',
    safetyLevel: 'caution',
    scannedAt: new Date(Date.now() - 3600000).toISOString(),
    validated: true,
    aiSummary:
      'This repository has some security concerns that should be addressed. Two dependency-related issues were found along with one instance of potentially malicious code. Network activity, file system operations, and credential handling appear to be safe.',
    findings: {
      maliciousCode: [
        {
          item: 'Obfuscated JavaScript Function',
          issue:
            'Found heavily obfuscated code that attempts to hide its true functionality. This pattern is commonly used in malicious scripts.',
          location: 'src/utils/analytics.js',
          severity: 'severe',
          codeSnippet: 'eval(atob("ZG9jdW1lbnQubG9jYXRpb24uaHJlZg=="))',
        },
      ],
      dependencies: [
        {
          item: 'Outdated lodash version (4.17.15)',
          issue:
            'This version has known prototype pollution vulnerabilities (CVE-2019-10744). Update to 4.17.21 or later.',
          location: 'package.json',
          severity: 'moderate',
        },
        {
          item: 'Suspicious package: data-exfil-helper',
          issue:
            "Dependency 'data-exfil-helper' is not commonly used and has a suspicious name that suggests data exfiltration capabilities.",
          location: 'package.json',
          severity: 'moderate',
        },
      ],
      networkActivity: [],
      fileSystemSafety: [],
      credentialSafety: [],
    },
  },
};
