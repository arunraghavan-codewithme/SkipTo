import os
import time

from firebase_functions import https_fn, logger, options
from firebase_admin import initialize_app
from google import genai
from google.genai import errors, types
from pydantic import BaseModel

initialize_app()

MODEL = "gemini-4-hydrogen"

# Error codes worth retrying: rate limit (429) and temporary server problems (5xx)
RETRY_CODES = {429, 500, 503, 504}
RETRY_DELAYS = [2, 5, 10]  # seconds to wait before each retry


# ---------- shared helpers ----------

_client = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY is missing")
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                "GEMINI_API_KEY is not set in functions/.env",
            )
        _client = genai.Client(api_key=api_key)
        logger.info("Gemini client created")
    return _client


def require_url(data: dict) -> str:
    url = data.get("url")
    if not url:
        logger.warn("Request is missing 'url'", data=data)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT, "Missing 'url'."
        )
    return url


def video_part(url: str) -> types.Part:
    return types.Part(file_data=types.FileData(file_uri=url))


def generate_with_retry(contents, config=None):
    """Call Gemini, retrying automatically if it's busy or rate-limited."""
    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            logger.info("Calling Gemini", model=MODEL, attempt=attempt + 1)
            response = get_client().models.generate_content(
                model=MODEL, contents=contents, config=config
            )
            logger.info("Gemini responded", attempt=attempt + 1)
            return response
        except errors.APIError as e:
            can_retry = e.code in RETRY_CODES and attempt < len(RETRY_DELAYS)
            if can_retry:
                logger.warn(
                    "Gemini busy, retrying",
                    code=e.code,
                    wait_seconds=RETRY_DELAYS[attempt],
                )
                time.sleep(RETRY_DELAYS[attempt])
                continue

            logger.error("Gemini API error", code=e.code, message=str(e))
            if e.code == 429:
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
                    "Gemini free limit reached. Please wait a minute and try again.",
                )
            if e.code in RETRY_CODES:
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.UNAVAILABLE,
                    "Gemini is busy right now. Please try again in a few minutes.",
                )
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INTERNAL, f"Gemini error: {e}"
            )
        except Exception as e:
            logger.error("Unexpected error calling Gemini", message=str(e))
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INTERNAL, f"Gemini error: {e}"
            )


# ---------- 1. Ask anything about a video ----------

@https_fn.on_call(timeout_sec=300, memory=options.MemoryOption.GB_1)
def ask_about_video(req: https_fn.CallableRequest):
    data = req.data or {}
    url = require_url(data)
    prompt = data.get("prompt") or "Summarize this video in 5 bullet points."
    logger.info("ask_about_video called", url=url, prompt=prompt)

    response = generate_with_retry(
        contents=types.Content(parts=[video_part(url), types.Part(text=prompt)])
    )
    logger.info("ask_about_video done", answer_length=len(response.text or ""))
    return {"text": response.text}


# ---------- 2. Generate timestamps (Bumpups-style) ----------

class Timestamp(BaseModel):
    time: str
    title: str


class TimestampsResult(BaseModel):
    timestamps: list[Timestamp]
    video_duration_minutes: int


@https_fn.on_call(timeout_sec=300, memory=options.MemoryOption.GB_1)
def generate_timestamps(req: https_fn.CallableRequest):
    data = req.data or {}
    url = require_url(data)
    language = data.get("language", "en")
    style = data.get("timestamps_style", "long")
    logger.info("generate_timestamps called", url=url, language=language, style=style)

    if style not in ("long", "short"):
        logger.warn("Invalid timestamps_style", style=style)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "'timestamps_style' must be 'long' or 'short'.",
        )

    style_rule = (
        "Each title is a descriptive phrase of 6-12 words."
        if style == "long"
        else "Each title is short: 2-5 words."
    )

    prompt = f"""Create YouTube chapter timestamps for this video.
Rules:
- The first timestamp must be 0:00.
- Use M:SS format, or H:MM:SS if the video is over an hour.
- Cover the whole video in order, one timestamp per main topic change.
- {style_rule}
- Write the titles in the language with this code: {language}.
Also give the video's total length in whole minutes."""

    response = generate_with_retry(
        contents=types.Content(parts=[video_part(url), types.Part(text=prompt)]),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TimestampsResult,
        ),
    )

    result: TimestampsResult = response.parsed
    if result is None:
        logger.error("Gemini returned no parsable timestamps", raw=response.text)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            "Gemini did not return valid timestamps. Try again.",
        )

    timestamps_list = [f"{t.time} - {t.title}" for t in result.timestamps]
    logger.info(
        "generate_timestamps done",
        count=len(timestamps_list),
        video_duration=result.video_duration_minutes,
    )

    return {
        "url": url,
        "model": MODEL,
        "language": language,
        "timestamps_style": style,
        "timestamps_list": timestamps_list,
        "timestamps_string": "\n".join(timestamps_list),
        "video_duration": result.video_duration_minutes,
    }