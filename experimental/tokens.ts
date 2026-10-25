import type { Options } from "./types.ts";

type TODO = unknown;

export const tokenize = (
  prompt: string,
  options: Options,
): number[] => {
  const [word2Token] = _getTokenLUTs(options);

  return [];
};

export const detokenize = (token: number, options: Options): string => {
  const [, token2Word] = _getTokenLUTs(options);

  return token2Word.get(token)!;
};


const _getTokenLUTs = (options: Options): [TODO, Map<number, string>] => {
  // let tokenTrie;
  // try {
  //   tokenTrie = _getFile(modelID, "tokenize.trie.json"); // TODO: unwrap stream
  // } catch {
  //   const tokenInfo = _getFile(modelID, "tokenize.json");

  //   // convert to trie, write to "tokenize.trie.json"
  //   // also write reverse token map, while we're here
  // }

  return [void 0, new Map()];
};
