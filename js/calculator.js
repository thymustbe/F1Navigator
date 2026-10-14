// F1 Navigator - Calculation & Strategy Engine
import { TREATY_COUNTRIES, O1A_CRITERIA, NIW_PRONGS, USCIS_FEE_SCHEDULE } from './data.js';

export function calculateTimeline(profile, referenceDate = new Date()) {
  const gradDate = profile.graduationDate ? new Date(profile.graduationDate) : new Date();
  
  // OPT Filing Windows
  // Earliest: 90 days before graduation
  const earliestOptFile = new Date(gradDate);
  earliestOptFile.setDate(gradDate.getDate() - 90);
  
  // Latest: 60 days after graduation (and within 30 days of DSO I-20 endorsement)
  const latestOptFile = new Date(gradDate);
  latestOptFile.setDate(gradDate.getDate() + 60);
  
  // OPT Active Authorization
  const optStart = profile.optStartDate ? new Date(profile.optStartDate) : new Date(gradDate.getTime() + 14 * 86400000);
  const optEnd = profile.optEndDate ? new Date(profile.optEndDate) : new Date(optStart.getTime() + 365 * 86400000);
  
  // STEM OPT Extension
  const isStem = !!profile.stemEligible;
  let stemEnd = null;
  let stemFilingWindowStart = null;
  
  if (isStem) {
    stemEnd = profile.stemOptEndDate ? new Date(profile.stemOptEndDate) : new Date(optEnd.getTime() + (730 * 86400000));
    stemFilingWindowStart = new Date(optEnd);
    stemFilingWindowStart.setDate(optEnd.getDate() - 90);
  }
  
  // 60-day Post-OPT Grace Period
  const activeAuthorizationEnd = isStem && stemEnd ? stemEnd : optEnd;
  const gracePeriodEnd = new Date(activeAuthorizationEnd);
  gracePeriodEnd.setDate(activeAuthorizationEnd.getDate() + 60);
  
  // Days Remaining on Active Work Authorization
  const msRemaining = activeAuthorizationEnd.getTime() - referenceDate.getTime();
  const daysAuthRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  
  // Unemployment Calculations
  const maxUnemployment = isStem ? 150 : 90;
  const unemploymentUsed = Math.max(0, Number(profile.unemploymentUsed) || 0);
  const unemploymentRemaining = Math.max(0, maxUnemployment - unemploymentUsed);
  const unemploymentBurnPercent = Math.min(100, Math.round((unemploymentUsed / maxUnemployment) * 100));
  
  // Determine Current Legal Phase
  let phase = 'Pre-Graduation Window';
  if (referenceDate < earliestOptFile) {
    phase = 'Enrolled / Pre-OPT Window';
  } else if (referenceDate >= earliestOptFile && referenceDate <= gradDate) {
    phase = 'OPT Filing Window (Pre-Graduation)';
  } else if (referenceDate > gradDate && referenceDate < optStart) {
    phase = 'Post-Graduation Pending EAD';
  } else if (referenceDate >= optStart && referenceDate <= optEnd) {
    phase = 'Active 12-Month Post-Completion OPT';
  } else if (isStem && referenceDate > optEnd && referenceDate <= stemEnd) {
    phase = 'Active 24-Month STEM OPT Extension';
  } else if (referenceDate > activeAuthorizationEnd && referenceDate <= gracePeriodEnd) {
    phase = '60-Day Post-OPT Departure / Transfer Grace Period';
  } else {
    phase = 'Authorization Expired / Transition Required';
  }
  
  return {
    gradDate,
    earliestOptFile,
    latestOptFile,
    optStart,
    optEnd,
    isStem,
    stemFilingWindowStart,
    stemEnd,
    activeAuthorizationEnd,
    gracePeriodEnd,
    daysAuthRemaining,
    maxUnemployment,
    unemploymentUsed,
    unemploymentRemaining,
    unemploymentBurnPercent,
    phase
  };
}

