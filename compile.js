// Проверка компиляции контрактов с реальными OZ-импортами.
const solc = require("solc");
const fs = require("fs");
const path = require("path");

const CONTRACTS = ["GameToken.sol", "GameNFT.sol", "GameBadges.sol", "GameLeaderboard.sol", "GameHub.sol"];

// Резолвер импортов: тянет исходники из node_modules (реальный OpenZeppelin).
function findImport(importPath) {
  try {
    const full = path.join(__dirname, "node_modules", importPath);
    return { contents: fs.readFileSync(full, "utf8") };
  } catch (e) {
    return { error: "не найден: " + importPath };
  }
}

const sources = {};
for (const f of CONTRACTS) {
  sources[f] = { content: fs.readFileSync(path.join(__dirname, "contracts", f), "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    // Base — после Dencun, Cancun поддерживается. OZ 5.6 использует mcopy.
    evmVersion: "cancun",
    optimizer: { enabled: false, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImport })
);

let errors = 0,
  warnings = 0;
for (const e of out.errors || []) {
  if (e.severity === "error") {
    errors++;
    console.log("ОШИБКА:", e.formattedMessage);
  } else {
    warnings++;
  }
}

console.log("");
if (errors === 0) {
  console.log("✓ Компиляция без ошибок (" + warnings + " предупреждений)");
  for (const f of CONTRACTS) {
    const name = f.replace(".sol", "");
    const c = out.contracts[f][name];
    const size = c.evm.bytecode.object.length / 2;
    console.log("  " + name.padEnd(12) + " байткод: " + size + " байт");
  }
} else {
  console.log("✗ Ошибок компиляции: " + errors);
  process.exit(1);
}
