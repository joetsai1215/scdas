import { analyzeCircuit, examples, parseDescriptionToTable } from "./logic.js";
import { bindDiagramPan, renderCircuitDiagram, resetDiagramView, zoomDiagram } from "./diagram.js";

const state = {
  modelType: "mealy",
  ffType: "jk",
  rows: structuredClone(examples.mealyThreeOnes.rows),
  analysis: null,
};

const els = {
  statusText: document.querySelector("#statusText"),
  stateTableHead: document.querySelector("#stateTableHead"),
  stateTableBody: document.querySelector("#stateTableBody"),
  assignmentTable: document.querySelector("#assignmentTable"),
  equationList: document.querySelector("#equationList"),
  equationSelect: document.querySelector("#equationSelect"),
  kmapView: document.querySelector("#kmapView"),
  circuitSvg: document.querySelector("#circuitSvg"),
  problemText: document.querySelector("#problemText"),
};

init();

function init() {
  document.querySelectorAll("[name='modelType']").forEach((input) => {
    input.addEventListener("change", () => {
      state.modelType = input.value;
      state.rows = structuredClone(state.modelType === "moore" ? examples.mooreThreeOnes.rows : examples.mealyThreeOnes.rows);
      renderStateTable();
      clearResults("Model changed. Example table loaded.");
    });
  });

  document.querySelectorAll("[name='ffType']").forEach((input) => {
    input.addEventListener("change", () => {
      state.ffType = input.value;
      clearResults("Flip-flop type changed.");
    });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.querySelector("#clearTableButton").addEventListener("click", () => {
    state.rows = [];
    renderStateTable();
    clearResults("Table cleared.");
  });

  document.querySelector("#loadExampleButton").addEventListener("click", () => {
    state.rows = structuredClone(state.modelType === "moore" ? examples.mooreThreeOnes.rows : examples.mealyThreeOnes.rows);
    renderStateTable();
    clearResults("Example loaded.");
  });

  document.querySelector("#addStateButton").addEventListener("click", () => {
    const nextName = String.fromCharCode(65 + state.rows.length);
    state.rows.push(
      state.modelType === "mealy"
        ? { state: nextName, next0: nextName, out0: "0", next1: nextName, out1: "0" }
        : { state: nextName, output: "0", next0: nextName, next1: nextName }
    );
    renderStateTable();
    clearResults("State added.");
  });

  document.querySelector("#parseTextButton").addEventListener("click", () => {
    try {
      state.rows = parseDescriptionToTable(els.problemText.value, state.modelType);
      renderStateTable();
      clearResults("Description parsed locally.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  document.querySelector("#generateButton").addEventListener("click", generateCircuit);
  els.equationSelect.addEventListener("change", renderSelectedKMap);

  document.querySelector("#zoomOutButton").addEventListener("click", () => zoomDiagram(els.circuitSvg, -0.15));
  document.querySelector("#zoomInButton").addEventListener("click", () => zoomDiagram(els.circuitSvg, 0.15));
  document.querySelector("#zoomResetButton").addEventListener("click", () => {
    resetDiagramView();
    renderCircuitDiagram(els.circuitSvg, state.analysis);
  });

  bindDiagramPan(els.circuitSvg);
  renderStateTable();
  renderEmptyResults();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelector("#textPane").classList.toggle("active", tabName === "text");
  document.querySelector("#manualPane").classList.toggle("active", tabName === "manual");
}

function renderStateTable() {
  const isMealy = state.modelType === "mealy";
  const columns = isMealy
    ? [
        ["state", "Present State"],
        ["next0", "Next State X=0"],
        ["out0", "Output X=0"],
        ["next1", "Next State X=1"],
        ["out1", "Output X=1"],
      ]
    : [
        ["state", "Present State"],
        ["output", "State Output"],
        ["next0", "Next State X=0"],
        ["next1", "Next State X=1"],
      ];

  els.stateTableHead.innerHTML = `<tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}</tr>`;
  els.stateTableBody.innerHTML = state.rows
    .map(
      (row, rowIndex) =>
        `<tr>${columns
          .map(
            ([key]) =>
              `<td><input data-row="${rowIndex}" data-key="${key}" value="${escapeHtml(row[key] ?? "")}" aria-label="${key} row ${rowIndex + 1}" /></td>`
          )
          .join("")}</tr>`
    )
    .join("");

  els.stateTableBody.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      const rowIndex = Number(input.dataset.row);
      state.rows[rowIndex][input.dataset.key] = input.value;
      clearResults("Table edited.");
    });
  });

  els.assignmentTable.innerHTML = '<span class="placeholder">Assignments appear after generation.</span>';
}

function generateCircuit() {
  try {
    state.analysis = analyzeCircuit(readRowsFromTable(), state.modelType, state.ffType);
    renderAnalysis();
    setStatus("Circuit generated.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function readRowsFromTable() {
  return [...els.stateTableBody.querySelectorAll("tr")].map((tr) => {
    const row = {};
    tr.querySelectorAll("input").forEach((input) => {
      row[input.dataset.key] = input.value;
    });
    return row;
  });
}

function renderAnalysis() {
  const { analysis } = state;

  els.assignmentTable.innerHTML = Object.entries(analysis.assignment)
    .map(([stateName, bits]) => `<div>${stateName}</div><strong>${bits}</strong>`)
    .join("");

  els.equationList.innerHTML = analysis.equations
    .map(
      (equation) => `
        <article class="equation-card">
          <strong>${equation.name}</strong>
          <div>${equation.expression}</div>
        </article>
      `
    )
    .join("");

  els.equationSelect.innerHTML = analysis.equations
    .map((equation) => `<option value="${equation.name}">${equation.name}</option>`)
    .join("");
  renderSelectedKMap();
  resetDiagramView();
  renderCircuitDiagram(els.circuitSvg, analysis);
}

function renderSelectedKMap() {
  if (!state.analysis) return;
  const selected = els.equationSelect.value || state.analysis.equations[0]?.name;
  const kmap = state.analysis.kMaps[selected];
  if (!kmap) return;

  els.kmapView.innerHTML = `
    <div class="kmap-grid">
      <div class="kmap-cell header">${kmap.rowVariable} \\ ${kmap.columnVariables}</div>
      ${kmap.columnLabels.map((label) => `<div class="kmap-cell header">${label}</div>`).join("")}
      ${kmap.rowLabels
        .map(
          (rowLabel, rowIndex) => `
            <div class="kmap-cell header">${rowLabel}</div>
            ${kmap.columnLabels
              .map((_, columnIndex) => {
                const cell = kmap.cells[rowIndex * kmap.columnLabels.length + columnIndex];
                const className = cell.value === "1" ? "one" : cell.value === "X" ? "dc" : "";
                return `<div class="kmap-cell ${className}" title="${cell.bits}">${cell.value}</div>`;
              })
              .join("")}
          `
        )
        .join("")}
    </div>
    <article class="equation-card">
      <strong>Simplified Result</strong>
      <div>${selected} = ${kmap.expression}</div>
    </article>
  `;
}

function renderEmptyResults() {
  els.equationList.innerHTML = '<div class="placeholder">Generate a circuit to see flip-flop input equations.</div>';
  els.equationSelect.innerHTML = "";
  els.kmapView.innerHTML = '<div class="placeholder">K-map appears here after generation.</div>';
  els.circuitSvg.innerHTML = "";
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  els.circuitSvg.setAttribute("viewBox", "0 0 600 280");
  text.setAttribute("x", "300");
  text.setAttribute("y", "140");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("fill", "#647184");
  text.setAttribute("font-size", "16");
  text.textContent = "Circuit diagram appears after generation.";
  els.circuitSvg.appendChild(text);
}

function clearResults(message) {
  state.analysis = null;
  renderEmptyResults();
  setStatus(message);
}

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
