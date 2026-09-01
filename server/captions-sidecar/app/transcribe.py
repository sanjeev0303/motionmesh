import os
import json
import logging
from typing import List
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from faster_whisper import WhisperModel
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace

logger = logging.getLogger(__name__)

class SegmentInfo(BaseModel):
    start: float
    end: float
    text: str

class ChapterInfo(BaseModel):
    start_time_seconds: int
    title: str
    position: int

class TranscribeResponse(BaseModel):
    transcript_text: str
    vtt: str
    segments: List[SegmentInfo]
    chapters: List[ChapterInfo]

def format_timestamp(seconds: float) -> str:
    hours = int(seconds / 3600)
    minutes = int((seconds % 3600) / 60)
    secs = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"

def generate_chapters(text: str) -> List[ChapterInfo]:
    hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

    if not hf_api_key:
        logger.warning("No valid HUGGINGFACE_API_KEY provided, skipping chapters")
        return []

    try:
        llm = HuggingFaceEndpoint(
            repo_id="mistralai/Mistral-7B-Instruct-v0.3",
            max_new_tokens=2048,
            temperature=0.1,
            huggingfacehub_api_token=hf_api_key,
        )
        chat_model = ChatHuggingFace(llm=llm)

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at analyzing video transcripts.
Your task is to break the transcript down into logical chapters.
For each chapter, provide a concise, descriptive title and the estimated start time in seconds (assuming the transcript flows chronologically).
Keep the number of chapters between 3 and 10 depending on the length.

Return ONLY a valid JSON array of objects with the keys 'start_time_seconds' (integer) and 'title' (string). No markdown formatting, backticks, or other text."""),
            ("human", "Transcript:\n{transcript}")
        ])

        chain = prompt | chat_model

        response_message = chain.invoke({"transcript": text[:20000]})
        content = response_message.content
        if isinstance(content, list):
            # handle cases where content is a list of parts
            text_parts = []
            for part in content:
                if isinstance(part, str):
                    text_parts.append(part)
                elif isinstance(part, dict) and "text" in part:
                    text_parts.append(part["text"])
            content = "".join(text_parts)

        content = str(content).strip()

        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        chapters_data = json.loads(content.strip())

        result = []
        for i, c in enumerate(chapters_data):
            result.append(ChapterInfo(
                start_time_seconds=int(c.get("start_time_seconds", 0)),
                title=c.get("title", "Chapter"),
                position=i
            ))

        return result

    except Exception as e:
        logger.error(f"Failed to generate chapters: {e}")
        return []

def process_audio(model: WhisperModel, temp_path: str, wants_chapters: bool) -> TranscribeResponse:
    logger.info(f"Transcribing {temp_path}")
    segments_gen, info = model.transcribe(temp_path, beam_size=5, vad_filter=True)

    segments = []
    transcript_text = ""
    vtt_lines = ["WEBVTT", ""]

    for segment in segments_gen:
        segments.append(SegmentInfo(
            start=segment.start,
            end=segment.end,
            text=segment.text.strip()
        ))
        transcript_text += segment.text + " "

        start_fmt = format_timestamp(segment.start)
        end_fmt = format_timestamp(segment.end)
        vtt_lines.append(f"{start_fmt} --> {end_fmt}")
        vtt_lines.append(segment.text.strip())
        vtt_lines.append("")

    vtt = "\n".join(vtt_lines)
    transcript_text = transcript_text.strip()

    chapters = []
    if wants_chapters and len(transcript_text) > 0:
        chapters = generate_chapters(transcript_text)

    return TranscribeResponse(
        transcript_text=transcript_text,
        vtt=vtt,
        segments=segments,
        chapters=chapters
    )
