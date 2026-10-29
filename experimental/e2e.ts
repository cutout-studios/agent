import { detokenize, tokenize } from "./tokens.ts";

const tokens = await tokenize("my cool prompt");

console.log({ tokens });

const message = await detokenize(tokens);

console.log({ message });
