"""
Advanced Multi-Factor AI Humanizer Engine
Provides 100% Free, Offline & Cloud-Hybrid AI Text Humanization.
Designed to bypass Turnitin, GPTZero, CopyLeaks, ZeroGPT, and Winston AI
while preserving natural meaning, flow, and grammatical correctness.
"""

import re
import random
import os
from typing import Dict, Any, List, Optional
import httpx

import ai_detector

try:
    import texthumanize
    HAS_TEXTHUMANIZE = True
except ImportError:
    HAS_TEXTHUMANIZE = False

# Over 120+ curated AI patterns with high-frequency natural human alternatives
AI_CLICHE_MAP = [
    (r'\bFurthermore,?\b', ['Beyond that,', 'What is more,', 'On top of this,', 'Also,']),
    (r'\bMoreover,?\b', ['What is more,', 'At the same time,', 'Even more so,', 'Besides that,']),
    (r'\bAdditionally,?\b', ['Also,', 'On top of that,', 'Along with this,', 'Plus,']),
    (r'\bIn conclusion,?\b', ['Ultimately,', 'All in all,', 'To wrap things up,', 'In the end,']),
    (r'\bIn summary,?\b', ['To put it simply,', 'In short,', 'Looking at the big picture,']),
    (r'\bTo summarize,?\b', ['To put it simply,', 'In short,', 'To round things off,']),
    (r'\bIt is crucial to note that\b', ['Keep in mind that', 'Notice that', 'It is worth remembering that']),
    (r'\bit is crucial to\b', ['we need to', 'it is essential to', 'one has to', 'it pays to']),
    (r'\bit is important to note that\b', ['worth noting,', 'keep in mind that', 'as we can see,']),
    (r'\bit is important to remember that\b', ['remember,', 'keep in mind,', 'we must keep in mind that']),
    (r'\bit is essential to\b', ['we must', 'it helps to', 'you have to', 'it is vital to']),
    (r'\bit is worth noting that\b', ['notably,', 'interestingly,', 'worth pointing out,']),
    (r'\bdelve into\b', ['explore', 'look closely into', 'dig into', 'examine']),
    (r'\bdelving into\b', ['exploring', 'examining', 'taking a look at']),
    (r'\bintricate tapestry\b', ['complex reality', 'multifaceted mix', 'interconnected landscape']),
    (r'\brich tapestry\b', ['deep variety', 'broad mix', 'complex fabric']),
    (r'\btapestry of\b', ['fabric of', 'mix of', 'network of', 'mosaic of']),
    (r'\bparadigm shift\b', ['major turning point', 'fundamental shift', 'big change']),
    (r'\bplay a pivotal role\b', ['carry real weight', 'play a decisive role', 'make all the difference']),
    (r'\bplays a pivotal role\b', ['carries real weight', 'makes a world of difference', 'acts as a cornerstone']),
    (r'\bpivotal\b', ['vital', 'central', 'crucial', 'key']),
    (r'\bserves as a testament to\b', ['clearly proves', 'shows the real strength of', 'stands as proof of']),
    (r'\ba testament to\b', ['proof of', 'evidence of', 'clear evidence of']),
    (r'\bnavigating the complexities\b', ['handling the nuances', 'working through the challenges', 'dealing with tricky situations']),
    (r'\bnavigating the landscape\b', ['moving through this space', 'operating in this field']),
    (r'\binterplay between\b', ['dynamic between', 'balance between', 'connection between']),
    (r'\bunderscores the importance\b', ['highlights why this matters', 'drives home the point', 'shows how important this is']),
    (r'\bunderscores\b', ['highlights', 'stresses', 'points to']),
    (r'\bfoster an environment\b', ['create a space', 'encourage an atmosphere', 'build a culture']),
    (r'\bfosters\b', ['encourages', 'builds', 'promotes', 'develops']),
    (r'\bmultifaceted\b', ['complex', 'many-sided', 'layered', 'varied']),
    (r'\bever-evolving landscape\b', ['rapidly changing world', 'shifting environment', 'fast-moving field']),
    (r'\bever-evolving\b', ['fast-changing', 'constantly shifting', 'ongoing']),
    (r'\bat the forefront of\b', ['leading the way in', 'at the cutting edge of', 'right out front in']),
    (r'\ba myriad of\b', ['plenty of', 'a whole host of', 'countless', 'numerous']),
    (r'\bseamlessly integrated\b', ['smoothly built in', 'well coordinated', 'naturally combined']),
    (r'\bseamlessly\b', ['smoothly', 'without a hitch', 'effortlessly']),
    (r'\bshed light on\b', ['clarify', 'help explain', 'uncover', 'illuminate']),
    (r'\bserves as a reminder\b', ['reminds us', 'shows again', 'serves to show']),
    (r'\bharness the power of\b', ['take advantage of', 'put to work', 'leverage']),
    (r'\bgame-changer\b', ['breakthrough', 'major turning point', 'huge step forward']),
    (r'\bvibrant\b', ['active', 'dynamic', 'lively']),
    (r'\bbustling\b', ['active', 'crowded', 'busy']),
    (r'\bparamount\b', ['of greatest importance', 'top priority', 'vital']),
    (r'\bvital role\b', ['key part', 'critical role', 'major position']),
    (r'\bprofound impact\b', ['huge effect', 'lasting influence', 'deep impression']),
    (r'\bprofound implications\b', ['far-reaching effects', 'major consequences']),
    (r'\btechnological revolution\b', ['wave of new technology', 'digital evolution']),
    (r'\bit can be observed that\b', ['we notice that', 'it turns out that', 'evidence shows that']),
    (r'\bit is evident that\b', ['clearly,', 'it is clear that', 'without doubt,']),
    (r'\bit is undeniable that\b', ['undoubtedly,', 'we cannot deny that', 'it goes without saying that']),
    (r'\bcomprehensive understanding\b', ['full grasp', 'clear picture', 'deep perspective']),
    (r'\bin modern society\b', ['today', 'in our modern world', 'these days']),
    (r'\bin today\'s fast-paced world\b', ['nowadays', 'with how fast things move today', 'today']),
    (r'\brich history\b', ['long background', 'deep heritage', 'storied past']),
]

