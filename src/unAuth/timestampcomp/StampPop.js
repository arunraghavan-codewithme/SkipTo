// src/unAuth/timestampcomp/StampPop.js
import { useEffect, useState } from 'react';
import './StampPop.css';

// "1:42" -> 102, "1:02:05" -> 3725
const toSeconds = (time) =>
  time.split(':').reduce((total, part) => total * 60 + Number(part), 0);

export default function StampPop({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  // Close with Esc, and stop the page behind from scrolling
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.timestamps_string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="stamppop-backdrop" onClick={onClose}>
      <div
        className="stamppop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stamppop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="stamppop-close"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="stamppop-head">
          <img
            className="stamppop-thumb"
            src={data.thumbnail}
            alt=""
            onError={(e) => {
              e.currentTarget.src = `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`;
            }}
          />
          <div>
            <h3 id="stamppop-title" className="stamppop-title">
              {data.title || 'Your timestamps'}
            </h3>
            <p className="stamppop-meta">
              {data.timestamps_list.length} timestamps
              {data.video_duration ? ` · ~${data.video_duration} min` : ''}
            </p>
          </div>
        </div>

        <ul className="stamppop-list">
          {data.timestamps_list.map((line) => {
            const [time, ...rest] = line.split(' - ');
            return (
              <li key={line}>
                <a
                  href={`https://www.youtube.com/watch?v=${data.id}&t=${toSeconds(time)}s`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {time}
                </a>
                <span>{rest.join(' - ')}</span>
              </li>
            );
          })}
        </ul>

        <div className="stamppop-footer">
          <button type="button" className="stamppop-copy" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy all'}
          </button>
          <a
            className="stamppop-open"
            href={`https://www.youtube.com/watch?v=${data.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Open on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}