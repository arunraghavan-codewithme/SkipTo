// src/unAuth/timestampcomp/VideoList.js
import { useEffect, useState } from 'react';
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
        <h3 className="videolist-title">Your recent videos</h3>
        <button type="button" className="videolist-clear" onClick={clearHistory}>
          Clear history
        </button>
      </div>

      <ul className="videolist-grid">
        {history.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="videolist-item"
              onClick={() => onSelect(item)}
            >
              <img
                className="videolist-thumb"
                src={item.thumbnail}
                alt={item.title ? `Thumbnail for ${item.title}` : 'Video thumbnail'}
                onError={(e) => {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
                }}
              />
              <span className="videolist-name">{item.title || 'Untitled video'}</span>
              <span className="videolist-meta">
                {item.timestamps_list.length} timestamps
                {item.video_duration ? ` · ~${item.video_duration} min` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}