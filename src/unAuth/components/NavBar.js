import './NavBar.css';

function NavBar() {
  return (
    <header className="navbar">
      <a className="navbar-brand" href="#top">
        My App
      </a>
      <nav className="navbar-links" aria-label="Primary">
        <a href="#features">Features</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}

export default NavBar;
