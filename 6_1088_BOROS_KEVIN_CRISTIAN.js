const canvas          = document.getElementById("canvas");
const lineBtn         = document.getElementById("line");
const ellipseBtn      = document.getElementById("ellipse");
const rectBtn         = document.getElementById("rect");
const circleBtn       = document.getElementById("circle");
const squareBtn       = document.getElementById("square");
const resetBtn        = document.getElementById("reset");
const strokeColorInput= document.getElementById("strokeColor");
const strokeWidthInput= document.getElementById("strokeWidth");
const fillColorInput  = document.getElementById("fillColor");
const exportPngBtn    = document.getElementById("exportPng");
const exportSvgBtn    = document.getElementById("exportSvg");
const undoBtn         = document.getElementById("undo");
const drawPathBtn     = document.getElementById("drawPath");


const undoStack = [];


let currentShape   = null;  
let selectedElement= null;  
let highlightBox   = null;  
let isDragging     = false; 
let isDrawing      = false; 
let currentPath    = null;  

const lastStyleValues = {
  stroke: strokeColorInput.value,      
  strokeWidth: strokeWidthInput.value, 
  fill: fillColorInput.value
};



function setCursor(type) {
  canvas.style.cursor = type;
}

function resetColors() {
  strokeColorInput.value  = "#000000";
  strokeWidthInput.value  = 2;
  fillColorInput.value    = "#ffffff";
}

function deselectElement() {
  if (selectedElement) {
    selectedElement.removeEventListener("mousedown", startDragging);
    selectedElement = null;
  }
  if (highlightBox) {
    canvas.removeChild(highlightBox);
    highlightBox = null;
  }
}

function selectElement(e, element) {
  if (currentShape !== null) return;

  e.stopPropagation(); 
  deselectElement();

  selectedElement = element;
  
  if (!highlightBox) {
    highlightBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    highlightBox.setAttribute("stroke", "black");
    highlightBox.setAttribute("stroke-dasharray", "4");
    highlightBox.setAttribute("fill", "none");
    canvas.appendChild(highlightBox);
  }
  updateHighlightBox();

  strokeColorInput.value   = selectedElement.getAttribute("stroke")       || "#000000";
  strokeWidthInput.value   = selectedElement.getAttribute("stroke-width") || "1";
  fillColorInput.value     = selectedElement.getAttribute("fill")         || "#ffffff";

  selectedElement.addEventListener("mousedown", startDragging);
}

function startDragging(e) {
  isDragging = true;
  const rect = canvas.getBoundingClientRect();

  let oldPositions = {};

  if (selectedElement.tagName === "rect" || selectedElement.tagName === "square") {
    oldPositions.x = parseFloat(selectedElement.getAttribute("x"));
    oldPositions.y = parseFloat(selectedElement.getAttribute("y"));
  } 
  else if (selectedElement.tagName === "ellipse" || selectedElement.tagName === "circle") {
    oldPositions.cx = parseFloat(selectedElement.getAttribute("cx"));
    oldPositions.cy = parseFloat(selectedElement.getAttribute("cy"));
  } 
  else if (selectedElement.tagName === "line") {
    oldPositions.x1 = parseFloat(selectedElement.getAttribute("x1"));
    oldPositions.y1 = parseFloat(selectedElement.getAttribute("y1"));
    oldPositions.x2 = parseFloat(selectedElement.getAttribute("x2"));
    oldPositions.y2 = parseFloat(selectedElement.getAttribute("y2"));
  }

  let startX, startY;

  if (selectedElement.tagName === "rect" || selectedElement.tagName === "square") {
    startX = oldPositions.x; 
    startY = oldPositions.y;
  } 
  else if (selectedElement.tagName === "ellipse" || selectedElement.tagName === "circle") {
    startX = oldPositions.cx;
    startY = oldPositions.cy;
  } 
  else if (selectedElement.tagName === "line") {
    startX = oldPositions.x1; 
    startY = oldPositions.y1;
  }

  const move = (evt) => {
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    if (selectedElement.tagName === "rect" || selectedElement.tagName === "square") {
      selectedElement.setAttribute("x", x);
      selectedElement.setAttribute("y", y);
    } 
    else if (selectedElement.tagName === "ellipse" || selectedElement.tagName === "circle") {
      selectedElement.setAttribute("cx", x);
      selectedElement.setAttribute("cy", y);
    } 
    else if (selectedElement.tagName === "line") {
      const dx = x - startX;
      const dy = y - startY;
      selectedElement.setAttribute("x1", parseFloat(selectedElement.getAttribute("x1")) + dx);
      selectedElement.setAttribute("y1", parseFloat(selectedElement.getAttribute("y1")) + dy);
      selectedElement.setAttribute("x2", parseFloat(selectedElement.getAttribute("x2")) + dx);
      selectedElement.setAttribute("y2", parseFloat(selectedElement.getAttribute("y2")) + dy);
      startX = x; 
      startY = y;
    }
    updateHighlightBox();
  };

  const stopDragging = () => {
    isDragging = false;
    canvas.removeEventListener("mousemove", move);
    canvas.removeEventListener("mouseup", stopDragging);

    let newPositions = {};
    if (selectedElement.tagName === "rect" || selectedElement.tagName === "square") {
      newPositions.x = parseFloat(selectedElement.getAttribute("x"));
      newPositions.y = parseFloat(selectedElement.getAttribute("y"));
    } 
    else if (selectedElement.tagName === "ellipse" || selectedElement.tagName === "circle") {
      newPositions.cx = parseFloat(selectedElement.getAttribute("cx"));
      newPositions.cy = parseFloat(selectedElement.getAttribute("cy"));
    } 
    else if (selectedElement.tagName === "line") {
      newPositions.x1 = parseFloat(selectedElement.getAttribute("x1"));
      newPositions.y1 = parseFloat(selectedElement.getAttribute("y1"));
      newPositions.x2 = parseFloat(selectedElement.getAttribute("x2"));
      newPositions.y2 = parseFloat(selectedElement.getAttribute("y2"));
    }

    if (JSON.stringify(oldPositions) !== JSON.stringify(newPositions)) {
      undoStack.push({
        action: "move",
        element: selectedElement,
        oldPositions: oldPositions,
        newPositions: newPositions
      });
    }
  };

  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", stopDragging);
}

