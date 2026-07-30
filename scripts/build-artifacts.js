// Компилирует контракты и выгружает ABI + байткод в src/lib/artifacts.json.
// Этот файл потом импортируют деплой-страница (нужен байткод) и фронт (нужен ABI),
// чтобы не компилировать Solidity в браузере.
const solc = require("solc");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTRACTS = [
  "GameToken.sol",
  "GameNFT.sol",
  "GameBadges.sol",
  "GameLeaderboard.sol",
  "GameHub.sol",
];

function findImport(p) {
  try {
    return { contents: fs.readFileSync(path.join(ROOT, "node_modules", p), "utf8") };
  } catch {
    return { error: "не найден: " + p };
  }
}

const sources = {};
for (const f of CONTRACTS) {
  sources[f] = { content: fs.readFileSync(path.join(ROOT, "contracts", f), "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    evmVersion: "cancun",
    optimizer: { enabled: false, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
const errs = (out.errors || []).filter((e) => e.severity === "error");
if (errs.length) {
  for (const e of errs) console.error(e.formattedMessage);
  process.exit(1);
}

const artifacts = {};
for (const f of CONTRACTS) {
  const name = f.replace(".sol", "");
  const c = out.contracts[f][name];
  artifacts[name] = {
    abi: c.abi,
    bytecode: "0x" + c.evm.bytecode.object,
  };
}

const outDir = path.join(ROOT, "src", "lib");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "artifacts.json");
fs.writeFileSync(outFile, JSON.stringify(artifacts, null, 2));
console.log("Записано:", path.relative(ROOT, outFile));
for (const [k, v] of Object.entries(artifacts)) {
  console.log("  " + k.padEnd(16) + " abi:" + v.abi.length + " методов, байткод:" + (v.bytecode.length - 2) / 2 + " байт");
}
