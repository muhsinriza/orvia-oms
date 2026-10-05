import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow shrink-0">
              <img src="/logo.svg" alt="ORVIA" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-none">ORVIA OMS</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Order Management System</div>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold text-white bg-[#0a5c3a] hover:bg-[#064e32] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Login for Company Members
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-[#0a5c3a] text-white py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-[#6ee7b7]/20 text-[#6ee7b7] text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wider uppercase">
            Orvia Tropical Ltd.
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6">
            Global Agricultural Trade,<br />
            <span className="text-[#6ee7b7]">Digitally Managed</span>
          </h1>
          <p className="text-base sm:text-lg text-[#a7f3d0] max-w-2xl mx-auto leading-relaxed">
            A purpose-built order management platform for Orvia Tropical's international agricultural trade operations — from purchase to delivery, fully digitalised.
          </p>
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-bold text-[#0a5c3a] tracking-widest uppercase mb-3">About Us</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Turkey-Based, Globally Connected
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Founded and headquartered in Antalya, Turkey, Orvia Tropical Sebze Meyve San. ve Tic. Ltd. Şti. specialises in the import and export of fresh fruit and vegetables. With strong roots in one of the world's leading agricultural regions, we connect premium Turkish produce with international buyers across Europe, Asia and Africa.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our team brings deep expertise in international trade logistics, phytosanitary compliance, export documentation, and cold-chain supply — ensuring quality from farm to shelf, wherever in the world your shelf may be.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '3', label: 'Target Markets' },
                { num: '10+', label: 'Product Lines' },
                { num: '🇹🇷', label: 'Turkey-Based Operations' },
                { num: '2024', label: 'Year Founded' },
              ].map(({ num, label }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-5 text-center">
                  <div className="text-2xl font-bold text-[#0a5c3a]">{num}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Markets ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#0a5c3a] tracking-widest uppercase mb-3">Our Markets</div>
            <h2 className="text-2xl font-bold text-gray-900">Where We Trade</h2>
            <p className="text-gray-500 mt-2 text-sm">Serving buyers across three continents from our base in Antalya, Turkey</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🌍', region: 'Europe', desc: 'Supplying retailers, wholesalers and importers across the EU with certified Turkish fresh produce meeting the highest European quality standards.' },
              { icon: '🌏', region: 'Asia', desc: 'Expanding trade relationships with buyers across the Middle East and Central Asia, delivering premium agricultural goods on competitive terms.' },
              { icon: '🌍', region: 'Africa', desc: 'Supporting growing demand across key African markets with reliable supply chains and full export documentation.' },
            ].map(({ icon, region, desc }) => (
              <div key={region} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="text-4xl mb-3">{icon}</div>
                <div className="font-bold text-gray-900 text-lg mb-2">{region}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#0a5c3a] tracking-widest uppercase mb-3">Our Products</div>
            <h2 className="text-2xl font-bold text-gray-900">What We Trade</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🍎', title: 'Fresh Fruits', desc: 'Apples, citrus, stone fruit and tropical varieties from certified Turkish growers.' },
              { icon: '🥦', title: 'Vegetables', desc: 'Seasonal and year-round vegetables meeting European and international standards.' },
              { icon: '📋', title: 'Full Documentation', desc: 'Phytosanitary, health certificates, certificate of origin — handled end to end.' },
              { icon: '🚢', title: 'All Transport Modes', desc: 'Sea, air and road freight with full cold-chain capability.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-[#f0fdf4] rounded-xl p-5 border border-[#bbf7d0]">
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-gray-900 mb-2 text-sm">{title}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#064e32] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Get in Touch</h2>
          <p className="text-[#a7f3d0] mb-8 text-sm max-w-lg mx-auto">
            Interested in working with Orvia Tropical? We'd be happy to discuss your sourcing needs and explore how we can serve your market.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm">
            <div className="flex items-center gap-2 text-[#6ee7b7]">
              <span>📞</span>
              <span>+90 530 552 83 06</span>
            </div>
            <div className="flex items-center gap-2 text-[#6ee7b7]">
              <span>📍</span>
              <span>Antalya, Türkiye</span>
            </div>
            <div className="flex items-center gap-2 text-[#6ee7b7]">
              <span>🌐</span>
              <span>orviaoms.com</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Under Construction Notice ── */}
      <section className="bg-amber-50 border-y border-amber-200 py-4 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
          <span className="text-lg">🚧</span>
          <p className="text-sm text-amber-800">
            <strong>orviatropical.com</strong> — Our main company website is currently under development and will be launched shortly. Stay tuned.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-500 text-xs py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>© {new Date().getFullYear()} Orvia Tropical Sebze Meyve San. ve Tic. Ltd. Şti. All rights reserved.</div>
          <div>Tax No: 6481831271 · Antalya Kurumlar V.D.</div>
        </div>
      </footer>

    </div>
  )
}
