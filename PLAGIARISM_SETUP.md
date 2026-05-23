# Plagiarism Detection API Integration Guide

## Overview
The improved plagiarism detection system now checks against **REAL sources** instead of just local analysis.

## Current Status
- ✅ Local analysis (baseline - always enabled)
- ✅ Web search via Serper API (optional - free tier available)
- ✅ Academic database checking (free via Semantic Scholar)
- ⏳ Turnitin integration (template provided - requires API key)
- ⏳ Copyscape integration (template provided - requires API key)

---

## Setup Instructions

### 1. Basic Local Analysis (No Setup Required)
The system uses local pattern analysis to:
- Detect Wikipedia patterns
- Identify generic/template content
- Analyze word diversity and structure
- Check for citations and academic formatting

**No API key needed** - this runs automatically.

---

### 2. Web Search (Optional - Free Tier)

#### Get Serper API Key (FREE)
1. Go to https://serper.dev/
2. Sign up for free account
3. Copy your API key
4. Add to `.env`:
```
SERPER_API_KEY=your_serper_api_key_here
```

**Free tier:** 100 searches/day (enough for testing)
**Cost after:** $2.50 per 100 searches

#### What it does:
- Searches Google for note content
- Checks snippets for matches
- Reports top matching websites
- Percentage match per source

---

### 3. Academic Database (Optional - Free)

#### Semantic Scholar API (FREE - No key needed)
No setup required! The system automatically uses:
- https://api.semanticscholar.org (free endpoint)
- No API key required
- 100 requests/second rate limit

**What it does:**
- Searches academic papers
- Checks arXiv, PubMed, ACL, etc.
- Finds scholarly article matches
- Reports academic plagiarism

---

### 4. Turnitin Integration (Optional - Paid)

#### Setup Turnitin
1. Create account at https://www.turnitin.com/
2. Set up API integration
3. Get API credentials
4. Add to `.env`:
```
TURNITIN_API_KEY=your_turnitin_api_key
```

**Cost:** ~$0.10-0.25 per submission (expensive for testing)
**Accuracy:** 99%+ (industry standard)

**When it's used:**
- Only for ~20% of uploads (cost optimization)
- Uses local + web + academic first, then adds Turnitin

---

### 5. Copyscape Integration (Optional - Paid)

#### Setup Copyscape
1. Create account at https://www.copyscape.com/
2. Get API key from account settings
3. Add to `.env`:
```
COPYSCAPE_API_KEY=your_copyscape_api_key
```

**Cost:** ~$0.05 per page
**Accuracy:** 85%+ (good for web content)

---

## Environment Variables

Create/update `.env` with these optional keys:

```bash
# Web search (recommended - free tier available)
SERPER_API_KEY=sk_xxxxxxxxxxxxx

# Academic database (no key needed, auto-enabled)
# (No setup required - uses free Semantic Scholar API)

# External plagiarism APIs (optional - expensive)
TURNITIN_API_KEY=your_key_here
COPYSCAPE_API_KEY=your_key_here
SCHOLARLY_API_KEY=your_key_here
```

---

## How It Works

### Flow for Each Upload:

1. **Instant (0-1 second):**
   - Local analysis (patterns, structure, citations)
   - Return preliminary score to user

2. **Background (30-60 seconds):**
   ```
   async checkPlagiarism():
     ├─ Local Analysis (✓ Done above)
     ├─ Web Search (if SERPER_API_KEY)
     ├─ Academic DB (if available - free)
     └─ Turnitin/Copyscape (if budget available)
   ```

3. **Result:**
   - Update note with detailed report
   - Show matched sources
   - Provide risk level (LOW/MEDIUM/HIGH)
   - Calculate final originality score

### Example Response:

**Immediately (Upload Response):**
```json
{
  "_id": "note123",
  "title": "Physics Notes",
  "plagiarismScore": 87,
  "plagiarismCheckStatus": "IN_PROGRESS",
  "plagiarismCheckMessage": "Advanced plagiarism check running in background..."
}
```

**After 30-60 seconds (GET /api/notes/note123):**
```json
{
  "_id": "note123",
  "plagiarismScore": 82,
  "plagiarismDetails": {
    "originalityScore": 82,
    "riskLevel": "LOW",
    "matchedSources": [
      {
        "title": "Wikipedia - Physics",
        "url": "https://en.wikipedia.org/wiki/Physics",
        "percentage": 12,
        "source": "web"
      },
      {
        "title": "Academic Paper Title",
        "url": "https://arxiv.org/abs/...",
        "percentage": 8,
        "source": "academic"
      }
    ],
    "sourceCount": 2
  },
  "originalityReport": "Plagiarism Check Complete\nOriginality: 82%\nRisk Level: LOW\nMatches Found: 2"
}
```

