let view = { x: 0, y: 0, scale: 1 };
let drag = null;

export function resetDiagramView() {
  view = { x: 0, y: 0, scale: 1 };
}

export function zoomDiagram(svg, delta) {
  view.scale = Math.min(2.2, Math.max(0.55, view.scale + delta));
  applyView(svg);
}

export function bindDiagramPan(svg) {
  svg.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener("pointermove", (event) => {
    if (!drag) return;
    view.x = drag.vx + (event.clientX - drag.x) / view.scale;
    view.y = drag.vy + (event.clientY - drag.y) / view.scale;
    applyView(svg);
  });

  svg.addEventListener("pointerup", () => {
    drag = null;
  });
}

export function renderCircuitDiagram(svg, analysis) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 1100 560");

  const defs = createSvgElement("defs");
  defs.innerHTML = `
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155"></path>
    </marker>
  `;
  svg.appendChild(defs);

  const root = createSvgElement("g", { id: "viewportRoot" });
  svg.appendChild(root);

  const inputX = node(root, 48, 170, 80, 38, "Input X", "input");
  const clock = node(root, 48, 385, 80, 38, "Clock", "input");
  const bus = node(root, 48, 70, 80, 38, "State Q", "input");

  const ffCount = analysis.graph.flipFlops.length;
  const ffStartY = ffCount === 1 ? 220 : 150;
  const ffPositions = analysis.graph.flipFlops.map((ff, index) => ({
    ...ff,
    x: 790,
    y: ffStartY + index * 150,
  }));

  const equationPositions = analysis.graph.equations.map((equation, index) => ({
    equation,
    x: 360,
    y: 75 + index * 82,
  }));

  equationPositions.forEach(({ equation, x, y }) => {
    node(root, x, y, 260, 54, `${equation.name} = ${equation.expression}`, "gate");
    wire(root, inputX.right, inputX.midY, x, y + 27);
    wire(root, bus.right, bus.midY, x, y + 17);
  });

  ffPositions.forEach((ff, index) => {
    const ffBox = node(root, ff.x, ff.y, 150, 90, `${ff.type} FF\n${ff.name}`, "ff");
    const related = equationPositions.filter((item) => item.equation.name.endsWith(ff.name));

    related.forEach((item, relatedIndex) => {
      wire(root, item.x + 260, item.y + 27, ff.x, ff.y + 28 + relatedIndex * 24);
    });

    wire(root, clock.right, clock.midY, ff.x, ff.y + 74);
    wire(root, ffBox.right, ffBox.midY, 1010, ffBox.midY);
    label(root, 1018, ffBox.midY + 4, ff.name);
    if (index > 0) {
      wire(root, ffBox.right, ffBox.midY, 1025, ffBox.midY);
    }
  });

  const outEquation = analysis.graph.output;
  const outNode = node(root, 360, 455, 260, 54, `Z = ${outEquation.expression}`, "gate");
  const zNode = node(root, 830, 462, 90, 42, "Output Z", "output");
  wire(root, inputX.right, inputX.midY, outNode.x, outNode.midY);
  wire(root, bus.right, bus.midY, outNode.x, outNode.midY - 10);
  wire(root, outNode.right, outNode.midY, zNode.x, zNode.midY);

  applyView(svg);
}

function node(root, x, y, width, height, text, kind) {
  const group = createSvgElement("g");
  const rect = createSvgElement("rect", {
    x,
    y,
    width,
    height,
    rx: 8,
    fill: kind === "ff" ? "#e9f7f5" : kind === "gate" ? "#f2f6f9" : "#ffffff",
    stroke: kind === "ff" ? "#0f766e" : "#94a3b8",
    "stroke-width": kind === "ff" ? 2 : 1.5,
  });
  group.appendChild(rect);

  text.split("\n").forEach((line, index, lines) => {
    label(group, x + width / 2, y + height / 2 - (lines.length - 1) * 9 + index * 18, line, "middle");
  });

  root.appendChild(group);
  return { x, y, width, height, right: x + width, midY: y + height / 2 };
}

function wire(root, x1, y1, x2, y2) {
  const path = createSvgElement("path", {
    d: `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`,
    fill: "none",
    stroke: "#334155",
    "stroke-width": 2,
    "marker-end": "url(#arrow)",
  });
  root.insertBefore(path, root.firstChild);
}

function label(root, x, y, text, anchor = "start") {
  const textNode = createSvgElement("text", {
    x,
    y,
    "text-anchor": anchor,
    "dominant-baseline": "middle",
    fill: "#17202a",
    "font-size": 13,
    "font-weight": 700,
  });
  textNode.textContent = text;
  root.appendChild(textNode);
}

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function applyView(svg) {
  const root = svg.querySelector("#viewportRoot");
  if (!root) return;
  root.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.scale})`);
}
