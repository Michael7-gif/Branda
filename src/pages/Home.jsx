import { useState } from "react";
import heroImage from "../assets/branda-hero.webp";
import "../styles/home.css";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="home-page" id="top">
      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="brand-logo" onClick={closeMenu}>
            Branda
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#about">About Branda</a>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#why-branda">Why Branda</a>
          </nav>

          <div className="desktop-actions">
            <a href="/login" className="header-signin">
              Sign in
            </a>

            <a href="/signup" className="header-create">
              Create a store
            </a>
          </div>

          <button
            type="button"
            className={`mobile-menu-button ${menuOpen ? "menu-open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <a href="#about" onClick={closeMenu}>
              About Branda
            </a>

            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>

            <a href="#features" onClick={closeMenu}>
              Features
            </a>

            <a href="#why-branda" onClick={closeMenu}>
              Why Branda
            </a>

            <div className="mobile-menu-actions">
              <a href="/login" className="mobile-signin">
                Sign in
              </a>

              <a href="/signup" className="mobile-create">
                Create a store
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <p className="hero-eyebrow">YOUR BUSINESS, ONLINE</p>

            <h1>Give your business a place of its own.</h1>

            <p className="hero-description">
              Branda gives businesses the tools to create, manage, and grow
              their own online store without dealing with the complexity of
              building everything from scratch.
            </p>

            <div className="hero-actions">
              <a href="/signup" className="primary-button">
                Create your store
              </a>

              <a href="#how-it-works" className="secondary-button">
                See how Branda works
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <img
              src={heroImage}
              alt="Branda online store"
              className="hero-image"
              width="1920"
              height="1280"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />

            <div className="hero-caption">
              <span>YOUR STORE</span>
              <strong>Built around your business.</strong>
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-intro">
            <p className="section-label">ABOUT BRANDA</p>

            <h2>
              Your business deserves more than a page on someone else's
              platform.
            </h2>
          </div>

          <div className="about-text">
            <p>
              Branda is a platform built for businesses that want their own
              online space. Instead of putting your products into a shared
              marketplace, Branda gives your business its own storefront.
            </p>

            <p>
              You control the products, orders, customers, delivery options,
              payments, and the way your store looks and feels.
            </p>

            <a href="#features" className="text-link">
              Explore what Branda gives you
            </a>
          </div>
        </section>

        <section className="work-section" id="how-it-works">
          <div className="section-heading">
            <p className="section-label">HOW IT WORKS</p>

            <h2>From business idea to online store.</h2>

            <p>
              Branda keeps the process straightforward so you can spend more
              time running your business and less time worrying about
              technology.
            </p>
          </div>

          <div className="work-grid">
            <article className="work-card work-card-rounded">
              <p className="work-card-label">START</p>
              <h3>Create your business</h3>
              <p>
                Set up your business profile with your name, contact details,
                description, branding, and store information.
              </p>
            </article>

            <article className="work-card work-card-square">
              <p className="work-card-label">BUILD</p>
              <h3>Add your products</h3>
              <p>
                Add products, prices, images, descriptions, stock information,
                variants, and other details your customers need.
              </p>
            </article>

            <article className="work-card work-card-square">
              <p className="work-card-label">SELL</p>
              <h3>Open your store</h3>
              <p>
                Give customers a dedicated storefront where they can browse
                your products, add items to their cart, and place orders.
              </p>
            </article>

            <article className="work-card work-card-rounded">
              <p className="work-card-label">GROW</p>
              <h3>Manage everything</h3>
              <p>
                Manage orders, customers, payments, delivery, products, and
                store activity from your business dashboard.
              </p>
            </article>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="features-intro">
            <p className="section-label light-label">FEATURES</p>

            <h2>Everything your online store needs.</h2>

            <p>
              Branda brings the important parts of running an online store
              together in one place.
            </p>
          </div>

          <div className="features-grid">
            <article className="feature-card feature-card-rounded">
              <h3>Your own storefront</h3>
              <p>
                Give your customers a dedicated online store that represents
                your business.
              </p>
            </article>

            <article className="feature-card feature-card-square">
              <h3>Product management</h3>
              <p>
                Add and manage products, prices, images, variants, stock, and
                product information.
              </p>
            </article>

            <article className="feature-card feature-card-square">
              <h3>Order management</h3>
              <p>
                Keep track of customer orders from the moment they are placed
                until they are completed.
              </p>
            </article>

            <article className="feature-card feature-card-rounded">
              <h3>Customer management</h3>
              <p>
                Understand your customers and give registered customers a
                better shopping experience.
              </p>
            </article>

            <article className="feature-card feature-card-rounded">
              <h3>Payments and delivery</h3>
              <p>
                Configure payment and delivery options that fit the way your
                business operates.
              </p>
            </article>

            <article className="feature-card feature-card-square">
              <h3>Store analytics</h3>
              <p>
                See useful information about your products, orders, customers,
                and store activity.
              </p>
            </article>
          </div>
        </section>

        <section className="why-section" id="why-branda">
          <div className="why-visual">
            <div className="why-visual-content">
              <p>BRANDA</p>
              <h2>Your business. Your store. Your customers.</h2>
            </div>
          </div>

          <div className="why-content">
            <p className="section-label">WHY BRANDA</p>

            <h2>Built around the way your business actually works.</h2>

            <p>
              Every business is different. Branda gives business owners the
              flexibility to manage their own storefront instead of forcing
              every business into the same marketplace experience.
            </p>

            <div className="why-points">
              <div>
                <h3>Independent storefront</h3>
                <p>
                  Your products and customers belong to your business
                  experience.
                </p>
              </div>

              <div>
                <h3>Simple management</h3>
                <p>
                  Manage the important parts of your store from one business
                  dashboard.
                </p>
              </div>

              <div>
                <h3>Room to grow</h3>
                <p>
                  Start with what you need and expand your store as your
                  business grows.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-content">
            <p className="section-label light-label">START WITH BRANDA</p>

            <h2>Give your business its own online home.</h2>

            <p>
              Create your store, add your products, and start building a better
              online experience for your customers.
            </p>

            <a href="/signup" className="cta-button">
              Create your store
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#top" className="brand-logo footer-logo">
              Branda
            </a>

            <p>
              A platform for businesses that want their own online store.
            </p>
          </div>

          <div className="footer-links">
            <div>
              <h3>Branda</h3>
              <a href="#about">About</a>
              <a href="#features">Features</a>
              <a href="#why-branda">Why Branda</a>
            </div>

            <div>
              <h3>Get started</h3>
              <a href="/login">Sign in</a>
              <a href="/signup">Create a store</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Branda</p>
          <p>Built for independent businesses.</p>
        </div>
      </footer>
    </div>
  );
}