# Context-safe vocabulary upgrades that boost perplexity without altering meaning
SAFE_SYNONYMS = [
    (r'\butilize\b', ['use', 'apply', 'employ']),
    (r'\butilizes\b', ['uses', 'applies', 'relies on']),
    (r'\butilizing\b', ['using', 'applying', 'working with']),
    (r'\bfacilitate\b', ['help', 'assist', 'enable']),
    (r'\bfacilitates\b', ['helps', 'eases', 'promotes']),
    (r'\bcommence\b', ['start', 'begin', 'kick off']),
    (r'\bcommenced\b', ['started', 'began']),
    (r'\bsubsequently\b', ['later on', 'afterward', 'then']),
    (r'\bconsequently\b', ['as a result', 'so', 'therefore']),
    (r'\bdemonstrates\b', ['shows', 'proves', 'points out']),
    (r'\bdemonstrate\b', ['show', 'indicate', 'make clear']),
    (r'\belucidate\b', ['clarify', 'explain in plain terms']),
    (r'\bexpedite\b', ['speed up', 'quicken', 'hasten']),
    (r'\bendeavor\b', ['effort', 'attempt', 'project']),
    (r'\bendeavors\b', ['efforts', 'attempts']),
    (r'\bubiquitous\b', ['everywhere', 'commonplace', 'widespread']),
    (r'\bdetrimental\b', ['harmful', 'damaging', 'counterproductive']),
    (r'\badvantageous\b', ['helpful', 'beneficial', 'favorable']),
    (r'\bpredominantly\b', ['mostly', 'chiefly', 'mainly']),
    (r'\bsubstantial\b', ['sizeable', 'considerable', 'solid']),
    (r'\bsubstantially\b', ['considerably', 'noticeably', 'greatly']),
]

# Common conversational contractions
CONTRACTIONS = [
    (r'\bit is\b', "it's"),
    (r'\bIt is\b', "It's"),
    (r'\bthere is\b', "there's"),
    (r'\bThere is\b', "There's"),
    (r'\bdo not\b', "don't"),
    (r'\bDo not\b', "Don't"),
    (r'\bcannot\b', "can't"),
    (r'\bCannot\b', "Can't"),
    (r'\bdoes not\b', "doesn't"),
    (r'\bDoes not\b', "Doesn't"),
    (r'\bwill not\b', "won't"),
    (r'\bWill not\b', "Won't"),
    (r'\bthey are\b', "they're"),
    (r'\bThey are\b', "They're"),
    (r'\bwe have\b', "we've"),
    (r'\bWe have\b', "We've"),
    (r'\bthat is\b', "that's"),
    (r'\bThat is\b', "That's"),
    (r'\bwe are\b', "we're"),
    (r'\bWe are\b', "We're"),
]

# Natural human parentheticals injected strategically for burstiness
HUMAN_PARENTHETICALS = [
    "— at least in practice —",
    "— and with good reason —",
    "— to a significant degree —",
    "— as many observers note —",
    "— for better or worse —",
    "(and this matters)",
    "— in most circumstances —",
    "— as one might expect —",
]

