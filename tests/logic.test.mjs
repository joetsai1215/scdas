import assert from "node:assert/strict";
import { analyzeCircuit, examples } from "../src/logic.js";

const mealyJk = analyzeCircuit(examples.mealyThreeOnes.rows, "mealy", "jk");
assert.deepEqual(
  Object.fromEntries(mealyJk.equations.map((equation) => [equation.name, equation.expression])),
  {
    JQ1: "Q0X",
    KQ1: "X'",
    JQ0: "Q1'X",
    KQ0: "1",
    Z: "Q1X",
  }
);

const mealyT = analyzeCircuit(examples.mealyThreeOnes.rows, "mealy", "t");
assert.deepEqual(
  Object.fromEntries(mealyT.equations.map((equation) => [equation.name, equation.expression])),
  {
    TQ1: "Q0X + Q1X'",
    TQ0: "Q0 + Q1'X",
    Z: "Q1X",
  }
);

const mooreJk = analyzeCircuit(examples.mooreThreeOnes.rows, "moore", "jk");
assert.deepEqual(
  Object.fromEntries(mooreJk.equations.map((equation) => [equation.name, equation.expression])),
  {
    JQ1: "Q0X",
    KQ1: "X'",
    JQ0: "X",
    KQ0: "Q1' + X'",
    Z: "Q1Q0",
  }
);

console.log("logic tests passed");
