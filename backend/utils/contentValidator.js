/**
 * Content Validation Utility
 * Validates uploaded files are actual study notes, not resumes or random documents
 */

// Patterns that indicate this is actual study material
const STUDY_NOTE_INDICATORS = {
  academic_terms: /\b(chapter|section|topic|lesson|unit|module|theorem|formula|equation|definition|concept|hypothesis|theory|principle|law|axiom|corollary|derivation|proof|solution|example|exercise|problem|answer|key|summary|revision|flashcard|quiz|test|exam|syllabus|curriculum|academic|educational|learning|objective)\b/gi,
  
  technical_content: /\b(math|physics|chemistry|biology|history|geography|economics|political|science|literature|engineering|programming|code|algorithm|data|structure|analysis|calculus|algebra|geometry|trigonometry|statistics|probability|function|variable|constant|derivative|integral|matrix|vector)\b/gi,
  
  academic_language: /\b(furthermore|moreover|however|therefore|consequently|thus|hence|meanwhile|subsequently|previously|notably|significantly|specifically|generally|essentially|primarily|secondary|particularly)\b/gi,
  
  section_markers: /^(chapter|section|unit|module|topic|part|introduction|abstract|conclusion|summary|references|appendix|index|glossary|bibliography|notes|outline|objectives|learning goals|key concepts|review questions|practice problems|solutions|answers)[\s:]/mi,
  
  formulas_and_equations: /[a-z]\s*=|∫|∑|∏|≠|≤|≥|→|←|↔|±|×|÷|√|π|α|β|γ|θ|λ|Δ|Σ|Π|Ω|\^[0-9]/gi,
  
  numbered_lists: /^\d+[\).]\s|^[-•]\s|^[a-z]\)\s/mi,
  
  headers_and_structure: /^#{1,6}\s|^={2,}|^-{2,}/m,
};

const RESUME_INDICATORS = {
  resume_keywords: /\b(resume|cv|curriculum vitae|contact information|phone|email|linkedin|github|experience|education|degree|employment|job|position|role|responsibility|skill|proficiency|objective|summary|technical|professional|certification|award|achievement|reference|availability|salary|duration|company|employer|organization|institution|university|college|high school|graduate|bachelor|master|diploma|license)\b/gi,
  
  resume_patterns: /\b(currently employed|seeking position|open to opportunities|available immediately|full-time|part-time|remote|flexible|relocation|willing to relocate)\b/gi,
  
  contact_section: /\b(email|phone|address|city|state|zip|country|contact|linkedin|github|portfolio|website|www|http)\b.*?(?:\n|$)/gi,
};

// Check if content appears to be a resume
const isResume = (text) => {
  const lowerText = text.toLowerCase();
  
  let resumeScore = 0;
  const maxScore = 100;
  
  // Check resume keywords
  const resumeMatches = text.match(RESUME_INDICATORS.resume_keywords) || [];
  resumeScore += Math.min(40, resumeMatches.length * 4);
  
  // Check resume patterns
  const patternMatches = text.match(RESUME_INDICATORS.resume_patterns) || [];
  resumeScore += Math.min(30, patternMatches.length * 5);
  
  // Check for contact information patterns
  if (/\b\w+@\w+\.\w+\b/.test(text)) resumeScore += 10;
  if (/\+?[0-9]{10,}/.test(text)) resumeScore += 10;
  if (/linkedin\.com|github\.com/.test(text)) resumeScore += 15;
  
  // Check structure - resumes often have very short lines
  const lines = text.split('\n').filter(l => l.trim());
  const shortLines = lines.filter(l => l.trim().length < 60).length;
  if (shortLines > lines.length * 0.7) resumeScore += 15;
  
  // Resumes lack academic content
  const academicMatches = text.match(STUDY_NOTE_INDICATORS.academic_terms) || [];
  if (academicMatches.length < 5) resumeScore += 10;
  
  return resumeScore > 40;
};

// Check if content appears to be actual study notes
const isStudyNotes = (text) => {
  if (text.length < 200) return false; // Too short
  
  const lowerText = text.toLowerCase();
  let studyScore = 0;
  const maxScore = 100;
  
  // Check for academic terms
  const academicMatches = text.match(STUDY_NOTE_INDICATORS.academic_terms) || [];
  studyScore += Math.min(25, academicMatches.length * 2);
  
  // Check for technical content
  const technicalMatches = text.match(STUDY_NOTE_INDICATORS.technical_content) || [];
  studyScore += Math.min(25, technicalMatches.length * 2);
  
  // Check for academic language/transitions
  const languageMatches = text.match(STUDY_NOTE_INDICATORS.academic_language) || [];
  studyScore += Math.min(15, languageMatches.length * 3);
  
  // Check for section markers
  if (STUDY_NOTE_INDICATORS.section_markers.test(text)) studyScore += 15;
  
  // Check for headers and structure
  if (STUDY_NOTE_INDICATORS.headers_and_structure.test(text)) studyScore += 10;
  
  // Check for formulas/equations
  const formulaMatches = text.match(STUDY_NOTE_INDICATORS.formulas_and_equations) || [];
  studyScore += Math.min(10, formulaMatches.length * 2);
  
  // Check for numbered lists
  if (STUDY_NOTE_INDICATORS.numbered_lists.test(text)) studyScore += 10;
  
  return studyScore >= 30;
};

// Validate file extension
const isValidNoteExtension = (filename) => {
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.docx', '.doc'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext);
};

// Main validation function
const validateNoteContent = (content, filename = '', context = {}) => {
  const validations = {
    valid: true,
    warnings: [],
    errors: [],
    score: 0,
    contentType: 'unknown'
  };
  
  // Check extension
  if (filename && !isValidNoteExtension(filename)) {
    validations.errors.push('Invalid file extension. Only images, PDFs, and documents are allowed.');
    validations.valid = false;
    return validations;
  }
  
  // Check content length
  if (!content || content.length < 100) {
    validations.errors.push('Content is too short. Please upload actual study notes (minimum 100 characters).');
    validations.valid = false;
    return validations;
  }
  
  // Check if it's a resume
  if (isResume(content)) {
    validations.errors.push('This appears to be a resume or CV, not study notes. Please upload actual study materials.');
    validations.valid = false;
    return validations;
  }
  
  // Check if it looks like study notes
  const hasStudyContent = isStudyNotes(content);
  
  if (!hasStudyContent && content.length < 500) {
    validations.warnings.push('Content may not be actual study notes. Ensure you\'re uploading educational material.');
    validations.score = 40;
  } else if (!hasStudyContent) {
    validations.warnings.push('Content doesn\'t strongly match academic material patterns. Please verify it\'s study notes.');
    validations.score = 50;
  } else {
    validations.score = 85;
  }
  
  // Additional checks
  if (content.includes('http') && !context.allowLinks) {
    validations.warnings.push('Content contains external links. Make sure to include proper citations.');
  }
  
  // Check for minimum unique words
  const words = content.match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  if (uniqueWords.size < 20) {
    validations.warnings.push('Content has very few unique words. Please provide more detailed notes.');
    validations.score -= 20;
  }
  
  // Determine content type
  if (hasStudyContent) {
    validations.contentType = 'study_notes';
  } else if (isResume(content)) {
    validations.contentType = 'resume';
  } else {
    validations.contentType = 'other';
  }
  
  validations.valid = validations.errors.length === 0 && validations.score >= 40;
  
  return validations;
};

module.exports = {
  validateNoteContent,
  isStudyNotes,
  isResume,
  isValidNoteExtension
};