export function isEligibleForTreaty(nationality) {
  if (!nationality) return { hasTreaty: false, visaType: null, country: '' };
  const natNorm = nationality.trim().toLowerCase();
  
  const isTN = TREATY_COUNTRIES.tn.some(c => c.toLowerCase() === natNorm);
  if (isTN) {
    return {
      hasTreaty: true,
      visaType: 'TN (USMCA)',
      country: nationality,
      description: 'Citizens of Canada and Mexico can obtain instant professional work status at port of entry or USCIS without the H-1B lottery.'
    };
  }
  
  const isE3 = TREATY_COUNTRIES.e3.some(c => c.toLowerCase() === natNorm);
  if (isE3) {
    return {
      hasTreaty: true,
      visaType: 'E-3 Specialty Occupation',
      country: nationality,
      description: 'Citizens of Australia have a dedicated 10,500 annual cap that is virtually never exhausted, with no lottery required.'
    };
  }
  
  const isH1B1 = TREATY_COUNTRIES.h1b1.some(c => c.toLowerCase() === natNorm);
  if (isH1B1) {
    return {
      hasTreaty: true,
      visaType: 'H-1B1 Treaty Visa',
      country: nationality,
      description: 'Citizens of Chile (1,400 cap) and Singapore (5,400 cap) bypass the general H-1B lottery through dedicated bilateral quotas.'
    };
  }
  
  const isE2 = TREATY_COUNTRIES.e2.some(c => c.toLowerCase() === natNorm);
  if (isE2) {
    return {
      hasTreaty: true,
      visaType: 'E-2 Treaty Investor',
      country: nationality,
      description: `Citizens of ${nationality} can start or invest substantially in a U.S. business without relying on employer sponsorship.`
    };
  }
  
  return { hasTreaty: false, visaType: null, country: nationality };
}

