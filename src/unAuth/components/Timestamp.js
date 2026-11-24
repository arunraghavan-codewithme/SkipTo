import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import './Timestamp.css';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

// Matches youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/i;

// Your Python Cloud Function. 2-minute timeout because Gemini can be slow.
const generateTimestamps = httpsCallable(functions, 'generate_timestamps', {
  timeout: 120000,
});

// "1:42" -> 102, "1:02:05" -> 3725
const toSeconds = (time) =>
  time.split(':').reduce((total, part) => total * 60 + Number(part), 0);

function Timestamp() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState(null); // { id, title, thumbnail }
  const abortRef = useRef(null);

  // Timestamps (from your generate_timestamps function)
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState('');
  const [timestamps, setTimestamps] = useState(null);
  const [copied, setCopied] = useState(false);
  const tsRequestRef = useRef(0);

  // Cancel any in-flight request if the component unmounts
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleChange = (e) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

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

  const fetchTimestamps = async (videoId) => {
    const requestId = ++tsRequestRef.current;

    setTsLoading(true);
    setTsError('');
    setTimestamps(null);
    setCopied(false);

    try {
      const res = await generateTimestamps({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        language: 'en',
        timestamps_style: 'long',
      });
      if (requestId !== tsRequestRef.current) return; // a newer request replaced this one
      console.log('generate_timestamps result:', res.data);
      setTimestamps(res.data);
    } catch (err) {
      if (requestId !== tsRequestRef.current) return;
      console.error('generate_timestamps failed:', err);
      setTsError(err.message || 'Could not generate timestamps. Please try again.');
    } finally {
      if (requestId === tsRequestRef.current) setTsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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

    // Title + thumbnail (needs the YouTube API key)
    if (API_KEY) {
      fetchVideo(videoId);
    } else {
      setVideo({
        id: videoId,
        title: '',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }

    // Timestamps (your Gemini Cloud Function)
    fetchTimestamps(videoId);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(timestamps.timestamps_string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Some videos have no max-res image. Fall back to a smaller one.
  const handleImageError = (e) => {
    const fallback = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    if (e.currentTarget.src !== fallback) {
      e.currentTarget.src = fallback;
    }
  };

  const busy = loading || tsLoading;

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
        />
        <button type="submit" className="timestamp-button" disabled={busy}>
          {busy ? 'Loading...' : 'Generate'}
        </button>
      </form>

      {error && (
        <p className="timestamp-error" role="alert">
          {error}
        </p>
      )}

      {loading && <div className="timestamp-skeleton" aria-hidden="true" />}

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
        </figure>
      )}

      {tsLoading && (
        <p className="timestamp-status">
          Generating timestamps... this can take up to a minute.
        </p>
      )}

      {tsError && (
        <p className="timestamp-error" role="alert">
          {tsError}
        </p>
      )}

      {timestamps && video && (
        <div className="timestamp-results">
          <div className="timestamp-results-header">
            <span>
              {timestamps.timestamps_list.length} timestamps · ~
              {timestamps.video_duration} min
            </span>
            <button type="button" className="timestamp-copy" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy all'}
            </button>
          </div>

          <ul className="timestamp-list">
            {timestamps.timestamps_list.map((line) => {
              const [time, ...rest] = line.split(' - ');
              return (
                <li key={line}>
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}&t=${toSeconds(time)}s`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {time}
                  </a>{' '}
                  {rest.join(' - ')}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default Timestamp;