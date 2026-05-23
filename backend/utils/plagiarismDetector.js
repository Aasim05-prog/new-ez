/**
 * REAL Plagiarism Detection System
 * 
 * This implementation provides HONEST plagiarism analysis:
 * 1. Cross-references content against ALL existing notes in the database
 * 2. Compares against a corpus of known commonly-copied academic text
 * 3. Uses N-gram matching, TF-IDF cosine similarity, and Jaccard similarity
 * 4. Reports only REAL matches — never fabricates scores or sources
 * 5. Is transparent about its limitations
 * 
 * For full external source checking, integrate:
 *   - Turnitin API  (set TURNITIN_API_KEY in .env)
 *   - Copyscape API (set COPYSCAPE_API_KEY in .env)
 *   - Serper API    (set SERPER_API_KEY in .env)
 */

// ─── Stop-word filter ───────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','is','at','which','on','a','an','and','or','but','in','with','to',
  'for','of','not','no','can','had','have','was','were','are','been','be',
  'do','does','did','will','would','could','should','may','might','shall',
  'this','that','these','those','it','its','i','me','my','we','our','you',
  'your','he','she','him','her','they','them','their','what','how','when',
  'where','who','whom','if','then','than','so','as','by','from','up',
]);

const isStopWord = (word) => STOP_WORDS.has(word.toLowerCase());

// ─── TF-IDF Calculation ────────────────────────────────────────────────────
const calculateTFIDF = (text) => {
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const filteredWords = words.filter(w => !isStopWord(w));
  const tf = {};
  filteredWords.forEach(word => { tf[word] = (tf[word] || 0) + 1; });
  const totalWords = filteredWords.length || 1;
  Object.keys(tf).forEach(word => { tf[word] /= totalWords; });
  return tf;
};

// ─── N-gram Extraction & Similarity ─────────────────────────────────────────
const extractNGrams = (text, n = 3) => {
  const words = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  const filtered = words.filter(w => !isStopWord(w));
  const ngrams = new Set();
  for (let i = 0; i <= filtered.length - n; i++) {
    ngrams.add(filtered.slice(i, i + n).join(' '));
  }
  return ngrams;
};

const calculateNGramSimilarity = (text1, text2, n = 3) => {
  const ngrams1 = extractNGrams(text1, n);
  const ngrams2 = extractNGrams(text2, n);
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let shared = 0;
  ngrams1.forEach(ng => { if (ngrams2.has(ng)) shared++; });
  return shared / Math.min(ngrams1.size, ngrams2.size);
};

// ─── Jaccard Similarity ─────────────────────────────────────────────────────
const calculateJaccardSimilarity = (text1, text2) => {
  const getWordSet = (text) => {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    return new Set(words.filter(w => !isStopWord(w)));
  };
  const set1 = getWordSet(text1);
  const set2 = getWordSet(text2);
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  set1.forEach(w => { if (set2.has(w)) intersection++; });
  const union = set1.size + set2.size - intersection;
  return intersection / (union || 1);
};

