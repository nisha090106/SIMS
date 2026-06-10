import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Package,
  ShoppingCart,
  BarChart3,
  Lock,
} from 'lucide-react';
import '../styles/Landing.css';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({ skus: 0, accuracy: 0, speed: 0, cost: 0 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate counters on mount
  useEffect(() => {
    const animateCounters = () => {
      let current = { skus: 0, accuracy: 0, speed: 0, cost: 0 };
      const targets = { skus: 10000, accuracy: 99, speed: 50, cost: 35 };
      const interval = setInterval(() => {
        current.skus = Math.min(current.skus + 100, targets.skus);
        current.accuracy = Math.min(current.accuracy + 1.5, targets.accuracy);
        current.speed = Math.min(current.speed + 1, targets.speed);
        current.cost = Math.min(current.cost + 1, targets.cost);
        setStats({ ...current });

        if (current.skus >= targets.skus) clearInterval(interval);
      }, 30);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });

    const statsElement = document.getElementById('stats-section');
    if (statsElement) observer.observe(statsElement);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  const features = [
    {
      icon: <TrendingUp className='w-8 h-8' />,
      title: 'Real-time Stock Tracking',
      description: 'Monitor inventory levels across all warehouses instantly',
    },
    {
      icon: <AlertCircle className='w-8 h-8' />,
      title: 'Automated Low-Stock Alerts',
      description: 'Get instant notifications when stock falls below thresholds',
    },
    {
      icon: <Package className='w-8 h-8' />,
      title: 'Multi-Warehouse Management',
      description: 'Manage multiple warehouses with centralized control',
    },
    {
      icon: <ShoppingCart className='w-8 h-8' />,
      title: 'Supplier & PO Management',
      description: 'Streamline purchase orders and supplier relationships',
    },
    {
      icon: <BarChart3 className='w-8 h-8' />,
      title: 'Advanced Reports & Analytics',
      description: 'Generate insights with powerful reporting tools',
    },
    {
      icon: <Lock className='w-8 h-8' />,
      title: 'Role-Based Access Control',
      description: 'Secure data with granular permission management',
    },
  ];

  const stats_data = [
    { label: 'SKUs Managed', value: stats.skus, suffix: '+' },
    { label: 'Accuracy Rate', value: stats.accuracy, suffix: '%' },
    { label: 'Faster Operations', value: stats.speed, suffix: '%' },
    { label: 'Cost Reduction', value: stats.cost, suffix: '%' },
  ];

  const steps = [
    {
      number: '01',
      title: 'Add Products & Warehouses',
      description:
        'Set up your inventory structure with products, categories, and warehouse locations',
    },
    {
      number: '02',
      title: 'Track in Real-Time',
      description: 'Monitor stock movements, transfers, and transactions as they happen',
    },
    {
      number: '03',
      title: 'Get Alerts & Reports',
      description: 'Receive notifications and generate comprehensive analytics reports',
    },
  ];

  return (
    <div className='landing-page'>
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className='container mx-auto px-4 py-4 flex items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center gap-2 text-2xl font-bold text-indigo-600'>
            <div className='w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center'>
              <span className='text-white text-sm font-bold'>S</span>
            </div>
            SIMS
          </div>

          {/* Desktop Menu */}
          <div className='hidden md:flex items-center gap-8'>
            <button onClick={() => scrollToSection('features')} className='nav-link'>
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className='nav-link'>
              How It Works
            </button>
            <button onClick={() => scrollToSection('pricing')} className='nav-link'>
              Pricing
            </button>
            <button onClick={() => scrollToSection('footer')} className='nav-link'>
              Contact
            </button>
          </div>

          {/* Desktop CTA Buttons */}
          <div className='hidden md:flex items-center gap-4'>
            <Link
              to='/login'
              className='px-6 py-2 text-indigo-600 font-semibold hover:text-indigo-700 transition'
            >
              Login
            </Link>
            <Link
              to='/register'
              className='px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition'
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className='md:hidden p-2 hover:bg-gray-100 rounded-lg transition'
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className='md:hidden bg-white border-t animate-slideDown'>
            <div className='container mx-auto px-4 py-4 flex flex-col gap-4'>
              <button
                onClick={() => scrollToSection('features')}
                className='text-left py-2 hover:text-indigo-600 transition'
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className='text-left py-2 hover:text-indigo-600 transition'
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className='text-left py-2 hover:text-indigo-600 transition'
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('footer')}
                className='text-left py-2 hover:text-indigo-600 transition'
              >
                Contact
              </button>
              <div className='flex gap-2 pt-4 border-t'>
                <Link
                  to='/login'
                  className='flex-1 px-4 py-2 text-center text-indigo-600 font-semibold border border-indigo-600 rounded-lg hover:bg-indigo-50 transition'
                >
                  Login
                </Link>
                <Link
                  to='/register'
                  className='flex-1 px-4 py-2 text-center bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition'
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section id='hero' className='hero-section'>
        <div className='container mx-auto px-4 py-20 lg:py-32'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            {/* Left Content */}
            <div className='hero-content fadeInUp'>
              <h1 className='text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight'>
                Smart Inventory Management for Modern Warehouses
              </h1>
              <p className='text-xl text-gray-600 mb-8 leading-relaxed'>
                Real-time tracking, automated alerts, and powerful analytics — all in one platform.
                Transform how you manage inventory.
              </p>
              <div className='flex flex-col sm:flex-row gap-4'>
                <Link
                  to='/register'
                  className='px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition inline-flex items-center justify-center gap-2'
                >
                  Start Free Trial <ChevronRight size={20} />
                </Link>
                <button className='px-8 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition'>
                  View Demo
                </button>
              </div>

              {/* Trust Badges */}
              <div className='mt-12 flex flex-wrap gap-6 text-sm text-gray-600'>
                <div className='flex items-center gap-2'>
                  <span className='text-green-500 font-bold'>✓</span> 1000+ Active Users
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-green-500 font-bold'>✓</span> 99% Uptime SLA
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className='hero-visual fadeInUp' style={{ animationDelay: '0.2s' }}>
              <div className='hero-mockup'>
                <div className='mockup-header'>
                  <div className='mockup-dot'></div>
                  <div className='mockup-dot'></div>
                  <div className='mockup-dot'></div>
                </div>
                <div className='mockup-body'>
                  <div className='mockup-card'>
                    <div className='mockup-card-header'></div>
                    <div className='mockup-card-bar'></div>
                    <div className='mockup-card-bar short'></div>
                  </div>
                  <div className='mockup-card'>
                    <div className='mockup-card-header'></div>
                    <div className='mockup-card-bar'></div>
                    <div className='mockup-card-bar short'></div>
                  </div>
                  <div className='mockup-card'>
                    <div className='mockup-card-header'></div>
                    <div className='mockup-card-bar'></div>
                    <div className='mockup-card-bar short'></div>
                  </div>
                  <div className='mockup-card'>
                    <div className='mockup-card-header'></div>
                    <div className='mockup-card-bar'></div>
                    <div className='mockup-card-bar short'></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id='features' className='features-section'>
        <div className='container mx-auto px-4 py-20'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold text-gray-900 mb-4'>Powerful Features</h2>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              Everything you need to manage inventory efficiently
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='feature-card fadeInUp'
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className='feature-icon'>{feature.icon}</div>
                <h3 className='feature-title'>{feature.title}</h3>
                <p className='feature-description'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section id='stats-section' className='stats-section'>
        <div className='container mx-auto px-4 py-20'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold text-gray-900 mb-4'>Proven Results</h2>
            <p className='text-xl text-gray-600'>See the impact SIMS has on businesses</p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {stats_data.map((stat, index) => (
              <div
                key={index}
                className='stat-card fadeInUp'
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className='stat-value'>
                  {stat.value.toLocaleString()}
                  {stat.suffix}
                </div>
                <div className='stat-label'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id='how-it-works' className='how-it-works-section'>
        <div className='container mx-auto px-4 py-20'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold text-gray-900 mb-4'>How It Works</h2>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              Get started in just 3 simple steps
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12'>
            {steps.map((step, index) => (
              <div
                key={index}
                className='step-card fadeInUp'
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className='step-number'>{step.number}</div>
                <h3 className='step-title'>{step.title}</h3>
                <p className='step-description'>{step.description}</p>
                {index < steps.length - 1 && <div className='step-connector'></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION (Placeholder) */}
      <section id='pricing' className='pricing-section'>
        <div className='container mx-auto px-4 py-20'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold text-gray-900 mb-4'>Simple, Transparent Pricing</h2>
            <p className='text-xl text-gray-600'>Choose the plan that works for your business</p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
            {[
              {
                name: 'Starter',
                price: '$99',
                features: ['Up to 1,000 SKUs', 'Single Warehouse', 'Basic Reports'],
              },
              {
                name: 'Professional',
                price: '$299',
                features: [
                  'Up to 50,000 SKUs',
                  'Multi-Warehouse',
                  'Advanced Reports',
                  'API Access',
                ],
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                features: [
                  'Unlimited SKUs',
                  'Unlimited Warehouses',
                  'Custom Integration',
                  'Dedicated Support',
                ],
              },
            ].map((plan, index) => (
              <div key={index} className={`pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                <h3 className='pricing-name'>{plan.name}</h3>
                <div className='pricing-price'>{plan.price}</div>
                <ul className='pricing-features'>
                  {plan.features.map((feature, i) => (
                    <li key={i} className='pricing-feature'>
                      ✓ {feature}
                    </li>
                  ))}
                </ul>
                <Link to='/register' className='pricing-cta'>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section id='cta' className='cta-section'>
        <div className='container mx-auto px-4 py-20 text-center'>
          <h2 className='text-4xl font-bold text-white mb-6'>Ready to Transform Your Inventory?</h2>
          <p className='text-xl text-indigo-100 mb-8 max-w-2xl mx-auto'>
            Join thousands of businesses that trust SIMS for their inventory management
          </p>
          <Link
            to='/register'
            className='inline-block px-10 py-4 bg-white text-indigo-600 rounded-lg font-bold text-lg hover:bg-indigo-50 transition'
          >
            Get Started Today — It's Free
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id='footer' className='footer'>
        <div className='container mx-auto px-4 py-12'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8 mb-8'>
            {/* Brand */}
            <div>
              <div className='flex items-center gap-2 text-xl font-bold text-indigo-600 mb-4'>
                <div className='w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center'>
                  <span className='text-white text-xs font-bold'>S</span>
                </div>
                SIMS
              </div>
              <p className='text-gray-600 text-sm'>Smart Inventory Management System</p>
            </div>

            {/* Product */}
            <div>
              <h4 className='font-semibold text-gray-900 mb-4'>Product</h4>
              <ul className='space-y-2 text-sm text-gray-600'>
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className='hover:text-indigo-600 transition'
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className='hover:text-indigo-600 transition'
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    className='hover:text-indigo-600 transition'
                  >
                    How It Works
                  </button>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className='font-semibold text-gray-900 mb-4'>Company</h4>
              <ul className='space-y-2 text-sm text-gray-600'>
                <li>
                  <a href='#' className='hover:text-indigo-600 transition'>
                    About Us
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-indigo-600 transition'>
                    Blog
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-indigo-600 transition'>
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className='font-semibold text-gray-900 mb-4'>Legal</h4>
              <ul className='space-y-2 text-sm text-gray-600'>
                <li>
                  <a href='#' className='hover:text-indigo-600 transition'>
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-indigo-600 transition'>
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className='border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600'>
            <p>&copy; 2026 SIMS. All rights reserved.</p>
            <div className='flex gap-6 mt-4 md:mt-0'>
              <a href='#' className='hover:text-indigo-600 transition'>
                Twitter
              </a>
              <a href='#' className='hover:text-indigo-600 transition'>
                LinkedIn
              </a>
              <a href='#' className='hover:text-indigo-600 transition'>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
