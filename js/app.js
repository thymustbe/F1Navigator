// F1 Navigator - Core Application Controller
import { CIP_STEM_MAJORS, O1A_CRITERIA, NIW_PRONGS, USCIS_FEE_SCHEDULE } from './data.js';
import { calculateTimeline, isEligibleForTreaty, evaluatePathwayRecommendations, generatePathwayReport } from './calculator.js';

class F1Navigator {
  constructor() {
    this.currentStep = 1;
    this.profile = this.loadStoredProfile();
    this.selectedPathway = localStorage.getItem('f1_nav_selected_pathway') || null;
    this.deepDiveDetails = this.loadStoredDeepDive();
    this.checkedMilestones = this.loadStoredMilestones();

    this.initElements();
    this.bindEvents();
    this.restoreState();
  }

  loadStoredProfile() {
    const saved = localStorage.getItem('f1_nav_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Clean default state for a student
    const nextYear = new Date().getFullYear() + 1;
    return {
      degreeLevel: "Master's",
      major: "Computer Science & Software Engineering",
      stemEligible: true,
      nationality: "",
      graduationDate: `${nextYear}-05-15`,
      optStartDate: `${nextYear}-07-01`,
      unemploymentUsed: 0,
      careerTrack: "corporate",
      citations: 0,
      papers: 0,
      peerReviews: 0,
      patents: 0,
      salaryAmount: 120000,
      liquidSavings: 25000,
      monthlyLiving: 2800
    };
  }

  loadStoredDeepDive() {
    const saved = localStorage.getItem('f1_nav_deepdive');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  }

  loadStoredMilestones() {
    const saved = localStorage.getItem('f1_nav_milestones');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  }

  saveProfile() {
    localStorage.setItem('f1_nav_profile', JSON.stringify(this.profile));
  }

  saveDeepDive() {
    localStorage.setItem('f1_nav_deepdive', JSON.stringify(this.deepDiveDetails));
  }

  saveMilestones() {
    localStorage.setItem('f1_nav_milestones', JSON.stringify(this.checkedMilestones));
  }

  initElements() {
    // Stepper indicators
    this.stepIndicators = document.querySelectorAll('.step-item');
    this.stepViews = document.querySelectorAll('.step-view');

    // Step 1 Form elements
    this.profileForm = document.getElementById('profileForm');
    this.inputDegree = document.getElementById('inputDegree');
    this.inputMajor = document.getElementById('inputMajor');
    this.stemPill = document.getElementById('stemPill');
    this.inputNationality = document.getElementById('inputNationality');
    this.inputGradDate = document.getElementById('inputGradDate');
    this.inputOptStart = document.getElementById('inputOptStart');
    this.inputUnemploymentUsed = document.getElementById('inputUnemploymentUsed');
    this.inputCareerTrack = document.getElementById('inputCareerTrack');
    this.inputCitations = document.getElementById('inputCitations');
    this.inputPapers = document.getElementById('inputPapers');
    this.inputPeerReviews = document.getElementById('inputPeerReviews');
    this.inputPatents = document.getElementById('inputPatents');
    this.inputSalary = document.getElementById('inputSalary');
    this.inputSavings = document.getElementById('inputSavings');
    this.trackCards = document.querySelectorAll('.radio-card');

    // Populate Major dropdown
    if (this.inputMajor) {
      this.inputMajor.innerHTML = CIP_STEM_MAJORS.map(m => 
        `<option value="${m.name}" data-stem="${m.stem}">${m.name} ${m.stem ? '(STEM)' : '(Non-STEM)'}</option>`
      ).join('');
    }

    // Step 2 & 3 & 4 Containers
    this.step2ProfileSummary = document.getElementById('step2ProfileSummary');
    this.pathwaysContainer = document.getElementById('pathwaysContainer');
    this.btnBackToStep1 = document.getElementById('btnBackToStep1');

    this.selectedPathwayTag = document.getElementById('selectedPathwayTag');
    this.step3Title = document.getElementById('step3Title');
    this.deepDiveDynamicFields = document.getElementById('deepDiveDynamicFields');
    this.deepDiveForm = document.getElementById('deepDiveForm');
    this.inputMonthlyLiving = document.getElementById('inputMonthlyLiving');
    this.btnBackToStep2 = document.getElementById('btnBackToStep2');

    this.reportContainer = document.getElementById('reportContainer');
    this.btnResetAll = document.getElementById('btnResetAll');
  }

  bindEvents() {
    // Stepper header navigation
    this.stepIndicators.forEach(item => {
      item.addEventListener('click', () => {
        const targetStep = Number(item.dataset.step);
        // Only allow clicking to steps that have been reached
        if (targetStep < this.currentStep || (targetStep === 2 && this.profile.nationality) || (targetStep === 3 && this.selectedPathway)) {
          this.goToStep(targetStep);
        }
      });
    });

    // STEM pill dynamic reaction
    if (this.inputMajor) {
      this.inputMajor.addEventListener('change', (e) => {
        const selectedOpt = e.target.selectedOptions[0];
        const isStem = selectedOpt.dataset.stem === 'true';
        this.updateStemPill(isStem);
      });
    }

    // Career track radio cards
    this.trackCards.forEach(card => {
      card.addEventListener('click', () => {
        this.trackCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (this.inputCareerTrack) {
          this.inputCareerTrack.value = card.dataset.value;
        }
      });
    });

    // Step 1 Submission
    if (this.profileForm) {
      this.profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStep1Submit();
      });
    }

