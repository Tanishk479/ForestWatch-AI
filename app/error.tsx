"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="panel empty-state">
      <h2>Something interrupted this view.</h2>
      <p>Please retry. Your sample data is safe.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
