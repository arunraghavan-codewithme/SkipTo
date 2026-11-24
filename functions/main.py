import os

from firebase_functions import https_fn, options
from firebase_admin import initialize_app
from google import genai
from google.genai import types

initialize_app()


@https_fn.on_call(timeout_sec=300, memory=options.MemoryOption.GB_1)
def ask_about_video(req: https_fn.CallableRequest):
    """Send a YouTube link + a question to Gemini and return its answer."""
    data = req.data or {}
    url = data.get("url")
    prompt = data.get("prompt") or "Summarize this video in 5 bullet points."

    if not url:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT, "Missing 'url'."
        )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            "GEMINI_API_KEY is not set in functions/.env",
        )

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-4-hydrogen",
            contents=types.Content(
                parts=[
                    types.Part(file_data=types.FileData(file_uri=url)),
                    types.Part(text=prompt),
                ]
            ),
        )
    except Exception as e:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL, f"Gemini error: {e}"
        )

    return {"text": response.text}