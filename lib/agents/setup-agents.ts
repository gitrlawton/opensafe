import { DigitalOceanClient } from "./client";
import { AGENT_CONFIGS } from "./config";
import { AgentSetup } from "./types";

/**
 * Creates all 6 agents for the OpenSafe scanning workflow
 * and establishes parent-child relationships
 */
export async function setupAgents(
  apiToken: string,
  projectId?: string,
  workspaceId?: string
): Promise<AgentSetup> {
  const client = new DigitalOceanClient(apiToken);

  console.log("Starting OpenSafe agent setup...\n");

  // Step 1: Create all agents
  console.log("Creating agents...");

  const repoContentFetch = await client.createAgent({
    name: AGENT_CONFIGS.repoContentFetch.name,
    description: AGENT_CONFIGS.repoContentFetch.description,
    instruction: AGENT_CONFIGS.repoContentFetch.instruction,
    model: AGENT_CONFIGS.repoContentFetch.model,
    temperature: AGENT_CONFIGS.repoContentFetch.temperature,
    max_tokens: AGENT_CONFIGS.repoContentFetch.maxTokens,
    project_id: projectId,
    workspace_id: workspaceId,
  });
  console.log(`✓ Created: ${repoContentFetch.name} (${repoContentFetch.uuid})`);

  const riskDetection = await client.createAgent({
    name: AGENT_CONFIGS.riskDetection.name,
    description: AGENT_CONFIGS.riskDetection.description,
    instruction: AGENT_CONFIGS.riskDetection.instruction,
    model: AGENT_CONFIGS.riskDetection.model,
    temperature: AGENT_CONFIGS.riskDetection.temperature,
    max_tokens: AGENT_CONFIGS.riskDetection.maxTokens,
    project_id: projectId,
    workspace_id: workspaceId,
  });
  console.log(`✓ Created: ${riskDetection.name} (${riskDetection.uuid})`);

  const scoring = await client.createAgent({
    name: AGENT_CONFIGS.scoring.name,
    description: AGENT_CONFIGS.scoring.description,
    instruction: AGENT_CONFIGS.scoring.instruction,
    model: AGENT_CONFIGS.scoring.model,
    temperature: AGENT_CONFIGS.scoring.temperature,
    max_tokens: AGENT_CONFIGS.scoring.maxTokens,
    project_id: projectId,
    workspace_id: workspaceId,
  });
  console.log(`✓ Created: ${scoring.name} (${scoring.uuid})`);

  // Note: Summary agent uses Gemini API directly (not DigitalOcean) to save credits
  console.log(`⏭️  Skipped: Summary Agent (uses Gemini API directly)`);

  const review = await client.createAgent({
    name: AGENT_CONFIGS.review.name,
    description: AGENT_CONFIGS.review.description,
    instruction: AGENT_CONFIGS.review.instruction,
    model: AGENT_CONFIGS.review.model,
    temperature: AGENT_CONFIGS.review.temperature,
    max_tokens: AGENT_CONFIGS.review.maxTokens,
    project_id: projectId,
    workspace_id: workspaceId,
  });
  console.log(`✓ Created: ${review.name} (${review.uuid})`);

  const aggregator = await client.createAgent({
    name: AGENT_CONFIGS.aggregator.name,
    description: AGENT_CONFIGS.aggregator.description,
    instruction: AGENT_CONFIGS.aggregator.instruction,
    model: AGENT_CONFIGS.aggregator.model,
    temperature: AGENT_CONFIGS.aggregator.temperature,
    max_tokens: AGENT_CONFIGS.aggregator.maxTokens,
    project_id: projectId,
    workspace_id: workspaceId,
  });
  console.log(`✓ Created: ${aggregator.name} (${aggregator.uuid})`);

  // Step 2: Link child agents to the Aggregator (parent)
  console.log("\nLinking child agents to Aggregator...");

  await client.addChildAgent(aggregator.uuid, repoContentFetch.uuid);
  console.log(`✓ Linked: ${repoContentFetch.name} → Aggregator`);

  await client.addChildAgent(aggregator.uuid, riskDetection.uuid);
  console.log(`✓ Linked: ${riskDetection.name} → Aggregator`);

  await client.addChildAgent(aggregator.uuid, scoring.uuid);
  console.log(`✓ Linked: ${scoring.name} → Aggregator`);

  // Summary agent is not linked (uses Gemini API directly)
  console.log(`⏭️  Skipped: Summary Agent linking (external API)`);

  await client.addChildAgent(aggregator.uuid, review.uuid);
  console.log(`✓ Linked: ${review.name} → Aggregator`);

  console.log("\n✓ Agent setup complete!\n");

  // Step 3: Return agent setup info
  const setup: AgentSetup = {
    aggregator,
    repoContentFetch,
    riskDetection,
    scoring,
    summary: null, // Summary uses Gemini API, not a DigitalOcean agent
    review,
  };

  // Print summary
  console.log("Agent UUIDs for .env:");
  console.log(`AGGREGATOR_AGENT_UUID=${aggregator.uuid}`);
  console.log(`REPO_FETCH_AGENT_UUID=${repoContentFetch.uuid}`);
  console.log(`RISK_DETECTION_AGENT_UUID=${riskDetection.uuid}`);
  console.log(`SCORING_AGENT_UUID=${scoring.uuid}`);
  console.log(`# SUMMARY_AGENT_UUID not needed (uses Gemini API directly)`);
  console.log(`REVIEW_AGENT_UUID=${review.uuid}`);
  if (workspaceId) {
    console.log(`\n# Workspace ID (already set):`);
    console.log(`DIGITALOCEAN_WORKSPACE_ID=${workspaceId}`);
  }
  console.log(`\n# Don't forget to add your Gemini API key:`);
  console.log(`GEMINI_API_KEY=your_gemini_key_here`);
  console.log(`# Optional: OpenRouter as fallback`);
  console.log(`OPENROUTER_API_KEY=your_openrouter_key_here`);

  return setup;
}

