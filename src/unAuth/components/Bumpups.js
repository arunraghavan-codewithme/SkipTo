import './Bumpups.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faArrowUpFromBracket,
  faComments,
  faVideo,
  faLaptopCode,
} from '@fortawesome/free-solid-svg-icons';

const cards = [
  { label: 'Local Videos', icon: faArrowUpFromBracket, href: '#local-videos' },
  { label: 'Video Chat', icon: faComments, href: '#video-chat' },
  { label: 'AI YouTube', icon: faVideo, href: '#ai-youtube' },
  { label: 'API', icon: faLaptopCode, href: '#api' },
];

function Bumpups() {
  return (
    <section className="bumpups" id="features">
      <hr className="bumpups-divider" />

      <h2 className="bumpups-title">
        Do more with bump<span className="bumpups-accent">ups</span>.com
      </h2>
      <p className="bumpups-text">
        Process your videos to deliver insights across all industries. Ask
        questions, request summaries, analyses, and more with Bump-1.0.
      </p>

      <div className="bumpups-grid">
        {cards.map((card) => (
          <a className="bumpups-card" href={card.href} key={card.label}>
            <div className="bumpups-card-left">
              <span className="bumpups-label">{card.label}</span>
              <span className="bumpups-more">
                <span className="bumpups-arrow">
                  <FontAwesomeIcon icon={faArrowRight} />
                </span>
                Learn more
              </span>
            </div>
            <FontAwesomeIcon className="bumpups-icon" icon={card.icon} />
          </a>
        ))}
      </div>
    </section>
  );
}

export default Bumpups;