    // Step 2 Back button
    if (this.btnBackToStep1) {
      this.btnBackToStep1.addEventListener('click', () => this.goToStep(1));
    }

    // Step 3 Back button
    if (this.btnBackToStep2) {
      this.btnBackToStep2.addEventListener('click', () => this.goToStep(2));
    }

    // Step 3 Submission
    if (this.deepDiveForm) {
      this.deepDiveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStep3Submit();
      });
    }

    // Reset All button
    if (this.btnResetAll) {
      this.btnResetAll.addEventListener('click', () => {
        if (confirm('Start fresh with a clean profile? This will clear stored inputs.')) {
          localStorage.removeItem('f1_nav_profile');
          localStorage.removeItem('f1_nav_selected_pathway');
          localStorage.removeItem('f1_nav_deepdive');
          localStorage.removeItem('f1_nav_milestones');
          window.location.reload();
        }
      });
    }
  }

  updateStemPill(isStem) {
    if (!this.stemPill) return;
    if (isStem) {
      this.stemPill.textContent = 'STEM Eligible (+24 Mos)';
      this.stemPill.style.background = 'rgba(16, 185, 129, 0.12)';
      this.stemPill.style.color = '#10b981';
    } else {
      this.stemPill.textContent = 'Non-STEM (12 Mos Total)';
      this.stemPill.style.background = 'rgba(245, 158, 11, 0.12)';
      this.stemPill.style.color = '#f59e0b';
    }
  }

  restoreState() {
    const p = this.profile;
    if (this.inputDegree) this.inputDegree.value = p.degreeLevel || "Master's";
    if (this.inputMajor) this.inputMajor.value = p.major || "Computer Science & Software Engineering";
    if (this.inputNationality) this.inputNationality.value = p.nationality || "";
    if (this.inputGradDate) this.inputGradDate.value = p.graduationDate || "";
    if (this.inputOptStart) this.inputOptStart.value = p.optStartDate || "";
    if (this.inputUnemploymentUsed) this.inputUnemploymentUsed.value = p.unemploymentUsed || 0;
    if (this.inputCitations) this.inputCitations.value = p.citations || 0;
    if (this.inputPapers) this.inputPapers.value = p.papers || 0;
    if (this.inputPeerReviews) this.inputPeerReviews.value = p.peerReviews || 0;
    if (this.inputPatents) this.inputPatents.value = p.patents || 0;
    if (this.inputSalary) this.inputSalary.value = p.salaryAmount || 120000;
    if (this.inputSavings) this.inputSavings.value = p.liquidSavings || 25000;

    // Career track restore
    if (p.careerTrack) {
      this.trackCards.forEach(c => {
        c.classList.toggle('selected', c.dataset.value === p.careerTrack);
      });
      if (this.inputCareerTrack) this.inputCareerTrack.value = p.careerTrack;
    }

    // Trigger major change to set initial STEM pill
    if (this.inputMajor) {
      const selectedOpt = this.inputMajor.selectedOptions[0];
      if (selectedOpt) this.updateStemPill(selectedOpt.dataset.stem === 'true');
    }

    // If user already has a nationality and selected pathway, restore to report
    const savedStep = Number(localStorage.getItem('f1_nav_step')) || 1;
    if (p.nationality && this.selectedPathway && savedStep === 4) {
      this.renderReport();
      this.goToStep(4);
    } else if (p.nationality && savedStep >= 2) {
      this.renderStep2Pathways();
      this.goToStep(savedStep);
    } else {
      this.goToStep(1);
    }
  }

  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    localStorage.setItem('f1_nav_step', stepNumber);

    // Update Stepper Nav
    this.stepIndicators.forEach(item => {
      const s = Number(item.dataset.step);
      item.classList.toggle('active', s === stepNumber);
      item.classList.toggle('completed', s < stepNumber);
    });

    // Toggle Views
    this.stepViews.forEach((view, idx) => {
      view.classList.toggle('active', idx + 1 === stepNumber);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleStep1Submit() {
    const selectedMajorOpt = this.inputMajor.selectedOptions[0];
    const isStem = selectedMajorOpt.dataset.stem === 'true';

    const gradDateStr = this.inputGradDate.value;
    const optStartStr = this.inputOptStart.value;
    const optStart = new Date(optStartStr);
    const optEnd = new Date(optStart.getTime() + 365 * 86400000);
    const stemEnd = isStem ? new Date(optEnd.getTime() + 730 * 86400000) : null;

    this.profile = {
      degreeLevel: this.inputDegree.value,
      major: this.inputMajor.value,
      stemEligible: isStem,
      nationality: this.inputNationality.value.trim(),
      graduationDate: gradDateStr,
      optStartDate: optStartStr,
      optEndDate: optEnd.toISOString().split('T')[0],
      stemOptEndDate: stemEnd ? stemEnd.toISOString().split('T')[0] : null,
      unemploymentUsed: Number(this.inputUnemploymentUsed.value) || 0,
      careerTrack: this.inputCareerTrack.value || 'corporate',
      citations: Number(this.inputCitations.value) || 0,
      papers: Number(this.inputPapers.value) || 0,
      peerReviews: Number(this.inputPeerReviews.value) || 0,
      patents: Number(this.inputPatents.value) || 0,
      salaryAmount: Number(this.inputSalary.value) || 0,
      liquidSavings: Number(this.inputSavings.value) || 25000,
      monthlyLiving: Number(this.inputMonthlyLiving?.value) || 2800
    };

    this.saveProfile();
    this.renderStep2Pathways();
    this.goToStep(2);
  }

  renderStep2Pathways() {
    const p = this.profile;
    const recommendations = evaluatePathwayRecommendations(p);

    // Profile summary pill strip
    if (this.step2ProfileSummary) {
      const treatyCheck = isEligibleForTreaty(p.nationality);
      this.step2ProfileSummary.innerHTML = `
        <div>
          <strong style="color: var(--text-main);">${p.degreeLevel}</strong> in ${p.major}
          &bull; <span>${p.stemEligible ? 'STEM (36 Mos Total OPT)' : 'Standard 12 Mos OPT'}</span>
        </div>
        <div>
          Citizenship: <strong style="color: var(--text-main);">${p.nationality}</strong>
          ${treatyCheck.hasTreaty ? `<span style="margin-left: 6px; padding: 2px 7px; border-radius: 4px; background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 600; font-size: 11px;">${treatyCheck.visaType.split(' ')[0]} Treaty Eligible</span>` : ''}
        </div>
      `;
    }

    if (!this.pathwaysContainer) return;

    this.pathwaysContainer.innerHTML = recommendations.map(item => `
      <div class="pathway-card" id="card-pathway-${item.id}">
        <div class="pathway-card-top">
          <div class="pathway-title-group">
            <span class="pathway-category">${item.category}</span>
            <h3>${item.name}</h3>
          </div>
          <div class="score-badge">
            <span class="score-num">${item.matchScore}%</span>
            <span class="score-text">Match</span>
          </div>
        </div>

        <p class="pathway-summary">${item.summary}</p>

        <div class="pathway-reasons-box">
          <strong>Why this fits:</strong> ${item.whyYouQualify}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12px; margin: 4px 0;">
          <div>
            <span style="color: var(--emerald); font-weight: 600;">Advantages:</span>
            <ul style="padding-left: 16px; color: var(--text-muted); margin-top: 3px; line-height: 1.45;">
              ${item.pros.map(pro => `<li>${pro}</li>`).join('')}
            </ul>
          </div>
          <div>
            <span style="color: var(--rose); font-weight: 600;">Considerations:</span>
            <ul style="padding-left: 16px; color: var(--text-muted); margin-top: 3px; line-height: 1.45;">
              ${item.cons.map(con => `<li>${con}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="pathway-card-footer">
          <span>Est. Approval Timeline: <strong style="color: var(--text-main);">${item.estimatedTimeline}</strong></span>
          <button type="button" class="btn btn-primary btn-sm btn-select-pathway" data-id="${item.id}">
            Select Pathway &amp; Continue →
          </button>
        </div>
      </div>
    `).join('');

    // Bind pathway select buttons
    this.pathwaysContainer.querySelectorAll('.btn-select-pathway').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pathwayId = e.currentTarget.dataset.id;
        this.handlePathwaySelection(pathwayId);
      });
    });
  }

  handlePathwaySelection(pathwayId) {
    this.selectedPathway = pathwayId;
    localStorage.setItem('f1_nav_selected_pathway', pathwayId);
    this.renderStep3DeepDive(pathwayId);
    this.goToStep(3);
  }

  renderStep3DeepDive(pathwayId) {
    const p = this.profile;
    const fieldsContainer = this.deepDiveDynamicFields;
    if (!fieldsContainer) return;

    let titleText = 'Tailoring Your Strategy';
    let tagText = 'Selected Pathway';

    if (pathwayId === 'o1a') {
      tagText = 'O-1A Extraordinary Ability Visa';
      titleText = 'O-1A Evidentiary Rubric & Sponsor Details';
      fieldsContainer.innerHTML = `
        <div class="form-section-title">USCIS 8-Criteria Self-Assessment</div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
          USCIS regulations require establishing at least <strong>3 out of 8 criteria</strong> plus passing the Kazarian final merits determination. Check what you currently have or plan to build:
        </p>
        
        <div>
          ${O1A_CRITERIA.map(crit => `
            <label class="criteria-item" id="crit-box-${crit.id}">
              <input type="checkbox" name="o1Criteria" value="${crit.id}" ${this.deepDiveDetails?.o1Criteria?.includes(crit.id) ? 'checked' : ''}>
              <div class="criteria-content">
                <div class="criteria-title">${crit.title}</div>
                <div class="criteria-desc">${crit.description}</div>
              </div>
            </label>
          `).join('')}
        </div>

        <div class="form-section-title">Sponsorship Structure</div>
        <div class="form-group">
          <label class="form-label" for="inputO1Sponsor">Intended Petitioner / Sponsor</label>
          <select id="inputO1Sponsor" class="form-select">
            <option value="employer">Direct Employer (W-2 Company Sponsorship)</option>
            <option value="agent">Talent / Peer Agent (Allows Multiple Gigs/Contracts)</option>
            <option value="founder_entity">Your Own Startup (With Independent Board of Directors / Advisory Agreement)</option>
          </select>
        </div>
      `;
    } else if (pathwayId === 'eb2niw') {
      tagText = 'EB-2 NIW (National Interest Waiver)';
      titleText = 'Proposed Endeavor & National Importance Details';
      fieldsContainer.innerHTML = `
        <div class="form-section-title">Matter of Dhanasar Endeavor Alignment</div>
        
        <div class="form-group">
          <label class="form-label" for="inputNiwDomain">Primary Endeavor Domain</label>
          <select id="inputNiwDomain" class="form-select">
            <option value="ai">Artificial Intelligence & Machine Learning</option>
            <option value="quantum">Quantum Computing & Microelectronics</option>
            <option value="biotech">Biotechnology, Genomics & Healthcare</option>
            <option value="clean_energy">Clean Energy & Climate Technologies</option>
            <option value="cyber">Cybersecurity & Critical Infrastructure</option>
            <option value="other">Other High-Impact Scientific/Technical Field</option>
          </select>
          <div class="form-hint">Aligning directly with White House Critical & Emerging Technologies provides substantial evidentiary weight.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputNiwEndeavorTitle">Proposed Endeavor Summary (1-2 sentences)</label>
          <textarea id="inputNiwEndeavorTitle" class="form-textarea" rows="3" placeholder="e.g. Developing privacy-preserving distributed machine learning systems to optimize clinical data pipelines across decentralized hospital networks."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputLettersStatus">Expert Testimonial Letters Status</label>
          <select id="inputLettersStatus" class="form-select">
            <option value="not_started">Not Started (Need identification of independent experts)</option>
            <option value="identifying">Identifying 4–6 Academic and Industry Recommenders</option>
            <option value="drafting">Currently Drafting Recommender Testimonial Letters</option>
          </select>
        </div>
      `;
    } else if (pathwayId === 'treaty') {
      const treatyInfo = isEligibleForTreaty(p.nationality);
      tagText = `${treatyInfo.visaType} Bilateral Pathway`;
      titleText = 'Treaty Profession & Offer Details';
      fieldsContainer.innerHTML = `
        <div class="form-section-title">USMCA / Bilateral Treaty Classification</div>

        <div class="form-group">
          <label class="form-label" for="inputTreatyRole">Qualifying Professional Role</label>
          <input type="text" id="inputTreatyRole" class="form-input" placeholder="e.g. Software Engineer, Computer Systems Analyst, Scientist, Management Consultant" value="Software Engineer" required>
          <div class="form-hint">The role title and duties must closely align with the treaty's official occupational schedule.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputOfferStatus">Sponsoring Employer Status</label>
          <select id="inputOfferStatus" class="form-select">
            <option value="offer_in_hand">Written Job Offer in Hand</option>
            <option value="interviewing">Currently in Final Interview Stages</option>
            <option value="current_employer">Current Employer Transitioning from OPT</option>
          </select>
        </div>
      `;
    } else if (pathwayId === 'cap_exempt') {
      tagText = 'Cap-Exempt H-1B Pathway';
      titleText = 'Institutional Sponsor & Concurrent Role Strategy';
      fieldsContainer.innerHTML = `
        <div class="form-section-title">Institutional Affiliation</div>

        <div class="form-group">
          <label class="form-label" for="inputInstitutionType">Target Institution Type</label>
          <select id="inputInstitutionType" class="form-select">
            <option value="university">Higher Education Institution (University / College)</option>
            <option value="affiliated_hospital">University-Affiliated Non-Profit Hospital</option>
            <option value="nonprofit_research">501(c)(3) Non-Profit Research Organization</option>
            <option value="gov_research">Governmental Research Laboratory</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputConcurrentInterest">Concurrent Private Employment Interest</label>
          <select id="inputConcurrentInterest" class="form-select">
            <option value="yes">Yes — Plan to work 20 hrs at cap-exempt entity + 20 hrs at private tech firm / startup</option>
            <option value="no">No — Exclusively full-time at the cap-exempt research institution</option>
          </select>
          <div class="form-hint">Once an approved cap-exempt H-1B is active, a second for-profit employer can file a concurrent petition without lottery!</div>
        </div>
      `;
    } else if (pathwayId === 'e2') {
      tagText = 'E-2 Treaty Investor Visa';
      titleText = 'Startup Entity & Capital Commitment';
      fieldsContainer.innerHTML = `
        <div class="form-section-title">Commercial Enterprise Structuring</div>

        <div class="form-group">
          <label class="form-label" for="inputE2Capital">Committed or Available At-Risk Capital ($)</label>
          <input type="number" id="inputE2Capital" class="form-input" step="5000" value="65000" required>
          <div class="form-hint">Typical minimum viability starts around $50,000–$75,000 for tech services and software consulting.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputE2Hiring">5-Year U.S. Job Creation Plan</label>
          <select id="inputE2Hiring" class="form-select">
            <option value="1_2">Plan to hire 1–2 U.S. full-time workers within 2 years</option>
            <option value="3_5">Plan to hire 3–5 U.S. full-time workers within 5 years</option>
            <option value="5_plus">Plan to hire 5+ employees</option>
          </select>
          <div class="form-hint">E-2 rules require proving the enterprise is not marginal (it will generate more than minimal living income).</div>
        </div>
      `;
    } else {
      // L-1
      tagText = 'L-1 Corporate Transferee Bridge';
      titleText = 'Multinational Employer & Relocation Details';
      fieldsContainer.innerHTML = `
        <div class="form-section-title">Corporate Transfer Pathway</div>

        <div class="form-group">
          <label class="form-label" for="inputL1Employer">Multinational Employer Name</label>
          <input type="text" id="inputL1Employer" class="form-input" placeholder="e.g. Google, Amazon, Microsoft, Stripe, Databricks" required>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputL1Location">Target Overseas Subsidiary Office</label>
          <select id="inputL1Location" class="form-select">
            <option value="canada">Canada (Vancouver / Toronto)</option>
            <option value="uk">United Kingdom (London)</option>
            <option value="ireland">Ireland (Dublin)</option>
            <option value="apac">APAC / Other International Subsidiary</option>
          </select>
        </div>
      `;
    }

    if (this.selectedPathwayTag) this.selectedPathwayTag.textContent = tagText;
    if (this.step3Title) this.step3Title.textContent = titleText;

    // Checkbox styling listener for O-1
    fieldsContainer.querySelectorAll('.criteria-item input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.target.closest('.criteria-item').classList.toggle('checked', e.target.checked);
      });
    });
  }

  handleStep3Submit() {
    const o1Checks = Array.from(document.querySelectorAll('input[name="o1Criteria"]:checked')).map(c => c.value);
    
    this.deepDiveDetails = {
      pathwayId: this.selectedPathway,
      o1Criteria: o1Checks,
      monthlyLiving: Number(this.inputMonthlyLiving.value) || 2800,
      targetFiling: document.getElementById('inputTargetFiling')?.value || 'moderate',
      niwDomain: document.getElementById('inputNiwDomain')?.value,
      niwEndeavor: document.getElementById('inputNiwEndeavorTitle')?.value,
      treatyRole: document.getElementById('inputTreatyRole')?.value,
      e2Capital: document.getElementById('inputE2Capital')?.value
    };

    // Update monthly living in profile
    this.profile.monthlyLiving = this.deepDiveDetails.monthlyLiving;
    this.saveProfile();
    this.saveDeepDive();

    this.renderReport();
    this.goToStep(4);
  }

  renderReport() {
    const p = this.profile;
    const reportData = generatePathwayReport(p, this.selectedPathway, this.deepDiveDetails);
    const container = this.reportContainer;
    if (!container) return;

    const timeline = reportData.timeline;

    container.innerHTML = `
      <!-- Header Banner -->
      <div class="report-header-banner">
        <div class="report-headline">
          <h2>Executive Strategy &amp; Financial Roadmap</h2>
          <p>
            Candidate: <strong>${p.degreeLevel} (${p.major})</strong> &bull; Citizenship: <strong>${p.nationality}</strong> &bull; Target: <strong>${this.getPathwayTitle(this.selectedPathway)}</strong>
          </p>
        </div>
        <div class="report-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btnExportCalendar">
            Export Deadlines (.ics)
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btnPrintReport">
            Print / Save PDF
          </button>
        </div>
      </div>

      <!-- Quick Executive Metrics Grid -->
      <div class="report-grid-summary">
        <div class="stat-pill">
          <span class="stat-label">Active Authorization</span>
          <span class="stat-val" style="color: #38bdf8;">${timeline.daysAuthRemaining} Days</span>
          <span style="font-size: 11px; color: var(--text-muted);">Through ${timeline.activeAuthorizationEnd.toLocaleDateString()}</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Allowable Unemployment</span>
          <span class="stat-val" style="color: ${timeline.unemploymentRemaining < 25 ? '#fb7185' : '#34d399'};">
            ${timeline.unemploymentRemaining} Days Left
          </span>
          <span style="font-size: 11px; color: var(--text-muted);">${timeline.unemploymentUsed} of ${timeline.maxUnemployment} days burned</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Total Estimated Budget</span>
          <span class="stat-val">$${reportData.totalEstimatedCost.toLocaleString()}</span>
          <span style="font-size: 11px; color: var(--text-muted);">Gov fees ($${reportData.totalGovernmentFees.toLocaleString()}) + Legal</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Financial Runway</span>
          <span class="stat-val" style="color: ${reportData.runwayMonths < 3 ? '#fb7185' : '#38bdf8'};">
            ${reportData.runwayMonths} Months
          </span>
          <span style="font-size: 11px; color: var(--text-muted);">Burn: $${reportData.totalMonthlyBurn.toLocaleString()}/mo</span>
        </div>
      </div>

      <!-- Section 1: Executive Strategy Brief -->
      <div class="report-section">
        <h3 class="report-section-title">1. Strategic Overview &amp; Legal Basis</h3>
        <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6;">
          ${reportData.strategyBrief}
        </p>

        <div class="callout-box info" style="margin-top: 14px;">
          <strong>Why this bypasses the H-1B lottery:</strong> Unlike the 85,000 annual lottery cap which faces ~75% rejection rates, the <strong>${this.getPathwayTitle(this.selectedPathway)}</strong> relies strictly on regulatory qualifications and bilateral treaties, providing year-round filing and expedited adjudication.
        </div>
      </div>

      <!-- Section 2: Status Runway & Critical Timing -->
      <div class="report-section">
        <h3 class="report-section-title">2. Status Runway &amp; Timeline Deadlines</h3>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
            <span>OPT Unemployment Fuel Level</span>
            <span style="font-family: var(--font-mono); color: var(--text-main);">${timeline.unemploymentUsed} / ${timeline.maxUnemployment} Days</span>
          </div>
          <div class="fuel-bar-wrap">
            <div class="fuel-bar-fill ${timeline.unemploymentBurnPercent > 65 ? 'danger' : timeline.unemploymentBurnPercent > 35 ? 'warning' : ''}" style="width: ${timeline.unemploymentBurnPercent}%;"></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px; color: var(--text-muted);">
          <div>
            <span style="color: var(--text-main); font-weight: 600;">Form I-765 Earliest Filing Date:</span><br>
            ${timeline.earliestOptFile.toLocaleDateString()} (90 days before graduation)
          </div>
          <div>
            <span style="color: var(--text-main); font-weight: 600;">Form I-765 Final Filing Deadline:</span><br>
            ${timeline.latestOptFile.toLocaleDateString()} (60 days post-graduation)
          </div>
          <div>
            <span style="color: var(--text-main); font-weight: 600;">Initial 12-Month OPT End Date:</span><br>
            ${timeline.optEnd.toLocaleDateString()}
          </div>
          <div>
            <span style="color: var(--text-main); font-weight: 600;">STEM OPT Extension Expiration:</span><br>
            ${timeline.isStem && timeline.stemEnd ? timeline.stemEnd.toLocaleDateString() : 'N/A (Non-STEM degree)'}
          </div>
        </div>
      </div>

      <!-- Section 3: Next Steps & Operational Milestones -->
      <div class="report-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 class="report-section-title" style="margin-bottom: 0;">3. Step-by-Step Action Plan</h3>
          <span style="font-size: 11px; color: var(--text-subtle);">Check off items as completed</span>
        </div>

        <div class="milestones-timeline">
          ${reportData.milestones.map(m => {
            const isDone = !!this.checkedMilestones[m.step];
            return `
              <div class="milestone-row ${isDone ? 'completed' : ''}" id="milestone-row-${m.step}">
                <input type="checkbox" class="milestone-checkbox" data-step="${m.step}" ${isDone ? 'checked' : ''}>
                <div class="milestone-info">
                  <div class="milestone-header-line">
                    <span class="milestone-title">Step ${m.step}: ${m.title}</span>
                    <span class="milestone-target">${m.targetDate}</span>
                  </div>
                  <p class="milestone-desc">${m.desc}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Section 4: Itemized Financial Budget -->
      <div class="report-section">
        <h3 class="report-section-title">4. Itemized Financial Breakdown &amp; Filing Budget</h3>
        
        <table class="finance-table">
          <thead>
            <tr>
              <th>Expense Item</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.governmentFees.map(f => `
              <tr>
                <td>${f.name}</td>
                <td class="amount-cell">$${f.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr>
              <td>Estimated Immigration Legal Counsel &amp; Brief Preparation</td>
              <td class="amount-cell">~$${reportData.estimatedLegalFee.toLocaleString()}</td>
            </tr>
            <tr class="finance-total-row">
              <td>Total Estimated Transition Capital Needed</td>
              <td class="amount-cell">$${reportData.totalEstimatedCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 16px; padding: 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); font-size: 12.5px; color: var(--text-muted);">
          <span>Liquid Savings: <strong>$${reportData.liquidSavings.toLocaleString()}</strong> &bull; Monthly Outflow: <strong>$${reportData.totalMonthlyBurn.toLocaleString()}/mo</strong> &bull; Runway: <strong>${reportData.runwayMonths} Months</strong></span>
        </div>
      </div>

      <!-- Section 5: Regulatory Compliance Guardrails -->
      <div class="report-section">
        <h3 class="report-section-title">5. Critical Compliance Guardrails &amp; Traps</h3>
        <ul style="font-size: 13px; color: var(--text-muted); padding-left: 20px; line-height: 1.6;">
          ${reportData.complianceTraps.map(trap => `<li>${trap}</li>`).join('')}
        </ul>
      </div>

      <!-- Navigation & Action Row -->
      <div class="btn-row" style="margin-top: 24px;">
        <button type="button" class="btn btn-secondary" id="btnBackToOptions">
          ← Change Visa Pathway
        </button>
        <button type="button" class="btn btn-secondary" id="btnEditProfileFromReport">
          Edit Profile Inputs
        </button>
      </div>
    `;

    // Bind report events
    document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());
    document.getElementById('btnExportCalendar')?.addEventListener('click', () => this.exportCalendar(reportData));
    document.getElementById('btnBackToOptions')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('btnEditProfileFromReport')?.addEventListener('click', () => this.goToStep(1));

    // Bind milestone checkboxes
    container.querySelectorAll('.milestone-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const stepNum = e.target.dataset.step;
        this.checkedMilestones[stepNum] = e.target.checked;
        this.saveMilestones();
        const row = document.getElementById(`milestone-row-${stepNum}`);
        if (row) row.classList.toggle('completed', e.target.checked);
      });
    });
  }

  getPathwayTitle(id) {
    const titles = {
      o1a: 'O-1A Extraordinary Ability Visa',
      eb2niw: 'EB-2 NIW (National Interest Waiver)',
      treaty: 'Treaty Specialty Visa (TN / E-3 / H-1B1)',
      cap_exempt: 'Cap-Exempt H-1B Institutional Sponsor',
      e2: 'E-2 Treaty Investor Visa',
      l1: 'L-1 Intra-Company Transferee Bridge'
    };
    return titles[id] || 'Non-Lottery Pathway';
  }

  exportCalendar(reportData) {
    const timeline = reportData.timeline;
    let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//F1Navigator//Strategy Engine//EN\r\n";

    const addEvent = (title, date, desc) => {
      const dStr = date.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 8);
      ics += "BEGIN:VEVENT\r\n";
      ics += `SUMMARY:F1 Navigator: ${title}\r\n`;
      ics += `DESCRIPTION:${desc.replace(/\n/g, '\\n')}\r\n`;
      ics += `DTSTART;VALUE=DATE:${dStr}\r\n`;
      ics += `DTEND;VALUE=DATE:${dStr}\r\n`;
      ics += "STATUS:CONFIRMED\r\n";
      ics += "END:VEVENT\r\n";
    };

    addEvent("Earliest Form I-765 Filing Window (90d Pre-Grad)", timeline.earliestOptFile, "Submit OPT request to DSO and file Form I-765 online with USCIS.");
    addEvent("Official Graduation Date", timeline.gradDate, "Graduation milestone.");
    addEvent("Latest Form I-765 Filing Deadline", timeline.latestOptFile, "USCIS must receive Form I-765 within 60 days of graduation and within 30 days of DSO I-20 signature.");
    addEvent("OPT 12-Month Expiration", timeline.optEnd, "Initial work authorization end date. Must have STEM extension or non-lottery petition active.");

    if (timeline.isStem && timeline.stemEnd) {
      addEvent("STEM OPT Filing Window Opens", timeline.stemFilingWindowStart, "Submit Form I-983 to DSO to obtain STEM recommendation I-20.");
      addEvent("STEM OPT 24-Month Expiration", timeline.stemEnd, "Final OPT deadline. Transition must be fully approved.");
    }

    ics += "END:VCALENDAR\r\n";

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `F1Navigator_${this.selectedPathway || 'Immigration'}_Roadmap.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.f1Navigator = new F1Navigator();
});
