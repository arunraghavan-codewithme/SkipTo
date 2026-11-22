import './Bumpups.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faClock,
  faListUl,
  faFileLines,
  faLaptopCode,
} from '@fortawesome/free-solid-svg-icons';

const cards = [
  { label: 'Timestamps', icon: faClock, href: '#timestamps' },
  { label: 'Chapters', icon: faListUl, href: '#chapters' },
  { label: 'Summaries', icon: faFileLines, href: '#summaries' },
  { label: 'API', icon: faLaptopCode, href: '#api' },
];

function Bumpups() {
  return (
    <section className="bumpups" id="features">
      <hr className="bumpups-divider" />

      <h2 className="bumpups-title">
        Do more with Skip<span className="bumpups-accent">To</span>
      </h2>
      <p className="bumpups-text">
        Turn long videos into something you can scan in seconds. Get
        timestamps, chapters and summaries, so you can skip straight to what
        matters.
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