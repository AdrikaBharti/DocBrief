
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_FILE_SIZE_MB = 15;
const HISTORY_KEY = "docubrief_history";

const $ = id => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("fileInput");
const browseBtn = $("browseBtn");
const dropzoneContent = $("dropzoneContent");
const fileSelected = $("fileSelected");
const fileNameEl = $("fileName");
const fileMetaEl = $("fileMeta");
const removeFileBtn = $("removeFileBtn");
const generateBtn = $("generateBtn");
const lengthSegmented = $("lengthSegmented");
const progressArea = $("progressArea");
const progressLabel = $("progressLabel");
const progressBarFill = $("progressBarFill");
const errorBox = $("errorBox");
const resultsSection = $("resultsSection");
const summaryCard = $("summaryCard");
const keypointsList = $("keypointsList");
const keywordList = $("keywordList");
const rawTextBox = $("rawTextBox");
const copyBtn = $("copyBtn");
const downloadBtn = $("downloadBtn");
const clearResultBtn = $("clearResultBtn");
const originalWordsEl = $("originalWords");
const summaryWordsEl = $("summaryWords");
const compressionStatEl = $("compressionStat");
const sentenceStatEl = $("sentenceStat");
const compressionFill = $("compressionFill");
const compressionText = $("compressionText");
const lengthBadge = $("lengthBadge");
const historyList = $("historyList");
const emptyHistory = $("emptyHistory");
const clearHistoryBtn = $("clearHistoryBtn");

let selectedFile = null;
let selectedLength = "medium";
let lastResult = null;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function setProgress(percent, label) {
  progressArea.hidden = false;
  progressBarFill.style.width = `${percent}%`;
  progressLabel.textContent = label;
}

function hideProgress() {
  progressArea.hidden = true;
  progressBarFill.style.width = "0%";
}

function resetResults() {
  resultsSection.hidden = true;
  summaryCard.textContent = "";
  keypointsList.innerHTML = "";
  keywordList.innerHTML = "";
  rawTextBox.textContent = "";
  lastResult = null;
}

function validateFile(file) {
  const validTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
  ];

  if (!validTypes.includes(file.type)) {
    throw new Error("Unsupported file type. Please use PDF, PNG, JPG or WEBP.");
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File is too large. The maximum size is ${MAX_FILE_SIZE_MB} MB.`);
  }
}

function handleFile(file) {
  clearError();
  resetResults();
  if (!file) return;

  try {
    validateFile(file);
    selectedFile = file;

    fileNameEl.textContent = file.name;
    fileMetaEl.textContent = `${formatBytes(file.size)} · ${file.type || "document"}`;

    dropzoneContent.hidden = true;
    fileSelected.hidden = false;
    generateBtn.disabled = false;
  } catch (error) {
    showError(error.message);
  }
}

function clearFile() {
  selectedFile = null;
  fileInput.value = "";
  dropzoneContent.hidden = false;
  fileSelected.hidden = true;
  generateBtn.disabled = true;
  resetResults();
  clearError();
}

browseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => handleFile(e.target.files[0]));
removeFileBtn.addEventListener("click", clearFile);

["dragenter", "dragover"].forEach(eventName => {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
  });
});

dropzone.addEventListener("drop", event => {
  handleFile(event.dataTransfer.files[0]);
});

lengthSegmented.addEventListener("click", event => {
  const button = event.target.closest(".segmented-btn");
  if (!button) return;

  lengthSegmented.querySelectorAll(".segmented-btn")
    .forEach(btn => btn.classList.remove("is-active"));

  button.classList.add("is-active");
  selectedLength = button.dataset.length;
});

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const percent = 10 + Math.round((pageNum / pdf.numPages) * 55);
    setProgress(percent, `Extracting text — page ${pageNum} of ${pdf.numPages}`);

    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}

async function extractTextFromImage(file) {
  setProgress(10, "Preparing OCR...");

  const result = await Tesseract.recognize(file, "eng", {
    logger: message => {
      if (message.status === "recognizing text") {
        const percent = 10 + Math.round(message.progress * 55);

        setProgress(
          percent,
          `Running OCR — ${Math.round(message.progress * 100)}%`
        );
      }
    }
  });

  const extractedText = result.data.text.trim();

  if (looksLikeDiagram(extractedText)) {
    showError(
      "This image appears to contain a diagram or flowchart. " +
      "The text has been extracted, but the original layout may not be preserved."
    );
  }

  return cleanOCRText(extractedText);
}
function cleanOCRText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function looksLikeDiagram(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());

  return words.length >= 15 && sentences.length <= 3;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function renderResults(rawText, result) {
  resultsSection.hidden = false;

  summaryCard.textContent =
    result.summary || "No summary could be generated from this document.";

  keypointsList.innerHTML = "";
  result.keyPoints.forEach(point => {
    const li = document.createElement("li");
    li.textContent = point;
    keypointsList.appendChild(li);
  });

  keywordList.innerHTML = "";
  (result.keywords || []).forEach(keyword => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip";
    chip.textContent = keyword;
    keywordList.appendChild(chip);
  });

  const originalWords = wordCount(rawText);
  const summaryWords = wordCount(result.summary);
  const compression = originalWords
    ? Math.max(0, Math.round((1 - summaryWords / originalWords) * 100))
    : 0;

  originalWordsEl.textContent = originalWords.toLocaleString();
  summaryWordsEl.textContent = summaryWords.toLocaleString();
  compressionStatEl.textContent = `${compression}%`;
  sentenceStatEl.textContent =
    `${result.sentenceCount} → ${result.summarySentenceCount}`;

  lengthBadge.textContent =
    selectedLength.charAt(0).toUpperCase() + selectedLength.slice(1);

  
  compressionFill.style.width =`${Math.min(result.compression, 100)}%`;
  compressionText.textContent =
    `The summary is about ${compression}% shorter than the extracted text.`;

  rawTextBox.textContent = rawText;

  lastResult = {
    fileName: selectedFile ? selectedFile.name : "document",
    rawText,
    summary: result.summary,
    keyPoints: result.keyPoints,
    keywords: result.keywords || [],
    originalWords,
    summaryWords,
    compression,
    sentenceCount: result.sentenceCount,
    summarySentenceCount: result.summarySentenceCount,
    length: selectedLength
  };

  saveHistory(lastResult);
  renderHistory();

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

generateBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  clearError();
  resetResults();
  generateBtn.disabled = true;

  try {
    setProgress(5, "Reading file...");

    const text = selectedFile.type === "application/pdf"
      ? await extractTextFromPDF(selectedFile)
      : await extractTextFromImage(selectedFile);

    if (!text || wordCount(text) < 15) {
      throw new Error(
        "Not enough readable text was found. Try a clearer image or a text-based PDF."
      );
    }

    setProgress(75, "Generating summary...");
    await new Promise(resolve => setTimeout(resolve, 150));

    const result = summarizeText(text, selectedLength);

    setProgress(100, "Finished");
    await new Promise(resolve => setTimeout(resolve, 200));
    hideProgress();

    renderResults(text, result);
  } catch (error) {
    console.error(error);
    hideProgress();
    showError(error.message || "Something went wrong while processing the document.");
  } finally {
    generateBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastResult) return;

  try {
    await navigator.clipboard.writeText(lastResult.summary);
    copyBtn.textContent = "Copied!";
    setTimeout(() => copyBtn.textContent = "Copy", 1400);
  } catch {
    showError("Could not copy the summary. Please copy it manually.");
  }
});

function safeFileName(name) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .slice(0, 60);
}

downloadBtn.addEventListener("click", () => {
  if (!lastResult) return;

  const content = [
    "DOCUBRIEF - DOCUMENT SUMMARY",
    "================================",
    "",
    `File: ${lastResult.fileName}`,
    `Summary length: ${lastResult.length}`,
    `Original words: ${lastResult.originalWords}`,
    `Summary words: ${lastResult.summaryWords}`,
    `Compression: ${lastResult.compression}%`,
    "",
    "SUMMARY",
    "-------",
    lastResult.summary,
    "",
    "KEY POINTS",
    "----------",
    ...lastResult.keyPoints.map(point => `• ${point}`),
    "",
    "KEYWORDS",
    "--------",
    lastResult.keywords.join(", ")
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeFileName(lastResult.fileName)}_summary.txt`;
  anchor.click();

  URL.revokeObjectURL(url);
});

