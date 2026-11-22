import './LandingPage.css';
import NavBar from './components/NavBar';
import Timestamp from './components/Timestamp';
import Bumpups from './components/Bumpups';
import Footer from './components/Footer';

function LandingPage() {
  return (
    <div className="landing" id="top">
      <NavBar />
      <main className="landing-main">
        <h1 className="landing-title">Hello landing page</h1>
        <p className="landing-subtitle">Welcome. This is the public landing page.</p>
        <Timestamp />
      </main>
      <Bumpups />
      <Footer />
    </div>
  );
}

export default LandingPage;
