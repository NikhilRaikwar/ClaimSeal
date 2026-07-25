import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import solc from "solc";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(root, "contracts", "ClaimSealRegistry.sol");
const artifactDirectory = path.join(root, "artifacts");
const artifactPath = path.join(artifactDirectory, "ClaimSealRegistry.json");

const source = await readFile(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: { "ClaimSealRegistry.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors ?? [];
for (const issue of errors) console.log(issue.formattedMessage);
if (errors.some((issue) => issue.severity === "error")) process.exit(1);

const contract = output.contracts?.["ClaimSealRegistry.sol"]?.ClaimSealRegistry;
if (!contract?.evm?.bytecode?.object) {
  throw new Error("ClaimSealRegistry compilation did not produce deployable bytecode.");
}

await mkdir(artifactDirectory, { recursive: true });
await writeFile(
  artifactPath,
  `${JSON.stringify(
    {
      contractName: "ClaimSealRegistry",
      compilerVersion: solc.version(),
      abi: contract.abi,
      bytecode: `0x${contract.evm.bytecode.object}`,
      deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
    },
    null,
    2,
  )}\n`,
);

console.log(`Compiled ClaimSealRegistry with solc ${solc.version()}`);
console.log(`Artifact: ${path.relative(root, artifactPath)}`);