// ─── Cosine Similarity ──────────────────────────────────────────────────────
const calculateCosineSimilarity = (tfidf1, tfidf2) => {
  const allTerms = new Set([...Object.keys(tfidf1), ...Object.keys(tfidf2)]);
  let dotProduct = 0, mag1 = 0, mag2 = 0;

  allTerms.forEach(term => {
    const v1 = tfidf1[term] || 0;
    const v2 = tfidf2[term] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// ─── Combined Real Similarity (weighted ensemble) ───────────────────────────
const calculateRealSimilarity = (text1, text2) => {
  if (!text1 || !text2 || text1.length < 30 || text2.length < 30) return 0;

  const ngram3 = calculateNGramSimilarity(text1, text2, 3);
  const ngram5 = calculateNGramSimilarity(text1, text2, 5);
  const jaccard = calculateJaccardSimilarity(text1, text2);
  const tfidf1 = calculateTFIDF(text1);
  const tfidf2 = calculateTFIDF(text2);
  const cosine = calculateCosineSimilarity(tfidf1, tfidf2);

  // Weighted: longer N-grams and cosine are stronger signals of actual copying
  return (ngram3 * 0.15) + (ngram5 * 0.35) + (jaccard * 0.15) + (cosine * 0.35);
};

// ─── Find shared phrases between two texts ──────────────────────────────────
const findSharedPhrases = (text1, text2, minWords = 5) => {
  const words1 = text1.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  const words2 = text2.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];

  // Build N-gram set from text2
  const text2Ngrams = new Set();
  for (let i = 0; i <= words2.length - minWords; i++) {
    text2Ngrams.add(words2.slice(i, i + minWords).join(' '));
  }

  // Find matching N-grams in text1
  const matches = new Set();
  for (let i = 0; i <= words1.length - minWords; i++) {
    const phrase = words1.slice(i, i + minWords).join(' ');
    // Skip phrases that are mostly stop words
    const contentWords = phrase.split(' ').filter(w => !isStopWord(w));
    if (contentWords.length >= Math.ceil(minWords / 2) && text2Ngrams.has(phrase)) {
      matches.add(phrase);
    }
  }

  return [...matches].slice(0, 10); // Return top 10 shared phrases
};

// ─── Quality & Structure Analysis ───────────────────────────────────────────
const analyzeStructure = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const words = text.match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  return {
    lineCount: lines.length,
    wordCount: words.length,
    uniqueWordCount: uniqueWords.size,
    lexicalDiversity: words.length > 0 ? Math.round((uniqueWords.size / words.length) * 100) : 0,
    avgSentenceLength: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    hasHeaders: /^#{1,6}\s|^[A-Z][A-Z\s]{3,}$/m.test(text),
    hasLists: /^[\s]*[-*•]\s|^\d+[.)]\s/m.test(text),
    hasFormulas: /[=∫∑√πα-ωΔ±×÷]|\^[\d{]/.test(text),
    hasCitations: /\[\d+\]|\([\w]+,\s*\d{4}\)|et al\.|doi:|ISBN:/i.test(text),
  };
};

const detectContentQualityIssues = (text) => {
  const issues = [];
  const suspiciousIndicators = [];
  const words = text.match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const diversity = uniqueWords.size / (words.length || 1);

  if (words.length < 50) issues.push('Content is very short (less than 50 words)');
  if (diversity < 0.3) issues.push('Extremely low word diversity — likely spam or filler');
  else if (diversity < 0.4) issues.push('Low word diversity — repetitive content');

  if (/Lorem ipsum/i.test(text)) suspiciousIndicators.push('Contains Lorem Ipsum placeholder text');
  if (/asdf|qwer|zxcv/i.test(text)) suspiciousIndicators.push('Contains keyboard-mash text');
  if (/click here|download here|visit our/i.test(text)) suspiciousIndicators.push('Contains promotional language');

  // Check for excessive repeated sentences
  const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20);
  const sentenceSet = new Set(sentences);
  if (sentences.length > 5 && sentenceSet.size < sentences.length * 0.5) {
    issues.push('Many repeated sentences detected');
  }

  return { issues, suspiciousIndicators };
};

