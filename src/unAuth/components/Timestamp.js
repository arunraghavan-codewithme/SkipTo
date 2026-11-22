import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import './Timestamp.css';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

// Matches youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/i;

function Timestamp() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState(null); // { id, title, thumbnail }
  const abortRef = useRef(null);

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

    if (!API_KEY) {
      setError('Missing API key. Check REACT_APP_YOUTUBE_API_KEY in your .env file.');
      return;
    }

    fetchVideo(match[1]);
  };

  // Some videos have no max-res image. Fall back to a smaller one.
  const handleImageError = (e) => {
    const fallback = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    if (e.currentTarget.src !== fallback) {
      e.currentTarget.src = fallback;
    }
  };

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
        <button type="submit" className="timestamp-button" disabled={loading}>
          {loading ? 'Loading...' : 'Generate'}
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
            alt={`Thumbnail for ${video.title}`}
            onError={handleImageError}
          />
          <figcaption className="timestamp-video-title">{video.title}</figcaption>
        </figure>
      )}
    </section>
  );
}

export default Timestamp;