clearResultBtn.addEventListener("click", () => {
  resetResults();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(result) {
  const historyItem = {
    id: Date.now(),
    fileName: result.fileName,
    length: result.length,
    originalWords: result.originalWords,
    summaryWords: result.summaryWords,
    summary: result.summary,
    keywords: result.keywords,
    savedAt: new Date().toISOString()
  };

  const history = getHistory().filter(item => item.fileName !== result.fileName);
  history.unshift(historyItem);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";
  emptyHistory.hidden = history.length > 0;

  history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const date = new Date(item.savedAt);
    const dateText = date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    row.innerHTML = `
      <div class="history-icon">📄</div>
      <div class="history-info">
        <strong>${escapeHtml(item.fileName)}</strong>
        <span>${capitalize(item.length)} summary · ${item.originalWords.toLocaleString()} words · ${dateText}</span>
      </div>
      <button class="btn btn-ghost history-view" type="button" data-id="${item.id}">View</button>
    `;

    historyList.appendChild(row);
  });
}

historyList.addEventListener("click", event => {
  const button = event.target.closest(".history-view");
  if (!button) return;

  const item = getHistory().find(x => String(x.id) === button.dataset.id);
  if (!item) return;

  const result = {
    fileName: item.fileName,
    rawText: "",
    summary: item.summary,
    keyPoints: [],
    keywords: item.keywords || [],
    originalWords: item.originalWords,
    summaryWords: item.summaryWords,
   compression: item.originalWords
    ? Math.max(
      0,
      Math.round((1 - item.summaryWords / item.originalWords) * 100)
    )
   : 0,
    sentenceCount: 0,
    summarySentenceCount: 0,
    length: item.length
  };

  lastResult = result;
  resultsSection.hidden = false;
  summaryCard.textContent = result.summary;
  keypointsList.innerHTML = "<li>This saved item contains the summary only.</li>";
  keywordList.innerHTML = "";
  result.keywords.forEach(keyword => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip";
    chip.textContent = keyword;
    keywordList.appendChild(chip);
  });

  originalWordsEl.textContent = result.originalWords.toLocaleString();
  summaryWordsEl.textContent = result.summaryWords.toLocaleString();
  compressionStatEl.textContent = `${result.compression}%`;
  sentenceStatEl.textContent = "Saved result";
  lengthBadge.textContent = capitalize(result.length);
  compressionFill.style.width = `${result.compression}%`;
  compressionText.textContent = `This saved summary is about ${result.compression}% shorter than the original.`;
  rawTextBox.textContent = "Original extracted text was not stored in browser history.";

  resultsSection.scrollIntoView({ behavior: "smooth" });
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

renderHistory();
