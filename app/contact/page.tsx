export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 py-16">
      <div className="max-w-5xl mx-auto">

        {/* Heading */}
        <h1 className="text-4xl font-bold mb-10 text-center">
          Visit Sindhu
        </h1>

        {/* Grid Layout */}
        <div className="grid md:grid-cols-2 gap-10">

          {/* Left: Info */}
          <div className="space-y-6 text-lg text-gray-700">

            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">
                4790 Hagadorn Rd #132<br />
                East Lansing, MI 48823
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">(517) 351-3080</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Hours</p>
              <p className="font-medium">
                Mon – Fri: 11:30 AM – 2:30 PM<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;5:00 PM – 9:15 PM
                <br /><br />
                Sat – Sun: 12:00 PM – 3:00 PM<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;5:00 PM – 9:15 PM
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">
                SindhuIndianCuisine@gmail.com
              </p>
            </div>

          </div>

          {/* Right: Map Placeholder */}
          <div className="rounded-2xl overflow-hidden shadow-md">
            <iframe
              src="https://www.google.com/maps?q=4790+Hagadorn+Rd+East+Lansing+MI&output=embed"
              className="w-full h-[350px] border-0"
              loading="lazy"
            ></iframe>
          </div>

        </div>
      </div>
    </main>
  );
}