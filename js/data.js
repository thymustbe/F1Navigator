// F1 Navigator - Core Data Models & Immigration Knowledge Base

export const CIP_STEM_MAJORS = [
  { id: 'cs', name: 'Computer Science & Software Engineering', stem: true, cip: '11.0701' },
  { id: 'ds', name: 'Data Science & Artificial Intelligence', stem: true, cip: '30.7001' },
  { id: 'ee', name: 'Electrical & Computer Engineering', stem: true, cip: '14.1001' },
  { id: 'me', name: 'Mechanical & Aerospace Engineering', stem: true, cip: '14.1901' },
  { id: 'bio', name: 'Biomedical & Biotechnology Sciences', stem: true, cip: '26.1201' },
  { id: 'math', name: 'Mathematics & Statistics', stem: true, cip: '27.0101' },
  { id: 'fintech', name: 'Financial Engineering / Quantitative Finance', stem: true, cip: '27.0305' },
  { id: 'mgmt_stem', name: 'Information Systems & Tech Management', stem: true, cip: '11.0103' },
  { id: 'mba', name: 'Business Administration (General MBA - Non-STEM)', stem: false, cip: '52.0201' },
  { id: 'finance', name: 'Traditional Finance & Accounting', stem: false, cip: '52.0801' },
  { id: 'marketing', name: 'Marketing & Communications', stem: false, cip: '09.0101' },
  { id: 'design', name: 'Graphic / Industrial Design (Non-STEM)', stem: false, cip: '50.0409' },
  { id: 'law', name: 'Legal Studies / LL.M.', stem: false, cip: '22.0101' },
  { id: 'other_stem', name: 'Other STEM Designated Degree', stem: true, cip: '99.9999' },
  { id: 'other_non_stem', name: 'Other Non-STEM Degree', stem: false, cip: '99.0000' }
];

export const TREATY_COUNTRIES = {
  // TN (USMCA)
  tn: ['Canada', 'Mexico'],
  // E-3 (Australia)
  e3: ['Australia'],
  // H-1B1 (Dedicated bilateral quotas)
  h1b1: ['Chile', 'Singapore'],
  // E-2 Treaty Countries
  e2: [
    'Albania', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh',
    'Belgium', 'Bolivia', 'Bosnia and Herzegovina', 'Bulgaria', 'Cameroon', 'Canada', 'Chile',
    'Colombia', 'Congo', 'Costa Rica', 'Croatia', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt',
    'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Grenada', 'Honduras',
    'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'South Korea',
    'Kosovo', 'Kyrgyzstan', 'Latvia', 'Liberia', 'Lithuania', 'Luxembourg', 'Macedonia', 'Mexico',
    'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Netherlands', 'New Zealand', 'Norway', 'Oman',
    'Pakistan', 'Panama', 'Paraguay', 'Philippines', 'Poland', 'Romania', 'Senegal', 'Serbia',
    'Slovakia', 'Slovenia', 'Spain', 'Sri Lanka', 'Suriname', 'Sweden', 'Switzerland', 'Taiwan',
    'Thailand', 'Togo', 'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Ukraine', 'United Kingdom'
  ]
};

export const O1A_CRITERIA = [
  {
    id: 'awards',
    title: 'Recognized Prizes / Awards',
    description: 'Documentation of nationally or internationally recognized prizes or awards for excellence in your field.',
    examples: 'Best Paper awards at Tier-1 conferences (NeurIPS, CVPR, IEEE), competitive hackathons, top academic honors, major fellowship awards.'
  },
  {
    id: 'memberships',
    title: 'Selective Professional Memberships',
    description: 'Membership in associations requiring outstanding achievements judged by recognized national or international experts.',
    examples: 'Senior IEEE member, selective accelerator cohorts (Y Combinator, Techstars), invitation-only research societies (Sigma Xi).'
  },
  {
    id: 'press',
    title: 'Published Media Coverage',
    description: 'Published material in professional or major trade publications or major media about you and your work.',
    examples: 'Articles or profile features in TechCrunch, Forbes, Bloomberg, IEEE Spectrum, major industry publications, university spotlights.'
  },
  {
    id: 'judging',
    title: 'Peer Review & Judging',
    description: 'Participation on a panel, or individually, as a judge of the work of others in the same or allied field.',
    examples: 'Peer reviewer for journals or Tier-1 conferences, judge for startup pitch competitions or hackathons.'
  },
  {
    id: 'contributions',
    title: 'Original Significant Contributions',
    description: 'Original scientific, scholarly, or business-related contributions of major significance in the field.',
    examples: 'Open-source code repositories with high adoption, licensed patents, novel ML architectures adopted in production, high citation velocity.'
  },
  {
    id: 'scholarly_articles',
    title: 'Scholarly Articles',
    description: 'Authorship of scholarly articles in professional journals, major trade publications, or other major media.',
    examples: 'First or co-authored peer-reviewed journal papers, Tier-1 conference proceedings, high-impact ArXiv preprints.'
  },
  {
    id: 'critical_role',
    title: 'Critical Role in Distinguished Organizations',
    description: 'Employment in a critical or essential capacity at organizations that have a distinguished reputation.',
    examples: 'Lead researcher at an elite lab, founding engineer / CTO at a venture-backed startup, key contributor at a prominent tech company.'
  },
  {
    id: 'high_remuneration',
    title: 'High Remuneration / Salary',
    description: 'Commanding a high salary or other significantly high remuneration for services in relation to others in the field.',
    examples: 'Total compensation package (base salary + bonus + equity) exceeding the 90th percentile of prevailing wage data for your role and area.'
  }
];

export const NIW_PRONGS = [
  {
    id: 'prong1',
    name: 'Prong 1: Substantial Merit & National Importance',
    description: 'The proposed endeavor must have substantial merit (scientific, economic, health, technological) and national importance beyond a single employer.',
    focus: 'Ties to Critical and Emerging Technologies (AI, semiconductors, biotech, clean energy, national security).'
  },
  {
    id: 'prong2',
    name: 'Prong 2: Well-Positioned to Advance the Endeavor',
    description: 'The petitioner has the education, track record, resources, and progress to realistically advance the proposed endeavor.',
    focus: 'Master\'s or Ph.D. degree, research record, citation footprint, patents, venture capital backing, and independent expert support.'
  },
  {
    id: 'prong3',
    name: 'Prong 3: On Balance Beneficial to Waive Job Offer & PERM',
    description: 'It is beneficial to the United States to waive the labor certification (PERM) requirement due to the urgency or nature of the endeavor.',
    focus: 'Urgency of innovation, entrepreneurial self-direction, or unique interdisciplinary skillset that makes labor certification impractical.'
  }
];

export const USCIS_FEE_SCHEDULE = {
  i765_opt: 470,
  i765_stem: 470,
  i129_base: 460,
  asylum_program_fee: 300, // Small business / non-profit rate
  i140_niw: 715,
  premium_processing_i129: 2805,
  premium_processing_i140: 2805,
  estimated_legal: {
    o1a: 5500,
    eb2niw: 5000,
    treaty: 2000,
    cap_exempt: 3000,
    e2: 6000,
    l1: 4500
  }
};
