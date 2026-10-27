"""
AI Detection and Metrics Analyzer
Evaluates text for AI probability, human score, perplexity, burstiness, and cliché frequency.
"""

import re
import math
import statistics
from typing import Dict, Any, List

try:
    import texthumanize
    HAS_TEXTHUMANIZE = True
except ImportError:
    HAS_TEXTHUMANIZE = False

# Known AI clichés and buzzwords commonly flagged by Turnitin and GPTZero
AI_CLICHE_PATTERNS = [
    r'\bfurthermore\b',
    r'\bmoreover\b',
    r'\badditionally\b',
    r'\bin conclusion\b',
    r'\bto summarize\b',
    r'\bit is crucial to\b',
    r'\bit is important to note\b',
    r'\bit is worth noting\b',
    r'\bdelve into\b',
    r'\btapestry\b',
    r'\brich tapestry\b',
    r'\bparadigm shift\b',
    r'\bpivotal role\b',
    r'\bplays a pivotal role\b',
    r'\bserves as a testament to\b',
    r'\ba testament to\b',
    r'\bnavigating the complexities\b',
    r'\binterplay between\b',
    r'\bunderscores the importance\b',
    r'\bfoster an environment\b',
    r'\bmultifaceted\b',
    r'\bever-evolving landscape\b',
    r'\bat the forefront of\b',
    r'\ba myriad of\b',
    r'\bseamlessly integrated\b',
    r'\bshed light on\b',
    r'\bserves as a reminder\b',
    r'\bharness the power of\b',
    r'\bgame-changer\b',
    r'\bintricate dance\b',
    r'\bbustling\b',
    r'\bvibrant\b',
    r'\brelatively speaking\b',
    r'\bnotably\b',
    r'\bparamount\b',
]

def split_into_sentences(text: str) -> List[str]:
    """Splits text into meaningful sentences while respecting abbreviations."""
    raw_sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in raw_sentences if s.strip() and len(s.strip()) > 3]
    return sentences

def calculate_burstiness(sentences: List[str]) -> float:
    """
    Calculates sentence length standard deviation (burstiness).
    Higher burstiness (> 6.0) indicates human writing.
    Lower burstiness (< 2.5) indicates uniform AI text.
    """
    if len(sentences) < 2:
        return 5.0
    lengths = [len(s.split()) for s in sentences]
    return round(statistics.stdev(lengths), 2)

def find_ai_cliches(text: str) -> List[str]:
    """Finds all AI cliché phrases in text."""
    found = []
    text_lower = text.lower()
    for pattern in AI_CLICHE_PATTERNS:
        matches = re.findall(pattern, text_lower)
        if matches:
            found.extend(matches)
    return list(set(found))

def calculate_readability(text: str, words: int, sentences_count: int) -> float:
    """Calculates Flesch Reading Ease score."""
    if words == 0 or sentences_count == 0:
        return 60.0
    
    # Estimate syllables by vowel clusters
    syllables = len(re.findall(r'[aeiouy]+', text.lower()))
    syllables = max(syllables, words)
    
    score = 206.835 - (1.015 * (words / sentences_count)) - (84.6 * (syllables / words))
    return round(max(0.0, min(100.0, score)), 1)

def analyze_text(text: str) -> Dict[str, Any]:
    """
    Performs full multi-factor AI detection and linguistic analysis.
    Returns human score, AI probability, burstiness, clichés, and sentence risk breakdown.
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        return {
            "ai_score": 0.0,
            "human_score": 100.0,
            "verdict": "human",
            "burstiness": 0.0,
            "cliches": [],
            "word_count": 0,
            "sentence_count": 0,
            "reading_ease": 100.0,
            "sentence_breakdown": []
        }

    words = cleaned_text.split()
    word_count = len(words)
    sentences = split_into_sentences(cleaned_text)
    sentence_count = max(1, len(sentences))
    burstiness = calculate_burstiness(sentences)
    cliches = find_ai_cliches(cleaned_text)
    readability = calculate_readability(cleaned_text, word_count, sentence_count)

    ai_score = 0.5
    verdict = "uncertain"

    # Use texthumanize detector if available
    if HAS_TEXTHUMANIZE:
        try:
            # Sample up to 800 words for responsive detection without freezing on huge manuscripts
            sample_text = " ".join(words[:800]) if len(words) > 800 else cleaned_text
            det = texthumanize.detect_ai(sample_text)
            ai_score = float(det.get("score", 0.5))
            verdict = det.get("verdict", "uncertain")
        except Exception:
            pass

    # Factor in burstiness and cliché density
    cliche_penalty = min(0.35, len(cliches) * 0.08)
    
    # If burstiness is very low, raise AI score slightly; if high, reward human score
    if burstiness < 2.5:
        burstiness_factor = 0.15
    elif burstiness > 7.0:
        burstiness_factor = -0.15
    else:
        burstiness_factor = 0.0

    adjusted_ai_score = max(0.0, min(1.0, ai_score + burstiness_factor + (cliche_penalty if ai_score > 0.1 else 0)))
    human_score = round((1.0 - adjusted_ai_score) * 100.0, 1)

    # Determine final verdict
    if human_score >= 80.0:
        verdict = "human"
    elif human_score <= 40.0:
        verdict = "ai"
    else:
        verdict = "mixed"

    # Sentence-by-sentence analysis
    sentence_breakdown = []
    for s in sentences:
        s_words = s.split()
        s_len = len(s_words)
        s_cliches = [c for c in cliches if c in s.lower()]
        
        # Risk heuristic: uniform 15-22 word sentence with cliches is high risk
        if s_cliches or (15 <= s_len <= 22 and burstiness < 3.5):
            risk = "high"
        elif 12 <= s_len <= 25:
            risk = "medium"
        else:
            risk = "low"
            
        sentence_breakdown.append({
            "text": s,
            "word_count": s_len,
            "risk": risk,
            "cliches": s_cliches
        })

    return {
        "ai_score": round(adjusted_ai_score, 3),
        "human_score": human_score,
        "verdict": verdict,
        "burstiness": burstiness,
        "cliches": cliches,
        "word_count": word_count,
        "sentence_count": sentence_count,
        "reading_ease": readability,
        "sentence_breakdown": sentence_breakdown
    }
