from __future__ import annotations


import io

import math

import re

from collections import Counter

from typing import Dict, List, Optional


class AIMLServiceCore:

    """AI/ML domain logic lives here, outside the API backend.

    This module is the extension point for transformer embeddings, ASR,
    document extraction and video analysis. Current scoring is an MVP local
    heuristic and is intentionally reported as heuristic.
    """


    STOP_WORDS = {

        "і", "й", "та", "або", "але", "що", "це", "як", "для", "до", "на", "у", "в", "з", "із",

        "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are",

    }


    @classmethod

    def tokenize(cls, text: Optional[str]) -> List[str]:

        return [

            token.lower()

            for token in re.findall(r"[a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]+", text or "")

            if token.lower() not in cls.STOP_WORDS

        ]


    @classmethod

    def answer_length_score(cls, answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        answer_count = len(cls.tokenize(answer_text))

        reference_count = len(cls.tokenize(reference_answer))

        if answer_count == 0:

            return 0.0

        if reference_count == 0:

            return round(min(100.0, answer_count / 30 * 100), 2)

        return round(min(1.0, answer_count / max(1, reference_count)) * 100, 2)


    @classmethod

    def reference_coverage_score(cls, answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        answer_tokens = set(cls.tokenize(answer_text))

        reference_tokens = set(cls.tokenize(reference_answer))

        if not answer_tokens:

            return 0.0

        if not reference_tokens:

            return 100.0

        return round((len(answer_tokens & reference_tokens) / len(reference_tokens)) * 100, 2)


    @classmethod

    def matched_concepts(cls, answer_text: Optional[str], keywords: Optional[list], reference_answer: Optional[str]) -> List[str]:

        answer_tokens = set(cls.tokenize(answer_text))

        source = keywords or cls.tokenize(reference_answer)[:12]

        matched = []

        for concept in source:

            normalized = str(concept).strip().lower()

            if not normalized:

                continue

            concept_tokens = cls.tokenize(normalized)

            if normalized in (answer_text or "").lower() or any(token in answer_tokens for token in concept_tokens):

                matched.append(str(concept))

        return matched[:12]


    @classmethod

    def cosine_token_similarity(cls, answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        answer_tokens = cls.tokenize(answer_text)

        reference_tokens = cls.tokenize(reference_answer)

        if not answer_tokens or not reference_tokens:

            return 0.0

        answer_counts = Counter(answer_tokens)

        reference_counts = Counter(reference_tokens)

        shared = set(answer_counts) | set(reference_counts)

        dot = sum(answer_counts[token] * reference_counts[token] for token in shared)

        answer_norm = math.sqrt(sum(value * value for value in answer_counts.values()))

        reference_norm = math.sqrt(sum(value * value for value in reference_counts.values()))

        if not answer_norm or not reference_norm:

            return 0.0

        return round((dot / (answer_norm * reference_norm)) * 100, 2)


    @classmethod

    def structure_score(cls, answer_text: Optional[str]) -> float:

        text = (answer_text or "").strip()

        tokens = cls.tokenize(text)

        if not tokens:

            return 0.0

        sentence_count = max(1, len(re.findall(r"[.!?。]+", text)))

        has_connectors = any(word in text.lower() for word in ["тому", "оскільки", "наприклад", "по-перше", "отже", "because", "for example"])

        return round(min(100.0, min(45.0, len(tokens) / 45 * 45) + min(35.0, sentence_count / 3 * 35) + (20.0 if has_connectors else 5.0)), 2)


    @classmethod

    def detailed_feedback(

        cls,

        answer_text: Optional[str],

        reference_answer: Optional[str],

        matched_concepts: Optional[List[str]],

        missing_concepts: Optional[List[str]],

        semantic_score: float,

        keyword_score: float,

        completeness_score: float,

        structure_score: float,

        original_feedback: Optional[str] = None,

    ) -> str:

        if not answer_text:

            return "Відповідь не зафіксована як змістовний текст, тому система не може коректно порівняти її з еталоном."

        parts = []

        if original_feedback:

            parts.append(original_feedback.strip())

        if semantic_score >= 75:

            parts.append("За змістом відповідь близька до еталону: головна ідея передана достатньо впевнено.")

        elif semantic_score >= 45:

            parts.append("Зміст частково збігається з еталоном, але частина пояснення або причинно-наслідкових звʼязків лишилась неповною.")

        else:

            parts.append("Зміст суттєво відходить від еталону: відповідь потребує точнішого визначення і прямого пояснення основної ідеї.")

        matched = [str(item) for item in (matched_concepts or []) if str(item).strip()]

        missing = [str(item) for item in (missing_concepts or []) if str(item).strip()]

        if matched:

            parts.append(f"Зараховані поняття: {', '.join(matched[:6])}.")

        if missing:

            parts.append(f"Бракує понять або акцентів: {', '.join(missing[:6])}.")

        if keyword_score < 50:

            parts.append("Ключові терміни треба називати прямо, бо без них відповідь виглядає загальною навіть якщо інтуїтивно правильна.")

        if completeness_score < 50:

            parts.append("Повнота слабка: додай визначення, навіщо це потрібно, як працює, і короткий приклад застосування.")

        if structure_score < 50:

            parts.append("Структура слабка: краще відповідати схемою 'визначення -> механізм -> приклад -> висновок'.")

        return " ".join(dict.fromkeys(parts))


    @classmethod

    def evaluate_answer(cls, answer_text: Optional[str], reference_answer: Optional[str], keywords: Optional[list] = None) -> Dict:

        semantic_score = cls.cosine_token_similarity(answer_text, reference_answer)

        keyword_score = cls.reference_coverage_score(answer_text, " ".join(keywords or []) or reference_answer)

        completeness_score = cls.answer_length_score(answer_text, reference_answer)

        structure_score = cls.structure_score(answer_text)

        matched = cls.matched_concepts(answer_text, keywords, reference_answer)

        reference_concepts = [str(item) for item in (keywords or cls.tokenize(reference_answer)[:12])]

        missing = [item for item in reference_concepts if item not in matched][:8]

        total_score = round(semantic_score * 0.35 + keyword_score * 0.25 + completeness_score * 0.2 + structure_score * 0.2, 2)

        weak_points = []

        recommendations = []

        if semantic_score < 50:

            weak_points.append("змістова відповідність")

            recommendations.append("Звірити відповідь з еталоном і додати головну ідею прямо.")

        if keyword_score < 50:

            weak_points.append("ключові поняття")

            recommendations.append("Називати ключові терміни явно, а не лише описувати їх непрямо.")

        if completeness_score < 50:

            weak_points.append("повнота")

            recommendations.append("Додати визначення, механізм роботи і короткий приклад.")

        if structure_score < 50:

            weak_points.append("структура")

            recommendations.append("Відповідати за схемою: визначення -> пояснення -> приклад -> висновок.")

        return {

            "semantic_score": semantic_score,

            "keyword_score": keyword_score,

            "structure_score": structure_score,

            "completeness_score": completeness_score,

            "speech_score": None,

            "total_score": total_score,

            "source": "ai_ml_service.local_heuristic",

            "feedback_text": cls.detailed_feedback(answer_text, reference_answer, matched, missing, semantic_score, keyword_score, completeness_score, structure_score),

            "weak_points": weak_points,

            "recommendations": recommendations,

            "missing_concepts": missing,

        }


    @staticmethod

    def transcribe_audio(audio_url: str) -> str:

        return "[Транскрипція недоступна в локальному MVP. Підключити ASR pipeline в ai_ml_service.]"


    @staticmethod

    def analyze_video(video_url: str) -> Dict:

        return {

            "status": "summary",

            "warnings": ["raw_video_analysis_not_enabled"],

            "recommendations": ["Використано live metrics summary; сире відео не аналізується і не зберігається."],

            "feedback_text": "Video transformer/OpenCV pipeline зарезервовано в ai_ml_service.",

        }


    @staticmethod

    async def generate_template(prompt: str, num_questions: int) -> Dict:

        topic = (prompt or "загальна тема").strip()

        keywords = AIMLServiceCore.tokenize(topic)[:8]

        questions = []

        for index in range(max(1, min(50, int(num_questions or 1)))):

            questions.append({

                "question_text": f"Питання {index + 1}: поясни ключову ідею теми '{topic}'.",

                "question_type": "text_question",

                "reference_answer": f"Еталонна відповідь має розкрити тему '{topic}', ключові поняття, приклад застосування і короткий висновок.",

                "keywords": keywords,

                "evaluation_criteria": {"key_points": ["визначення", "пояснення", "приклад", "висновок"]},

            })

        return {

            "source": "ai_ml_service.local_generator",

            "warning": "Використано локальний MVP-генератор без зовнішньої LLM.",

            "recommended_duration": max(10, min(60, len(questions) * 4)),

            "questions": questions,

        }


    @staticmethod

    def extract_text_from_txt(content: bytes) -> str:

        for encoding in ("utf-8-sig", "utf-8", "cp1251"):

            try:

                return content.decode(encoding)

            except UnicodeDecodeError:

                continue

        return content.decode("utf-8", errors="ignore")


    @staticmethod

    def extract_text_from_pdf(content: bytes) -> str:

        from pypdf import PdfReader


        reader = PdfReader(io.BytesIO(content))

        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()


    @staticmethod

    def parse_qa_text(content: str) -> Dict:

        marker_pattern = re.compile(r"^([QA])(\d+)\.\s*(.*)$", re.IGNORECASE)

        errors = []

        parsed = []

        current = None

        active = None


        def push_current() -> None:

            nonlocal current

            if not current:

                return

            question = "\n".join(current["question_parts"]).strip()

            answer = "\n".join(current["answer_parts"]).strip()

            if len(question) < 5:

                errors.append(f"Питання Q{current['number']} має містити щонайменше 5 символів.")

            if len(answer) < 10:

                errors.append(f"Відповідь A{current['number']} має містити щонайменше 10 символів.")

            if question and answer and len(question) >= 5 and len(answer) >= 10:

                parsed.append({"question": question, "answer": answer})


        for raw_line in (content or "").replace("\r\n", "\n").replace("\r", "\n").split("\n"):

            line = raw_line.strip()

            if not line:

                continue

            match = marker_pattern.match(line)

            if match:

                marker, number_text, text = match.groups()

                number = int(number_text)

                if marker.upper() == "Q":

                    push_current()

                    current = {"number": number, "question_parts": [text.strip()], "answer_parts": []}

                    active = "question_parts"

                else:

                    if not current:

                        current = {"number": number, "question_parts": [], "answer_parts": []}

                    if current["number"] != number:

                        errors.append(f"Номери питання та відповіді не збігаються: Q{current['number']} має A{number}.")

                    current["answer_parts"].append(text.strip())

                    active = "answer_parts"

                continue

            if not current or not active:

                errors.append("Кожен блок має починатися з Q<number>. або A<number>.")

                continue

            current[active].append(line)

        push_current()

        if not parsed and not errors:

            errors.append("Не знайдено жодної пари Q/A.")

        return {"questions": [] if errors else parsed, "errors": errors}

