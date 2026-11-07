import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="wrap">
      <h1>That page is not here</h1>
      <p><Link href="/catalogue">Back to the catalogue</Link></p>
    </main>
  );
}
