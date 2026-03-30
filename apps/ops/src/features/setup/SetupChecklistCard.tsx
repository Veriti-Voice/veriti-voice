const steps = [
  'Business details',
  'Cliniko or demo mode',
  'Practitioners and booking rules',
  'Fallback and FAQs',
  'Test call',
];

export function SetupChecklistCard() {
  return (
    <article className="card">
      <p className="card-kicker">Happy-path setup</p>
      <h2>Get a clinic to test call fast</h2>
      <ul className="checklist">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <button className="primary-button" type="button">
        Start setup flow
      </button>
    </article>
  );
}
