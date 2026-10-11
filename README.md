# F1 Navigator: Non-Lottery Immigration & Runway Strategy Engine

A clean, modern, and minimalistic decision engine built for **F-1 international students and founders** to discover, evaluate, and execute legal pathways to stay and work in the United States **without relying on the H-1B lottery cap**.

---

## 🌐 Live Local Server
The development server is running locally:
👉 **[http://localhost:8080](http://localhost:8080)** (or `http://127.0.0.1:8080`)

To start or restart the server manually:
```bash
python3 -m http.server 8080
```

---

## 🔄 User Journey & Architecture

The application follows an intuitive **4-step guided strategy funnel**:

```
[ 1. Your Profile ] ───> [ 2. Visa Matches ] ───> [ 3. Pathway Details ] ───> [ 4. Strategic Report ]
```

### Step 1: Your Profile (Initial Form)
User lands directly on an input form:
- **Academic Credentials**: Degree level (Bachelor's, Master's, Ph.D.), major/field of study with automatic STEM classification.
- **Citizenship & Status Timeline**: Country of citizenship (screens for TN, E-3, H-1B1, and 80+ E-2 bilateral treaties), graduation date, OPT start date, and unemployment days used.
- **Career Intent**: Corporate Employment vs. Startup Founder vs. University/Non-Profit Research.
- **Achievements & Resources**: Google Scholar citations, publications, peer reviews, patents, current/offered compensation, and liquid savings.

### Step 2: Visa Matches (Recommendation Engine)
Analyzes candidate attributes against U.S. immigration regulations (8 CFR) and displays personalized non-lottery visa pathways:
- **O-1A Extraordinary Ability Visa** (Merit-based, zero annual cap, 15-day adjudication)
- **EB-2 NIW Green Card Self-Petition** (Matter of Dhanasar 3-prong standard, no employer sponsor or PERM labor cert)
- **Bilateral Treaty Specialty Visas** (TN for Canada/Mexico, E-3 for Australia, H-1B1 for Chile/Singapore)
- **Cap-Exempt H-1B** (Higher ed institutions and non-profit research labs; unlocks concurrent private startup employment)
- **E-2 Treaty Investor Visa** (Self-employment for founders from 80+ treaty nations)
- **L-1 Global Corporate Bridge** (1-year multinational overseas relocation and return mechanism)

Each card displays a **Match Score percentage**, a tailored breakdown of **Why you qualify**, **Key advantages & considerations**, and a **"Select Pathway & Continue →"** button.

### Step 3: Pathway Details (Deep-Dive Tailoring)
Based on the visa selected in Step 2, the tool dynamically prompts the user for targeted, pathway-specific questions:
- **If O-1A**: Interactive checklist of the 8 USCIS regulatory criteria and sponsorship structure (employer, agent, or founder entity with board).
- **If EB-2 NIW**: Proposed endeavor domain (AI, Quantum, Biotech, Clean Energy, Defense) and expert testimonial letters status.
- **If Treaty (TN/E-3/H-1B1)**: Qualifying professional role title and employer offer status.
- **If Cap-Exempt H-1B**: Institution type and concurrent for-profit role interest.
- **If E-2 Investor**: Committed at-risk capital ($) and 5-year U.S. hiring plan.
- **If L-1 Bridge**: Multinational employer and target foreign subsidiary location.
- **Plus Financial Parameters**: Monthly living costs and target filing timeframe.

### Step 4: Strategic Report (Executive Roadmap)
Generates a bespoke, executive-level report formatted for presenting to a founder or immigration counsel:
1. **Executive Strategy & Legal Basis**: Tailored overview of the legal foundation and why it bypasses the lottery.
2. **Status Runway & Critical Milestones**: Active authorization countdown, OPT filing windows (90-day pre / 60-day post), and an unemployment burn fuel meter.
3. **Step-by-Step Action Plan**: Numbered operational tasks with target dates, with interactive checklist checkboxes.
4. **Itemized Financial Budget**: Exact USCIS filing fees (I-765, I-129, I-140, Asylum fee, Premium Processing $2,805), estimated legal fees, living burn during transitional gap, and capital runway in months.
5. **Regulatory Guardrails & Traps**: Key compliance pitfalls to avoid.
6. **Export Tools**: 1-click **Export Deadlines (.ics)** for calendar sync and **Print / Save PDF**.

---

## 💾 Local Browser Persistence
All form inputs, selected pathways, deep-dive answers, and checked action plan tasks are automatically persisted in `localStorage`. 
- Users can refresh or revisit without losing progress.
- A **"Start Fresh"** button in the header allows clearing data at any time.

---

## 🎨 Modern Minimalist Design System
- Linear / Stripe / Vercel-inspired dark mode aesthetic (`#080c14` canvas, `#0f1624` cards, hairline borders).
- Modern typography via Google Fonts (`Inter`, `Outfit`, `JetBrains Mono`).
- Clean visual hierarchy with zero clutter, no garish colors, and no intrusive badges.

---

## 🧪 Automated Testing
Run the validation suite:
```bash
node test_calculator.js
```
```
✓ 20/20 test assertions passed across 4 distinct candidate scenarios.
```
