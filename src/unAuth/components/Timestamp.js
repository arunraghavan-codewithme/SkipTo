import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import './Timestamp.css';

// Matches youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/i;

function Timestamp() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setUrl(e.target.value);
    if (error) setError('');
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
    setError('');
    // TODO: call your API here
    console.log('Generate timestamps for video ID:', videoId);
  };

  return (
    <section className="timestamp-card" id="timestamps">
      <h2 className="timestamp-title">AI YouTube Timestamps</h2>
      <p className="timestamp-text">
        Generates timestamps for a given YouTube video using the bump-1.0 model.
        This software was built using the AI, watch tutorials how to{' '}
        <a href="#about">here</a>.
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
        <button type="submit" className="timestamp-button">
          Generate
        </button>
      </form>

      {error && (
        <p className="timestamp-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default Timestamp;