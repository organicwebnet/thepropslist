# Marketing Website Improvements Plan

## Overview
Transform the marketing website into a more effective conversion tool by improving copy, adding SEO, CTAs, social proof, visuals, and trust signals.

## Priority 1: Content & Copy Improvements

### 1. Fix Feature Section Grammar & Capitalization
**File:** `marketing/index.html` (lines 75-115)

**Issues:**
- Inconsistent capitalization: "todo list", "assign tasks", "set deadlines" should be capitalized
- Grammar issues: "create a list" should be "Create a list"
- Missing punctuation and clarity

**Changes:**
- Capitalize all feature titles properly
- Improve grammar and sentence structure
- Make descriptions more benefit-focused
- Add proper punctuation

**Example fixes:**
- "todo list" → "Todo List"
- "create a list of products" → "Create a list of products"
- "assign tasks to team members" → "Assign tasks to team members"

### 2. Improve Hero Value Proposition
**File:** `marketing/index.html` (line 38)

**Current:** "Manage theatre props — share the load with our app"
**Options to consider:**
- More specific benefit: "Streamline theatre props management — from shopping to packing, all in one place"
- Pain-focused: "Stop losing props. Start managing them professionally."
- Outcome-focused: "The complete props management system for theatre productions"

**Action:** Update headline to be more specific and benefit-driven

### 3. Enhance Feature Descriptions
**File:** `marketing/index.html` (lines 75-115)

**Improvements needed:**
- Make descriptions more compelling and benefit-focused
- Add specific use cases
- Use active voice
- Include emotional benefits (save time, reduce stress, etc.)

**Example transformation:**
- Current: "create a list of products for your shoppers to get options for then select the best options"
- Improved: "Create shopping lists with photos and links. Your team can suggest options, and you approve the best ones—all from your phone."

## Priority 2: SEO & Meta Tags

### 4. Add SEO Meta Tags
**File:** `marketing/index.html` (lines 1-9)

**Add:**
- Meta description (150-160 characters)
- Open Graph tags (og:title, og:description, og:image, og:url)
- Twitter Card tags
- Canonical URL
- Keywords meta tag (optional, less important now)

**Example:**
```html
<meta name="description" content="Professional theatre props management software. Track inventory, manage shopping lists, organize packing, and collaborate with your team. Free tier available." />
<meta property="og:title" content="The Props List — Professional Theatre Props Management" />
<meta property="og:description" content="Streamline your theatre production with our complete props management system." />
<meta property="og:image" content="https://www.thepropslist.uk/og-image.png" />
<meta property="og:url" content="https://www.thepropslist.uk/" />
<meta name="twitter:card" content="summary_large_image" />
```

## Priority 3: Call-to-Action Improvements

### 5. Add CTA Buttons to Pricing Cards
**File:** `marketing/index.html` (lines 128-149)

**Current:** Pricing cards show price but no action button
**Add:**
- "Get Started" or "Start Free" button for Free tier
- "Start Free Trial" or "Get Started" for paid tiers
- Link to app signup or appropriate onboarding flow

**Implementation:**
- Add `<a>` or `<button>` element in each pricing card
- Style consistently with existing `.cta` class
- Link to appropriate signup/checkout URLs
- Consider highlighting "Most Popular" on Standard tier

### 6. Add Secondary CTAs Throughout Page
**File:** `marketing/index.html`

**Add CTAs:**
- After features section: "Ready to get started? Request access"
- After pricing: "Start managing your props today"
- In hero: Already has form, but could add "Learn more" link

## Priority 4: Social Proof & Trust Signals

### 7. Add Testimonials Section
**File:** `marketing/index.html`

**New section to add:**
- Testimonials from beta users (if available)
- User quotes with names/roles
- Star ratings (if applicable)
- Case study highlights

**Placement:** After features, before pricing

**Structure:**
```html
<section class="section">
  <h2>Trusted by Theatre Teams</h2>
  <div class="grid">
    <div class="card">
      <p>"Quote from user..."</p>
      <p class="muted">— Name, Role, Theatre</p>
    </div>
    <!-- More testimonials -->
  </div>
</section>
```

### 8. Add Usage Statistics
**File:** `marketing/index.html`

**Add social proof numbers:**
- "Join X+ theatre teams"
- "Managing X+ props"
- "X shows tracked"
- "X props organized"

