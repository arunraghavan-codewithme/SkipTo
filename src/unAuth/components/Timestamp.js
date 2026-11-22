import { useEffect, useState } from 'react';
import './Timestamp.css';

function Timestamp() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <p className="timestamp">
      <time dateTime={now.toISOString()}>{formatted}</time>
    </p>
  );
}

export default Timestamp;
