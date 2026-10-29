import type { Options } from "./types.ts";

export const DEFAULT_MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct";
export const DEFAULT_PRETOKENIZER_REGEX_TEXT =
  "('s|'t|'re|'ve|'m|'ll|'d)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}| ?[^\\s\\p{L}\\p{N}]+[\\r\\n]*|\\s*[\\r\\n]+|\\s+(?!\\S)|\\s+";

export const resolveOptionDefaults = (options?: Options): Options => ({
  session: options?.session,
  model: {
    repository: {
      id: options?.model.repository.id ?? DEFAULT_MODEL_ID,
      type: "hf",
    },
  },
});
