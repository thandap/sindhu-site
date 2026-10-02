export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-10 text-center text-4xl font-bold">
          Visit Sindhu
        </h1>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <h2 className="text-2xl font-bold">
              East — East Lansing
            </h2>

            <p className="mt-5 font-semibold">
              We are moving from Hannah Plaza to Hannah Lofts,
              just a couple of blocks from Hannah Plaza!
            </p>

            <address className="mt-4 not-italic text-lg leading-8">
              2929 Hannah Blvd.<br />
              East Lansing, MI 48823
            </address>

            <a
              href="https://sindhu-indian-west.cloveronline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block font-semibold text-orange-700 hover:underline"
            >
              Until we open, please visit our West Side location →
            </a>
          </section>

          <section className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold">
              West — Lansing
            </h2>
            <p className="mt-2 font-semibold text-green-700">
              Now Open
            </p>

            <address className="mt-4 not-italic text-lg leading-8">
              2010 W Saginaw Street<br />
              Lansing, MI 48915
            </address>

            <a
              href="tel:+15179008469"
              className="mt-4 inline-block font-semibold text-orange-700 hover:underline"
            >
              (517) 900-8469
            </a>

            <div className="mt-6">
              <a
                href="https://sindhu-indian-west.cloveronline.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
              >
                Order Online — West
              </a>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-2xl font-bold text-orange-700">
          East or West — Sindhu is the Best!
        </p>

        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold">
            Find Our West Side Location
          </h2>

          <div className="overflow-hidden rounded-2xl shadow-md">
            <iframe
              title="Sindhu West Side location map"
              src="https://www.google.com/maps?q=2010+W+Saginaw+Street+Lansing+MI+48915&output=embed"
              className="h-[350px] w-full border-0"
              loading="lazy"
            />
          </div>
        </section>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">Email</p>
          <a
            href="mailto:SindhuIndianCuisine@gmail.com"
            className="mt-2 inline-block break-all font-medium text-orange-700 hover:underline"
          >
            SindhuIndianCuisine@gmail.com
          </a>
        </div>
      </div>
    </main>
  );
}