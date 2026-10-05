import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow">
              <img src="/logo.svg" alt="ORVIA" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-none">ORVIA OMS</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Order Management System</div>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold text-white bg-[#0a5c3a] hover:bg-[#064e32] px-4 py-2 rounded-lg transition-colors"
          >
            Login for Company Members
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-[#0a5c3a] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-[#6ee7b7]/20 text-[#6ee7b7] text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wider uppercase">
            Orvia Tropical Ltd.
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Digital Trade Operations<br />
            <span className="text-[#6ee7b7]">Simplified</span>
          </h1>
          <p className="text-lg text-[#a7f3d0] max-w-2xl mx-auto leading-relaxed">
            A purpose-built order management platform for Orvia Tropical's global agricultural trade operations — from purchase to delivery, fully digitalised.
          </p>
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold text-[#0a5c3a] tracking-widest uppercase mb-3">About Us</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Orvia Tropical — A Global Agricultural Trading Company
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Founded and headquartered in Antalya, Turkey, Orvia Tropical Sebze Meyve San. ve Tic. Ltd. Şti. specialises in the import and export of fresh fruit and vegetables. We source premium produce from origin markets including Turkey, Egypt, and beyond, connecting suppliers with buyers across Europe and the world.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our team brings deep expertise in international trade logistics, phytosanitary compliance, documentation, and cold-chain supply — ensuring quality from farm to shelf.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '100+', label: 'Shipments Managed' },
                { num: '15+', label: 'Countries Served' },
                { num: '10+', label: 'Product Lines' },
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

      {/* ── What We Trade ── */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#0a5c3a] tracking-widest uppercase mb-3">Our Products</div>
            <h2 className="text-2xl font-bold text-gray-900">What We Trade</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '🍎', title: 'Fresh Fruits', desc: 'Apples, citrus, stone fruit and tropical varieties sourced from premium growing regions.' },
              { icon: '🥦', title: 'Vegetables', desc: 'Seasonal and year-round vegetables meeting European import standards.' },
              { icon: '🌍', title: 'Multi-Origin', desc: 'Flexible sourcing from Turkey, Egypt, and other key agricultural regions.' },
              { icon: '📦', title: 'Export Ready', desc: 'Full documentation — phytosanitary, health certificates, certificate of origin.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-gray-900 mb-2">{title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OMS Platform ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#0a5c3a] tracking-widest uppercase mb-3">Our Platform</div>
            <h2 className="text-2xl font-bold text-gray-900">Built for Modern Agricultural Trade</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              Orvia OMS is our internal order management system — digitising every step of the trade cycle.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'Sales & Purchase Orders', desc: 'Create and manage export, domestic, and transit orders with full traceability.' },
              { icon: '📄', title: 'Document Generation', desc: 'Instantly generate Sales Agreements, Commercial Invoices, and Packing Lists.' },
              { icon: '🚢', title: 'Shipment Tracking', desc: 'Track orders from confirmation through loading, transit, and delivery.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-[#f0fdf4] rounded-xl p-6 border border-[#bbf7d0]">
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-gray-900 mb-2">{title}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="py-16 px-6 bg-[#064e32] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Get in Touch</h2>
          <p className="text-[#a7f3d0] mb-8 text-sm">
            Interested in working with Orvia Tropical? We'd be happy to discuss your sourcing needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
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
              <a
                href="https://www.orviatropical.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                orviatropical.com
              </a>
            </div>
          </div>
          <div className="mt-6 inline-block bg-white/10 text-[#a7f3d0] text-xs px-4 py-2 rounded-full border border-[#6ee7b7]/30">
            🚧 orviatropical.com is currently under development and will be launched shortly.
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 text-xs py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} Orvia Tropical Sebze Meyve San. ve Tic. Ltd. Şti. All rights reserved.</div>
          <div className="text-gray-600">Tax No: 6481831271 · Antalya Kurumlar V.D.</div>
        </div>
      </footer>

    </div>
  )
}
