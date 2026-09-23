import type { CrmStore, PersistedStoreMutation } from "./store.js";
import type { AiModelConfig } from "./types.js";

export interface AiConfigTestOutcome {
  ok: boolean;
  message: string;
  testedAt: string;
}

export async function persistAiConfigTestOutcome(
  store: CrmStore,
  ownerId: string,
  configId: string,
  outcome: AiConfigTestOutcome
): Promise<AiModelConfig | null> {
  const mutation = (): PersistedStoreMutation<AiModelConfig | null> => {
    const config = store.aiModelConfigs.find(
      (item) => item.id === configId && item.ownerId === ownerId
    );
    if (!config) return { value: null, rollback() {} };
    const previous = {
      lastTestAt: config.lastTestAt,
      lastTestStatus: config.lastTestStatus,
      lastTestMessage: config.lastTestMessage,
      updatedAt: config.updatedAt
    };
    config.lastTestAt = outcome.testedAt;
    config.lastTestStatus = outcome.ok ? "passed" : "failed";
    config.lastTestMessage = outcome.message;
    config.updatedAt = outcome.testedAt;
    return {
      value: config,
      rollback() {
        Object.assign(config, previous);
      }
    };
  };

  if (store.persistMutation) return store.persistMutation(mutation);
  const applied = mutation();
  try {
    await store.persist();
    return applied.value;
  } catch (error) {
    applied.rollback();
    throw error;
  }
}