// ─── Known Academic Corpus ──────────────────────────────────────────────────
// Commonly-copied verbatim definitions that students plagiarize from textbooks
const KNOWN_ACADEMIC_CORPUS = [
  {
    text: "Newton first law states that an object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force",
    source: "Common Physics Textbook (Newton's First Law)",
    subject: "Physics",
  },
  {
    text: "The second law of thermodynamics states that the total entropy of an isolated system can never decrease over time and is constant if and only if all processes are reversible",
    source: "Common Physics Textbook (Second Law of Thermodynamics)",
    subject: "Physics",
  },
  {
    text: "Photosynthesis is the process by which green plants and certain other organisms transform light energy into chemical energy during this process carbon dioxide and water are converted into glucose and oxygen",
    source: "Common Biology Textbook (Photosynthesis)",
    subject: "Biology",
  },
  {
    text: "DNA or deoxyribonucleic acid is the hereditary material in humans and almost all other organisms nearly every cell in a person body has the same DNA",
    source: "Common Biology Textbook (DNA Definition)",
    subject: "Biology",
  },
  {
    text: "The cell is the basic structural and functional unit of all living organisms cells are the smallest unit of life that can replicate independently",
    source: "Common Biology Textbook (Cell Theory)",
    subject: "Biology",
  },
  {
    text: "An algorithm is a finite sequence of well defined instructions typically used to solve a class of specific problems or to perform a computation",
    source: "Common CS Textbook (Algorithm Definition)",
    subject: "Computer Science",
  },
  {
    text: "Object oriented programming is a programming paradigm based on the concept of objects which can contain data in the form of fields and code in the form of procedures",
    source: "Common CS Textbook (OOP Definition)",
    subject: "Computer Science",
  },
  {
    text: "The Pythagorean theorem states that in a right angled triangle the square of the length of the hypotenuse is equal to the sum of the squares of the other two sides",
    source: "Common Math Textbook (Pythagorean Theorem)",
    subject: "Mathematics",
  },
  {
    text: "A derivative of a function represents the rate of change of the function with respect to the variable and is a fundamental concept of differential calculus",
    source: "Common Math Textbook (Derivative Definition)",
    subject: "Mathematics",
  },
  {
    text: "The law of supply and demand is a theory that explains the interaction between the sellers of a resource and the buyers for that resource",
    source: "Common Economics Textbook (Supply & Demand)",
    subject: "Economics",
  },
  {
    text: "Gross domestic product is the total monetary or market value of all the finished goods and services produced within a country borders in a specific time period",
    source: "Common Economics Textbook (GDP Definition)",
    subject: "Economics",
  },
  {
    text: "The periodic table is a tabular arrangement of the chemical elements organized by their atomic number electron configuration and recurring chemical properties",
    source: "Common Chemistry Textbook (Periodic Table)",
    subject: "Chemistry",
  },
  {
    text: "A chemical bond is a lasting attraction between atoms ions or molecules that enables the formation of chemical compounds the bond may result from the electrostatic force between oppositely charged ions or through the sharing of electrons",
    source: "Common Chemistry Textbook (Chemical Bond)",
    subject: "Chemistry",
  },
  {
    text: "Machine learning is a subset of artificial intelligence that provides systems the ability to automatically learn and improve from experience without being explicitly programmed",
    source: "Common CS/AI Textbook (Machine Learning)",
    subject: "Computer Science",
  },
  {
    text: "The mitochondria is the powerhouse of the cell it is responsible for producing adenosine triphosphate the main energy currency of the cell through oxidative phosphorylation",
    source: "Common Biology Textbook (Mitochondria)",
    subject: "Biology",
  },
];

// ─── Main Plagiarism Analysis ───────────────────────────────────────────────
/**
 * Performs REAL plagiarism detection by comparing content against:
 *  1. All existing notes in the database (passed as `existingNotes`)
 *  2. A corpus of known commonly-copied academic definitions
 *  3. Internal quality/structural analysis
 *
 * @param {string}  content        - The note content to analyze
 * @param {string}  description    - The note description
 * @param {string}  title          - The note title
 * @param {Array}   existingNotes  - Array of existing notes from DB to compare against
 * @returns {Object} Honest plagiarism analysis results
 */
