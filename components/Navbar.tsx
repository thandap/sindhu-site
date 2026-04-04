import Link from "next/link";

export default function Navbar() {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-bold text-orange-700">
          SINDHU
        </Link>

        <div className="flex gap-6 text-sm md:text-base text-slate-800">
  <Link href="/" className="hover:text-orange-600 transition font-medium">
    Home
  </Link>
  <Link href="/menu" className="hover:text-orange-600 transition font-medium">
    Menu
  </Link>
  <Link href="/about" className="hover:text-orange-600 transition font-medium">
    About
  </Link>
  <Link href="/contact" className="hover:text-orange-600 transition font-medium">
    Contact
  </Link>
</div>
      </nav>
    </header>
  );
}