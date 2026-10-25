import { readEnv } from "../libraries/readEnv.ts";
import type { Options } from "./types.ts";

const DEFAULT_MODEL_ID = readEnv("XO_AGENT_MODEL_ID", "Qwen/Model-Name");

import { tokenize, detokenize } from "./tokens.ts";
// TODO: resolve default options throughout

export const generate = (
  prompt: string,
  options: Options,
): ReadableStream<string> => {
  const {
    model: { repository: { id: modelID = DEFAULT_MODEL_ID } },
    session: { id: sessionID },
  } = options;

  const tokens = tokenize(prompt, options),
    sessionCache = _upsertSession(modelID, sessionID);

  return new ReadableStream({
    pull(stream) {
      const predictedOptions = predict(tokens, sessionCache);

      const roll = Math.random();
      let [chosenToken] = predictedOptions;

      // TODO: ah, this is probably not the right "predictedOptions" format
      for (
        let index = 0, acc = 0;
        acc < roll;
        index++, acc += predictedOptions[index]
      ) {
        chosenToken = predictedOptions[index];
      }

      const result = detokenize(chosenToken, options);

      stream.enqueue(result);

      if (result === "<|eof token|>" /* or whatever */) stream.close();
    },
  });
};

export const predict = (
  tokens: number[],
  sessionCache: GPUBuffer,
): number[] => {
  // TODO: actual render pass
  return [];
};

const _upsertSession = (modelID: string, sessionID?: string): GPUBuffer => {
  // => init gpu device if not there
  // => if different model, _getFile(model) and load it

  // if new session ID, start new buffer

  // => find gpubuffer by session id, either
  // => in weakmap
  // => on disk
};