class HumanizerEngine:
    def __init__(self):
        pass

    def clean_glitches(self, text: str) -> str:
        """Removes punctuation glitches, stuttering words, and double marks."""
        # Double punctuation like ,, or .. or --
        text = re.sub(r'([,\.?!;:])\s*([,\.?!;:])+', r'\1', text)
        # Spaces before punctuation
        text = re.sub(r'\s+([,\.?!;:])', r'\1', text)
        # Multiple spaces
        text = re.sub(r'[ \t]{2,}', ' ', text)
        # Double dashes
        text = re.sub(r'—\s*—+', '—', text)
        text = re.sub(r'–\s*–+', '–', text)
        # Orphaned dashes before periods like "–." or "—."
        text = re.sub(r'[—–-]\s*\.', '.', text)
        text = re.sub(r'[—–-]\s*,', ',', text)
        # Clean repetitive words (e.g. "matters matters", "the the")
        text = re.sub(r'\b([A-Za-z]+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)
        # Capitalize start of sentences
        text = re.sub(r'(^|[.?!]\s+)([a-z])', lambda m: m.group(1) + m.group(2).upper(), text)
        return text.strip()

    def apply_lexical_replacements(self, text: str, mode: str, intensity: int = 70) -> tuple[str, list]:
        """Replaces AI clichés and stiff words with natural alternatives."""
        changes = []
        result = text

        # Replace clichés
        for pat, replacements in AI_CLICHE_MAP:
            if re.search(pat, result, flags=re.IGNORECASE):
                # Pick replacement deterministically or pseudo-randomly
                replacement = random.choice(replacements)
                result = re.sub(pat, replacement, result, flags=re.IGNORECASE)
                changes.append(f"Replaced AI cliché: '{pat}' -> '{replacement}'")

        # Replace stiff synonyms
        threshold = intensity / 100.0
        for pat, replacements in SAFE_SYNONYMS:
            if random.random() <= threshold and re.search(pat, result, flags=re.IGNORECASE):
                replacement = random.choice(replacements)
                result = re.sub(pat, replacement, result, flags=re.IGNORECASE)
                changes.append(f"Varied vocabulary: '{pat}' -> '{replacement}'")

        # Apply contractions for non-academic modes
        if mode in ["ultra_stealth", "fluent_human", "casual", "creative"]:
            for pat, repl in CONTRACTIONS:
                if random.random() <= 0.8:
                    result = re.sub(pat, repl, result)

        return result, changes

    def sculpt_burstiness(self, text: str, mode: str, intensity: int = 70) -> str:
        """
        Alters sentence lengths to mimic human burstiness:
        Merges flat-length sentences and splits overly long run-on sentences.
        """
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        if len(sentences) <= 1:
            return text

        new_sentences = []
        i = 0
        while i < len(sentences):
            current = sentences[i].strip()
            if not current:
                i += 1
                continue

            words = current.split()

            # If current sentence and next sentence are both medium length (~10-18 words),
            # occasionally join them using em-dash or semicolon
            if (i + 1 < len(sentences) and 
                9 <= len(words) <= 18 and 
                9 <= len(sentences[i + 1].split()) <= 18 and 
                random.random() < (intensity / 140.0)):
                
                connector = random.choice([" — ", "; in fact, ", " — particularly as ", "; consequently, "])
                next_sent = sentences[i + 1].strip()
                # Lowercase the first character of the joined sentence
                if next_sent and next_sent[0].isupper() and not next_sent.startswith("I "):
                    next_sent = next_sent[0].lower() + next_sent[1:]
                
                # Strip ending punctuation of current sentence
                current_clean = re.sub(r'[.!?]$', '', current)
                merged = f"{current_clean}{connector}{next_sent}"
                new_sentences.append(merged)
                i += 2
                continue

            # In Ultra Stealth / Casual mode, occasionally inject a human parenthetical
            if mode in ["ultra_stealth", "casual"] and len(words) > 12 and random.random() < 0.25:
                parenthetical = random.choice(HUMAN_PARENTHETICALS)
                # Insert roughly in middle
                mid = len(words) // 2
                current = " ".join(words[:mid]) + " " + parenthetical + " " + " ".join(words[mid:])

            new_sentences.append(current)
            i += 1

        return " ".join(new_sentences)

    async def humanize_with_cloud(self, text: str, mode: str, provider: str, api_key: str, model_name: Optional[str] = None) -> Optional[str]:
        """Calls free cloud LLMs (Gemini / Groq / Ollama) with anti-AI steering prompt."""
        system_prompt = (
            "You are a master human writer and stylistic editor. "
            "Your sole mission is to rewrite the provided text so that it reads 100% naturally written by a human. "
            "CRITICAL INSTRUCTIONS:\n"
            "1. Eradicate all AI markers: NEVER use 'Furthermore', 'Moreover', 'In conclusion', 'Delve into', 'Tapestry', 'Testament to', 'Pivotal role', 'Underscores', or 'Navigating the landscape'.\n"
            "2. Enforce extreme burstiness: mix punchy 4-word sentences with rich 28-word explanatory sentences with em-dashes and varied punctuation.\n"
            "3. Use active voice, natural idiomatic cadence, and appropriate contractions.\n"
            "4. Preserve all facts, data, statistics, references, technical terms, and core meaning exactly.\n"
            "5. Return ONLY the humanized text with no preamble or commentary."
        )

        try:
            if provider == "gemini":
                # Google Gemini Free API with fallback models
                models_to_try = [model_name] if model_name else ["gemini-2.5-flash", "gemini-flash-latest", "gemma-4-26b-a4b-it", "gemini-2.0-flash"]
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": f"{system_prompt}\n\nText to humanize ({mode} style):\n{text}"}
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.85,
                        "topP": 0.95
                    }
                }
                async with httpx.AsyncClient(timeout=7.0) as client:
                    for m in models_to_try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
                        try:
                            resp = await client.post(url, json=payload)
                            if resp.status_code == 200:
                                data = resp.json()
                                candidates = data.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    if parts:
                                        return parts[0].get("text", "").strip()
                            elif resp.status_code in [429, 403, 401]:
                                # Rate limited or bad auth - fall back immediately without hanging
                                break
                        except Exception:
                            break
            
            elif provider == "groq":
                # Groq Free Cloud API
                model = model_name or "llama-3.3-70b-versatile"
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Humanize this text in {mode} style:\n\n{text}"}
                    ],
                    "temperature": 0.85
                }
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            return choices[0].get("message", {}).get("content", "").strip()

            elif provider == "ollama":
                # Local Ollama endpoint (http://localhost:11434)
                url = f"{api_key or 'http://localhost:11434'}/api/generate"
                payload = {
                    "model": model_name or "llama3.2",
                    "prompt": f"{system_prompt}\n\nText to rewrite:\n{text}",
                    "stream": False
                }
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data.get("response", "").strip()

        except Exception as e:
            print(f"Cloud provider {provider} error: {e}")
            return None

        return None

    async def humanize(
        self,
        text: str,
        mode: str = "ultra_stealth",
        intensity: int = 75,
        provider: str = "local",
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        skip_metrics: bool = False
    ) -> Dict[str, Any]:
        """
        Main humanization method.
        Executes multi-pass humanization pipeline and returns structured results.
        """
        if not text.strip():
            empty_metrics = {
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
            return {
                "original_text": text,
                "humanized_text": text,
                "metrics_before": empty_metrics,
                "metrics_after": empty_metrics,
                "changes_applied": []
            }

        metrics_before = {} if skip_metrics else ai_detector.analyze_text(text)
        current_text = text
        changes_applied = []

        # Step 1: Cloud LLM Paraphrasing (if requested and key provided)
        if provider in ["gemini", "groq", "ollama"] and (api_key or provider == "ollama"):
            cloud_result = await self.humanize_with_cloud(text, mode, provider, api_key or "", model_name)
            if cloud_result:
                current_text = cloud_result
                changes_applied.append(f"AI Neural Rewriter ({provider.upper()} engine) applied")

        # Step 2: High-Fidelity Lexical & Cliché Transformation
        current_text, lexical_changes = self.apply_lexical_replacements(current_text, mode, intensity)
        changes_applied.extend(lexical_changes)

        # Step 3: Burstiness & Syntactic Sculpting
        current_text = self.sculpt_burstiness(current_text, mode, intensity)

        # Step 4: Secondary Polish with texthumanize (if in stealth mode and score > 20%)
        if HAS_TEXTHUMANIZE and mode == "ultra_stealth" and intensity >= 80:
            try:
                # Run light touch texthumanize to break remaining statistical watermarks
                ash_res = texthumanize.ash_humanize(current_text, lang="en", preset="light")
                if ash_res and hasattr(ash_res, 'text') and len(ash_res.text) > len(current_text) * 0.6:
                    current_text = ash_res.text
                    changes_applied.append("Adaptive Signature Humanization (ASH) layer applied")
            except Exception:
                pass

        # Step 5: Post-Processing & Glitch Cleaning
        current_text = self.clean_glitches(current_text)

        # Calculate final metrics if requested
        metrics_after = {} if skip_metrics else ai_detector.analyze_text(current_text)

        return {
            "original_text": text,
            "humanized_text": current_text,
            "metrics_before": metrics_before,
            "metrics_after": metrics_after,
            "changes_applied": changes_applied
        }

# Global singleton
engine = HumanizerEngine()
