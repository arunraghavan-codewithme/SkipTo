import os
import time

from firebase_functions import https_fn, logger, options
from firebase_admin import initialize_app
from google import genai
from google.genai import errors, types
from pydantic import BaseModel

initialize_app()

# Tried in order: best quality first, then the model with the bigger free limit
#   gemini-4-hydrogen:      20 requests/day (free)
#   gemini-3.5-flash-lite: 500 requests/day (free)
MODELS = ["gemini-4-hydrogen", "gemini-3.5-flash-lite"]

# Temporary server problems worth retrying on the same model
RETRY_CODES = {500, 503, 504}
RETRY_DELAYS = [2, 5]  # seconds to wait before each retry

# Model is over its limit (429) or not available (404): move on to the next model
SWITCH_CODES = {429, 404}
SKIP_SECONDS = 600  # after a 429, skip that model for 10 minutes

# Watch videos at low resolution: uses fewer tokens, timestamps stay about the same
LOW_RES = types.MediaResolution.MEDIA_RESOLUTION_LOW

_skip_until = {}  # model name -> time when we can try it again


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


def generate_with_fallback(contents, config=None):
    """Try each model in MODELS. Returns (response, model_used)."""
    client = get_client()
    last_code = None

    for model in MODELS:
        if time.time() < _skip_until.get(model, 0):
            logger.info("Skipping model (recently over limit)", model=model)
            last_code = 429
            continue

        for attempt in range(len(RETRY_DELAYS) + 1):
            try:
                logger.info("Calling Gemini", model=model, attempt=attempt + 1)
                response = client.models.generate_content(
                    model=model, contents=contents, config=config
                )
                logger.info("Gemini responded", model=model, attempt=attempt + 1)
                return response, model

            except errors.APIError as e:
                last_code = e.code

                # Temporary problem: wait and retry the same model
                if e.code in RETRY_CODES and attempt < len(RETRY_DELAYS):
                    logger.warn(
                        "Gemini busy, retrying",
                        model=model,
                        code=e.code,
                        wait_seconds=RETRY_DELAYS[attempt],
                    )
                    time.sleep(RETRY_DELAYS[attempt])
                    continue

                # Over limit, unavailable, or still busy: try the next model
                if e.code in SWITCH_CODES or e.code in RETRY_CODES:
                    if e.code == 429:
                        _skip_until[model] = time.time() + SKIP_SECONDS
                    logger.warn("Switching to next model", model=model, code=e.code)
                    break

                # Anything else (bad link, private video, etc.): stop
                logger.error("Gemini API error", model=model, code=e.code, message=str(e))
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.INTERNAL, f"Gemini error: {e}"
                )

            except Exception as e:
                logger.error("Unexpected error calling Gemini", model=model, message=str(e))
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.INTERNAL, f"Gemini error: {e}"
                )

    # Every model failed
    logger.error("All models failed", last_code=last_code)
    if last_code == 429:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            "Daily free AI limit reached. Please try again later.",
        )
    raise https_fn.HttpsError(
        https_fn.FunctionsErrorCode.UNAVAILABLE,
        "The AI is busy right now. Please try again in a few minutes.",
    )


# ---------- 1. Ask anything about a video ----------

@https_fn.on_call(timeout_sec=300, memory=options.MemoryOption.GB_1)
def ask_about_video(req: https_fn.CallableRequest):
    data = req.data or {}
    url = require_url(data)
    prompt = data.get("prompt") or "Summarize this video in 5 bullet points."
    logger.info("ask_about_video called", url=url, prompt=prompt)

    response, model_used = generate_with_fallback(
        contents=types.Content(parts=[video_part(url), types.Part(text=prompt)]),
        config=types.GenerateContentConfig(media_resolution=LOW_RES),
    )
    logger.info("ask_about_video done", model=model_used, answer_length=len(response.text or ""))
    return {"text": response.text, "model": model_used}


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

    response, model_used = generate_with_fallback(
        contents=types.Content(parts=[video_part(url), types.Part(text=prompt)]),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TimestampsResult,
            media_resolution=LOW_RES,
        ),
    )

    result: TimestampsResult = response.parsed
    if result is None:
        logger.error("Gemini returned no parsable timestamps", model=model_used, raw=response.text)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            "The AI did not return valid timestamps. Try again.",
        )

    timestamps_list = [f"{t.time} - {t.title}" for t in result.timestamps]
    logger.info(
        "generate_timestamps done",
        model=model_used,
        count=len(timestamps_list),
        video_duration=result.video_duration_minutes,
    )

    return {
        "url": url,
        "model": model_used,
        "language": language,
        "timestamps_style": style,
        "timestamps_list": timestamps_list,
        "timestamps_string": "\n".join(timestamps_list),
        "video_duration": result.video_duration_minutes,
    }