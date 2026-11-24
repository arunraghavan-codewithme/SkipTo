import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import StampPop from '../timestampcomp/StampPop';
import VideoList, { saveToHistory } from '../timestampcomp/VideoList';
import './Timestamp.css';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

// Matches youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/i;

// Your Python Cloud Function. 2-minute timeout because Gemini can be slow.
const generateTimestamps = httpsCallable(functions, 'generate_timestamps', {
  timeout: 120000,
});

function Timestamp() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState(null); // { id, title, thumbnail }
  const abortRef = useRef(null);

  // Timestamps (from your generate_timestamps function)
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState('');
  const [result, setResult] = useState(null); // full record for the current video
  const [popData, setPopData] = useState(null); // what the popup is showing
  const tsRequestRef = useRef(0);

  // Cancel any in-flight request if the component unmounts
  useEffect(() => () => abortRef.current?.abort(), []);

  const closePopup = useCallback(() => setPopData(null), []);

  // Clears old timestamps (and ignores any request still running)
  const resetTimestamps = () => {
    tsRequestRef.current++;
    setTsLoading(false);
    setTsError('');
    setResult(null);
  };

  // Editing the link starts over, so the button goes back to "Load Video"
  const handleChange = (e) => {
    setUrl(e.target.value);
    if (error) setError('');
    if (video) {
      setVideo(null);
      resetTimestamps();
    }
  };

  // ---------- Step 1: load thumbnail + title ----------
  const fetchVideo = async (videoId) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    setVideo(null);

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        id: videoId,
        key: API_KEY,
      });
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${params}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        throw new Error(`YouTube API error (${res.status})`);
      }

      const data = await res.json();
      const item = data.items && data.items[0];

      if (!item) {
        setError('Video not found. It may be private or deleted.');
        return;
      }

      const { title, thumbnails } = item.snippet;
      const thumbnail =
        thumbnails.maxres?.url ||
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      setVideo({ id: videoId, title, thumbnail });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setError('Could not load the video. Please try again.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  const loadVideo = () => {
    const value = url.trim();

    if (!value) {
      setError('Please enter a YouTube video URL.');
      return;
    }

    const match = value.match(YOUTUBE_REGEX);
    if (!match) {
      setError('That does not look like a valid YouTube link.');
      return;
    }

    const videoId = match[1];
    resetTimestamps();

    if (API_KEY) {
      fetchVideo(videoId);
    } else {
      setVideo({
        id: videoId,
        title: '',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  };

  // ---------- Step 2: generate timestamps ----------
  const handleGenerateTimestamps = async () => {
    if (!video) return;
    const requestId = ++tsRequestRef.current;

    setTsLoading(true);
    setTsError('');
    setResult(null);

    const payload = {
      url: `https://www.youtube.com/watch?v=${video.id}`,
      language: 'en',
      timestamps_style: 'long',
    };
    console.log('Payload sent to generate_timestamps:', payload);

    try {
      const res = await generateTimestamps(payload);
      if (requestId !== tsRequestRef.current) return; // a newer request replaced this one
      console.log('Data received from generate_timestamps:', res.data);

      const record = {
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        timestamps_list: res.data.timestamps_list,
        timestamps_string: res.data.timestamps_string,
        video_duration: res.data.video_duration,
        savedAt: Date.now(),
      };

      setResult(record);
      setPopData(record); // open the popup
      saveToHistory(record); // add to "History"
    } catch (err) {
      if (requestId !== tsRequestRef.current) return;
      console.error('generate_timestamps failed:', err);
      setTsError(err.message || 'Could not generate timestamps. Please try again.');
    } finally {
      if (requestId === tsRequestRef.current) setTsLoading(false);
    }
  };

  // One button: loads the video first, then generates timestamps
  const handleSubmit = (e) => {
    e.preventDefault();
    if (video) {
      handleGenerateTimestamps();
    } else {
      loadVideo();
    }
  };

  // Some videos have no max-res image. Fall back to a smaller one.
  const handleImageError = (e) => {
    const fallback = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    if (e.currentTarget.src !== fallback) {
      e.currentTarget.src = fallback;
    }
  };

  let buttonContent = 'Load Video';
  if (loading) {
    buttonContent = 'Loading...';
  } else if (tsLoading) {
    buttonContent = (
      <>
        <FontAwesomeIcon icon={faWandMagicSparkles} className="wand-icon" />
        Generating...
      </>
    );
  } else if (video) {
    buttonContent = 'Generate Timestamps';
  }

  return (
    <section className="timestamp-card" id="timestamps">
      <h2 className="timestamp-title">AI YouTube Timestamps</h2>
      <p className="timestamp-text">
        Paste any YouTube link and SkipTo uses AI to generate timestamps for the
        video, so you can jump straight to the part you care about.
      </p>

      <form className="timestamp-form" onSubmit={handleSubmit} noValidate>
        <FontAwesomeIcon className="timestamp-link-icon" icon={faLink} />
        <input
          type="text"
          className="timestamp-input"
          placeholder="Enter YouTube video URL"
          value={url}
          onChange={handleChange}
          aria-label="YouTube video URL"
          aria-invalid={!!error}
          disabled={tsLoading}
        />
        <button
          type="submit"
          className="timestamp-button"
          disabled={loading || tsLoading}
        >
          {buttonContent}
        </button>
      </form>

      {error && (
        <p className="timestamp-error" role="alert">
          {error}
        </p>
      )}

      {/* Loading placeholder: shimmering thumbnail with a spinner + title bar */}
      {loading && (
        <div className="timestamp-loading" aria-hidden="true">
          <div className="timestamp-skeleton">
            <FontAwesomeIcon icon={faSpinner} spin className="timestamp-loader-icon" />
          </div>
          <div className="timestamp-skeleton-title" />
        </div>
      )}

      {video && !loading && (
        <figure className="timestamp-video">
          <img
            className="timestamp-thumbnail"
            src={video.thumbnail}
            alt={video.title ? `Thumbnail for ${video.title}` : 'Video thumbnail'}
            onError={handleImageError}
          />
          {video.title && (
            <figcaption className="timestamp-video-title">{video.title}</figcaption>
          )}

          {/* Re-open the popup after closing it */}
          {result && !tsLoading && (
            <button
              type="button"
              className="timestamp-copy"
              style={{ marginTop: '1rem' }}
              onClick={() => setPopData(result)}
            >
              View timestamps ({result.timestamps_list.length})
            </button>
          )}
        </figure>
      )}

      {tsLoading && (
        <p className="timestamp-status">
          Watching the video... this can take up to a minute.
        </p>
      )}

      {tsError && (
        <p className="timestamp-error" role="alert">
          {tsError}
        </p>
      )}

      {/* History: clicking one opens its saved timestamps (no Gemini call) */}
      <VideoList onSelect={setPopData} />

      {/* Popup */}
      {popData && <StampPop data={popData} onClose={closePopup} />}
    </section>
  );
}

export default Timestamp;