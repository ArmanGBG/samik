import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Features } from "./features";
import { Roles } from "./roles";
import { CTASection } from "./cta";
import { Footer } from "./footer";

/**
 * Samik public marketing landing page.
 *
 * Composed of:
 *   1. Navbar (sticky, conditional Login/Dashboard button)
 *   2. Hero (headline, subhead, CTA buttons, dashboard visual mock)
 *   3. Features (4 pillars with Lucide icons)
 *   4. Roles (alternating rows for Manager/Deputy/Teacher/Parent)
 *   5. CTA (gradient navy section)
 *   6. Footer (brand + link columns)
 *
 * The Navbar receives `isAuthenticated` from the server-side cookie check
 * in `src/app/page.tsx` so the initial paint shows the right button
 * without a client-side hydration round-trip.
 */
export function LandingPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <Navbar initialIsAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <Hero />
        <Features />
        <Roles />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
