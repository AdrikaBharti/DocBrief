# DocBrief - Document Summary Assistant

A small browser-based document summarization project built for a software engineering technical assessment.

# Deployed Link:

# What it does

DocBrief accepts PDF files and common image formats. It extracts the document text, creates an extractive summary, and shows the main points and frequent keywords.

# Main features

- PDF upload with drag-and-drop
- PNG, JPG and WEBP image support
- PDF text extraction using PDF.js
- OCR for scanned images using Tesseract.js
- Short, medium and long summary options
- Frequency-based extractive summarization
- Key points
- Automatically detected keywords
- Document statistics
- Summary compression percentage
- Copy summary to clipboard
- Download summary as a txt file
- Recent summaries stored locally in the browser
- Responsive layout
- Basic validation and error messages
- No document is sent to a custom backend

## How the project works

```text
Upload
  |
  +--> PDF --------> PDF.js --------+
  |                                 |
  +--> Image ------> Tesseract.js --+
                                    |
                              Extracted text
                                    |
                              summarizer.js
                                    |
                    +---------------+---------------+
                    |               |               |
                 Summary        Key points      Keywords
                    |
              Statistics
                    |
              Copy / Download
```

The summarizer is intentionally simple and explainable. It removes common stopwords, counts useful words, scores sentences using their word frequencies, and gives small bonuses to early sentences and sentences containing useful indicators or numbers. The highest scoring sentences are selected and then returned in their original order.

## Technology used

- HTML
- CSS
- JavaScript
- PDF.js
- Tesseract.js
- Browser Local Storage

No build step or package installation is required.


## Project structure

```text
docbrief/
├── index.html
├── style.css
├── app.js
├── summarizer.js
└── README.md
```

## Notes

- The summarizer is extractive rather than an LLM-based abstractive model.
- OCR quality depends on the image quality.
- Complex PDF layouts and tables may not preserve their original visual structure.
- Recent document history stores only summary information in browser Local Storage.
- Very large documents may take longer because processing happens in the browser.

## Short approach write-up

I built DocBrief as a lightweight client-side application so documents can be processed without setting up a backend or API key. PDF.js is used for extracting text from normal PDFs, while Tesseract.js performs OCR when the input is a scanned image. For summarization, I implemented a frequency-based extractive approach. Common stopwords are ignored, useful words are counted, and each sentence receives a score based on those word frequencies. I also added small bonuses for opening sentences, numbers and terms such as “result” or “conclusion”. The highest scoring sentences are selected for the requested summary length and returned in their original order. The interface includes validation, progress feedback, key points, keywords, document statistics, download support and local recent-summary history. The application is intentionally small and easy to run because the assessment had a limited time budget.
