export enum ActorType {
  USER = "USER",
  AGENT = "AGENT",
  SYSTEM = "SYSTEM",
}

export interface ToolCall {
  id: string;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
  calledAt: Date;
  completedAt?: Date;
}

export interface AgentMemory {
  id: string;
  organizationId: string;
  key: string;
  value: unknown;
  scope: "global" | "role" | "candidate" | "application";
  scopeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSession {
  id: string;
  organizationId: string;
  actorType: ActorType;
  actorId: string;
  goal?: string;
  context: Record<string, unknown>;
  toolCalls: ToolCall[];
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