/**
 * Retrieves existing agents by their UUIDs
 */
export async function getAgents(
  apiToken: string,
  agentUuids: {
    aggregator: string;
    repoContentFetch: string;
    riskDetection: string;
    scoring: string;
    summary: string;
    review: string;
  }
): Promise<AgentSetup> {
  const client = new DigitalOceanClient(apiToken);

  console.log("Retrieving existing agents...\n");

  const [aggregator, repoContentFetch, riskDetection, scoring, summary, review] =
    await Promise.all([
      client.getAgent(agentUuids.aggregator),
      client.getAgent(agentUuids.repoContentFetch),
      client.getAgent(agentUuids.riskDetection),
      client.getAgent(agentUuids.scoring),
      client.getAgent(agentUuids.summary),
      client.getAgent(agentUuids.review),
    ]);

  console.log("✓ Retrieved all agents\n");

  return {
    aggregator,
    repoContentFetch,
    riskDetection,
    scoring,
    summary,
    review,
  };
}

/**
 * Deletes all OpenSafe agents
 */
export async function cleanupAgents(
  apiToken: string,
  agentUuids: {
    aggregator: string;
    repoContentFetch: string;
    riskDetection: string;
    scoring: string;
    summary: string;
    review: string;
  }
): Promise<void> {
  const client = new DigitalOceanClient(apiToken);

  console.log("Cleaning up agents...\n");

  // Delete in reverse order (children first, then parent)
  const uuids = [
    agentUuids.review,
    agentUuids.summary,
    agentUuids.scoring,
    agentUuids.riskDetection,
    agentUuids.repoContentFetch,
    agentUuids.aggregator,
  ];

  for (const uuid of uuids) {
    await client.deleteAgent(uuid);
    console.log(`✓ Deleted agent: ${uuid}`);
  }

  console.log("\n✓ Cleanup complete!\n");
}
