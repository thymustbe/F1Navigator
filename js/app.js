// F1 Navigator - Core Application Controller
import { CIP_STEM_MAJORS, O1A_CRITERIA, NIW_PRONGS, USCIS_FEE_SCHEDULE } from './data.js';
import { calculateTimeline, isEligibleForTreaty, evaluatePathwayRecommendations, generatePathwayReport } from './calculator.js';
import { downloadDocxReport } from './docxExport.js';
import { downloadPngReport } from './pngExport.js';

// Google Sheets Web App Endpoint (Optional Lead Record Storage)
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
    // Stepper indicators & Views
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

    this.selectedPathwayTag = document.getElementById('selectedPathwayTag');
    this.step3Title = document.getElementById('step3Title');
    this.deepDiveDynamicFields = document.getElementById('deepDiveDynamicFields');
    this.deepDiveForm = document.getElementById('deepDiveForm');
    this.inputMonthlyLiving = document.getElementById('inputMonthlyLiving');

    this.reportContainer = document.getElementById('reportContainer');
    this.btnResetAll = document.getElementById('btnResetAll');
    this.btnOpenFaq = document.getElementById('btnOpenFaq');
    this.faqModalOverlay = document.getElementById('faqModalOverlay');
    this.faqModalClose = document.getElementById('faqModalClose');

    // Main Site Dropdown Menu
    this.btnSiteMenu = document.getElementById('btnSiteMenu');
    this.siteMenuWrap = document.getElementById('siteMenuWrap');
    this.siteMenuDropdown = document.getElementById('siteMenuDropdown');

    // Web App Dock Controls
    this.appBottomDock = document.getElementById('appBottomDock');
    this.dockBtnBack = document.getElementById('dockBtnBack');
    this.dockStepIndicator = document.getElementById('dockStepIndicator');
    this.dockNextGroup = document.getElementById('dockNextGroup');
    this.dockBtnNext = document.getElementById('dockBtnNext');
  }

  bindEvents() {
    // Stepper header navigation
    this.stepIndicators.forEach(item => {
      item.addEventListener('click', () => {
        const targetStep = Number(item.dataset.step);
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
          localStorage.removeItem('f1_nav_step');
          window.location.reload();
        }
      });
    }

    // FAQ Modal Open / Close
    if (this.btnOpenFaq && this.faqModalOverlay) {
      this.btnOpenFaq.addEventListener('click', () => {
        this.faqModalOverlay.classList.add('open');
      });
    }
    if (this.faqModalClose && this.faqModalOverlay) {
      this.faqModalClose.addEventListener('click', () => {
        this.faqModalOverlay.classList.remove('open');
      });
    }
    if (this.faqModalOverlay) {
      this.faqModalOverlay.addEventListener('click', (e) => {
        if (e.target === this.faqModalOverlay) {
          this.faqModalOverlay.classList.remove('open');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.faqModalOverlay.classList.contains('open')) {
          this.faqModalOverlay.classList.remove('open');
        }
      });
    }

    // Main Site Dropdown Menu Toggle
    if (this.btnSiteMenu && this.siteMenuWrap) {
      this.btnSiteMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = this.siteMenuWrap.classList.toggle('open');
        this.btnSiteMenu.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', (e) => {
        if (this.siteMenuWrap.classList.contains('open') && !this.siteMenuWrap.contains(e.target)) {
          this.siteMenuWrap.classList.remove('open');
          this.btnSiteMenu.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.siteMenuWrap.classList.contains('open')) {
          this.siteMenuWrap.classList.remove('open');
          this.btnSiteMenu.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Web App Dock: Back Button
    if (this.dockBtnBack) {
      this.dockBtnBack.addEventListener('click', () => {
        if (this.currentStep === 2) this.goToStep(1);
        else if (this.currentStep === 3) this.goToStep(2);
        else if (this.currentStep === 4) this.goToStep(3);
      });
    }

    // Web App Dock: Next Button delegation
    if (this.dockNextGroup) {
      this.dockNextGroup.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('button');
        if (!targetBtn) return;

        if (targetBtn.id === 'dockBtnNext') {
          if (this.currentStep === 1) {
            if (this.profileForm.reportValidity()) {
              this.handleStep1Submit();
            }
          } else if (this.currentStep === 2) {
            const pathwayToUse = this.selectedPathway || 'o1a';
            this.handlePathwaySelection(pathwayToUse);
          } else if (this.currentStep === 3) {
            if (this.deepDiveForm.reportValidity()) {
              this.handleStep3Submit();
            }
          }
        } else if (targetBtn.id === 'dockBtnDownloadPng') {
          const reportData = generatePathwayReport(this.profile, this.selectedPathway, this.deepDiveDetails);
          downloadPngReport(this.profile, reportData, this.getPathwayTitle(this.selectedPathway));
        } else if (targetBtn.id === 'dockBtnDownloadDocx') {
          const reportData = generatePathwayReport(this.profile, this.selectedPathway, this.deepDiveDetails);
          downloadDocxReport(this.profile, reportData, this.getPathwayTitle(this.selectedPathway));
        }
      });
    }
  }

  updateStemPill(isStem) {
    if (!this.stemPill) return;
    if (isStem) {
      this.stemPill.textContent = 'STEM Eligible (+24 Mos)';
      this.stemPill.style.background = 'rgba(13, 131, 65, 0.1)';
      this.stemPill.style.color = 'var(--brand-sea-green)';
    } else {
      this.stemPill.textContent = 'Non-STEM (12 Mos Total)';
      this.stemPill.style.background = 'rgba(245, 184, 25, 0.15)';
      this.stemPill.style.color = '#B45309';
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

    if (p.careerTrack) {
      this.trackCards.forEach(c => {
        c.classList.toggle('selected', c.dataset.value === p.careerTrack);
      });
      if (this.inputCareerTrack) this.inputCareerTrack.value = p.careerTrack;
    }

    if (this.inputMajor) {
      const selectedOpt = this.inputMajor.selectedOptions[0];
      if (selectedOpt) this.updateStemPill(selectedOpt.dataset.stem === 'true');
    }

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

    // Update Stepper Navigation
    this.stepIndicators.forEach(item => {
      const s = Number(item.dataset.step);
      item.classList.toggle('active', s === stepNumber);
      item.classList.toggle('completed', s < stepNumber);
    });

    // Toggle Step Views
    this.stepViews.forEach((view, idx) => {
      view.classList.toggle('active', idx + 1 === stepNumber);
    });

    // Update Persistent Bottom Dock
    this.updateBottomDock(stepNumber);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateBottomDock(stepNumber) {
    if (!this.appBottomDock) return;

    // Back Button State
    if (this.dockBtnBack) {
      if (stepNumber === 1) {
        this.dockBtnBack.classList.add('hidden');
        this.dockBtnBack.disabled = true;
      } else {
        this.dockBtnBack.classList.remove('hidden');
        this.dockBtnBack.disabled = false;
        if (stepNumber === 4) {
          this.dockBtnBack.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Back to Strategy</span>
          `;
        } else {
          this.dockBtnBack.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Back</span>
          `;
        }
      }
    }

    // Step Indicator Text
    if (this.dockStepIndicator) {
      const stepNames = {
        1: 'Profile',
        2: 'Visa Matches',
        3: 'Tailor Strategy',
        4: 'Strategic Report'
      };
      this.dockStepIndicator.textContent = `Step ${stepNumber} of 4 • ${stepNames[stepNumber] || ''}`;
    }

    // Right Action Buttons in Dock
    if (this.dockNextGroup) {
      if (stepNumber === 1) {
        this.dockNextGroup.innerHTML = `
          <button type="button" class="dock-btn-next" id="dockBtnNext">
            <span>Next: Visa Matches</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        `;
      } else if (stepNumber === 2) {
        this.dockNextGroup.innerHTML = `
          <button type="button" class="dock-btn-next" id="dockBtnNext">
            <span>Next: Tailor Strategy</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        `;
      } else if (stepNumber === 3) {
        this.dockNextGroup.innerHTML = `
          <button type="button" class="dock-btn-next" id="dockBtnNext">
            <span>Next: Generate Report</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        `;
      } else if (stepNumber === 4) {
        this.dockNextGroup.innerHTML = `
          <button type="button" class="dock-btn-next" id="dockBtnDownloadPng" title="Download High-Resolution PNG graphic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Download .PNG</span>
          </button>
          <button type="button" class="dock-btn-secondary" id="dockBtnDownloadDocx" title="Download Editable Microsoft Word document">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Download .DOCX</span>
          </button>
        `;
      }
    }
  }

  handleStep1Submit() {
    const selectedMajorOpt = this.inputMajor.selectedOptions[0];
    const isStem = selectedMajorOpt.dataset.stem === 'true';

    const gradDateStr = this.inputGradDate.value;
    const gradDate = gradDateStr ? new Date(gradDateStr) : new Date();
    const optStartStr = this.inputOptStart.value;
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

    if (!this.selectedPathway && recommendations.length > 0) {
      this.selectedPathway = recommendations[0].id;
    }

    this.pathwaysContainer.innerHTML = recommendations.map(item => {
      const isSelected = this.selectedPathway === item.id;
      return `
        <div class="pathway-card ${isSelected ? 'selected' : ''}" id="card-pathway-${item.id}">
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

          <div class="pathway-pros-cons">
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
      `;
    }).join('');

    // Bind card selection
    this.pathwaysContainer.querySelectorAll('.btn-select-pathway').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pathwayId = e.currentTarget.dataset.id;
        this.handlePathwaySelection(pathwayId);
      });
    });

    this.pathwaysContainer.querySelectorAll('.pathway-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = card.id.replace('card-pathway-', '');
        this.selectedPathway = id;
        this.pathwaysContainer.querySelectorAll('.pathway-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
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
            <option value="ai">Artificial Intelligence &amp; Machine Learning</option>
            <option value="quantum">Quantum Computing &amp; Microelectronics</option>
            <option value="biotech">Biotechnology, Genomics &amp; Healthcare</option>
            <option value="clean_energy">Clean Energy &amp; Climate Technologies</option>
            <option value="cyber">Cybersecurity &amp; Critical Infrastructure</option>
            <option value="other">Other High-Impact Scientific/Technical Field</option>
          </select>
          <div class="form-hint">Aligning directly with White House Critical &amp; Emerging Technologies provides substantial evidentiary weight.</div>
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
    const pathwayTitle = this.getPathwayTitle(this.selectedPathway);

    container.innerHTML = `
      <!-- Header Banner with INVISA Branding -->
      <div class="report-header-banner">
        <div class="report-headline">
          <div class="report-tagline">F1 Navigator &bull; Executive Brief</div>
          <h2>Strategic Action Plan &amp; Financial Runway</h2>
          <p>
            Candidate: <strong>${p.fullName ? p.fullName + ' &bull; ' : ''}${p.degreeLevel} (${p.major})</strong>
            &bull; Citizenship: <strong>${p.nationality}</strong>
            <br>
            Target Pathway: <strong>${pathwayTitle}</strong>
            <span class="location-badge ${reportData.isOutOfUs ? 'out-of-us' : 'in-us'}" style="margin-left: 8px; font-size: 11px;">${reportData.locationTag || (reportData.isOutOfUs ? '(Out of U.S. Pathway)' : 'Ways to Stay in the U.S.')}</span>
          </p>
        </div>
        <div class="report-actions">
          <button type="button" class="btn btn-primary btn-sm" id="btnDownloadPng">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Download .PNG
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btnDownloadDocx">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Download .DOCX
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
          <strong>Why this bypasses the general H-1B lottery:</strong> Unlike the annual 85,000 cap which faces heavy lottery rejection rates, the <strong>${pathwayTitle}</strong> relies strictly on merit-based regulatory qualifications or bilateral treaties under Title 8 CFR, enabling year-round filing and expedited adjudication.
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

        <div class="filing-dates-grid">
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
        
        <div class="table-responsive-wrap">
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

        <div class="runway-metrics-grid">
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

      <!-- Section 7: Export & Offline Downloads Center (Replaces Email Sending) -->
      <div class="report-export-center">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="font-family: var(--font-h2); font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--brand-cobalt); font-weight: 700;">Direct File Downloads</span>
            <h3 style="font-family: var(--font-h1); font-size: 22px; color: var(--brand-charcoal); margin: 2px 0 6px 0;">Export Your Strategic Roadmap &amp; Legal Brief</h3>
          </div>
          <span class="location-badge in-us" style="font-size: 11px;">Offline Export Center</span>
        </div>
        <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 0;">
          Download your personalized timeline, evidentiary checklist, and transition budget directly to your device. No email delivery required.
        </p>

        <div class="export-grid">
          <!-- Card 1: PNG Infographic -->
          <div class="export-card">
            <div>
              <div class="export-card-header">
                <div class="export-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div>
                  <div class="export-card-title">Executive Brief Graphic (.PNG)</div>
                  <div class="export-card-desc">High-resolution 2x visual summary infographic of your immigration timeline, selected pathway, critical milestones, and budget. Ideal for mobile sharing and quick reference.</div>
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="cardBtnDownloadPng" style="width: 100%; justify-content: center; margin-top: 12px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Executive .PNG
            </button>
          </div>

          <!-- Card 2: DOCX Word Document -->
          <div class="export-card">
            <div>
              <div class="export-card-header">
                <div class="export-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <div class="export-card-title">Full Regulatory Brief (.DOCX)</div>
                  <div class="export-card-desc">Complete editable Microsoft Word document formatted for immigration attorneys and employers, with full Title 8 CFR citations, itemized budget table, and milestone checklist.</div>
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-secondary" id="cardBtnDownloadDocx" style="width: 100%; justify-content: center; margin-top: 12px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Full .DOCX Brief
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind report download actions
    const doDownloadPng = () => downloadPngReport(this.profile, reportData, pathwayTitle);
    const doDownloadDocx = () => downloadDocxReport(this.profile, reportData, pathwayTitle);

    document.getElementById('btnDownloadPng')?.addEventListener('click', doDownloadPng);
    document.getElementById('cardBtnDownloadPng')?.addEventListener('click', doDownloadPng);

    document.getElementById('btnDownloadDocx')?.addEventListener('click', doDownloadDocx);
    document.getElementById('cardBtnDownloadDocx')?.addEventListener('click', doDownloadDocx);

    document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());
    document.getElementById('btnExportCalendar')?.addEventListener('click', () => this.exportCalendar(reportData));

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

    addEvent("Form I-765 OPT Window Opens", timeline.earliestOptFile, "Earliest date to submit Form I-765 for post-completion OPT (90 days before graduation).");
    addEvent("Graduation Date", timeline.gradDate, "Official program completion date indicated on Form I-20.");
    addEvent("Final OPT Filing Deadline", timeline.latestOptFile, "Final statutory deadline to file Form I-765 with USCIS (60 days post-graduation).");
    addEvent("OPT 12-Month Expiration", timeline.optEnd, "Initial work authorization end date. Must have STEM extension or non-lottery petition active.");

    if (timeline.isStem && timeline.stemEnd) {
      addEvent("STEM OPT Filing Window Opens", timeline.stemFilingWindowStart, "Earliest date to submit 24-month STEM extension Form I-765 (90 days prior to initial OPT expiration).");
      addEvent("STEM OPT Extension Expiration", timeline.stemEnd, "Final STEM OPT work authorization end date.");
    }

    addEvent("Final Departure / Grace Period End", timeline.gracePeriodEnd, "End of 60-day post-OPT grace period. Must depart U.S., transfer SEVIS, or have non-lottery change of status pending.");

    ics += "END:VCALENDAR";

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
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
  }

  recordLead(profile, pathway = null) {
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
      liquidSavings: profile.liquidSavings || 0
    };

    if (existingIndex >= 0 && profile.email) {
      leads[existingIndex] = { ...leads[existingIndex], ...leadData };
    } else {
      leads.push(leadData);
    }
    this.saveLeads(leads);

    // Optional silent backup to Google Sheets (no email sending triggered)
    if (GOOGLE_SHEETS_WEBHOOK_URL && GOOGLE_SHEETS_WEBHOOK_URL.trim() !== "") {
      try {
        fetch(GOOGLE_SHEETS_WEBHOOK_URL.trim(), {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(leadData)
        }).catch(() => {});
      } catch (err) {}
    }
  }
}

// Instantiate on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.f1Navigator = new F1Navigator();
});
