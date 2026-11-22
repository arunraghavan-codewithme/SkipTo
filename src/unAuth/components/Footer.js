import './Footer.css';

const columns = [
  { title: 'Product', links: ['News', 'Pricing'] },
  { title: 'Features', links: ['Workspaces', 'Creator Studio'] },
  { title: 'API', links: ['Startups', 'Zapier'] },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" id="contact">
      <div className="footer-top">
        <div className="footer-brand">
          <h3 className="footer-tagline">SKIP TO WHAT MATTERS</h3>
          <p>
            Bump AI will watch any video and deliver insights across all
            industries.
          </p>
        </div>

        {columns.map((col) => (
          <nav className="footer-col" key={col.title} aria-label={col.title}>
            <h4>{col.title}</h4>
            {col.links.map((link) => (
              <a href={`#${link.toLowerCase().replace(/\s+/g, '-')}`} key={link}>
                {link}
              </a>
            ))}
          </nav>
        ))}
      </div>

      <p className="footer-copy">© {year} SkipTo</p>
    </footer>
  );
}

export default Footer;