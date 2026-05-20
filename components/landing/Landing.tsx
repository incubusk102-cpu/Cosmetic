import Link from "next/link";
import "./landing.css";

const ArrowRight = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const Check = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CautionTriangle = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ScanIcon = () => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx={12} cy={13} r={4} />
  </svg>
);

const FileIcon = () => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1={9} y1={13} x2={15} y2={13} />
    <line x1={9} y1={17} x2={13} y2={17} />
  </svg>
);

const BarsIcon = () => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1={18} y1={20} x2={18} y2={10} />
    <line x1={12} y1={20} x2={12} y2={4} />
    <line x1={6} y1={20} x2={6} y2={14} />
    <line x1={3} y1={20} x2={21} y2={20} />
  </svg>
);

/**
 * Marketing landing for anonymous visitors. Rendered by `app/page.tsx`
 * when there is no signed-in Supabase session. The mirror at
 * `landing/index.html` is a fully self-contained copy used for offline
 * preview (see docs/TERMUX.md).
 */
export function Landing() {
  return (
    <div className="landing">
      <header className="topbar">
        <div className="container row">
          <Link className="brand" href="/" aria-label="Cosmetic Allergy Tracker home">
            <span className="brand-mark" aria-hidden="true" />
            <span>Cosmetic Allergy Tracker</span>
          </Link>
          <Link className="topbar-cta" href="/login">
            Sign in
          </Link>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero section-first">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Cosmetic Allergy Tracker</span>
              <h1>
                Scan. Log.
                <br />
                <span className="alt">See the pattern.</span>
              </h1>
              <p className="lead">
                The allergy diary that does the math. Barcode-scan a product,
                log a reaction in ten seconds, and watch the ingredients you
                can&apos;t handle surface on their own.
              </p>
              <div className="hero-ctas">
                <Link className="btn btn-primary btn-lg" href="/login">
                  Get started — free <ArrowRight />
                </Link>
                <a className="btn btn-secondary btn-lg" href="#how">
                  How it works
                </a>
              </div>
              <p className="hero-microcopy">Pattern only — never a medical diagnosis.</p>
            </div>

            {/* Scan card mockup — concrete artifact, anchors the abstract pitch. */}
            <div className="mock-wrap" aria-hidden="true">
              <div className="mock-card" role="presentation">
                <div className="mock-card-head">
                  <div>
                    <span className="eyebrow">Scan result</span>
                    <h3>Calm Day Cream</h3>
                    <p className="sub">La Brève Cosmetics · barcode 3401520012345</p>
                  </div>
                  <span className="pill pill-caution">
                    <CautionTriangle />
                    Caution
                  </span>
                </div>
                <p className="mock-verdict-row">
                  Contains <strong>linalool</strong> — a known relative of your
                  tracked allergens. No direct hit, but worth watching.
                </p>
                <p className="mock-section-title">Ingredients (first 6)</p>
                <div className="mock-ingredients">
                  <span className="mock-tag">aqua</span>
                  <span className="mock-tag">glycerin</span>
                  <span className="mock-tag hit">linalool</span>
                  <span className="mock-tag">cetearyl alcohol</span>
                  <span className="mock-tag">niacinamide</span>
                  <span className="mock-tag">parfum</span>
                </div>
                <div className="mock-foot">
                  <span>Source · OpenBeautyFacts cache</span>
                  <span className="tabular">Lift in your history · 1.6×</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">What it does</span>
              <h2>A precision tool, not another wellness app.</h2>
              <p>
                Three loops. Each one earns its keep. No social feed, no AI
                guesswork, no giant ingredient database — just your scans,
                your reactions, and plain math you can read.
              </p>
            </div>

            <div className="features">
              <article className="feature-card">
                <div className="feature-icon"><ScanIcon /></div>
                <h3>Camera-first scan</h3>
                <p>
                  Barcode reader first. If the label&apos;s worn off, snap a
                  photo and let on-device OCR read it. If the OCR misfires,
                  paste the list. We try the shared cache before hitting the
                  network so it&apos;s fast on a phone.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon"><FileIcon /></div>
                <h3>Private reaction log</h3>
                <p>
                  Severity, body area, symptoms, optional photo, all in ten
                  seconds. Lives only in your account. Row-level security so
                  nobody — not even us at scale — can read someone else&apos;s
                  history. Your history is the moat.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon"><BarsIcon /></div>
                <h3>Evidence, not opinions</h3>
                <p>
                  We compute lift — how often an ingredient appears in
                  products you reacted to vs. all your products. Plain
                  probability, no black box. Hand the PDF to your
                  dermatologist; the methodology is on the page.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2>Three loops. Ten seconds each.</h2>
              <p>
                You don&apos;t have to remember anything. The app does. Once
                you&apos;ve scanned a handful of products and logged a couple
                of reactions, patterns appear.
              </p>
            </div>

            <ol className="steps">
              <li className="step">
                <span className="step-num" aria-hidden="true" />
                <div>
                  <h3>Scan a product</h3>
                  <p>
                    Barcode, photo of the label, or paste the ingredient list.
                    We resolve to a structured ingredient set and give you a
                    verdict against your tracked allergens.
                  </p>
                </div>
              </li>
              <li className="step">
                <span className="step-num" aria-hidden="true" />
                <div>
                  <h3>Log a reaction</h3>
                  <p>
                    When something flares up, log it: severity, body area,
                    symptoms, optional photo. Attach it to a product from your
                    history or pick from our shared cache.
                  </p>
                </div>
              </li>
              <li className="step">
                <span className="step-num" aria-hidden="true" />
                <div>
                  <h3>See the pattern</h3>
                  <p>
                    Insights surfaces the ingredients common to products you
                    reacted to, ranked by lift. Export the last 12 months as a
                    PDF for your dermatologist.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* PRICING */}
        <section id="plans">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Plans</span>
              <h2>Free does the work. Plus shows the math.</h2>
              <p>
                Scanning and logging stay free forever. Plus unlocks the
                correlation table on Insights and unlimited
                dermatologist-ready PDF reports.
              </p>
            </div>

            <div className="plans">
              <article className="plan">
                <div className="plan-head">
                  <h3 className="plan-name">Free</h3>
                  <p className="plan-price">$0 <small>/ forever</small></p>
                </div>
                <p className="plan-sub">Everything you need to start a history.</p>
                <ul className="plan-features">
                  <li><Check />Unlimited barcode + OCR + manual scans</li>
                  <li><Check />Unlimited reaction logs</li>
                  <li><Check />Personal allergen list with verdicts</li>
                  <li><Check />One PDF export per month</li>
                </ul>
                <div className="plan-cta">
                  <Link className="btn btn-secondary" href="/login">Start free</Link>
                </div>
              </article>

              <article className="plan featured">
                <div className="plan-head">
                  <h3 className="plan-name">
                    Plus
                    <span
                      className="pill pill-ghost"
                      style={{ marginLeft: "0.4rem", verticalAlign: "middle" }}
                    >
                      Recommended
                    </span>
                  </h3>
                  <p className="plan-price">$4 <small>/ month</small></p>
                </div>
                <p className="plan-sub">
                  For people who want the patterns, not just the records.
                </p>
                <ul className="plan-features">
                  <li><Check />Everything in Free</li>
                  <li><Check />Ingredient correlation table on Insights</li>
                  <li><Check />Correlations included in your PDF</li>
                  <li><Check />Unlimited monthly PDF exports</li>
                  <li><Check />Cancel any time, Stripe-backed</li>
                </ul>
                <div className="plan-cta">
                  <Link className="btn btn-primary" href="/login">Try Plus</Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="trust">
          <div className="container inner">
            <div className="trust-item">
              <h4>Pattern, not diagnosis.</h4>
              <p>
                We highlight ingredients that statistically co-occur with your
                reactions. We never claim a cause, and we never replace a
                dermatologist.
              </p>
            </div>
            <div className="trust-item">
              <h4>Your history, your data.</h4>
              <p>
                Row-level security on every table. We can&apos;t read your
                reactions at scale — and we don&apos;t sell the aggregate.
                Export and delete at will.
              </p>
            </div>
            <div className="trust-item">
              <h4>Minimal database. By design.</h4>
              <p>
                Six tables. No ML model on the critical path. No fragile
                pipelines. The product gets sharper as your history grows —
                not as ours does.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ textAlign: "center" }}>
          <div className="container">
            <span className="eyebrow">Ready</span>
            <h2
              style={{
                fontFamily: "var(--font-plex-serif), Georgia, serif",
                fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
                lineHeight: 1.1,
                marginTop: "0.6rem",
              }}
            >
              Your skin keeps records.
              <br />
              <span style={{ color: "#374E42", fontStyle: "italic" }}>
                Now you can read them.
              </span>
            </h2>
            <div
              style={{
                marginTop: "1.5rem",
                display: "inline-flex",
                gap: "0.6rem",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Link className="btn btn-primary btn-lg" href="/login">
                Get started — free
              </Link>
              <a className="btn btn-secondary btn-lg" href="#features">
                See the features
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="container row">
          <div>
            <div className="brand" style={{ marginBottom: "0.4rem" }}>
              <span className="brand-mark" aria-hidden="true" />
              <span>Cosmetic Allergy Tracker</span>
            </div>
            <span>Made for people whose skin tells the truth.</span>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <Link href="/login">Sign in</Link>
            <a
              href="https://github.com/incubusk102-cpu/Cosmetic"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
