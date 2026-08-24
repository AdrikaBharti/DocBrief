

const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any",
  "are","aren't","as","at","be","because","been","before","being","below",
  "between","both","but","by","can","cannot","could","did","do","does",
  "doing","don","down","during","each","few","for","from","further","had",
  "has","have","having","he","her","here","hers","herself","him","himself",
  "his","how","i","if","in","into","is","it","its","itself","just","me",
  "more","most","my","myself","no","nor","not","now","of","off","on","once",
  "only","or","other","our","ours","ourselves","out","over","own","same",
  "she","should","so","some","such","than","that","the","their","theirs",
  "them","themselves","then","there","these","they","this","those","through",
  "to","too","under","until","up","very","was","we","were","what","when",
  "where","which","while","who","whom","why","will","with","would","you",
  "your","yours","yourself","yourselves","also","may","might","one","two",
  "us","upon","across","per"
]);

const LENGTH_RATIOS = {
  short: 0.12,
  medium: 0.25,
  long: 0.40
};

const LENGTH_MIN_SENTENCES = {
  short: 3,
  medium: 5,
  long: 8
};

function splitSentences(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const raw = cleaned.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleaned];

  return raw
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.split(" ").length >= 4);
}

function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word && !STOPWORDS.has(word) && word.length > 2);
}

function buildWordFrequencies(sentences) {
  const frequencies = {};

  sentences.forEach(sentence => {
    tokenize(sentence).forEach(word => {
      frequencies[word] = (frequencies[word] || 0) + 1;
    });
  });

  return frequencies;
}

function getSentenceBonus(sentence) {
  let bonus = 0;
  const lower = sentence.toLowerCase();

  // Facts and results often contain numbers.
  if (/\d/.test(sentence)) bonus += 0.15;

  const usefulIndicators = [
    "important",
    "result",
    "results",
    "conclusion",
    "therefore",
    "significant",
    "main",
    "key",
    "because"
  ];

  usefulIndicators.forEach(word => {
    if (lower.includes(word)) bonus += 0.10;
  });

  return bonus;
}

function scoreSentences(sentences, frequencies) {
  return sentences.map((sentence, index) => {
    const words = tokenize(sentence);

    if (words.length === 0) {
      return { sentence, index, score: 0 };
    }

    const rawScore = words.reduce(
      (sum, word) => sum + (frequencies[word] || 0),
      0
    );

    const normalizedScore = rawScore / Math.sqrt(words.length);

    // Opening sentences often introduce the topic.
    const positionBonus = index < 3 ? 1.15 : 1;

    const score =
      normalizedScore * positionBonus + getSentenceBonus(sentence);

    return { sentence, index, score };
  });
}

function extractKeywords(frequencies, count = 6) {
  return Object.entries(frequencies)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, count)
    .map(([word]) => word);
}

function summarizeText(text, length = "medium") {
  const sentences = splitSentences(text);

  if (sentences.length === 0) {
    return {
      summary: "",
      keyPoints: [],
      keywords: [],
      sentenceCount: 0,
      summarySentenceCount: 0
    };
  }

  const frequencies = buildWordFrequencies(sentences);
  const scored = scoreSentences(sentences, frequencies);

  const ratio = LENGTH_RATIOS[length] || LENGTH_RATIOS.medium;
  const minCount =
    LENGTH_MIN_SENTENCES[length] || LENGTH_MIN_SENTENCES.medium;

  const targetCount = Math.min(
    sentences.length,
    Math.max(minCount, Math.round(sentences.length * ratio))
  );

  const topSentences = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .sort((a, b) => a.index - b.index);

  const summary = topSentences
    .map(item => item.sentence)
    .join(" ");

  const keyPointCount =
    length === "short" ? 3 :
    length === "long" ? 6 : 4;

  const keyPoints = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, keyPointCount)
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence);

  return {
    summary,
    keyPoints,
    keywords: extractKeywords(frequencies),
    sentenceCount: sentences.length,
    summarySentenceCount: topSentences.length
  };
}
