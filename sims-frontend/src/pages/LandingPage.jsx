import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Package, 
  AlertCircle, 
  TrendingUp, 
  Settings,
  Lock,
  Menu,
  X,
  CheckCircle,
  Warehouse
} from 'lucide-react';
import '../styles/LandingPage.css';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ skus: 0, accuracy: 0, speed: 0, cost: 0 });
  const [visibleSections, setVisibleSections] = useState({});

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animated counters
  useEffect(() => {
    const animateCounters = () => {
      let current = { skus: 0, accuracy: 0, speed: 0, cost: 0 };
      const targets = { skus: 10000, accuracy: 99, speed: 50, cost: 35 };
      const interval = setInterval(() => {
        current.skus = Math.min(current.skus + 150, targets.skus);
        current.accuracy = Math.min(current.accuracy + 1.5, targets.accuracy);
        current.speed = Math.min(current.speed + 1, targets.speed);
        current.cost = Math.min(current.cost + 1, targets.cost);
        setStats({ ...current });

        if (current.skus >= targets.skus) clearInterval(interval);
      }, 30);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          setVisibleSections((prev) => ({ ...prev, [id]: true }));
          
          if (id === 'stats-section') {
            animateCounters();
            observer.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          {/* Logo */}
          <div className="nav-logo">
            <Warehouse size={24} />
            <span>SIMS</span>
          </div>

          {/* Desktop Menu */}
          <div className="nav-menu hidden md:flex">
            <button onClick={() => scrollToSection('features')} className="nav-link">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link">
              How It Works
            </button>
            <button onClick={() => scrollToSection('pricing')} className="nav-link">
              Pricing
            </button>
            <button onClick={() => scrollToSection('contact')} className="nav-link">
              Contact
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="nav-cta hidden md:flex gap-4">
            <Link to="/login" className="nav-cta-login">
              Login
            </Link>
            <Link to="/register" className="nav-cta-button">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-blue-400"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mobile-menu md:hidden">
            <button onClick={() => scrollToSection('features')} className="mobile-menu-link">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="mobile-menu-link">
              How It Works
            </button>
            <button onClick={() => scrollToSection('pricing')} className="mobile-menu-link">
              Pricing
            </button>
            <button onClick={() => scrollToSection('contact')} className="mobile-menu-link">
              Contact
            </button>
            <div className="flex gap-2 pt-4 border-t border-blue-900">
              <Link to="/login" className="mobile-menu-login">
                Login
              </Link>
              <Link to="/register" className="mobile-menu-cta">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="hero-section" data-animate>
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="hero-content">
              <h1 className="hero-title">
                Smart Inventory.<br />
                <span className="gradient-text">Zero Guesswork.</span>
              </h1>
              <p className="hero-subtitle">
                Real-time stock tracking, automated alerts, and powerful analytics — all in one place. Transform how you manage inventory.
              </p>
              <div className="hero-ctas">
                <Link to="/register" className="cta-primary">
                  Start Free Trial
                </Link>
                <button className="cta-outline">
                  ▶ Watch Demo
                </button>
              </div>
            </div>

            {/* Right Visual */}
            <div className="hero-visual">
              {/* CSS Dashboard Mockup */}
              <div className="dashboard-mockup">
                <div className="mockup-header">
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-card">
                    <div className="card-header"></div>
                    <div className="card-bar"></div>
                    <div className="card-bar short"></div>
                  </div>
                  <div className="mockup-card">
                    <div className="card-header"></div>
                    <div className="card-bar"></div>
                    <div className="card-bar short"></div>
                  </div>
                </div>
                <div className="mockup-chart">
                  <div className="chart-bar h-12"></div>
                  <div className="chart-bar h-16"></div>
                  <div className="chart-bar h-10"></div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="floating-card card-1">
                <div className="card-icon">📦</div>
                <div className="card-text">
                  <div className="card-number">1,240</div>
                  <div className="card-label">Products Tracked</div>
                </div>
              </div>

              <div className="floating-card card-2">
                <div className="card-icon">🏢</div>
                <div className="card-text">
                  <div className="card-number">3</div>
                  <div className="card-label">Warehouses</div>
                </div>
              </div>

              <div className="floating-card card-3">
                <div className="card-icon">⚠️</div>
                <div className="card-text">
                  <div className="card-number">4</div>
                  <div className="card-label">Low Stock Items</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section id="stats-section" className="stats-section" data-animate>
        <div className="container mx-auto px-4 py-16">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.skus.toLocaleString()}+</div>
              <div className="stat-label">SKUs Supported</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{Math.round(stats.accuracy)}%</div>
              <div className="stat-label">Inventory Accuracy</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{Math.round(stats.speed)}%</div>
              <div className="stat-label">Faster Operations</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{Math.round(stats.cost)}-40%</div>
              <div className="stat-label">Cost Reduction</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="features-section" data-animate>
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-subtitle">Everything you need to master your inventory</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <TrendingUp size={32} />,
                title: 'Real-time Tracking',
                description: 'Monitor stock levels across all warehouses instantly',
              },
              {
                icon: <Package size={32} />,
                title: 'Multi-warehouse Support',
                description: 'Manage multiple locations from a single dashboard',
              },
              {
                icon: <AlertCircle size={32} />,
                title: 'Automated Alerts',
                description: 'Get notified when stock falls below thresholds',
              },
              {
                icon: <BarChart3 size={32} />,
                title: 'Analytics & Reports',
                description: 'Generate comprehensive insights and reports',
              },
              {
                icon: <Settings size={32} />,
                title: 'Purchase Orders',
                description: 'Streamline supplier and order management',
              },
              {
                icon: <Lock size={32} />,
                title: 'Role-based Access',
                description: 'Secure data with granular permissions',
              },
            ].map((feature, idx) => (
              <div key={idx} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="how-it-works-section" data-animate>
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Get up and running in 3 simple steps</p>
          </div>

          <div className="steps-container">
            {[
              {
                number: '01',
                title: 'Add Products & Warehouses',
                description: 'Set up your inventory structure with products, categories, and warehouse locations',
              },
              {
                number: '02',
                title: 'Track Stock in Real-time',
                description: 'Monitor stock movements, transfers, and transactions as they happen',
              },
              {
                number: '03',
                title: 'Get Alerts & Reports',
                description: 'Receive notifications and generate comprehensive analytics reports',
              },
            ].map((step, idx) => (
              <div key={idx} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                {idx < 2 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section" data-animate>
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="section-title">Trusted by Industry Leaders</h2>
            <p className="section-subtitle">See what our customers are saying</p>
          </div>

          <div className="testimonials-grid">
            {[
              {
                name: 'Sarah Johnson',
                role: 'Operations Manager',
                company: 'TechCorp Logistics',
                text: 'SIMS transformed our warehouse operations. We reduced inventory errors by 95% and cut operational costs by 40%.',
                avatar: 'SJ',
              },
              {
                name: 'Michael Chen',
                role: 'Supply Chain Director',
                company: 'Global Trade Inc',
                text: 'The real-time tracking and automated alerts have been game-changers. We now catch stock issues before they become problems.',
                avatar: 'MC',
              },
              {
                name: 'Emma Williams',
                role: 'Warehouse Manager',
                company: 'Swift Distribution',
                text: 'Implementation was seamless. Our team was productive within days. The support team is fantastic and always available.',
                avatar: 'EW',
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-stars">
                  {'★★★★★'.split('').map((star, i) => (
                    <span key={i} className="text-yellow-400">{star}</span>
                  ))}
                </div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.avatar}</div>
                  <div>
                    <div className="author-name">{testimonial.name}</div>
                    <div className="author-role">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing-section" data-animate>
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">Choose the plan that fits your business</p>
          </div>

          <div className="pricing-grid">
            {[
              {
                name: 'Starter',
                price: '$99',
                description: 'Perfect for small teams',
                features: ['Up to 1,000 SKUs', 'Single Warehouse', 'Basic Reports', 'Email Support'],
              },
              {
                name: 'Professional',
                price: '$299',
                description: 'Most popular for growing businesses',
                features: ['Up to 50,000 SKUs', 'Multi-Warehouse', 'Advanced Reports', 'Priority Support', 'API Access'],
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large-scale operations',
                features: ['Unlimited SKUs', 'Unlimited Warehouses', 'Custom Integration', 'Dedicated Support', 'SLA'],
              },
            ].map((plan, idx) => (
              <div key={idx} className={`pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">{plan.price}</div>
                <p className="pricing-description">{plan.description}</p>
                <ul className="pricing-features">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="pricing-feature">
                      <CheckCircle size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="pricing-cta">
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-final-section" data-animate>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="cta-final-title">Ready to Transform Your Inventory?</h2>
          <p className="cta-final-subtitle">
            Join thousands of businesses managing inventory smarter.
          </p>
          <Link to="/register" className="cta-final-button">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="footer">
        <div className="container mx-auto px-4 py-16">
          <div className="footer-grid">
            {/* Brand */}
            <div>
              <div className="footer-logo">
                <Warehouse size={24} />
                <span>SIMS</span>
              </div>
              <p className="footer-tagline">Smart Inventory Management System</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="footer-heading">Product</h4>
              <ul className="footer-links">
                <li><button onClick={() => scrollToSection('features')}>Features</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')}>How It Works</button></li>
                <li><button onClick={() => scrollToSection('pricing')}>Pricing</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="footer-heading">Company</h4>
              <ul className="footer-links">
                <li><a href="#about">About Us</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#careers">Careers</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="footer-heading">Legal</h4>
              <ul className="footer-links">
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 SIMS. All rights reserved.</p>
            <div className="footer-social">
              <a href="#twitter">Twitter</a>
              <a href="#linkedin">LinkedIn</a>
              <a href="#github">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
