import './Bumpups.css';

const items = [
  {
    title: 'Get started',
    text: 'A simple place to land before you sign in.',
  },
  {
    title: 'Stay current',
    text: 'See the time and what is new on this page.',
  },
  {
    title: 'Explore',
    text: 'Browse the basics, then come back for more.',
  },
];

function Bumpups() {
  return (
    <section className="bumpups" id="features" aria-label="Highlights">
      {items.map((item) => (
        <article className="bumpup" key={item.title}>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
  );
}

export default Bumpups;
