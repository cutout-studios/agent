import { join } from "@std/path";

import { OUTPUT_ROOT } from "../constants.env.ts";

import { getFile } from "./getFile.ts";
import type { Options } from "./types.ts";
import {
  DEFAULT_MODEL_ID,
  DEFAULT_PRETOKENIZER_REGEX_TEXT,
  resolveOptionDefaults,
} from "./defaults.ts";

type TokenNode = [{ [char: string]: TokenNode }, number | undefined];
type TokenLUT = [
  pretokenizer: RegExp,
  word2Token: TokenNode,
  token2word: string[],
];

export const tokenize = async (
  prompt: string,
  options?: Options,
): Promise<Uint32Array> => {
  const [pretokenizer, word2Token] = await _getTokenLUT(options);
  const result: number[] = [];

  let tokenMatch;
  while ((tokenMatch = pretokenizer.exec(prompt)) !== null) {
    const [currentWord] = tokenMatch;

    let node = word2Token;
    for (const character of currentWord as string) {
      console.log({ character, result, number: node[1] });

      if (!node[0][character]) {
        // TODO: we need to backtrack
        if (typeof node[1] !== "number") {
          throw new Error("Invalid Token!");
        }

        result.push(node[1]);
        node = word2Token;
        continue;
      }

      node = node[0][character];
    }
  }

  return new Uint32Array(result);
};

export const detokenize = async (
  tokens: Uint32Array,
  options?: Options,
): Promise<string> => {
  const [, , token2Word] = await _getTokenLUT(options);

  let result = "";

  for (const token of tokens) result += token2Word[token];

  return result;
};

// ---

const lutEncoder = new TextEncoder(), lutDecoder = new TextDecoder("latin1");

const _getFileJSON = async (modelID: string, filePath: string) =>
  JSON.parse(await new Response(await getFile(modelID, filePath)).text());

const _getTokenLUT = async (
  options?: Options,
): Promise<TokenLUT> => {
  const {
    model: { repository: { id: modelID = DEFAULT_MODEL_ID } },
  } = resolveOptionDefaults(options);

  try {
    const [regexText, ...rest] = await _getFileJSON(
      modelID,
      "tokenizer.lut.json",
    );

    return [new RegExp(regexText), ...rest] as TokenLUT;
  } catch {
    // need to build the tokenizer lut, then
  }

  const {
    model: { vocab },
    pre_tokenizer: pretokenizer,
    added_tokens: systemTokens,
  } = await _getFileJSON(
    modelID,
    "tokenizer.json",
  );

  let regexText;
  switch (pretokenizer.type) {
    case "Split":
      regexText = pretokenizer.pattern.Regex;
      break;
    case "Sequence":
      regexText = pretokenizer.pretokenizers.find((
        { type }: { type: string },
      ) => type === "Split")?.pattern.Regex;
      break;
    default:
      regexText = DEFAULT_PRETOKENIZER_REGEX_TEXT;
  }

  const result = [
    new RegExp(
      regexText.replaceAll("(?:", "("),
      regexText.includes("(?:") ? "gui" : "gu",
    ),
    [{}, undefined],
    [],
  ] as TokenLUT;

  for (const key in vocab) {
    // convert to utf-8 bytes
    const word = lutDecoder.decode(lutEncoder.encode(key)),
      number = vocab[key];

    // trie
    let node = result[1], index = 0;
    while (index < word.length) {
      const character = word[index++];
      node[0][character] ??= [{}, undefined];
      node = node[0][character];
    }

    node[1] = number;

    // reverse lookup
    result[2][number] = word;
  }

  // reverse lookup system tokens, emitted by the model
  for (const { content, id } of systemTokens) {
    result[2][id] = content;
  }

  await Deno.writeTextFile(
    join(
      OUTPUT_ROOT,
      "model",
      modelID,
      "tokenizer.lut.json",
    ),
    JSON.stringify([regexText, result[1], result[2]]),
  );

  return result;
};