**Placement:** In hero section or as a banner

### 9. Add Trust Badges
**File:** `marketing/index.html`

**Add:**
- Security badges (if applicable)
- "GDPR Compliant" (if true)
- "Secure & Private"
- Beta user count
- "Free Forever" badge on Free tier

**Placement:** Footer or near pricing section

## Priority 5: Visual Improvements

### 10. Add Product Screenshots
**File:** `marketing/index.html`

**Add screenshots:**
- Dashboard/overview screenshot
- Props inventory view
- Shopping list interface
- Task board view
- Packing/labeling interface

**Implementation:**
- Use existing screenshots from `screenshots/` directory if available
- Create new screenshots if needed
- Add image gallery or carousel in features section
- Use lazy loading for performance

**Placement:**
- Hero section: Main product screenshot
- Feature cards: Small screenshots for each feature
- Dedicated "See it in action" section

### 11. Add Demo Video or GIF
**File:** `marketing/index.html`

**Options:**
- Embedded video (YouTube/Vimeo)
- Animated GIF showing key workflows
- Interactive demo (iframe or embedded app)

**Placement:** After hero, before features

## Priority 6: Additional Sections

### 12. Add FAQ Section
**File:** `marketing/index.html`

**Common questions to address:**
- "How does closed beta work?"
- "What's included in the free tier?"
- "Can I export my data?"
- "Is my data secure?"
- "How do I get access?"
- "What happens after beta?"
- "Can I use this for multiple shows?"
- "Do you offer discounts for theatres?"

**Implementation:**
- Accordion-style FAQ (expandable questions)
- Place before footer or after pricing
- Use semantic HTML for SEO

### 13. Add Comparison Table
**File:** `marketing/index.html`

**Create pricing comparison table:**
- Side-by-side feature comparison
- Highlight differences between tiers
- Make it easy to see what you get at each level

**Placement:** After pricing cards, before add-ons

## Priority 7: UX & Navigation

### 14. Add "Login" Link to Navigation
**File:** `marketing/index.html` (line 26-31)

**Current:** Login link is commented out
**Action:** Uncomment and add "Login" or "Sign In" link
- Link to: `https://app.thepropslist.uk/login`
- Add to header navigation

### 15. Improve Mobile Experience
**File:** `marketing/styles.css`

**Review and enhance:**
- Form layout on mobile
- Pricing cards stacking
- Navigation menu (hamburger if needed)
- Touch targets size
- Text readability

## Priority 8: Conversion Optimization

### 16. Add Urgency/Scarcity Elements
**File:** `marketing/index.html`

**Add:**
- "Limited beta spots available"
- "Join X other teams waiting"
- "Early access for first 100 users"
- Countdown timer (if applicable)

**Placement:** In hero section or as banner

### 17. Improve Form UX
**File:** `marketing/index.html` (lines 40-45)

**Enhancements:**
- Better placeholder text
- Add helper text explaining what happens next
- Show form validation feedback
- Add privacy note ("We'll never spam you")

### 18. Add "About" or "Why" Section
**File:** `marketing/index.html`

**Add section explaining:**
- Why The Props List was created
- Problem it solves
- Who it's for
- Company/team background (optional)

**Placement:** After hero, before features

## Implementation Order

### Phase 1: Quick Wins (High Impact, Low Effort)
1. Fix feature section grammar/capitalization
2. Add SEO meta tags
3. Add CTA buttons to pricing cards
4. Add "Login" link to navigation
5. Improve hero value proposition

### Phase 2: Content Enhancement
6. Enhance feature descriptions
7. Add FAQ section
8. Add testimonials (if available)
9. Add usage statistics

### Phase 3: Visual & Trust
10. Add product screenshots
11. Add trust badges
12. Add comparison table
13. Add demo video/GIF (if available)

### Phase 4: Advanced Optimization
14. Add urgency/scarcity elements
15. Add "About" section
16. Improve mobile experience
17. Add secondary CTAs

## Files to Modify

1. `marketing/index.html` - Main content changes
2. `marketing/styles.css` - Styling for new sections (if needed)
3. Potentially create new image assets in `marketing/` directory

## Notes

- Test all changes on mobile devices
- Ensure all links work correctly
- Verify SEO meta tags with testing tools
- Get user testimonials if possible
- Consider A/B testing different headlines
- Keep existing functionality intact
- Maintain consistent design language
