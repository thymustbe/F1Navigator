// F1 Navigator - Core Application Controller
import { CIP_STEM_MAJORS, O1A_CRITERIA, NIW_PRONGS, USCIS_FEE_SCHEDULE } from './data.js';
import { calculateTimeline, isEligibleForTreaty, evaluatePathwayRecommendations, generatePathwayReport } from './calculator.js';

// Google Sheets Web App Endpoint (Paste your deployed Google Apps Script URL here)
export const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx4ubXWbSQS22_-bg5D15RDWHqIsxC755RWj4_QN8sorJIhO3zZAggbjXEERPX1eIoV/exec";

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
      try { return JSON.parse(saved); } catch (e) { }
    }
    // Clean default state for a student
    const nextYear = new Date().getFullYear() + 1;
    return {
      fullName: "",
      email: "",
      degreeLevel: "Master's",
      major: "Computer Science & Software Engineering",
      stemEligible: true,
      nationality: "",
      graduationDate: `${nextYear}-05-15`,
      optStartDate: "",
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
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {};
  }

  loadStoredMilestones() {
    const saved = localStorage.getItem('f1_nav_milestones');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
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
    this.inputFullName = document.getElementById('inputFullName');
    this.inputEmail = document.getElementById('inputEmail');
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
    this.btnExportLeads = document.getElementById('btnExportLeads');
    this.leadCounter = document.getElementById('leadCounter');
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

    // Step 1 Immediate Auto-Capture on Name / Email Entry
    if (this.inputEmail) {
      const triggerImmediateCapture = () => {
        const email = this.inputEmail.value.trim();
        const name = this.inputFullName ? this.inputFullName.value.trim() : "";
        if (email.includes('@') && email.includes('.')) {
          this.recordImmediateLead(name, email);
        }
      };

      this.inputEmail.addEventListener('blur', triggerImmediateCapture);
      this.inputEmail.addEventListener('change', triggerImmediateCapture);
    }

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

    // Lead CSV Export button
    if (this.btnExportLeads) {
      this.btnExportLeads.addEventListener('click', () => this.exportLeadsCSV());
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
    if (this.inputFullName) this.inputFullName.value = p.fullName || "";
    if (this.inputEmail) this.inputEmail.value = p.email || "";
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

    this.updateLeadCounter();

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
    const gradDate = gradDateStr ? new Date(gradDateStr) : new Date();
    const optStartStr = this.inputOptStart.value;
    // If user does not have EAD ready, estimate start 60 days post-graduation
    const optStart = optStartStr ? new Date(optStartStr) : new Date(gradDate.getTime() + 60 * 86400000);
    const optEnd = new Date(optStart.getTime() + 365 * 86400000);
    const stemEnd = isStem ? new Date(optEnd.getTime() + 730 * 86400000) : null;

    this.profile = {
      fullName: this.inputFullName ? this.inputFullName.value.trim() : "",
      email: this.inputEmail ? this.inputEmail.value.trim() : "",
      degreeLevel: this.inputDegree.value,
      major: this.inputMajor.value,
      stemEligible: isStem,
      nationality: this.inputNationality.value.trim(),
      graduationDate: gradDateStr,
      optStartDate: optStartStr || "",
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
    this.recordLead(this.profile);
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
          <strong style="color: var(--brand-charcoal);">${p.degreeLevel}</strong> in ${p.major}
          &bull; <span>${p.stemEligible ? 'STEM Track (+24 Mos Extension)' : 'Standard 12 Mos OPT'}</span>
        </div>
        <div>
          Citizenship: <strong style="color: var(--brand-charcoal);">${p.nationality}</strong>
          ${treatyCheck.hasTreaty ? `<span style="margin-left: 6px; padding: 3px 8px; border-radius: var(--radius-sm); background: rgba(20, 74, 134, 0.08); color: var(--brand-cobalt); font-weight: 600; font-size: 11px; border: 1px solid var(--primary-border);">${treatyCheck.visaType.split(' ')[0]} Treaty Eligible</span>` : ''}
        </div>
      `;
    }

    if (!this.pathwaysContainer) return;

    this.pathwaysContainer.innerHTML = recommendations.map(item => `
      <div class="pathway-card" id="card-pathway-${item.id}">
        <div class="pathway-card-top">
          <div class="pathway-title-group">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
              <span class="pathway-category">${item.category}</span>
              <span class="location-badge ${item.isOutOfUs ? 'out-of-us' : 'in-us'}">${item.locationTag || (item.isOutOfUs ? '(Out of U.S. Pathway)' : 'Ways to Stay in the U.S.')}</span>
            </div>
            <h3>${item.name}</h3>
          </div>
          <div class="score-badge">
            <span class="score-num">${item.matchScore}%</span>
            <span class="score-text">Match</span>
          </div>
        </div>

        <p class="pathway-summary">${item.summary}</p>

        <div class="pathway-reasons-box">
          <strong>Why this fits your profile:</strong> ${item.whyYouQualify}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 12.5px; margin: 4px 0;">
          <div>
            <span style="color: var(--brand-sea-green); font-weight: 700;">Strategic Advantages:</span>
            <ul style="padding-left: 16px; color: var(--text-muted); margin-top: 4px; line-height: 1.5;">
              ${item.pros.map(pro => `<li>${pro}</li>`).join('')}
            </ul>
          </div>
          <div>
            <span style="color: var(--brand-charcoal); font-weight: 700;">Key Considerations:</span>
            <ul style="padding-left: 16px; color: var(--text-muted); margin-top: 4px; line-height: 1.5;">
              ${item.cons.map(con => `<li>${con}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="pathway-card-footer">
          <span>Estimated Filing Timeline: <strong style="color: var(--brand-charcoal);">${item.estimatedTimeline}</strong></span>
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
        <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 14px;">
          USCIS regulations require establishing at least <strong>3 out of 8 regulatory criteria</strong> followed by a Kazarian final merits determination. Check your existing evidence or targeted areas:
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
      <!-- Header Banner with INVISA Branding -->
      <div class="report-header-banner">
        <div class="report-headline">
          <div class="report-tagline">F1 Navigator &bull; Executive Brief</div>
          <h2>Strategic Action Plan &amp; Financial Runway</h2>
          <p>
            Candidate: <strong>${p.fullName ? p.fullName + ' &bull; ' : ''}${p.degreeLevel} (${p.major})</strong>
            ${p.email ? `&bull; Email: <strong>${p.email}</strong>` : ''}
            &bull; Citizenship: <strong>${p.nationality}</strong>
            <br>
            Target Pathway: <strong>${this.getPathwayTitle(this.selectedPathway)}</strong>
            <span class="location-badge ${reportData.isOutOfUs ? 'out-of-us' : 'in-us'}" style="margin-left: 8px; font-size: 11px;">${reportData.locationTag || (reportData.isOutOfUs ? '(Out of U.S. Pathway)' : 'Ways to Stay in the U.S.')}</span>
          </p>
        </div>
        <div class="report-actions">
          <button type="button" class="btn btn-primary btn-sm" id="btnJumpToEmail">
            ✉ Email My Report
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btnExportCalendar">
            Export Deadlines (.ics)
          </button>
          <button type="button" class="btn btn-accent btn-sm" id="btnPrintReport">
            Print / Save PDF
          </button>
        </div>
      </div>

      <!-- Quick Executive Metrics Grid -->
      <div class="report-grid-summary">
        <div class="stat-pill">
          <span class="stat-label">Active Work Authorization</span>
          <span class="stat-val" style="color: var(--brand-cobalt);">${timeline.daysAuthRemaining} Days</span>
          <span style="font-size: 11px; color: var(--text-muted);">Through ${timeline.activeAuthorizationEnd.toLocaleDateString()}</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Allowable Unemployment</span>
          <span class="stat-val" style="color: ${timeline.unemploymentRemaining < 25 ? 'var(--danger)' : 'var(--brand-sea-green)'};">
            ${timeline.unemploymentRemaining} Days Cushion
          </span>
          <span style="font-size: 11px; color: var(--text-muted);">${timeline.unemploymentUsed} of ${timeline.maxUnemployment} days burned</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Estimated Transition Capital</span>
          <span class="stat-val" style="color: var(--brand-cobalt);">$${reportData.totalEstimatedCost.toLocaleString()}</span>
          <span style="font-size: 11px; color: var(--text-muted);">Gov fees ($${reportData.totalGovernmentFees.toLocaleString()}) + Legal</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Financial Runway</span>
          <span class="stat-val" style="color: ${reportData.runwayMonths < 3 ? 'var(--danger)' : 'var(--brand-sea-green)'};">
            ${reportData.runwayMonths} Months
          </span>
          <span style="font-size: 11px; color: var(--text-muted);">Burn: $${reportData.totalMonthlyBurn.toLocaleString()}/mo</span>
        </div>
      </div>

      <!-- Section 1: Executive Strategy Brief -->
      <div class="report-section">
        <h3 class="report-section-title">1. Strategic Overview &amp; Regulatory Basis</h3>
        <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
          ${reportData.strategyBrief}
        </p>

        <div class="callout-box info" style="margin-top: 16px;">
          <strong>Why this bypasses the general H-1B lottery:</strong> Unlike the annual 85,000 cap which faces heavy lottery rejection rates, the <strong>${this.getPathwayTitle(this.selectedPathway)}</strong> relies strictly on merit-based regulatory qualifications or bilateral treaties under Title 8 CFR, enabling year-round filing and expedited adjudication.
        </div>
      </div>

      <!-- Section 2: Status Runway & Critical Timing -->
      <div class="report-section">
        <h3 class="report-section-title">2. Status Runway &amp; Critical Filing Windows</h3>
        
        <div style="margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span>OPT Unemployment Reserve</span>
            <span style="font-family: var(--font-h2); color: var(--brand-charcoal); font-weight: 600;">${timeline.unemploymentUsed} / ${timeline.maxUnemployment} Days Used</span>
          </div>
          <div class="fuel-bar-wrap">
            <div class="fuel-bar-fill ${timeline.unemploymentBurnPercent > 65 ? 'danger' : timeline.unemploymentBurnPercent > 35 ? 'warning' : ''}" style="width: ${timeline.unemploymentBurnPercent}%;"></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13.5px; color: var(--text-muted);">
          <div style="background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="color: var(--brand-charcoal); font-weight: 600;">Form I-765 Earliest Filing Date:</span><br>
            ${timeline.earliestOptFile.toLocaleDateString()} (90 days before graduation)
          </div>
          <div style="background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="color: var(--brand-charcoal); font-weight: 600;">Form I-765 Final Filing Deadline:</span><br>
            ${timeline.latestOptFile.toLocaleDateString()} (60 days post-graduation)
          </div>
          <div style="background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="color: var(--brand-charcoal); font-weight: 600;">Initial 12-Month OPT End Date:</span><br>
            ${timeline.optEnd.toLocaleDateString()}
          </div>
          <div style="background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="color: var(--brand-charcoal); font-weight: 600;">STEM OPT Extension Expiration:</span><br>
            ${timeline.isStem && timeline.stemEnd ? timeline.stemEnd.toLocaleDateString() : 'N/A (Standard 12-Month Degree)'}
          </div>
        </div>
      </div>

      <!-- Section 3: Next Steps & Operational Milestones -->
      <div class="report-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 class="report-section-title" style="margin-bottom: 0;">3. Step-by-Step Action Plan</h3>
          <span style="font-size: 11.5px; color: var(--text-subtle); font-family: var(--font-h2);">Check items off as completed</span>
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
        <h3 class="report-section-title">4. Itemized Transition Capital &amp; Filing Budget</h3>
        
        <table class="finance-table">
          <thead>
            <tr>
              <th>Expense Item</th>
              <th style="text-align: right;">Estimated Cost</th>
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
              <td>Estimated Immigration Legal Counsel &amp; Evidentiary Brief Preparation</td>
              <td class="amount-cell">~$${reportData.estimatedLegalFee.toLocaleString()}</td>
            </tr>
            <tr class="finance-total-row">
              <td>Total Estimated Transition Capital Needed</td>
              <td class="amount-cell">$${reportData.totalEstimatedCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 5: Financial Safety Net & Monthly Runway Analysis -->
      <div class="report-section">
        <h3 class="report-section-title">5. Financial Safety Net (Runway)</h3>
        
        <div class="callout-box ${reportData.runwayMonths < 3 ? 'warning' : 'success'}">
          <div style="font-weight: 700; margin-bottom: 4px; font-size: 14px;">
            Financial Safety Net (Runway): ${reportData.runwayMonths} Months of Cushion
          </div>
          <div>${reportData.safetyNetMessage}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 14px; font-size: 13px;">
          <div style="padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-subtle); font-weight: 600;">Liquid Savings</div>
            <div style="font-size: 16px; font-weight: 700; color: var(--brand-charcoal); margin-top: 2px;">$${reportData.liquidSavings.toLocaleString()}</div>
          </div>
          <div style="padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-subtle); font-weight: 600;">Monthly Living Cost</div>
            <div style="font-size: 16px; font-weight: 700; color: var(--brand-charcoal); margin-top: 2px;">$${reportData.monthlyLiving.toLocaleString()}</div>
          </div>
          <div style="padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-subtle); font-weight: 600;">Monthly Healthcare Buffer</div>
            <div style="font-size: 16px; font-weight: 700; color: var(--brand-charcoal); margin-top: 2px;">$${reportData.healthcareGap.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <!-- Section 6: Regulatory Compliance Guardrails -->
      <div class="report-section">
        <h3 class="report-section-title">6. Critical Regulatory Safeguards</h3>
        <ul style="font-size: 13.5px; color: var(--text-muted); padding-left: 20px; line-height: 1.65;">
          ${reportData.complianceTraps.map(trap => `<li>${trap}</li>`).join('')}
        </ul>
      </div>

      <!-- Section 7: Save & Email Strategic Roadmap -->
      <div class="report-section" id="reportEmailSection" style="background: linear-gradient(135deg, rgba(20, 74, 134, 0.05) 0%, rgba(162, 188, 227, 0.12) 100%); border: 1.5px solid var(--primary-border);">
        <h3 class="report-section-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <span>7. Delivery &amp; Ongoing Strategy Alerts</span>
          <span class="location-badge in-us" style="font-size: 11px;">Save Assessment</span>
        </h3>
        <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 16px;">
          Lock in your personalized filing calendar, operational milestones, and budget forecast. Enter your details to record your assessment and receive future status updates:
        </p>

        <form id="reportEmailForm" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: end;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="reportInputName" style="font-size: 12px;">Full Name</label>
            <input type="text" id="reportInputName" class="form-input" placeholder="e.g. Alex Chen" value="${p.fullName || ''}" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="reportInputEmail" style="font-size: 12px;">Email Address</label>
            <input type="email" id="reportInputEmail" class="form-input" placeholder="e.g. alex@university.edu" value="${p.email || ''}" required>
          </div>
          <button type="submit" class="btn btn-primary" id="btnSubmitReportEmail" style="white-space: nowrap; height: 42px;">
            ✉ Email &amp; Save Roadmap
          </button>
        </form>

        <div id="emailConfirmationAlert" style="display: none; margin-top: 14px; padding: 12px 16px; border-radius: var(--radius-sm); background: rgba(13, 131, 65, 0.12); border: 1px solid var(--brand-sea-green); color: var(--brand-sea-green); font-size: 13.5px; font-weight: 500;">
          <!-- Injected via JS -->
        </div>
      </div>

      <!-- Navigation & Action Row -->
      <div class="btn-row" style="margin-top: 26px;">
        <button type="button" class="btn btn-secondary" id="btnBackToOptions">
          ← Change Visa Pathway
        </button>
        <button type="button" class="btn btn-secondary" id="btnEditProfileFromReport">
          Adjust Profile Inputs
        </button>
      </div>
    `;

    // Bind report events
    document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());
    document.getElementById('btnExportCalendar')?.addEventListener('click', () => this.exportCalendar(reportData));
    document.getElementById('btnBackToOptions')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('btnEditProfileFromReport')?.addEventListener('click', () => this.goToStep(1));

    // Jump to Email Section Button
    document.getElementById('btnJumpToEmail')?.addEventListener('click', () => {
      const emailSec = document.getElementById('reportEmailSection');
      if (emailSec) {
        emailSec.scrollIntoView({ behavior: 'smooth' });
        const emailInput = document.getElementById('reportInputEmail');
        if (emailInput && !emailInput.value) emailInput.focus();
      }
    });

    // Report Email Form Submission
    const reportEmailForm = document.getElementById('reportEmailForm');
    if (reportEmailForm) {
      reportEmailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredName = document.getElementById('reportInputName')?.value.trim() || '';
        const enteredEmail = document.getElementById('reportInputEmail')?.value.trim() || '';

        this.profile.fullName = enteredName;
        this.profile.email = enteredEmail;
        this.saveProfile();
        this.recordLead(this.profile, this.selectedPathway, true);

        const alertBox = document.getElementById('emailConfirmationAlert');
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.innerHTML = `
            <strong>✓ Strategic Roadmap Saved &amp; Queued!</strong><br>
            A copy of your <strong>${this.getPathwayTitle(this.selectedPathway)}</strong> action plan, filing timeline, and financial runway has been saved for <strong>${enteredEmail}</strong>.
          `;
          alertBox.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

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

  loadLeads() {
    const raw = localStorage.getItem('f1_nav_leads');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { }
    }
    return [];
  }

  saveLeads(leads) {
    localStorage.setItem('f1_nav_leads', JSON.stringify(leads));
    this.updateLeadCounter();
  }

  recordImmediateLead(name, email) {
    if (!email || this.lastDispatchedEmail === email) return;
    this.lastDispatchedEmail = email;

    const leadData = {
      fullName: name || 'Incomplete Profile Candidate',
      email: email,
      degreeLevel: this.inputDegree ? this.inputDegree.value : "Master's",
      major: this.inputMajor ? this.inputMajor.value : "STEM Field",
      nationality: this.inputNationality && this.inputNationality.value ? this.inputNationality.value : "Pending Selection",
      selectedPathway: "Step 1 (In Progress)",
      timestamp: new Date().toLocaleString(),
      optStartDate: this.inputOptStart && this.inputOptStart.value ? this.inputOptStart.value : "Pending EAD",
      graduationDate: this.inputGradDate && this.inputGradDate.value ? this.inputGradDate.value : "Not specified",
      liquidSavings: this.inputSavings ? Number(this.inputSavings.value) || 0 : 0
    };

    // Save in local vault
    const leads = this.loadLeads();
    const existingIndex = leads.findIndex(l => l.email && l.email.toLowerCase() === email.toLowerCase());
    if (existingIndex >= 0) {
      leads[existingIndex] = { ...leads[existingIndex], ...leadData };
    } else {
      leads.push(leadData);
    }
    this.saveLeads(leads);

    // Send immediately to Google Sheets
    if (GOOGLE_SHEETS_WEBHOOK_URL && GOOGLE_SHEETS_WEBHOOK_URL.trim() !== "") {
      try {
        fetch(GOOGLE_SHEETS_WEBHOOK_URL.trim(), {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(leadData)
        }).catch(err => console.warn("Google Sheets auto-capture note:", err));
      } catch (err) {
        console.warn("Google Sheets network dispatch error:", err);
      }
    }
  }

  recordLead(profile, pathway = null, sendEmail = false) {
    if (!profile.email && !profile.fullName) return;
    const leads = this.loadLeads();
    const existingIndex = leads.findIndex(l => l.email && l.email.toLowerCase() === (profile.email || '').toLowerCase());
    const leadData = {
      fullName: profile.fullName || 'Anonymous Candidate',
      email: profile.email || 'N/A',
      degreeLevel: profile.degreeLevel || "Master's",
      major: profile.major || 'STEM Field',
      nationality: profile.nationality || 'Unspecified',
      selectedPathway: pathway ? this.getPathwayTitle(pathway) : (this.selectedPathway ? this.getPathwayTitle(this.selectedPathway) : 'Pending Selection'),
      timestamp: new Date().toLocaleString(),
      optStartDate: profile.optStartDate || 'Pending EAD',
      graduationDate: profile.graduationDate || '',
      liquidSavings: profile.liquidSavings || 0,
      sendEmail: !!sendEmail
    };

    if (existingIndex >= 0 && profile.email) {
      leads[existingIndex] = { ...leads[existingIndex], ...leadData };
    } else {
      leads.push(leadData);
    }
    this.saveLeads(leads);

    // Real-Time Dispatch to Google Sheets Webhook
    if (GOOGLE_SHEETS_WEBHOOK_URL && GOOGLE_SHEETS_WEBHOOK_URL.trim() !== "") {
      try {
        fetch(GOOGLE_SHEETS_WEBHOOK_URL.trim(), {
          method: "POST",
          mode: "no-cors", // Bypass CORS preflight in client browsers
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(leadData)
        }).catch(err => console.warn("Google Sheets submission note:", err));
      } catch (err) {
        console.warn("Google Sheets network dispatch error:", err);
      }
    }
  }

  updateLeadCounter() {
    if (!this.leadCounter) return;
    const count = this.loadLeads().length;
    this.leadCounter.textContent = `${count}`;
  }

  exportLeadsCSV() {
    const leads = this.loadLeads();
    if (!leads.length) {
      alert('No candidate leads collected yet. When candidates enter their Name & Email in Step 1 or Step 4, they will automatically be recorded here.');
      return;
    }
    const headers = ['Full Name', 'Email', 'Degree', 'Major', 'Citizenship', 'Target Pathway', 'Graduation Date', 'OPT / EAD Start', 'Liquid Savings ($)', 'Recorded Timestamp'];
    const rows = leads.map(l => [
      `"${(l.fullName || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.degreeLevel || '').replace(/"/g, '""')}"`,
      `"${(l.major || '').replace(/"/g, '""')}"`,
      `"${(l.nationality || '').replace(/"/g, '""')}"`,
      `"${(l.selectedPathway || '').replace(/"/g, '""')}"`,
      `"${(l.graduationDate || '').replace(/"/g, '""')}"`,
      `"${(l.optStartDate || '').replace(/"/g, '""')}"`,
      l.liquidSavings || 0,
      `"${l.timestamp || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `F1Navigator_Candidate_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.f1Navigator = new F1Navigator();
});
