// Собирает Standard-JSON-Input для верификации на Basescan: все исходники
// (наши контракты + все транзитивно импортированные файлы OpenZeppelin)
// инлайнятся в один JSON. Настройки — ровно как при деплое (0.8.28, cancun,
// оптимизатор выключен). Этот же JSON грузится для каждого из 5 контрактов
// (Basescan сам матчит по ContractName).
const solc = require("solc");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTRACTS = ["GameToken.sol", "GameNFT.sol", "GameBadges.sol", "GameLeaderboard.sol", "GameHub.sol"];

// Собираем все загруженные импорты, чтобы вложить их в sources.
const collected = {};
function findImport(p) {
  try {
    const content = fs.readFileSync(path.join(ROOT, "node_modules", p), "utf8");
    collected[p] = { content };
    return { contents: content };
  } catch (e) {
    return { error: "не найден: " + p };
  }
}

const sources = {};
for (const f of CONTRACTS) {
  sources[f] = { content: fs.readFileSync(path.join(ROOT, "contracts", f), "utf8") };
}

const settings = {
  evmVersion: "cancun",
  optimizer: { enabled: false, runs: 200 },
  outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
};

// Первый проход — чтобы findImport собрал все зависимости.
const compiled = JSON.parse(
  solc.compile(JSON.stringify({ language: "Solidity", sources, settings }), { import: findImport })
);
const errs = (compiled.errors || []).filter((e) => e.severity === "error");
if (errs.length) {
  for (const e of errs) console.error(e.formattedMessage);
  process.exit(1);
}

// Финальный input: наши файлы + все собранные OZ-файлы.
const standardInput = {
  language: "Solidity",
  sources: { ...sources, ...collected },
  settings: {
    evmVersion: "cancun",
    optimizer: { enabled: false, runs: 200 },
    // Basescan сам добавит нужный outputSelection; оставляем минимальный.
    outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
  },
};

const outDir = path.join(ROOT, "verify");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "standard-input.json");
fs.writeFileSync(outFile, JSON.stringify(standardInput));
console.log("Записано:", path.relative(ROOT, outFile));
console.log("Всего файлов исходников:", Object.keys(standardInput.sources).length);
console.log("(наши 5 + OZ:", Object.keys(collected).length, "файлов)");