export function evaluatePathwayRecommendations(profile) {
  const pathways = [];
  const citations = Number(profile.citations) || 0;
  const papers = Number(profile.papers) || 0;
  const peerReviews = Number(profile.peerReviews) || 0;
  const patents = Number(profile.patents) || 0;
  const isPhd = profile.degreeLevel === 'Ph.D.';
  const isMasters = profile.degreeLevel === 'Master\'s';
  const isStem = !!profile.stemEligible;
  const isFounder = profile.careerTrack === 'founder';
  const liquidSavings = Number(profile.liquidSavings) || 0;
  const salary = Number(profile.salaryAmount) || 0;
  
  // 1. Nationality-Specific Treaty Visas (TN, E-3, H-1B1)
  const treatyInfo = isEligibleForTreaty(profile.nationality);
  if (treatyInfo.hasTreaty && treatyInfo.visaType !== 'E-2 Treaty Investor') {
    pathways.push({
      id: 'treaty',
      visaCode: treatyInfo.visaType,
      name: `${treatyInfo.visaType} (Bilateral Treaty)`,
      category: 'Nationality Treaty Pathway',
      locationTag: 'Ways to Stay in the U.S.',
      isOutOfUs: false,
      matchScore: 98,
      statusTag: 'Top Match',
      summary: `Direct, lottery-free work authorization exclusively for citizens of ${profile.nationality}. Allows qualifying professionals to obtain legal employment without the H-1B lottery cap.`,
      whyYouQualify: `Holding citizenship in ${profile.nationality} combined with a bachelor's or advanced degree in your field grants direct treaty eligibility.`,
      pros: ['Zero lottery requirement', 'Indefinitely renewable in 2-3 year increments', 'Direct border adjudication (Canadians) or rapid consular appointments'],
      cons: ['Strict non-immigrant intent (careful planning required if transitioning to green card)', 'Role must match official treaty professional list'],
      estimatedTimeline: '2 to 4 weeks'
    });
  }

  // 2. O-1A Extraordinary Ability
  let o1Score = 20;
  let o1Reasons = [];
  if (papers >= 1) { o1Score += 16; o1Reasons.push(`${papers} published scholarly paper(s)`); }
  if (citations >= 30) { o1Score += 22; o1Reasons.push(`${citations} Google Scholar citations`); }
  else if (citations >= 10) { o1Score += 12; o1Reasons.push(`${citations} citations`); }
  if (peerReviews >= 1) { o1Score += 18; o1Reasons.push(`${peerReviews} peer review / judging instance(s)`); }
  if (salary >= 125000) { o1Score += 16; o1Reasons.push('High remuneration placing in top wage brackets'); }
  if (patents >= 1) { o1Score += 12; o1Reasons.push(`${patents} patent(s) / original technical contributions`); }
  if (isPhd) { o1Score += 10; o1Reasons.push('Doctoral-level research credentials'); }
  if (isFounder) { o1Score += 8; o1Reasons.push('Critical founder role potential'); }
  o1Score = Math.min(97, Math.max(15, o1Score));

  pathways.push({
    id: 'o1a',
    visaCode: 'O-1A',
    name: 'O-1A Extraordinary Ability Visa',
    category: 'Merit-Based (Non-Lottery)',
    locationTag: 'Ways to Stay in the U.S.',
    isOutOfUs: false,
    matchScore: o1Score,
    statusTag: o1Score >= 75 ? 'Prime Candidate' : o1Score >= 50 ? 'Strong Potential' : 'Developing Profile',
    summary: 'A premier non-immigrant visa for individuals with demonstrated achievements in STEM, business, or education. Completely uncapped with zero lottery mechanism.',
    whyYouQualify: o1Reasons.length > 0 
      ? `Strengthened by your ${o1Reasons.slice(0, 3).join(', ')}.`
      : 'Viable by methodically building 3 out of 8 USCIS regulatory criteria during your OPT period.',
    pros: ['No annual quota or lottery limits', 'File anytime with 15-day Premium Processing', 'Can be sponsored by employers, agents, or founder-owned entities'],
    cons: ['Requires evidence dossier satisfying 3 of 8 regulatory criteria plus final merits review', 'Spouse (O-3) cannot work'],
    estimatedTimeline: '1 to 3 months'
  });

  // 3. EB-2 NIW (National Interest Waiver) Green Card
  let niwScore = 25;
  let niwReasons = [];
  if (isPhd) { niwScore += 35; niwReasons.push('Ph.D. degree'); }
  else if (isMasters) { niwScore += 25; niwReasons.push('U.S. Master\'s degree'); }
  else { niwScore += 10; }

  if (isStem) { niwScore += 15; niwReasons.push('STEM field aligned with Critical & Emerging Tech'); }
  if (citations >= 50) { niwScore += 20; niwReasons.push('High citation footprint'); }
  else if (citations >= 15) { niwScore += 12; niwReasons.push('Established citation record'); }
  if (papers >= 2) { niwScore += 10; niwReasons.push('Peer-reviewed publication track record'); }
  if (patents >= 1) { niwScore += 8; niwReasons.push('Commercial patents / IP'); }
  niwScore = Math.min(99, Math.max(20, niwScore));

  pathways.push({
    id: 'eb2niw',
    visaCode: 'EB-2 NIW',
    name: 'EB-2 NIW (National Interest Waiver)',
    category: 'Permanent Residency (Green Card)',
    locationTag: 'Ways to Stay in the U.S.',
    isOutOfUs: false,
    matchScore: niwScore,
    statusTag: niwScore >= 75 ? 'Strong Self-Petition' : niwScore >= 55 ? 'Viable Candidate' : 'Long-Term Target',
    summary: 'Direct self-petition for a U.S. Green Card without needing an employer sponsor or labor certification (PERM), based on the national importance of your proposed endeavor.',
    whyYouQualify: niwReasons.length > 0
      ? `Supported by your ${niwReasons.slice(0, 3).join(', ')}.`
      : 'Advanced degree holders in STEM can frame their technical endeavor to meet the Dhanasar 3-prong standard.',
    pros: ['100% self-petitioned: Zero employer lock-in or lottery dependency', 'Bypasses multi-year PERM labor market testing', 'Locks in early priority date'],
    cons: ['Backlogs exist for India and China chargeability', 'Requires comprehensive legal endeavor brief and expert letters'],
    estimatedTimeline: '2 to 4 months for petition approval (Premium Processing available)'
  });

  // 4. Cap-Exempt H-1B
  let capExemptScore = 45;
  if (profile.careerTrack === 'research' || isPhd) capExemptScore += 45;
  else if (isMasters) capExemptScore += 25;
  else capExemptScore += 10;
  capExemptScore = Math.min(96, capExemptScore);

  pathways.push({
    id: 'cap_exempt',
    visaCode: 'Cap-Exempt H-1B',
    name: 'Cap-Exempt H-1B (Universities & Non-Profits)',
    category: 'Institutional Sponsor (Non-Lottery)',
    locationTag: 'Ways to Stay in the U.S.',
    isOutOfUs: false,
    matchScore: capExemptScore,
    statusTag: capExemptScore >= 75 ? 'Ideal Academic Fit' : 'Strategic Bridge',
    summary: 'H-1B petitions filed by higher education institutions, affiliated university hospitals, and non-profit or governmental research organizations are 100% exempt from the annual lottery cap.',
    whyYouQualify: isPhd || profile.careerTrack === 'research'
      ? 'Your academic background and research track provide direct qualification for non-profit and university appointments.'
      : 'Eligible for research, data science, and engineering roles at university-affiliated institutes and non-profit labs.',
    pros: ['Zero lottery cap: File year-round with immediate start dates', 'Supports concurrent H-1B: work 20 hrs at a non-profit/university + 20 hrs at a startup or private company!', '15-day USCIS Premium Processing available'],
    cons: ['Compensation may be lower than private enterprise tech salaries', 'Transferring to a for-profit commercial company requires winning the standard lottery'],
    estimatedTimeline: '3 to 6 weeks'
  });

  // 5. E-2 Treaty Investor
  const isE2Country = TREATY_COUNTRIES.e2.some(c => c.toLowerCase() === (profile.nationality || '').trim().toLowerCase());
  let e2Score = 20;
  if (isE2Country) {
    e2Score += 40;
    if (isFounder) e2Score += 25;
    if (liquidSavings >= 50000) e2Score += 25;
    else if (liquidSavings >= 25000) e2Score += 12;
    e2Score = Math.min(98, Math.max(15, e2Score));

    pathways.push({
      id: 'e2',
      visaCode: 'E-2 Investor',
      name: 'E-2 Treaty Investor Visa',
      category: 'Entrepreneur / Founder Pathway',
      locationTag: 'Ways to Stay in the U.S.',
      isOutOfUs: false,
      matchScore: e2Score,
      statusTag: e2Score >= 75 ? 'High Founder Readiness' : 'Capital Dependent',
      summary: `Allows nationals of ${profile.nationality} (an official E-2 treaty partner) to launch, operate, and control a U.S. business by investing substantial at-risk capital.`,
      whyYouQualify: `Your citizenship (${profile.nationality}) qualifies under bilateral investment treaties, allowing self-directed business ownership without employer sponsorship.`,
      pros: ['Complete freedom to be self-employed and run your own venture', 'Spouses receive unrestricted open work authorization (E-2S)', 'Renewable indefinitely in 2 to 5 year increments'],
      cons: ['Requires committing substantial at-risk capital ($50k–$100k+)', 'Direct green card dual-intent not inherently available'],
      estimatedTimeline: '1 to 2 months'
    });
  }

  // 6. L-1 Global Corporate Bridge (Out of U.S. Pathway)
  let l1Score = profile.careerTrack === 'corporate' ? 70 : 45;
  pathways.push({
    id: 'l1',
    visaCode: 'L-1 Intra-Company',
    name: 'L-1 Intra-Company Transfer Bridge',
    category: 'Out of U.S. Pathway',
    locationTag: '(Out of U.S. Pathway)',
    isOutOfUs: true,
    matchScore: l1Score,
    statusTag: 'Corporate Backup',
    summary: 'If OPT expires without an alternative, multinational employers transfer you to an international subsidiary (e.g., Toronto, London, Dublin) for 1 continuous year, then return you to the U.S. on L-1 status.',
    whyYouQualify: 'Applicable if employed by a multinational technology firm or enterprise with established overseas corporate offices.',
    pros: ['Guaranteed lottery-free return to the United States', 'L-1A managers have streamlined EB-1C Green Card routes without PERM', 'Spouses (L-2S) receive unrestricted employment authorization'],
    cons: ['Requires relocating outside the U.S. for at least 1 full continuous year', 'Dependent on employer international mobility approvals'],
    estimatedTimeline: '12 months continuous employment abroad + 1 month visa processing'
  });

  // Sort descending by match score
  pathways.sort((a, b) => b.matchScore - a.matchScore);
  return pathways;
}

