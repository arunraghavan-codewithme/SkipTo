import './NavBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

function NavBar() {
  return (
    <header className="navbar">
      <a className="navbar-brand" href="#top" aria-label="SkipTo home">
        <svg
          className="navbar-logo"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M5 5.5 L21 16 L5 26.5 Z" fill="currentColor" />
          <rect x="23.5" y="5.5" width="4" height="21" rx="1.5" fill="currentColor" />
        </svg>
        <span className="navbar-brand-text">
          Skip<span className="navbar-brand-accent">To</span>
        </span>
      </a>

      <nav className="navbar-links" aria-label="Primary">
        <a href="#pricing">Pricing</a>
        <a href="#blog">Blog</a>
        <a className="navbar-cta" href="#chatbot">
          AI Video Chatbot <FontAwesomeIcon icon={faArrowRight} />
        </a>
      </nav>
    </header>
  );
}

export default NavBar;