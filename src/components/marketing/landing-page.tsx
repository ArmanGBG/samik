import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Features } from "./features";
import { ComparisonSection } from "./comparison";
import { Roles } from "./roles";
import { FAQSection } from "./faq";
import { CTASection } from "./cta";
import { Footer } from "./footer";

/**
 * Samik public marketing landing page (8-section redesign).
 *
 * 1. Navbar (Sticky with fast navigation and smart login status)
 * 2. Hero (Headline, subhead, CTAs, trust strip, classroom interactive mock)
 * 3. Features (4 core pillars for Iranian schools)
 * 4. Comparison (Traditional vs. Samik 6-point comparison)
 * 5. Roles (Interactive tabs for Principal, Deputy, Teacher, Parent)
 * 6. FAQ (Accordion answering top 5 school principal questions)
 * 7. CTA (Final conversion card)
 * 8. Footer (Brand, quick links, support contact, copyright)
 */
export function LandingPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30 selection:bg-emerald/20 selection:text-emerald-900" dir="rtl">
      <Navbar initialIsAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <Hero />
        <Features />
        <ComparisonSection />
        <Roles />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
