/** Official Prisma WASM parser + Rust-free generator; no native engine download is required. */
import internals from "@prisma/internals";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const schemaPath = resolve(root, "prisma/schema.prisma");
if (!/engineType\s*=\s*"client"/.test(await readFile(schemaPath, "utf8")))
  throw new Error("This generator requires Prisma Rust-free client mode.");
const generators = await internals.getGenerators({
  schemaPath,
  skipDownload: true,
  registry: {
    "prisma-client-js": {
      type: "rpc",
      generatorPath: require.resolve("@prisma/client/generator-build"),
      isNode: true,
    },
  },
});
try {
  for (const generator of generators) await generator.generate();
  console.log("Generated Prisma Rust-free client.");
} finally {
  for (const generator of generators) generator.stop();
}