function updateHighlightBox() {
  if (!highlightBox || !selectedElement) return;
  const bbox = selectedElement.getBBox();
  highlightBox.setAttribute("x", bbox.x - 2);
  highlightBox.setAttribute("y", bbox.y - 2);
  highlightBox.setAttribute("width",  bbox.width  + 4);
  highlightBox.setAttribute("height", bbox.height + 4);
}


function deleteElement(event, element) {
  event.preventDefault(); 
  undoStack.push({ action: "delete", element: element });
  canvas.removeChild(element);
  if (element === selectedElement) deselectElement();
}

function attachDeleteEvent(element) {
  element.addEventListener("contextmenu", (evt) => deleteElement(evt, element));
}



canvas.addEventListener("click", (e) => {
  if (currentShape) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const strokeColor = strokeColorInput.value;
    const strokeWidth = strokeWidthInput.value;
    const fillColor   = fillColorInput.value;

    let newElement;
    switch (currentShape) {
      case "line":
        newElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
        newElement.setAttribute("x1", x);
        newElement.setAttribute("y1", y);
        newElement.setAttribute("x2", x + 100);
        newElement.setAttribute("y2", y);
        break;
      case "ellipse":
        newElement = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        newElement.setAttribute("cx", x);
        newElement.setAttribute("cy", y);
        newElement.setAttribute("rx", 50);
        newElement.setAttribute("ry", 30);
        break;
      case "rect":
        newElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newElement.setAttribute("x", x);
        newElement.setAttribute("y", y);
        newElement.setAttribute("width",  100);
        newElement.setAttribute("height", 50);
        break;
      case "circle":
        newElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        newElement.setAttribute("cx", x);
        newElement.setAttribute("cy", y);
        newElement.setAttribute("r", 50);
        break;
      case "square":
        newElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newElement.setAttribute("x", x);
        newElement.setAttribute("y", y);
        newElement.setAttribute("width",  100);
        newElement.setAttribute("height", 100);
        break;
    }

    newElement.setAttribute("stroke",       strokeColor);
    newElement.setAttribute("stroke-width", strokeWidth);
    newElement.setAttribute("fill",         fillColor);

    newElement.addEventListener("click", (evt) => selectElement(evt, newElement));
    attachDeleteEvent(newElement);

    canvas.appendChild(newElement);

    undoStack.push({ action: "add", element: newElement });
    deselectElement(); 
  }
  else {
    if (e.target === canvas && selectedElement) {
      deselectElement();
    }
  }
});


canvas.addEventListener("mousedown", (e) => {
  if (!isDrawing) return;

  const rect = canvas.getBoundingClientRect();
  const x    = e.clientX - rect.left;
  const y    = e.clientY - rect.top;

  currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  currentPath.setAttribute("d", `M ${x} ${y}`);
  currentPath.setAttribute("stroke", strokeColorInput.value);
  currentPath.setAttribute("stroke-width", strokeWidthInput.value);
  currentPath.setAttribute("fill", "none");

  canvas.appendChild(currentPath);
  undoStack.push({ action: "add", element: currentPath });
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing || !currentPath) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const d = currentPath.getAttribute("d");
  currentPath.setAttribute("d", `${d} L ${x} ${y}`);
});

canvas.addEventListener("mouseup", () => {
  if (isDrawing) currentPath = null;
});


lineBtn.addEventListener("click",    () => { currentShape = "line";    setCursor("crosshair"); resetColors(); deselectElement(); });
ellipseBtn.addEventListener("click", () => { currentShape = "ellipse"; setCursor("crosshair"); resetColors(); deselectElement(); });
rectBtn.addEventListener("click",    () => { currentShape = "rect";    setCursor("crosshair"); resetColors(); deselectElement(); });
circleBtn.addEventListener("click",  () => { currentShape = "circle";  setCursor("crosshair"); resetColors(); deselectElement(); });
squareBtn.addEventListener("click",  () => { currentShape = "square";  setCursor("crosshair"); resetColors(); deselectElement(); });

