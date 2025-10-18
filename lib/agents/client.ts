import { Agent } from "./types";
import { DIGITALOCEAN_API_BASE } from "./config";

export class DigitalOceanClient {
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.baseUrl = DIGITALOCEAN_API_BASE;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DigitalOcean API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * List available regions
   */
  async listRegions(): Promise<any[]> {
    const response = await fetch("https://api.digitalocean.com/v2/regions", {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch regions: ${response.status}`);
    }

    const data = await response.json();
    return data.regions;
  }

  /**
   * List available models
   */
  async listModels(): Promise<any[]> {
    const response = await this.request<{ models: any[] }>("/models");
    return response.models;
  }

  /**
   * Get model UUID by name
   */
  async getModelUuid(modelName: string): Promise<string> {
    const models = await this.listModels();
    const model = models.find(
      (m) =>
        m.name === modelName ||
        m.name.toLowerCase().includes(modelName.toLowerCase())
    );

    if (!model) {
      console.error(`\n❌ Model "${modelName}" not found.`);
      console.error(`Available models (first 10):`);
      models.slice(0, 10).forEach((m) => console.error(`  - ${m.name}`));
      throw new Error(
        `Model "${modelName}" not found. Available models: ${models.map((m) => m.name).join(", ")}`
      );
    }

    console.log(`✓ Found model: "${model.name}" (UUID: ${model.uuid})`);
    return model.uuid;
  }

  /**
   * Create a new agent
   */
  async createAgent(config: {
    name: string;
    description: string;
    instruction: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    region?: string;
    project_id?: string;
    workspace_id?: string;
  }): Promise<Agent> {
    // Get model UUID
    const modelUuid = await this.getModelUuid(config.model || "gpt-oss-120b");

    const payload: any = {
      name: config.name,
      description: config.description,
      instruction: config.instruction,
      model_uuid: modelUuid,
      temperature: config.temperature ?? 0.3,
      max_tokens: config.max_tokens ?? 4000,
      region: "tor1",
    };

    // Add project_id if provided
    if (config.project_id) {
      payload.project_id = config.project_id;
    }

    // Add workspace_id if provided
    if (config.workspace_id) {
      payload.workspace_id = config.workspace_id;
    }

    console.log("\n🔍 Debug - Creating agent:");
    console.log(`  Name: ${payload.name}`);
    console.log(`  Model: ${config.model || "gpt-oss-120b"} → ${modelUuid}`);
    console.log(`  Region: ${payload.region}`);
    console.log(`  Temperature: ${payload.temperature}`);
    console.log(`  Max Tokens: ${payload.max_tokens}`);
    console.log(`  Project ID: ${payload.project_id || "Not set"}`);
    console.log(`  Workspace ID: ${payload.workspace_id || "Not set"}`);
    console.log(`  Instruction Length: ${payload.instruction.length} chars`);

    const response = await this.request<{ agent: Agent }>("/agents", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.agent;
  }

  /**
   * Wait for an agent to be deployed
   */
  async waitForAgentDeployment(
    agentUuid: string,
    maxAttempts = 30,
    delayMs = 2000
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const agent = await this.getAgent(agentUuid);
      const status = (agent as any).deployment?.status;

      if (status === "STATUS_RUNNING") {
        console.log(`  ✓ Agent deployed (${attempt}/${maxAttempts})`);
        return;
      }

      console.log(`  ⏳ Waiting for deployment... ${status || "unknown"} (${attempt}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(
      `Agent ${agentUuid} did not deploy within ${(maxAttempts * delayMs) / 1000} seconds`
    );
  }

  /**
   * Link a child agent to a parent agent
   */
  async addChildAgent(
    parentAgentUuid: string,
    childAgentUuid: string
  ): Promise<void> {
    console.log(`\n🔗 Linking child agent:`);
    console.log(`  Parent: ${parentAgentUuid}`);
    console.log(`  Child: ${childAgentUuid}`);

    // Wait for both agents to be deployed before linking
    console.log(`  Checking parent deployment...`);
    await this.waitForAgentDeployment(parentAgentUuid);

    console.log(`  Checking child deployment...`);
    await this.waitForAgentDeployment(childAgentUuid);

    try {
      await this.request(
        `/agents/${parentAgentUuid}/child_agents/${childAgentUuid}`,
        {
          method: "POST",
        }
      );
      console.log(`✓ Successfully linked`);
    } catch (error) {
      console.error(`❌ Failed to link agents`);
      throw error;
    }
  }

  /**
   * Get agent by UUID
   */
  async getAgent(agentUuid: string): Promise<Agent> {
    const response = await this.request<{ agent: Agent }>(
      `/agents/${agentUuid}`
    );
    return response.agent;
  }

  /**
   * List all agents
   */
  async listAgents(): Promise<Agent[]> {
    const response = await this.request<any>("/agents");

    // Handle different response formats
    if (response.agents) {
      return response.agents;
    } else if (Array.isArray(response)) {
      return response;
    } else {
      return [];
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentUuid: string): Promise<void> {
    await this.request(`/agents/${agentUuid}`, {
      method: "DELETE",
    });
  }

  /**
   * Get child agents of a parent agent
   */
  async getChildAgents(parentAgentUuid: string): Promise<Agent[]> {
    const response = await this.request<{ children: Agent[] }>(
      `/agents/${parentAgentUuid}/child_agents`
    );
    return response.children;
  }
}
