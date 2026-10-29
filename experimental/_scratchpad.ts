import type { Options } from "./types.ts";

import { tokenize, detokenize } from "./tokens.ts";
import { resolveOptionDefaults } from "./defaults.ts";

export const generate = async (
  prompt: string,
  options: Options,
): Promise<ReadableStream<string>> => {
  const {
    model: { repository: { id: modelID } },
    session: { id: sessionID } = {},
  } = resolveOptionDefaults(options)

  const tokens = await tokenize(prompt, options),
    sessionCache = _upsertSession(modelID, sessionID);

  return new ReadableStream({
    async pull(stream) {
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

      const result = await detokenize(new Uint32Array([chosenToken]), options);

      stream.enqueue(result);

      if (result === "<|eof token|>" /* or whatever */) stream.close();
    },
  });
};

export const predict = (
  tokens: Uint32Array,
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

  return new GPUBuffer();
};