const analyzePlagiarism = (content, description = '', title = '', existingNotes = []) => {
  // ── Guard: too-short content ──────────────────────────────────────────
  if (!content || content.trim().length < 50) {
    return {
      originalityScore: 100,
      plagiarismPercentage: 0,
      riskLevel: 'LOW',
      confidence: 20,
      detectionMethod: 'SKIPPED',
      checkedAgainst: 0,
      message: 'Content too short for meaningful plagiarism analysis (minimum 50 characters required).',
      matchedSources: [],
      highlightedCopiedContent: [],
      detectedPatterns: [],
      qualityAnalysis: {},
      recommendations: ['Add more content for a thorough plagiarism check.'],
      limitations: ['Content below minimum length threshold for analysis.'],
    };
  }

  const fullText = `${title} ${description} ${content}`;

  // ── 1. Structural & quality analysis ──────────────────────────────────
  const structureAnalysis = analyzeStructure(content);
  const qualityCheck = detectContentQualityIssues(fullText);

  // ── 2. Cross-reference against existing notes in database ─────────────
  const databaseMatches = [];
  let highestDbSimilarity = 0;

  for (const existing of existingNotes) {
    const existingText = existing.digitalizedContent || existing.description || '';
    if (existingText.length < 50) continue;

    const similarity = calculateRealSimilarity(content, existingText);

    if (similarity > highestDbSimilarity) {
      highestDbSimilarity = similarity;
    }

    if (similarity >= 0.20) {
      databaseMatches.push({
        title: existing.title || 'Untitled Note',
        noteId: existing._id?.toString() || '',
        percentage: Math.round(similarity * 100),
        type: 'DATABASE_MATCH',
        message: similarity >= 0.60
          ? 'High similarity — likely copied content'
          : similarity >= 0.40
            ? 'Moderate similarity — significant overlapping content'
            : 'Low similarity — some shared phrases detected',
      });
    }
  }

  // Sort by highest similarity first
  databaseMatches.sort((a, b) => b.percentage - a.percentage);

  // ── 3. Check against known academic corpus ────────────────────────────
  const corpusMatches = [];
  let highestCorpusSimilarity = 0;

  for (const entry of KNOWN_ACADEMIC_CORPUS) {
    const ngramSim = calculateNGramSimilarity(content, entry.text, 3);
    const jaccardSim = calculateJaccardSimilarity(content, entry.text);
    const combinedSim = (ngramSim * 0.6) + (jaccardSim * 0.4);

    if (combinedSim > highestCorpusSimilarity) {
      highestCorpusSimilarity = combinedSim;
    }

    if (combinedSim >= 0.15) {
      corpusMatches.push({
        title: entry.source,
        percentage: Math.round(combinedSim * 100),
        type: 'KNOWN_SOURCE',
        subject: entry.subject,
        message: `Matches known definition from: ${entry.source}`,
      });
    }
  }

  corpusMatches.sort((a, b) => b.percentage - a.percentage);

  // ── 4. Detect suspicious patterns ─────────────────────────────────────
  const detectedPatterns = [];

  // Lexical diversity check
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  const lexicalDiversity = uniqueWords.size / Math.max(words.length, 1);

  if (lexicalDiversity < 0.25) {
    detectedPatterns.push({
      pattern: 'Extremely repetitive text — possible auto-generated or spam content',
      similarity: Math.round((1 - lexicalDiversity) * 100),
      type: 'LOW_DIVERSITY',
    });
  } else if (lexicalDiversity < 0.35) {
    detectedPatterns.push({
      pattern: 'Low word diversity — content may be heavily repetitive',
      similarity: Math.round((1 - lexicalDiversity) * 100),
      type: 'LOW_DIVERSITY',
    });
  }

  // Quality issues become detected patterns
  for (const issue of qualityCheck.issues) {
    detectedPatterns.push({ pattern: issue, similarity: 0, type: 'QUALITY_ISSUE' });
  }
  for (const indicator of qualityCheck.suspiciousIndicators) {
    detectedPatterns.push({ pattern: indicator, similarity: 0, type: 'SUSPICIOUS' });
  }

  // ── 5. Find highlighted copied content (actual shared phrases) ────────
  const highlightedCopiedContent = [];

  for (const match of databaseMatches.slice(0, 3)) {
    const existing = existingNotes.find(n => (n._id?.toString() || '') === match.noteId);
    if (!existing) continue;
    const existingText = existing.digitalizedContent || existing.description || '';
    const sharedPhrases = findSharedPhrases(content, existingText, 5);

    for (const phrase of sharedPhrases.slice(0, 3)) {
      highlightedCopiedContent.push({
        text: phrase,
        source: match.title,
      });
    }
  }

  // ── 6. Calculate honest originality score ─────────────────────────────
  const maxRealSimilarity = Math.max(highestDbSimilarity, highestCorpusSimilarity);

  let plagiarismPercentage = 0;

  // Primary factor: actual similarity detected
  if (maxRealSimilarity > 0.10) {
    plagiarismPercentage = Math.round(maxRealSimilarity * 100);
  }

  // Secondary: low diversity penalty
  if (lexicalDiversity < 0.35) {
    plagiarismPercentage += Math.round((0.35 - lexicalDiversity) * 25);
  }

  // Secondary: suspicious content penalty
  plagiarismPercentage += qualityCheck.suspiciousIndicators.length * 5;

  plagiarismPercentage = Math.min(95, Math.max(0, plagiarismPercentage));
  const originalityScore = 100 - plagiarismPercentage;

  // ── 7. Determine risk level ───────────────────────────────────────────
  let riskLevel = 'LOW';
  if (originalityScore < 85 || databaseMatches.length > 2) riskLevel = 'MEDIUM';
  if (originalityScore < 60 || databaseMatches.some(m => m.percentage > 50)) riskLevel = 'HIGH';
  if (originalityScore < 40 || databaseMatches.some(m => m.percentage > 70)) riskLevel = 'CRITICAL';

  // ── 8. Confidence based on analysis depth ─────────────────────────────
  let confidence = 30; // Baseline: local analysis only
  if (existingNotes.length > 0) confidence = 50;
  if (existingNotes.length > 10) confidence = 65;
  if (existingNotes.length > 30) confidence = 75;
  if (existingNotes.length > 50) confidence = 80;
  // Note: without external APIs (Turnitin/Copyscape), max confidence is 80%

  // ── 9. Build all matched sources list ─────────────────────────────────
  const allMatches = [...databaseMatches, ...corpusMatches];

  // ── 10. Build honest human-readable message ───────────────────────────
  const messageParts = [];
  messageParts.push(`Originality: ${originalityScore}% (Risk: ${riskLevel}).`);
  messageParts.push(`Checked against ${existingNotes.length} existing notes in the database and ${KNOWN_ACADEMIC_CORPUS.length} known academic definitions.`);

  if (allMatches.length > 0) {
    messageParts.push(`Found ${allMatches.length} potential match(es). Top match: ${allMatches[0].percentage}% similarity with "${allMatches[0].title}".`);
  } else {
    messageParts.push('No significant matches found in our database.');
  }

  messageParts.push('Note: This analysis does not cover internet or published journal sources. For complete verification, external API integration is recommended.');

  // ── 11. Build recommendations ─────────────────────────────────────────
  const recommendations = [];

  if (originalityScore >= 85) {
    recommendations.push('Content appears original based on our database check.');
  }
  if (databaseMatches.length > 0) {
    recommendations.push('Review flagged matches to ensure proper attribution or paraphrasing.');
  }
  if (corpusMatches.length > 0) {
    recommendations.push('Some text closely matches common textbook definitions — consider paraphrasing or adding citations.');
  }
  if (lexicalDiversity < 0.4) {
    recommendations.push('Increase word variety to strengthen originality score.');
  }
  if (!structureAnalysis.hasCitations) {
    recommendations.push('Add proper citations to strengthen academic credibility.');
  }

  // ── 12. Return complete, honest results ───────────────────────────────
  return {
    originalityScore,
    plagiarismPercentage,
    riskLevel,
    confidence,
    detectionMethod: existingNotes.length > 0 ? 'DATABASE_CROSS_REFERENCE' : 'LOCAL_ANALYSIS_ONLY',
    checkedAgainst: existingNotes.length,
    message: messageParts.join(' '),
    matchedSources: allMatches.slice(0, 10),
    highlightedCopiedContent,
    detectedPatterns,
    qualityAnalysis: {
      ...structureAnalysis,
      lexicalDiversity: Math.round(lexicalDiversity * 100),
      qualityIssues: qualityCheck.issues,
      suspiciousIndicators: qualityCheck.suspiciousIndicators,
    },
    recommendations,
    limitations: [
      'Cannot check against internet sources without external API integration (Turnitin, Copyscape, or Serper).',
      `Checked against ${existingNotes.length} existing notes in the EduMarket database.`,
      `Checked against ${KNOWN_ACADEMIC_CORPUS.length} known commonly-copied academic definitions.`,
      'Confidence level increases as more notes are added to the platform.',
    ],
  };
};

module.exports = {
  analyzePlagiarism,
  analyzeStructure,
  calculateRealSimilarity,
  calculateNGramSimilarity,
  calculateJaccardSimilarity,
  calculateCosineSimilarity,
  findSharedPhrases,
};
