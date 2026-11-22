import './Footer.css';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" id="contact">
      <p>© {year} My App</p>
      <nav className="footer-links" aria-label="Footer">
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </footer>
  );
}

export default Footer;
