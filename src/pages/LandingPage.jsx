import React from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0a5c3a' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">Orvia OMS</span>
          </div>
          <Link
            to="/login"
            className="btn-primary text-sm px-5 py-2"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-24 md:py-36 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e32 0%, #0a5c3a 50%, #0d7a4e 100%)' }}
      >
        {/* Subtle decorative grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #6ee7b7 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 border"
            style={{ color: '#6ee7b7', borderColor: 'rgba(110,231,183,0.3)', backgroundColor: 'rgba(110,231,183,0.08)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Orvia Tropical Ltd — Internal Platform
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
            Orvia OMS
          </h1>
          <p className="text-lg md:text-xl font-light mb-3" style={{ color: '#a7f3d0' }}>
            Digitising Agricultural Trade, End to End
          </p>
          <p className="text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10" style={{ color: 'rgba(167,243,208,0.8)' }}>
            Streamline export operations, purchasing cycles, shipment tracking, and documentation — all from a single platform built for the way agricultural trade actually works.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ backgroundColor: '#6ee7b7', color: '#064e32' }}
          >
            Sign In to the Platform
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Features strip */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                ),
                title: 'Order Management',
                desc: 'Track purchasing and sales orders from creation through delivery, with real-time status updates at every stage.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                ),
                title: 'Shipment Tracking',
                desc: 'Monitor cargo in transit, manage logistics partners, and stay informed on arrival timelines across all origins.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                ),
                title: 'Supplier & Customer Hub',
                desc: 'Centralise supplier and customer records, contact details, and transaction history in one accessible place.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card p-6 flex flex-col gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#f0f9f4' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="#0a5c3a" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#0a5c3a' }}>About</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3 mb-5">
            Built for Agricultural Trade
          </h2>
          <p className="text-gray-600 leading-relaxed text-base md:text-lg mb-8">
            In a changing world, we bring digital solutions to agricultural trade — helping our teams manage orders, shipments, and documents with ease. Orvia OMS is the operational backbone of Orvia Tropical Ltd, designed specifically for the complexities of international fruit and vegetable import/export.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8 max-w-xs mx-auto">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6ee7b7' }} />
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Coming soon notice */}
          <div
            className="inline-flex items-start gap-3 text-left rounded-xl px-5 py-4 border text-sm max-w-lg"
            style={{ backgroundColor: '#f0f9f4', borderColor: '#a7f3d0', color: '#064e32' }}
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Our main website{' '}
              <span className="font-semibold">orviatropical.com</span>{' '}
              is currently under development and will be live soon. In the meantime, this platform serves our internal operations team.
            </span>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section
        className="py-16 px-6"
        style={{ background: 'linear-gradient(135deg, #064e32 0%, #0a5c3a 100%)' }}
      >
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="mb-8" style={{ color: '#a7f3d0' }}>
            Sign in with your Orvia credentials to access the order management platform.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ backgroundColor: '#6ee7b7', color: '#064e32' }}
          >
            Sign In
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} Orvia Tropical Ltd. All rights reserved.</span>
          <span>orviaoms.com</span>
        </div>
      </footer>
    </div>
  )
}
