// src/unAuth/timestampcomp/VideoList.js
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import './VideoList.css';

const HISTORY_KEY = 'timestampHistory';
const HISTORY_EVENT = 'timestampHistoryUpdated';
const MAX_ITEMS = 20;

// Read saved videos from the browser
export function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

// Save a video (newest first, no duplicates, max 20)
export function saveToHistory(record) {
  const rest = readHistory().filter((item) => item.id !== record.id);
  const next = [record, ...rest].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked - skip saving
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export default function VideoList({ onSelect }) {
  const [history, setHistory] = useState(readHistory);

  // Refresh the list whenever a new video is saved
  useEffect(() => {
    const refresh = () => setHistory(readHistory());
    window.addEventListener(HISTORY_EVENT, refresh);
    window.addEventListener('storage', refresh); // other tabs
    return () => {
      window.removeEventListener(HISTORY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="videolist">
      <div className="videolist-header">
        <h3 className="videolist-title">
          <FontAwesomeIcon icon={faArrowsRotate} className="videolist-icon" />
          History
        </h3>
        <button type="button" className="videolist-clear" onClick={clearHistory}>
          Clear
        </button>
      </div>

      <ul className="videolist-rows">
        {history.map((item) => (
          <li key={item.id} className="videolist-row" onClick={() => onSelect(item)}>
            <img
              className="videolist-thumb"
              src={item.thumbnail}
              alt=""
              onError={(e) => {
                e.currentTarget.src = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
              }}
            />
            <div className="videolist-info">
              <span className="videolist-name">{item.title || 'Untitled video'}</span>
              <span className="videolist-meta">
                {item.timestamps_list.length} timestamps
                {item.video_duration ? ` · ~${item.video_duration} min` : ''}
              </span>
            </div>
            <button
              type="button"
              className="videolist-view"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
            >
              View Timestamps
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}