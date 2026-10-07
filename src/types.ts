export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status?: 'streaming' | 'complete' | 'error';
  contextText?: string;
  contextMessageId?: string;
  attachments?: Array<{
    name: string;
    kind: 'image' | 'document';
    text?: string;
    mimeType?: string;
    imageDataUrl?: string;
  }>;
  // Image generation result (assistant messages only)
  imageUrl?: string;
  imagePrompt?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  isTemp?: boolean;
  // Trash + metadata-only list fields
  deletedAt?: number;
  daysLeft?: number;
  messageCount?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'github' | 'guest';
}

export type ThemeMode = 'dark' | 'bright' | 'system';

export type SubscriptionPlanType = 'free' | 'cat' | 'chetak' | 'arka';

export interface AppSettings {
  theme: ThemeMode;
  notificationsEnabled: boolean;
  customHfToken: string;
  customBackendUrl?: string;
  systemPrompt: string;
  responseStyle?: 'adaptive' | 'detailed';
  selectedModel?: string;
  subscriptionPlan?: SubscriptionPlanType;
  subscriptionStartedAt?: number;
  subscriptionExpiresAt?: number;
  lastPaymentId?: string;
  ownedPlans?: SubscriptionPlanType[];
  planExpiries?: Partial<Record<SubscriptionPlanType, number>>;
}

export const MODEL_TO_PLAN: Record<string, SubscriptionPlanType> = {
  'Qwen/Qwen2.5-1.5B-Instruct': 'free',
  'Qwen/Qwen2.5-3B-Instruct': 'cat',
  'deepseek-ai/DeepSeek-R1-Distill-Llama-8B': 'chetak',
  'meta-llama/Llama-3.3-70B-Instruct': 'arka',
  'meta-llama/Llama-3-70B-Instruct': 'arka',
};

// Migrate any legacy model IDs found in saved settings to the new ones.
export const LEGACY_MODEL_MAP: Record<string, string> = {
  'meta-llama/Llama-3.2-1B-Instruct': 'Qwen/Qwen2.5-1.5B-Instruct',
  'meta-llama/Llama-3.2-3B-Instruct': 'Qwen/Qwen2.5-3B-Instruct',
  'meta-llama/Llama-3.1-8B-Instruct': 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
  'meta-llama/Llama-3-70B-Instruct': 'meta-llama/Llama-3.3-70B-Instruct',
};

export interface HFStatus {
  status: string;
  model: string;
  hasTokenInEnv: boolean;
  instructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
}
