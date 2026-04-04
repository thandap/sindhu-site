import Link from "next/link";



export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
    <section className="relative h-[80vh] flex items-center justify-center text-center text-white">

  {/* Background Image */}
  <div className="absolute inset-0 bg-[url('/images/hero.jpg')] bg-cover bg-center" />

  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-black/60" />

  {/* Content */}
  <div className="relative z-10 px-6">
    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
      Authentic Indian Dining
    </p>

    <h1 className="text-5xl md:text-7xl font-bold tracking-widest">
      SINDHU
    </h1>

    <p className="mt-3 text-2xl md:text-3xl text-gray-200">
      Indian Restaurant
    </p>

    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-300">
      A warm, elevated dining experience with authentic Indian flavors,
      fresh ingredients, and dishes crafted to bring family and friends together.
    </p>

    <div className="mt-8 flex justify-center gap-4">
      <a
        href="/menu"
        className="bg-orange-600 px-6 py-3 rounded-full font-semibold hover:bg-orange-700 transition"
      >
        Explore Menu
      </a>

      <a
        href="/contact"
        className="border border-white px-6 py-3 rounded-full hover:bg-white hover:text-black"
      >
        Visit Us
      </a>
    </div>
  </div>
</section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 text-center md:grid-cols-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">Fresh Ingredients</p>
            <p className="mt-1 text-sm text-slate-600">
              Prepared with care and authentic spices.
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">Family Friendly</p>
            <p className="mt-1 text-sm text-slate-600">
              A welcoming place for everyday dining and celebrations.
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">Traditional Flavor</p>
            <p className="mt-1 text-sm text-slate-600">
              Classic dishes with richness, depth, and balance.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
  <div className="mb-10 flex items-end justify-between gap-4">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-700">
        Featured Favorites
      </p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
        Signature Dishes
      </h2>
    </div>
    <Link
      href="/menu"
      className="hidden text-sm font-semibold text-orange-700 hover:text-orange-800 md:inline"
    >
      View Full Menu
    </Link>
  </div>

  <div className="grid gap-6 md:grid-cols-3">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md transition hover:shadow-xl">
      <img
        src="/images/butter-chicken.jpg"
        alt="Butter Chicken"
        className="mb-4 h-52 w-full rounded-xl object-cover transition duration-300 hover:scale-105"
      />
      <h3 className="text-xl font-semibold text-slate-900">Butter Chicken</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Tender chicken in a rich tomato butter sauce with aromatic spices.
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <img
        src="/images/chicken-biryani.jpg"
        alt="Chicken Biryani"
        className="mb-4 h-52 w-full rounded-xl object-cover transition duration-300 hover:scale-105"
      />
      <h3 className="text-xl font-semibold text-slate-900">Chicken Biryani</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Fragrant basmati rice layered with spiced chicken and fresh herbs.
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <img
        src="/images/paneer-tikka-masala.jpg"
        alt="Paneer Tikka Masala"
        className="mb-4 h-52 w-full rounded-xl object-cover transition duration-300 hover:scale-105"
      />
      <h3 className="text-xl font-semibold text-slate-900">
        Paneer Tikka Masala
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Soft paneer cubes in a creamy, flavorful masala gravy.
      </p>
    </div>
  </div>

  <div className="mt-8 md:hidden">
    <Link
      href="/menu"
      className="text-sm font-semibold text-orange-700 hover:text-orange-800"
    >
      View Full Menu
    </Link>
  </div>
</section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-300">
              Our Story
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Hospitality, warmth, and memorable Indian cuisine
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-300">
              Sindhu Indian Restaurant is built around the joy of sharing food,
              culture, and tradition. From comforting curries to fragrant biryanis
              and freshly prepared specialties, every dish is crafted to create a
              memorable dining experience.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-8 backdrop-blur-sm">
            <p className="text-lg font-semibold">Why guests love Sindhu</p>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-200">
              <li>Authentic Indian flavors with balanced seasoning</li>
              <li>Welcoming setting for families and groups</li>
              <li>Freshly prepared dishes served with care</li>
              <li>Perfect for lunch, dinner, and celebrations</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-orange-50 px-8 py-12 md:px-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-700">
                Visit Sindhu
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                Join us for a flavorful dining experience
              </h2>
              <p className="mt-4 text-slate-600 leading-8">
                Enjoy authentic Indian cuisine in a warm and welcoming atmosphere.
                Stop by for lunch, dinner, or a relaxed meal with family and friends.
              </p>
            </div>

          <div className="space-y-4 rounded-2xl bg-white p-6 shadow-md">
  
  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">Address</p>
    <p className="font-medium text-slate-900">
      4790 Hagadorn Rd #132<br />
      East Lansing, MI 48823
    </p>
  </div>

  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
    <p className="font-medium text-slate-900">(517) 351-3080</p>
  </div>

  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">Hours</p>
    <p className="font-medium text-slate-900 text-sm leading-6">
      Mon – Fri: 11:30 AM – 2:30 PM<br />
      5:00 PM – 9:15 PM
      <br /><br />
      Sat – Sun: 12:00 PM – 3:00 PM<br />
      5:00 PM – 9:15 PM
    </p>
  </div>

  <div className="pt-4">
    <Link
      href="/contact"
      className="inline-block rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Contact & Location
    </Link>
  </div>

</div>
          </div>
        </div>
      </section>
    </main>
  );
}