export function generatePathwayReport(profile, pathwayId, pathwayDetails = {}) {
  const timeline = calculateTimeline(profile);
  const monthlyLiving = Number(profile.monthlyLiving) || 2800;
  const liquidSavings = Number(profile.liquidSavings) || 25000;
  const healthcareGap = 280;
  const totalMonthlyBurn = monthlyLiving + healthcareGap;
  const runwayMonths = totalMonthlyBurn > 0 ? (liquidSavings / totalMonthlyBurn).toFixed(1) : '0';
  const runwayVal = Number(runwayMonths);
  let safetyNetMessage = '';
  if (runwayVal <= 0) {
    safetyNetMessage = 'Your current plan shows 0 months of financial cushion. This means any unexpected expenses in Year 1 would require outside funds not accounted for in this report.';
  } else if (runwayVal < 3) {
    safetyNetMessage = `Your current plan shows ${runwayMonths} months of financial cushion. Any unexpected delays or legal fees would place pressure on unmodeled reserves. We recommend targeting a 6-month buffer.`;
  } else {
    safetyNetMessage = `Your current plan shows ${runwayMonths} months of financial cushion. This provides a resilient buffer while your petition is prepared, filed, and adjudicated.`;
  }

  // Itemized fee calculations based on chosen pathway
  let governmentFees = [];
  let estimatedLegalFee = 0;
  let strategyBrief = '';
  let milestones = [];
  let complianceTraps = [];

  const optFee = { name: 'Form I-765 (Post-Completion OPT)', amount: USCIS_FEE_SCHEDULE.i765_opt };
  governmentFees.push(optFee);

  if (profile.stemEligible) {
    governmentFees.push({ name: 'Form I-765 (STEM OPT 24-Month Extension)', amount: USCIS_FEE_SCHEDULE.i765_stem });
  }

  if (pathwayId === 'o1a') {
    governmentFees.push(
      { name: 'Form I-129 (O-1A Non-Immigrant Petition Base)', amount: USCIS_FEE_SCHEDULE.i129_base },
      { name: 'USCIS Asylum Program Fee', amount: USCIS_FEE_SCHEDULE.asylum_program_fee },
      { name: 'Form I-907 Premium Processing (15 Calendar Days)', amount: USCIS_FEE_SCHEDULE.premium_processing_i129 }
    );
    estimatedLegalFee = USCIS_FEE_SCHEDULE.estimated_legal.o1a;
    strategyBrief = `Your profile demonstrates substantial alignment with the O-1A extraordinary ability standard. By leveraging your degree, technical accomplishments, and targeted evidentiary documentation, this pathway bypasses the H-1B lottery entirely with a 15-day USCIS adjudication window.`;
    
    milestones = [
      { step: 1, title: 'Evidentiary Audit & Criteria Selection', targetDate: 'Month 1', desc: 'Identify 3 to 4 strongest USCIS regulatory criteria (e.g. scholarly articles, high remuneration, critical roles, peer review) and draft testimonial letter outlines.' },
      { step: 2, title: 'Secure 5-7 Expert Advisory Letters', targetDate: 'Month 2', desc: 'Obtain testimonial letters from independent domain experts and previous supervisors attesting to the major significance of your contributions.' },
      { step: 3, title: 'Draft Form I-129 Legal Memorandum', targetDate: 'Month 3', desc: 'Prepare petition brief with employer or agent petitioner establishing qualifying contracts, itinerary, and evidentiary exhibits.' },
      { step: 4, title: 'File with USCIS via Premium Processing', targetDate: 'Month 3 - 4', desc: 'Submit petition with Form I-907 for 15-day adjudication. Maintain active OPT/F-1 status until approval notice (Form I-797) is issued.' }
    ];

    complianceTraps = [
      'Self-sponsorship directly without an agent or corporate entity is prohibited; use an established employer or agent-based structure.',
      'Ensure peer review judging requests are formally documented with completed verification emails or editorial board acknowledgments.',
      'Maintain continuous F-1 / OPT employment authorization while the petition is pending to preserve seamless change of status.'
    ];
  } else if (pathwayId === 'eb2niw') {
    governmentFees.push(
      { name: 'Form I-140 (Immigrant Petition for Alien Worker)', amount: USCIS_FEE_SCHEDULE.i140_niw },
      { name: 'Form I-907 Premium Processing (45 Calendar Days)', amount: USCIS_FEE_SCHEDULE.premium_processing_i140 }
    );
    estimatedLegalFee = USCIS_FEE_SCHEDULE.estimated_legal.eb2niw;
    strategyBrief = `The EB-2 National Interest Waiver grants direct self-petitioned Permanent Residency (Green Card) without requiring an employer sponsor or labor certification (PERM). Your proposed endeavor in STEM aligns directly with the Dhanasar 3-prong framework and U.S. national priorities.`;

    milestones = [
      { step: 1, title: 'Define Proposed Endeavor Brief', targetDate: 'Month 1', desc: 'Articulate your specific endeavor with national scope (scientific advancement, economic impact, or healthcare improvements) aligned with White House Critical & Emerging Tech.' },
      { step: 2, title: 'Assemble Citation Footprint & Expert Support', targetDate: 'Month 2', desc: 'Collect Google Scholar citation metrics, implementation proof, and 4-6 independent advisory letters from recognized researchers.' },
      { step: 3, title: 'File Form I-140 with Premium Processing', targetDate: 'Month 3', desc: 'Submit petition to USCIS Texas or Nebraska Service Center with Form I-907 for 45-day adjudication.' },
      { step: 4, title: 'Priority Date Lock & Adjustment of Status', targetDate: 'Ongoing', desc: 'Locks in your immigrant priority date. File Form I-485 (Adjustment of Status) when your priority date becomes current on the Visa Bulletin.' }
    ];

    complianceTraps = [
      'Framing your endeavor too narrowly around your current employer will trigger an RFE; the endeavor must have national significance.',
      'F-1 students cannot easily travel internationally once an immigrant petition (I-140) is filed without careful dual-intent planning.',
      'Continue fulfilling STEM OPT reporting obligations and Form I-983 annual evaluations while the I-140 is pending.'
    ];
  } else if (pathwayId === 'treaty') {
    governmentFees.push(
      { name: 'Form I-129 (If filing Change of Status in U.S.)', amount: USCIS_FEE_SCHEDULE.i129_base },
      { name: 'Form I-907 Premium Processing (Optional)', amount: USCIS_FEE_SCHEDULE.premium_processing_i129 }
    );
    estimatedLegalFee = USCIS_FEE_SCHEDULE.estimated_legal.treaty;
    strategyBrief = `As a citizen of ${profile.nationality}, you have access to a dedicated bilateral treaty visa (${isEligibleForTreaty(profile.nationality).visaType}). This route skips the general H-1B lottery entirely and can be executed rapidly either through consular processing or USCIS change of status.`;

    milestones = [
      { step: 1, title: 'Job Offer & Profession Classification Check', targetDate: 'Week 1 - 2', desc: 'Confirm job offer duties align with qualifying treaty professions (e.g. Engineer, Computer Systems Analyst, Management Consultant).' },
      { step: 2, title: 'Prepare Employer Treaty Support Letter', targetDate: 'Week 2 - 3', desc: 'Draft comprehensive support letter stating job duties, professional credentials, temporary intent, and compensation.' },
      { step: 3, title: 'Port of Entry Adjudication or USCIS Filing', targetDate: 'Week 4', desc: 'Canadians apply directly at U.S. port of entry / preclearance. Others apply at U.S. Consulate or file Form I-129 with USCIS.' },
      { step: 4, title: 'Commence Treaty Status Employment', targetDate: 'Immediate', desc: 'Receive Form I-94 admitting you in authorized treaty professional status for up to 3 years, renewable indefinitely.' }
    ];

    complianceTraps = [
      'Treaty status does not allow immigrant intent; do not file a direct Green Card petition without consulting counsel on dual-intent bridging.',
      'Ensure educational credentials match the specific treaty profession category (degree equivalency evaluation if degree earned outside the treaty nation).'
    ];
  } else if (pathwayId === 'cap_exempt') {
    governmentFees.push(
      { name: 'Form I-129 (Cap-Exempt H-1B Petition)', amount: USCIS_FEE_SCHEDULE.i129_base },
      { name: 'USCIS Asylum Program Fee (Non-Profit Rate)', amount: USCIS_FEE_SCHEDULE.asylum_program_fee },
      { name: 'Form I-907 Premium Processing (15 Calendar Days)', amount: USCIS_FEE_SCHEDULE.premium_processing_i129 }
    );
    estimatedLegalFee = USCIS_FEE_SCHEDULE.estimated_legal.cap_exempt;
    strategyBrief = `Cap-Exempt H-1B allows you to transition into legal employment at higher education institutions, non-profit university affiliates, or research organizations without waiting for the March lottery. It also unlocks concurrent H-1B employment with private startups or tech companies.`;

    milestones = [
      { step: 1, title: 'Target Cap-Exempt Institution Roles', targetDate: 'Month 1', desc: 'Identify research, software, or technical roles at universities, non-profit research institutes, or affiliated university hospitals.' },
      { step: 2, title: 'Employer Files Prevailing Wage & LCA', targetDate: 'Month 2', desc: 'Employer files Labor Condition Application (LCA) with the Department of Labor certified for your specialty role.' },
      { step: 3, title: 'Submit Form I-129 Cap-Exempt Petition', targetDate: 'Month 2 - 3', desc: 'File with USCIS with evidence of non-profit research or higher education institution exemption.' },
      { step: 4, title: '(Optional) File Concurrent For-Profit H-1B', targetDate: 'Post-Approval', desc: 'Once cap-exempt petition is approved, a private for-profit company can file a concurrent H-1B without going through the lottery.' }
    ];

    complianceTraps = [
      'If you leave the cap-exempt employer, you cannot transfer to a purely commercial company without first winning the regular H-1B lottery.',
      'Verify that the institution qualifies under 8 CFR § 214.2(h)(19) as a bona fide higher education affiliate or non-profit research organization.'
    ];
  } else if (pathwayId === 'e2') {
    governmentFees.push(
      { name: 'Form I-129 (If filing within U.S.) or DS-160 (Consular)', amount: 460 },
      { name: 'Form I-907 Premium Processing (15 Days)', amount: USCIS_FEE_SCHEDULE.premium_processing_i129 }
    );
    estimatedLegalFee = USCIS_FEE_SCHEDULE.estimated_legal.e2;
    strategyBrief = `As a citizen of ${profile.nationality}, the E-2 Treaty Investor visa enables you to launch, own, and actively run your startup enterprise in the U.S. By committing at-risk capital to a commercial entity, you bypass employer sponsorship entirely.`;

    milestones = [
      { step: 1, title: 'Corporate Formation & Banking Setup', targetDate: 'Month 1', desc: 'Form U.S. C-Corp or LLC with at least 50% ownership by treaty nationals. Open commercial bank account and deposit capital.' },
      { step: 2, title: 'Commit Substantial At-Risk Capital', targetDate: 'Month 2', desc: 'Expend capital toward commercial operations (equipment, software, leases, vendor contracts) demonstrating funds are committed.' },
      { step: 3, title: 'Draft Comprehensive 5-Year Business Plan', targetDate: 'Month 2 - 3', desc: 'Produce Matter of Ho compliant business plan detailing revenue forecasts, job creation for U.S. workers, and non-marginality.' },
      { step: 4, title: 'Submit E-2 Petition via Consulate or USCIS', targetDate: 'Month 3 - 4', desc: 'Apply at U.S. Embassy/Consulate or file Form I-129 for change of status in the U.S.' }
    ];

    complianceTraps = [
      'Capital must be genuinely at risk (spent on commercial readiness) and cannot merely sit idle in a corporate checking account.',
      'The business cannot be "marginal" (solely supporting the investor and their family); it must project hiring U.S. workers within 5 years.'
    ];
  } else {
    // L-1 Bridge
    governmentFees.push(
      { name: 'Form I-129 (L-1 Intra-Company Transferee)', amount: USCIS_FEE_SCHEDULE.i129_base },
      { name: 'USCIS Asylum Program Fee', amount: USCIS_FEE_SCHEDULE.asylum_program_fee },
      { name: 'Form I-907 Premium Processing', amount: USCIS_FEE_SCHEDULE.premium_processing_i129 }
    );
    estimatedLegalFee = USCIS_FEE_SCHEDULE.estimated_legal.l1;
    strategyBrief = `The L-1 Intra-Company Transfer bridge is the gold-standard corporate contingency. If your OPT expires without a lottery win, your employer transfers you to an international subsidiary for 1 continuous year, then petitions for your return under L-1 status.`;

    milestones = [
      { step: 1, title: 'Initiate Corporate Mobility Review', targetDate: 'Month 1', desc: 'Work with internal employer immigration teams to identify qualifying overseas branch or subsidiary (e.g. Canada, UK, Ireland).' },
      { step: 2, title: 'Complete 365 Days of Continuous Employment Abroad', targetDate: 'Months 2 - 13', desc: 'Work full-time in qualifying specialized knowledge (L-1B) or managerial (L-1A) capacity for at least one continuous year.' },
      { step: 3, title: 'Prepare & File Form I-129 L-1 Petition', targetDate: 'Month 13', desc: 'Employer files petition with USCIS or blanket L petition at U.S. consulate.' },
      { step: 4, title: 'Re-Enter U.S. Under L-1 Status', targetDate: 'Month 14', desc: 'Return to U.S. without lottery; L-1A status unlocks direct EB-1C Green Card eligibility without PERM.' }
    ];

    complianceTraps = [
      'The one continuous year of employment abroad cannot be interrupted by significant trips into the U.S.',
      'The overseas entity must maintain a qualifying corporate affiliate, parent, or subsidiary relationship with the U.S. employer.'
    ];
  }

  const totalGovernmentFees = governmentFees.reduce((acc, f) => acc + f.amount, 0);
  const totalEstimatedCost = totalGovernmentFees + estimatedLegalFee;

  return {
    pathwayId,
    locationTag: pathwayId === 'l1' ? '(Out of U.S. Pathway)' : 'Ways to Stay in the U.S.',
    isOutOfUs: pathwayId === 'l1',
    timeline,
    strategyBrief,
    governmentFees,
    totalGovernmentFees,
    estimatedLegalFee,
    totalEstimatedCost,
    monthlyLiving,
    healthcareGap,
    totalMonthlyBurn,
    liquidSavings,
    runwayMonths: Number(runwayMonths),
    safetyNetMessage,
    milestones,
    complianceTraps
  };
}
