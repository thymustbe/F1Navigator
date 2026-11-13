// F1 Navigator - High-Resolution PNG Graphic Report Generator
// Generates an executive-grade visual infographic on an HTML5 Canvas

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeColor = '#E2E2E2', lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
  return curY + lineHeight;
}

export function generateReportCanvas(profile, reportData, pathwayTitle) {
  const p = profile;
  const timeline = reportData.timeline;
  const candidateName = p.fullName || 'Candidate';
  const pathwayName = pathwayTitle || 'Non-Lottery Strategic Pathway';

  const width = 1400;
  const height = 2100;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#F7F5FA');
  bgGrad.addColorStop(0.5, '#FFFFFF');
  bgGrad.addColorStop(1, '#F2EFF7');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer Container Card
  const margin = 40;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  drawRoundedRect(ctx, margin, margin, cardW, cardH, 24, '#FFFFFF', true, '#E2E2E2', 1.5);

  let curY = margin + 50;
  const contentX = margin + 50;
  const contentW = cardW - 100;

  // Header: Logo & Title
  // Stylized INVISA emblem
  ctx.save();
  const logoX = contentX;
  const logoY = curY;
  // Left Wing
  ctx.fillStyle = '#144A86';
  ctx.beginPath();
  ctx.ellipse(logoX + 22, logoY + 26, 20, 10, -Math.PI / 4, 0, 2 * Math.PI);
  ctx.fill();
  // Right Wing
  ctx.fillStyle = '#7BBC43';
  ctx.beginPath();
  ctx.ellipse(logoX + 38, logoY + 18, 18, 8, -Math.PI / 3, 0, 2 * Math.PI);
  ctx.fill();
  // Star accent
  ctx.fillStyle = '#F5B819';
  ctx.beginPath();
  ctx.arc(logoX + 16, logoY + 38, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // App Title
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 32px Outfit, sans-serif';
  ctx.fillText('INVISA F-1 NAVIGATOR', contentX + 64, curY + 24);

  // Subtitle
  ctx.fillStyle = '#231F20';
  ctx.font = '600 20px Outfit, sans-serif';
  ctx.fillText('Strategic Action Plan & Status Runway Report', contentX + 64, curY + 52);

  // Badge on the right
  drawRoundedRect(ctx, contentX + contentW - 240, curY + 8, 240, 36, 18, '#F2EFF7', true, '#144A86', 1);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TITLE 8 CFR GROUNDED ENGINE', contentX + contentW - 120, curY + 31);
  ctx.textAlign = 'left';

  curY += 80;

  // Divider Line
  ctx.strokeStyle = '#E2E2E2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, curY);
  ctx.lineTo(contentX + contentW, curY);
  ctx.stroke();

  curY += 30;

  // Candidate & Target Pathway Banner Box
  drawRoundedRect(ctx, contentX, curY, contentW, 110, 16, '#F2EFF7', true, '#D4D0DE', 1);
  
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.fillText('CANDIDATE DOSSIER & TARGET PATHWAY', contentX + 24, curY + 30);

  ctx.fillStyle = '#231F20';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillText(candidateName, contentX + 24, curY + 62);

  ctx.fillStyle = '#666666';
  ctx.font = '15px Outfit, sans-serif';
  const credText = `${p.degreeLevel || "Master's"} in ${p.major || 'Computer Science'} • Citizenship: ${p.nationality || 'International'}`;
  ctx.fillText(credText, contentX + 24, curY + 90);

  // Pathway pill inside the banner
  const pathwayPillW = 420;
  const pathwayPillX = contentX + contentW - pathwayPillW - 20;
  drawRoundedRect(ctx, pathwayPillX, curY + 22, pathwayPillW, 66, 12, '#FFFFFF', true, '#144A86', 1.5);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('SELECTED NON-LOTTERY ROUTE', pathwayPillX + 16, curY + 44);
  ctx.fillStyle = '#231F20';
  ctx.font = 'bold 17px Outfit, sans-serif';
  ctx.fillText(pathwayName, pathwayPillX + 16, curY + 70);

  curY += 135;

  // 4 Executive Stat Metric Cards
  const statCardW = (contentW - 45) / 4;
  const statCardH = 96;

  const stats = [
    { label: 'ACTIVE WORK AUTH', val: `${timeline.daysAuthRemaining} Days`, sub: `Through ${timeline.activeAuthorizationEnd.toLocaleDateString()}`, color: '#144A86' },
    { label: 'ALLOWABLE CUSHION', val: `${timeline.unemploymentRemaining} Days`, sub: `${timeline.unemploymentUsed} of ${timeline.maxUnemployment} days used`, color: timeline.unemploymentRemaining < 25 ? '#B22222' : '#0D8341' },
    { label: 'EST. TRANSITION CAPITAL', val: `$${reportData.totalEstimatedCost.toLocaleString()}`, sub: `Gov fees ($${reportData.totalGovernmentFees.toLocaleString()}) + legal`, color: '#144A86' },
    { label: 'FINANCIAL RUNWAY', val: `${reportData.runwayMonths} Mos`, sub: `Burn: $${reportData.totalMonthlyBurn.toLocaleString()}/mo`, color: reportData.runwayMonths < 3 ? '#B22222' : '#0D8341' }
  ];

  stats.forEach((st, idx) => {
    const sx = contentX + idx * (statCardW + 15);
    drawRoundedRect(ctx, sx, curY, statCardW, statCardH, 12, '#FFFFFF', true, '#E2E2E2', 1);

    ctx.fillStyle = '#666666';
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillText(st.label, sx + 16, curY + 26);

    ctx.fillStyle = st.color;
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(st.val, sx + 16, curY + 58);

    ctx.fillStyle = '#888888';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText(st.sub, sx + 16, curY + 82);
  });

  curY += statCardH + 30;

  // Section 1: Strategic Brief Box
  drawRoundedRect(ctx, contentX, curY, contentW, 110, 14, '#FFFFFF', true, '#E2E2E2', 1);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.fillText('1. Strategic Overview & Regulatory Basis', contentX + 20, curY + 30);

  ctx.fillStyle = '#444444';
  ctx.font = '13.5px Outfit, sans-serif';
  wrapText(ctx, reportData.strategyBrief, contentX + 20, curY + 54, contentW - 40, 20);

  curY += 130;

  // Section 2: Critical Filing Windows (4 column strip)
  drawRoundedRect(ctx, contentX, curY, contentW, 105, 14, '#F7F5FA', true, '#E2E2E2', 1);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.fillText('2. Status Runway & Critical Filing Windows', contentX + 20, curY + 28);

  const windowCols = [
    { title: 'I-765 Earliest File', date: timeline.earliestOptFile.toLocaleDateString(), desc: '90 days pre-grad' },
    { title: 'I-765 Final Deadline', date: timeline.latestOptFile.toLocaleDateString(), desc: '60 days post-grad' },
    { title: '12-Month OPT End', date: timeline.optEnd.toLocaleDateString(), desc: 'Initial authorization' },
    { title: 'STEM Extension End', date: timeline.isStem && timeline.stemEnd ? timeline.stemEnd.toLocaleDateString() : 'N/A', desc: timeline.isStem ? '+24 Months' : 'Standard Degree' }
  ];

  const colW = (contentW - 60) / 4;
  windowCols.forEach((w, i) => {
    const wx = contentX + 20 + i * (colW + 10);
    ctx.fillStyle = '#231F20';
    ctx.font = '600 12.5px Outfit, sans-serif';
    ctx.fillText(w.title, wx, curY + 54);

    ctx.fillStyle = '#144A86';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText(w.date, wx, curY + 74);

    ctx.fillStyle = '#888888';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText(w.desc, wx, curY + 92);
  });

  curY += 125;

  // Section 3: Action Plan Milestones
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 16px Outfit, sans-serif';
  ctx.fillText('3. Chronological Step-by-Step Action Plan', contentX, curY + 20);
  curY += 34;

  const milestoneH = 76;
  reportData.milestones.slice(0, 4).forEach((m, idx) => {
    drawRoundedRect(ctx, contentX, curY, contentW, milestoneH, 10, '#FFFFFF', true, '#E8E8E8', 1);

    // Number pill
    drawRoundedRect(ctx, contentX + 16, curY + 16, 36, 36, 18, '#144A86', false);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(m.step), contentX + 34, curY + 39);
    ctx.textAlign = 'left';

    // Title & Target date
    ctx.fillStyle = '#231F20';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText(m.title, contentX + 66, curY + 30);

    ctx.fillStyle = '#0D8341';
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(m.targetDate, contentX + contentW - 20, curY + 30);
    ctx.textAlign = 'left';

    // Desc
    ctx.fillStyle = '#555555';
    ctx.font = '13px Outfit, sans-serif';
    wrapText(ctx, m.desc, contentX + 66, curY + 52, contentW - 90, 18);

    curY += milestoneH + 12;
  });

  curY += 16;

  // Section 4: Itemized Budget & Runway in 2 Columns
  const halfW = (contentW - 24) / 2;
  const budgetBoxH = 260;

  // Left column: Budget Table
  drawRoundedRect(ctx, contentX, curY, halfW, budgetBoxH, 14, '#FFFFFF', true, '#E2E2E2', 1);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.fillText('4. Itemized Transition Capital & Filing Fees', contentX + 20, curY + 30);

  let by = curY + 56;
  reportData.governmentFees.forEach(f => {
    ctx.fillStyle = '#444444';
    ctx.font = '12.5px Outfit, sans-serif';
    ctx.fillText(f.name.length > 34 ? f.name.substring(0, 32) + '...' : f.name, contentX + 20, by);
    ctx.fillStyle = '#231F20';
    ctx.font = 'bold 12.5px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`$${f.amount.toLocaleString()}`, contentX + halfW - 20, by);
    ctx.textAlign = 'left';
    by += 24;
  });

  ctx.fillStyle = '#444444';
  ctx.font = '12.5px Outfit, sans-serif';
  ctx.fillText('Immigration Legal Counsel & Brief Prep', contentX + 20, by);
  ctx.fillStyle = '#231F20';
  ctx.font = 'bold 12.5px Outfit, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`~$${reportData.estimatedLegalFee.toLocaleString()}`, contentX + halfW - 20, by);
  ctx.textAlign = 'left';
  by += 32;

  // Total Row
  drawRoundedRect(ctx, contentX + 16, by - 16, halfW - 32, 38, 8, '#F2EFF7', true, '#144A86', 1);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 13.5px Outfit, sans-serif';
  ctx.fillText('Total Estimated Transition Capital', contentX + 28, by + 8);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${reportData.totalEstimatedCost.toLocaleString()}`, contentX + halfW - 28, by + 8);
  ctx.textAlign = 'left';

  // Right column: Runway & Compliance Safeguards
  drawRoundedRect(ctx, contentX + halfW + 24, curY, halfW, budgetBoxH, 14, '#FFFFFF', true, '#E2E2E2', 1);
  ctx.fillStyle = '#144A86';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.fillText('5. Financial Runway & Regulatory Guardrails', contentX + halfW + 44, curY + 30);

  let ry = curY + 56;
  ctx.fillStyle = '#0D8341';
  ctx.font = 'bold 14px Outfit, sans-serif';
  ctx.fillText(`Runway Cushion: ${reportData.runwayMonths} Months of Buffer`, contentX + halfW + 44, ry);
  ry += 22;

  ctx.fillStyle = '#555555';
  ctx.font = '12px Outfit, sans-serif';
  ctx.fillText(`Savings: $${reportData.liquidSavings.toLocaleString()} • Monthly Burn: $${reportData.totalMonthlyBurn.toLocaleString()}/mo`, contentX + halfW + 44, ry);
  ry += 32;

  ctx.fillStyle = '#B22222';
  ctx.font = 'bold 12.5px Outfit, sans-serif';
  ctx.fillText('Critical Safeguards:', contentX + halfW + 44, ry);
  ry += 20;

  reportData.complianceTraps.slice(0, 3).forEach(trap => {
    ctx.fillStyle = '#444444';
    ctx.font = '11.5px Outfit, sans-serif';
    ry = wrapText(ctx, `• ${trap}`, contentX + halfW + 44, ry, halfW - 50, 16);
    ry += 4;
  });

  curY += budgetBoxH + 30;

  // Footer Disclaimer
  ctx.strokeStyle = '#E2E2E2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, curY);
  ctx.lineTo(contentX + contentW, curY);
  ctx.stroke();

  curY += 24;

  ctx.fillStyle = '#777777';
  ctx.font = '11.5px Outfit, sans-serif';
  ctx.fillText('Grounded scenario modeling based on Title 8 of the Code of Federal Regulations (8 CFR). Not formal legal representation.', contentX, curY);
  ctx.fillText(`Generated on ${new Date().toLocaleDateString()} • Tool: https://f1-navigator.invisa-us.com/ • Invisa Home Page: https://invisa-us.com/`, contentX, curY + 20);

  return canvas;
}

export function downloadPngReport(profile, reportData, pathwayTitle) {
  const canvas = generateReportCanvas(profile, reportData, pathwayTitle);
  const candidateSlug = (profile.fullName || 'Candidate').trim().replace(/[^a-zA-Z0-9]+/g, '_');
  const pathwaySlug = (reportData.pathwayId || 'Strategy').replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `F1Navigator_${candidateSlug}_${pathwaySlug}_ActionPlan.png`;

  canvas.toBlob((blob) => {
    if (!blob) {
      alert('Unable to generate PNG image. Please try Print / Save PDF instead.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  }, 'image/png');
}