---

## Scoring System

| Score | Risk Level | Status |
|-------|-----------|--------|
| 85-100 | LOW | Highly original, safe to publish |
| 70-84 | LOW | Good originality, minor matches |
| 50-69 | MEDIUM | Some borrowed content, acceptable |
| 40-49 | MEDIUM | Significant matches, review needed |
| 25-39 | HIGH | Heavy plagiarism, likely rejection |
| <25 | CRITICAL | Probable full plagiarism |

---

## Risk Level Determination

```
LOW:
  - Score ≥ 85 AND no matches
  - Score ≥ 70 AND ≤ 2 matches
  - Academic citations present

MEDIUM:
  - Score 50-69
  - 3-5 web matches
  - Paraphrased content

HIGH:
  - Score < 40
  - 6+ matches
  - Direct Wikipedia copies
  - Suspicious patterns detected
```

---

## Testing

### Test Case 1: Original Content (Should score high)
```bash
curl -X POST http://localhost:5000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "My Personal Physics Analysis",
    "description": "I analyzed Newton'\''s laws by examining their applications in classical mechanics. First law discusses inertia...",
    "subject": "Physics",
    "educationLevel": "Std 12 - Science",
    "price": 50,
    "pages": 5
  }'

# Expected: plagiarismScore = 88-95 (LOW risk)
```

### Test Case 2: Wikipedia Content (Should score low)
```bash
# Copy text from Wikipedia article
# Expected: plagiarismScore = 30-45 (HIGH risk)
```

### Test Case 3: With APIs Enabled
Set `SERPER_API_KEY` in `.env`, then upload:
```bash
# Expected: More detailed matchedSources array
# Will show actual Wikipedia/web matches
```

---

## Monitoring Plagiarism Checks

### Check Note Status:
```bash
GET /api/notes/:noteId

# Response includes:
# - plagiarismScore
# - plagiarismDetails.matchedSources
# - plagiarismDetails.riskLevel
# - originalityReport
```

### View in Admin Dashboard:
Notes with HIGH risk are flagged for manual review.

---

## Cost Optimization

### Recommended Setup (Startup Budget):
1. **Always enabled (Free):**
   - Local analysis
   - Semantic Scholar (free endpoint)

2. **Optional (Low cost):**
   - Serper API: $2.50/100 searches = $25/month for 1000 uploads

3. **For scale (Advanced):**
   - Turnitin: Pay as you grow model
   - Set 20% sampling rate to manage costs

### Estimated Monthly Costs:
- **Free tier:** $0 (local + Semantic Scholar)
- **Basic:** $25 (Serper for web checks)
- **Standard:** $75 (Turnitin 30% of uploads)
- **Enterprise:** Custom pricing

---

## Troubleshooting

### Plagiarism check always shows "IN_PROGRESS"
**Solution:**
- Check server logs: `docker logs edumarket-backend`
- Verify async job is running
- Increase timeout in `plagiarismService.js`

### API timeouts
**Solution:**
- Reduce timeout: `timeout: 5000` in plagiarismService.js
- Use fewer APIs
- Increase server resources

### Invalid API key errors
**Solution:**
- Verify key in `.env`
- Check API account is active
- Test API directly with curl

---

## Next Steps

1. ✅ **Deploy to production**
   ```bash
   git add backend/services/plagiarismService.js
   git commit -m "feat: Add real plagiarism detection with API integration"
   git push
   ```

2. ⏳ **Get Serper API key** (recommended)
   - Cost: $2.50/100 searches
   - Setup: 2 minutes

3. ⏳ **Monitor plagiarism reports**
   - Flag HIGH risk uploads
   - Manual review process
   - Adjust scoring thresholds

4. ⏳ **Plan Turnitin integration** (optional)
   - For premium tier
   - Or monthly sampling

---

## Files Changed

- ✅ `backend/services/plagiarismService.js` - NEW: Real plagiarism detection
- ✅ `backend/controllers/noteController.js` - UPDATED: Uses new service
- 📋 `PLAGIARISM_SETUP.md` - THIS FILE: Setup guide

---

**Ready to deploy! 🚀**
