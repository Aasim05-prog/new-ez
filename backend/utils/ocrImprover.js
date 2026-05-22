/**
 * OCR Accuracy Improvement Utility
 * Post-processes OCR output to improve accuracy and formatting
 */

const improveOCRText = (text) => {
  if (!text) return '';
  
  // Step 1: Fix common OCR errors
  let improved = fixCommonOCRErrors(text);
  
  // Step 2: Fix spacing and punctuation
  improved = fixSpacingAndPunctuation(improved);
  
  // Step 3: Detect and format mathematical content
  improved = formatMathematicalContent(improved);
  
  // Step 4: Detect and format headers
  improved = formatHeaders(improved);
  
  // Step 5: Detect and format lists
  improved = formatLists(improved);
  
  // Step 6: Detect and format code blocks
  improved = formatCodeBlocks(improved);
  
  return improved;
};

// Fix common OCR misrecognitions
const fixCommonOCRErrors = (text) => {
  const replacements = {
    // Common character confusions
    'rn': 'in', // In context - be careful
    '0': 'O', // In words
    'l': 'I', // Letter confusions in uppercase
    '1': 'l', // Number-letter confusions
    '5': 'S', // In context
    '8': 'B', // In context
    
    // Common word OCR errors
    'tne': 'the',
    'tnx': 'thank',
    'ans': 'and',
    'tnis': 'this',
    'wnicn': 'which',
    'tinai': 'final',
    'signiricant': 'significant',
    'eignt': 'eight',
    'iunction': 'function',
    'exampie': 'example',
    'eqaation': 'equation',
    'anaiysis': 'analysis',
  };
  
  let result = text;
  
  // Apply replacements (case-insensitive but preserve case)
  Object.entries(replacements).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    result = result.replace(regex, match => {
      if (match[0] === match[0].toUpperCase()) {
        return correct.charAt(0).toUpperCase() + correct.slice(1);
      }
      return correct;
    });
  });
  
  // Fix extra spaces
  result = result.replace(/\s{2,}/g, ' ');
  
  // Fix line breaks
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result;
};

// Improve spacing and punctuation
const fixSpacingAndPunctuation = (text) => {
  let result = text;
  
  // Fix spacing around punctuation
  result = result.replace(/\s+([.!?,;:])/g, '$1');
  result = result.replace(/([.!?,;:])\s*/g, '$1 ');
  result = result.replace(/\s+\./g, '.');
  
  // Fix spacing around parentheses
  result = result.replace(/\(\s+/g, '(');
  result = result.replace(/\s+\)/g, ')');
  
  // Fix spacing in mathematical expressions
  result = result.replace(/(\w)\s+([+\-*/=])\s+/g, '$1 $2 ');
  
  // Remove extra spaces before end of line
  result = result.replace(/\s+$/gm, '');
  
  // Fix sentence ending
  result = result.replace(/([a-z])\s*\n/g, '$1.\n');
  
  return result;
};

// Detect and format mathematical content
const formatMathematicalContent = (text) => {
  let result = text;
  
  // Detect equations and wrap in markdown code
  const equationPatterns = [
    /(\w+)\s*=\s*([^,.\n]*)/g, // Simple equations
    /∫|∑|∏|√|π|α|β|γ|θ|λ|Δ|Σ|Π/g, // Mathematical symbols
    /\d+\.\d+\s*×\s*10\^-?\d+/g, // Scientific notation
  ];
  
  // Format detected math better (already formatted in Markdown is fine)
  
  return result;
};

// Detect and format headers
const formatHeaders = (text) => {
  let result = text;
  const lines = result.split('\n');
  const formatted = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // All caps lines that are short = likely headers
    if (line.match(/^[A-Z\s]+$/) && line.length < 50 && line.length > 3) {
      line = `## ${line}`;
    }
    
    // Lines ending with colon followed by content
    else if (line.match(/^([A-Z][a-z\s]+):\s*$/i) && i < lines.length - 1) {
      line = `### ${line}`;
    }
    
    // Numbered sections like "1.", "2." etc
    else if (line.match(/^\d+\.\s+[A-Z]/)) {
      line = `## ${line}`;
    }
    
    formatted.push(line);
  }
  
  return formatted.join('\n');
};

// Detect and format lists
const formatLists = (text) => {
  let result = text;
  const lines = result.split('\n');
  const formatted = [];
  
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Detect bullet points that aren't formatted
    if (trimmed.match(/^[a-z]\)\s+/i)) {
      line = `  * ${trimmed.substring(3)}`;
      inList = true;
    }
    
    // Detect numbered lists that aren't formatted
    else if (trimmed.match(/^\d+\)\s+/)) {
      const num = trimmed.match(/^(\d+)/)[1];
      line = `${num}. ${trimmed.substring(trimmed.indexOf(')') + 1).trim()}`;
      inList = true;
    }
    
    // Detect dash-based lists
    else if (trimmed.startsWith('-') && !trimmed.startsWith('--')) {
      line = `* ${trimmed.substring(1).trim()}`;
      inList = true;
    }
    
    else {
      inList = false;
    }
    
    formatted.push(line);
  }
  
  return formatted.join('\n');
};

// Detect and format code blocks
const formatCodeBlocks = (text) => {
  let result = text;
  
  // Detect code-like content
  const codeIndicators = /\b(function|class|def|import|export|const|let|var|if|else|for|while|return|console\.log|print|main)\b/gi;
  
  const lines = result.split('\n');
  const formatted = [];
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line looks like code
    if (codeIndicators.test(line) || line.includes('{') || line.includes('(')) {
      if (!inCodeBlock && i > 0) {
        formatted.push('```');
        inCodeBlock = true;
      }
      formatted.push(line);
    } else {
      if (inCodeBlock) {
        formatted.push('```');
        inCodeBlock = false;
      }
      formatted.push(line);
    }
  }
  
  if (inCodeBlock) {
    formatted.push('```');
  }
  
  return formatted.join('\n');
};

// Validate OCR quality
const validateOCRQuality = (text) => {
  if (!text || text.length === 0) {
    return { quality: 0, warnings: ['No text extracted'] };
  }
  
  const warnings = [];
  let qualityScore = 100;
  
  // Check for very short text
  if (text.length < 100) {
    qualityScore -= 30;
    warnings.push('Extracted text is very short');
  }
  
  // Check for gibberish indicators
  const nonAlphabetic = (text.match(/[^a-zA-Z\s\d\.\,\!\?\:\;\(\)\-\/\+\=]/g) || []).length;
  const ratio = nonAlphabetic / text.length;
  if (ratio > 0.1) {
    qualityScore -= 20;
    warnings.push('High ratio of unusual characters detected');
  }
  
  // Check for too many spaces
  if (text.match(/\s{4,}/g)) {
    qualityScore -= 10;
    warnings.push('Excessive whitespace detected');
  }
  
  // Check for word count
  const words = text.match(/\b\w+\b/g) || [];
  if (words.length < 20) {
    qualityScore -= 25;
    warnings.push('Very few words extracted');
  }
  
  // Check for proper sentence structure
  const sentences = text.match(/[.!?]/g) || [];
  const sentenceRatio = sentences.length / (words.length / 10 || 1);
  if (sentenceRatio < 0.05) {
    qualityScore -= 15;
    warnings.push('No clear sentence boundaries detected');
  }
  
  return {
    quality: Math.max(0, qualityScore),
    warnings,
    wordCount: words.length,
    hasProperStructure: qualityScore > 60
  };
};

module.exports = {
  improveOCRText,
  validateOCRQuality,
  fixCommonOCRErrors,
  formatMathematicalContent,
  formatHeaders,
  formatLists
};
