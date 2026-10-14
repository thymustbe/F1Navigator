// Comprehensive Verification Suite for F1 Navigator Strategy Engine
import { calculateTimeline, isEligibleForTreaty, evaluatePathwayRecommendations, generatePathwayReport } from './js/calculator.js';

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`✓ PASS: ${msg}`);
  } else {
    console.error(`✗ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

console.log('--- Testing F1 Navigator Flow & Calculation Logic ---');

// Scenario A: Master's in CS (India) - Seeking non-lottery alternatives
const candidateA = {
  degreeLevel: "Master's",
  major: "Computer Science & Software Engineering",
  stemEligible: true,
  nationality: "India",
  graduationDate: "2025-05-15",
  optStartDate: "2025-07-01",
  unemploymentUsed: 20,
  careerTrack: "corporate",
  citations: 25,
  papers: 2,
  peerReviews: 1,
  patents: 0,
  salaryAmount: 140000,
  liquidSavings: 30000,
  monthlyLiving: 2500
};

const timelineA = calculateTimeline(candidateA, new Date('2025-08-01'));
assert(timelineA.isStem === true, 'Candidate A identified as STEM eligible (+24 months)');
assert(timelineA.maxUnemployment === 150, 'Candidate A has 150 allowable unemployment days');
assert(timelineA.unemploymentRemaining === 130, 'Unemployment balance: 150 - 20 = 130 days');

const pathsA = evaluatePathwayRecommendations(candidateA);
assert(pathsA.length >= 4, `Candidate A evaluated with ${pathsA.length} non-lottery pathways`);
const o1A = pathsA.find(p => p.id === 'o1a');
const niwA = pathsA.find(p => p.id === 'eb2niw');
assert(o1A && o1A.matchScore >= 50, `Candidate A has viable O-1A match score (${o1A?.matchScore}%)`);
assert(niwA && niwA.matchScore >= 60, `Candidate A has strong EB-2 NIW match score (${niwA?.matchScore}%)`);

// Test Report Generation for Candidate A picking O-1A
const reportA = generatePathwayReport(candidateA, 'o1a', { targetFiling: 'moderate' });
assert(reportA.totalGovernmentFees > 0, `O-1A government filing fees itemized ($${reportA.totalGovernmentFees})`);
assert(reportA.estimatedLegalFee > 0, `O-1A legal counsel estimate provided ($${reportA.estimatedLegalFee})`);
assert(reportA.milestones.length >= 4, `Action plan generated with ${reportA.milestones.length} operational steps`);
assert(reportA.runwayMonths > 0, `Runway calculated correctly as ${reportA.runwayMonths} months`);

// Scenario B: Canadian Software Engineer (TN Treaty Screening)
const candidateB = {
  degreeLevel: "Bachelor's",
  major: "Computer Science & Software Engineering",
  stemEligible: true,
  nationality: "Canada",
  graduationDate: "2025-06-01",
  optStartDate: "2025-07-15",
  unemploymentUsed: 5,
  careerTrack: "corporate",
  citations: 0,
  papers: 0,
  peerReviews: 0,
  patents: 0,
  salaryAmount: 135000,
  liquidSavings: 40000,
  monthlyLiving: 3000
};

const treatyB = isEligibleForTreaty(candidateB.nationality);
assert(treatyB.hasTreaty === true, 'Canada recognized under USMCA bilateral treaty');
assert(treatyB.visaType === 'TN (USMCA)', 'Identifies TN (USMCA) status');

const pathsB = evaluatePathwayRecommendations(candidateB);
assert(pathsB[0].id === 'treaty', `Top pathway for Canadian is TN treaty (${pathsB[0].name})`);
assert(pathsB[0].matchScore === 98, 'TN match score is 98%');

const reportB = generatePathwayReport(candidateB, 'treaty', { treatyRole: 'Software Engineer' });
assert(reportB.milestones.some(m => m.title.includes('Treaty Support Letter')), 'Report includes TN treaty employer support letter step');

// Scenario C: Biotech Ph.D. Researcher
const candidateC = {
  degreeLevel: "Ph.D.",
  major: "Biomedical & Biotechnology Sciences",
  stemEligible: true,
  nationality: "China",
  graduationDate: "2024-12-15",
  optStartDate: "2025-02-01",
  unemploymentUsed: 0,
  careerTrack: "research",
  citations: 180,
  papers: 6,
  peerReviews: 8,
  patents: 1,
  salaryAmount: 95000,
  liquidSavings: 20000,
  monthlyLiving: 2200
};

const pathsC = evaluatePathwayRecommendations(candidateC);
const topPathC = pathsC[0];
assert(topPathC.id === 'eb2niw' || topPathC.id === 'o1a', `Biotech PhD top match is NIW or O-1A (${topPathC.name})`);
assert(topPathC.matchScore >= 90, `Biotech PhD achieves top score of ${topPathC.matchScore}%`);

// Scenario D: Founder from Germany (E-2 Treaty Country)
const candidateD = {
  degreeLevel: "Master's",
  major: "Information Systems & Tech Management",
  stemEligible: true,
  nationality: "Germany",
  graduationDate: "2025-05-30",
  optStartDate: "2025-06-15",
  unemploymentUsed: 10,
  careerTrack: "founder",
  citations: 2,
  papers: 1,
  peerReviews: 0,
  patents: 1,
  salaryAmount: 80000,
  liquidSavings: 75000,
  monthlyLiving: 3200
};

const pathsD = evaluatePathwayRecommendations(candidateD);
const e2Path = pathsD.find(p => p.id === 'e2');
assert(!!e2Path, 'E-2 Treaty Investor pathway is presented for German founder');
assert(e2Path.matchScore >= 80, `E-2 match score is strong (${e2Path.matchScore}%)`);

const reportD = generatePathwayReport(candidateD, 'e2', { e2Capital: 75000 });
assert(reportD.complianceTraps.some(t => t.includes('at risk')), 'E-2 report includes capital at-risk compliance advice');

// Scenario E: Candidate with Pending EAD (No optStartDate provided)
const candidateE = {
  degreeLevel: "Master's",
  major: "Computer Science & Software Engineering",
  stemEligible: true,
  nationality: "India",
  graduationDate: "2025-05-15",
  optStartDate: "", // Pending EAD
  unemploymentUsed: 0
};
const timelineE = calculateTimeline(candidateE, new Date('2025-05-20'));
assert(!isNaN(timelineE.optEnd.getTime()), 'Calculates valid OPT end date even without optStartDate');
assert(timelineE.phase === 'Post-Graduation Pending EAD', 'Identifies Pending EAD phase correctly');

// Verification of Location Tagging
const pathsE = evaluatePathwayRecommendations(candidateE);
const usPaths = pathsE.filter(p => !p.isOutOfUs);
const outPaths = pathsE.filter(p => p.isOutOfUs);
assert(usPaths.every(p => p.locationTag === 'Ways to Stay in the U.S.'), 'All in-country routes tagged "Ways to Stay in the U.S."');
assert(outPaths.every(p => p.locationTag === '(Out of U.S. Pathway)'), 'Relocation routes tagged "(Out of U.S. Pathway)"');

console.log(`\nVerification Complete: ${passed}/${total} assertions passed.`);