drawPathBtn.addEventListener("click", () => {
  currentShape = null;
  deselectElement();
  isDrawing = true;
  setCursor("crosshair");
});

resetBtn.addEventListener("click", () => {
  currentShape = null;
  isDrawing    = false;
  deselectElement();
  setCursor("default");
  resetColors();
});

undoBtn.addEventListener("click", undoAction);


strokeColorInput.addEventListener("input", () => {
  if (selectedElement) selectedElement.setAttribute("stroke", strokeColorInput.value);
});
strokeColorInput.addEventListener("change", () => {
  if (!selectedElement) return;

  const oldValue = lastStyleValues.stroke;
  const newValue = strokeColorInput.value;
  if (oldValue !== newValue) {
    undoStack.push({ action: "style", element: selectedElement, attribute: "stroke", oldValue });
    lastStyleValues.stroke = newValue;
  }
});

strokeWidthInput.addEventListener("input", () => {
  if (selectedElement) selectedElement.setAttribute("stroke-width", strokeWidthInput.value);
});
strokeWidthInput.addEventListener("change", () => {
  if (!selectedElement) return;
  
  const oldValue = lastStyleValues.strokeWidth;
  const newValue = strokeWidthInput.value;
  if (oldValue !== newValue) {
    undoStack.push({ action: "style", element: selectedElement, attribute: "stroke-width", oldValue });
    lastStyleValues.strokeWidth = newValue;
  }
});

fillColorInput.addEventListener("input", () => {
  if (selectedElement) selectedElement.setAttribute("fill", fillColorInput.value);
});
fillColorInput.addEventListener("change", () => {
  if (!selectedElement) return;

  const oldValue = lastStyleValues.fill;
  const newValue = fillColorInput.value;
  if (oldValue !== newValue) {
    undoStack.push({ action: "style", element: selectedElement, attribute: "fill", oldValue });
    lastStyleValues.fill = newValue;
  }
});



function undoAction() {
  if (undoStack.length === 0) return;

  const lastAction = undoStack.pop();

  if (lastAction.action === "add") {
    canvas.removeChild(lastAction.element);
    if (lastAction.element === selectedElement) deselectElement();

  } else if (lastAction.action === "delete") {
    canvas.appendChild(lastAction.element);

  } else if (lastAction.action === "style") {
    const { element, attribute, oldValue } = lastAction;
    element.setAttribute(attribute, oldValue);
    if (element === selectedElement) {
      if (attribute === "stroke")       strokeColorInput.value   = oldValue;
      if (attribute === "stroke-width") strokeWidthInput.value   = oldValue;
      if (attribute === "fill")         fillColorInput.value     = oldValue;
      updateHighlightBox();
    }

  } else if (lastAction.action === "move") {
    const { element, oldPositions } = lastAction;
    if (element.tagName === "rect" || element.tagName === "square") {
      element.setAttribute("x", oldPositions.x);
      element.setAttribute("y", oldPositions.y);
    } 
    else if (element.tagName === "ellipse" || element.tagName === "circle") {
      element.setAttribute("cx", oldPositions.cx);
      element.setAttribute("cy", oldPositions.cy);
    } 
    else if (element.tagName === "line") {
      element.setAttribute("x1", oldPositions.x1);
      element.setAttribute("y1", oldPositions.y1);
      element.setAttribute("x2", oldPositions.x2);
      element.setAttribute("y2", oldPositions.y2);
    }
    if (element === selectedElement) updateHighlightBox();
  }
}




function saveDrawing() {
  localStorage.setItem("myDrawing", canvas.innerHTML);
}

function loadDrawing() {
  const data = localStorage.getItem("myDrawing");
  if (data) {
    canvas.innerHTML = data;
    const children = canvas.children;
    for (let i = 0; i < children.length; i++) {
      const elem = children[i];
      attachDeleteEvent(elem);
      elem.addEventListener("click", (evt) => selectElement(evt, elem));
    }
  }
}

window.addEventListener("beforeunload", saveDrawing);
document.addEventListener("DOMContentLoaded", loadDrawing);



exportPngBtn.addEventListener("click", exportToPNG);
exportSvgBtn.addEventListener("click", exportToSVG);

function exportToPNG() {
  const svgData = new XMLSerializer().serializeToString(canvas);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url     = URL.createObjectURL(svgBlob);

  const image   = new Image();
  image.onload = function() {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = canvas.clientWidth;
    tmpCanvas.height= canvas.clientHeight;

    const ctx = tmpCanvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);

    const imgURI = tmpCanvas.toDataURL("image/png");
    const a      = document.createElement("a");
    a.href       = imgURI;
    a.download   = "desen.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  image.src = url;
}

function exportToSVG() {
  const svgData = new XMLSerializer().serializeToString(canvas);
  const a       = document.createElement("a");
  a.href        = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  a.download    = "desen.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
