import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty-state">
      <h1>Off the trail.</h1>
      <p>This page could not be found.</p>
      <Link className="primary-button" href="/">
        Return to overview
      </Link>
    </section>
  );
}
