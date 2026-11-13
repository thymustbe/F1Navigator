// F1 Navigator - Microsoft Word (.docx) Export Generator
// Generates an OpenXML .docx document in pure JavaScript without external dependencies

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createZip(files) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c >>> 0;
  }
  function calcCrc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const file of files) {
    const data = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const nameBytes = encoder.encode(file.name);
    const crc = calcCrc32(data);
    const size = data.length;

    // Local file header (30 bytes + name length)
    const lh = new Uint8Array(30 + nameBytes.length);
    const lhView = new DataView(lh.buffer);
    lhView.setUint32(0, 0x04034b50, true); // signature
    lhView.setUint16(4, 20, true);         // version needed
    lhView.setUint16(6, 0, true);          // flags
    lhView.setUint16(8, 0, true);          // compression method (0 = Store)
    lhView.setUint16(10, 0x4500, true);    // time
    lhView.setUint16(12, 0x5600, true);    // date
    lhView.setUint32(14, crc, true);       // crc32
    lhView.setUint32(18, size, true);      // compressed size
    lhView.setUint32(22, size, true);      // uncompressed size
    lhView.setUint16(26, nameBytes.length, true);
    lhView.setUint16(28, 0, true);         // extra field length
    lh.set(nameBytes, 30);

    localHeaders.push(lh, data);

    // Central directory header (46 bytes + name length)
    const ch = new Uint8Array(46 + nameBytes.length);
    const chView = new DataView(ch.buffer);
    chView.setUint32(0, 0x02014b50, true); // signature
    chView.setUint16(4, 20, true);         // version made by
    chView.setUint16(6, 20, true);         // version needed
    chView.setUint16(8, 0, true);          // flags
    chView.setUint16(10, 0, true);         // compression method (0)
    chView.setUint16(12, 0x4500, true);    // time
    chView.setUint16(14, 0x5600, true);    // date
    chView.setUint32(16, crc, true);       // crc
    chView.setUint32(20, size, true);      // comp size
    chView.setUint32(24, size, true);      // uncomp size
    chView.setUint16(28, nameBytes.length, true);
    chView.setUint16(30, 0, true);         // extra len
    chView.setUint16(32, 0, true);         // comment len
    chView.setUint16(34, 0, true);         // disk start
    chView.setUint16(36, 0, true);         // internal attr
    chView.setUint32(38, 0, true);         // external attr
    chView.setUint32(42, offset, true);    // relative offset
    ch.set(nameBytes, 46);

    centralHeaders.push(ch);
    offset += lh.length + data.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, centralDirOffset, true);
  eocdView.setUint16(20, 0, true);

  // Combine into single Uint8Array
  let totalLen = offset + centralDirSize + 22;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of [...localHeaders, ...centralHeaders, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

export function generateDocxBlob(profile, reportData, pathwayTitle) {
  const p = profile;
  const timeline = reportData.timeline;
  const candidateName = p.fullName ? escapeXml(p.fullName) : 'Candidate';
  const pathwayName = escapeXml(pathwayTitle || 'Non-Lottery Strategy');

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="231F20"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:after="140"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

  // Build Document XML
  let docBody = '';

  // Title & Subtitle Header
  docBody += `
    <w:p>
      <w:pPr>
        <w:spacing w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="44"/>
          <w:color w:val="144A86"/>
        </w:rPr>
        <w:t>INVISA F-1 NAVIGATOR</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="26"/>
          <w:color w:val="231F20"/>
        </w:rPr>
        <w:t>Strategic Non-Lottery Action Plan &amp; Runway Report</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="18"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t>Published by INVISA • Official Subdomain: https://f1-navigator.invisa-us.com/ • Title 8 CFR Modeling</w:t>
      </w:r>
    </w:p>
  `;

  // Candidate Profile Table
  docBody += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="144A86"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="144A86"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E2E2"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>Candidate</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${candidateName}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>Academic Credential</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>${escapeXml(p.degreeLevel || "Master's")} in ${escapeXml(p.major || "Computer Science")}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>Country of Citizenship</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>${escapeXml(p.nationality || "International")}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>Selected Pathway</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>${pathwayName}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
  `;

  // Key Metrics Table
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>Executive Status &amp; Financial Metrics</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="E2E2E2"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="E2E2E2"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E2E2"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E2E2"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2350" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>Active Work Auth</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>${timeline.daysAuthRemaining} Days</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2350" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>Allowable Cushion</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0D8341"/></w:rPr><w:t>${timeline.unemploymentRemaining} Days</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2350" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>Est. Transition Capital</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>$${reportData.totalEstimatedCost.toLocaleString()}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2350" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>Financial Runway</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0D8341"/></w:rPr><w:t>${reportData.runwayMonths} Mos</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
  `;

  // Section 1: Strategic Overview
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>1. Strategic Overview &amp; Regulatory Basis</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>${escapeXml(reportData.strategyBrief)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
      <w:r>
        <w:rPr><w:i/><w:color w:val="144A86"/></w:rPr>
        <w:t>Regulatory Foundation: Title 8 CFR regulations permit merit-based or treaty adjudications without dependency on the annual 85,000 lottery cap.</w:t>
      </w:r>
    </w:p>
  `;

  // Section 2: Critical Filing Windows
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>2. Status Runway &amp; Critical Filing Windows</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Earliest Form I-765 Filing Date: </w:t></w:r>
      <w:r><w:t>${timeline.earliestOptFile.toLocaleDateString()} (90 days before graduation)</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Latest Form I-765 Filing Deadline: </w:t></w:r>
      <w:r><w:t>${timeline.latestOptFile.toLocaleDateString()} (60 days post-graduation)</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Initial 12-Month OPT End Date: </w:t></w:r>
      <w:r><w:t>${timeline.optEnd.toLocaleDateString()}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• STEM OPT Extension Expiration: </w:t></w:r>
      <w:r><w:t>${timeline.isStem && timeline.stemEnd ? timeline.stemEnd.toLocaleDateString() : 'N/A (Standard 12-Month Degree)'}</w:t></w:r>
    </w:p>
  `;

  // Section 3: Action Plan Milestones
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>3. Chronological Step-by-Step Action Plan</w:t></w:r>
    </w:p>
  `;
  for (const m of reportData.milestones) {
    docBody += `
      <w:p>
        <w:pPr><w:spacing w:after="60"/></w:pPr>
        <w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>Step ${m.step}: ${escapeXml(m.title)} (${escapeXml(m.targetDate)})</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="160"/></w:pPr>
        <w:r><w:t>${escapeXml(m.desc)}</w:t></w:r>
      </w:p>
    `;
  }
  docBody += `<w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>`;

  // Section 4: Itemized Budget Table
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>4. Itemized Transition Capital &amp; Filing Budget</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="144A86"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="144A86"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E2E2"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="6800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Expense Item</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2EFF7"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Estimated Cost (USD)</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
  `;
  for (const f of reportData.governmentFees) {
    docBody += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>${escapeXml(f.name)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>$${f.amount.toLocaleString()}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    `;
  }
  docBody += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Immigration Legal Counsel &amp; Evidentiary Brief Preparation</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>~$${reportData.estimatedLegalFee.toLocaleString()}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="6800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E2E2"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>Total Estimated Transition Capital Needed</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E2E2"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="144A86"/></w:rPr><w:t>$${reportData.totalEstimatedCost.toLocaleString()}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
  `;

  // Section 5: Runway & Safety Net
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>5. Financial Safety Net &amp; Runway Analysis</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Calculated Runway: </w:t></w:r>
      <w:r><w:t>${reportData.runwayMonths} Months of Living Buffer</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>${escapeXml(reportData.safetyNetMessage)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Liquid Savings: $${reportData.liquidSavings.toLocaleString()} • Monthly Living: $${reportData.monthlyLiving.toLocaleString()} • Monthly Healthcare Buffer: $${reportData.healthcareGap.toLocaleString()}</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
  `;

  // Section 6: Compliance Safeguards
  docBody += `
    <w:p>
      <w:pPr><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="144A86"/></w:rPr><w:t>6. Critical Regulatory Safeguards</w:t></w:r>
    </w:p>
  `;
  for (const trap of reportData.complianceTraps) {
    docBody += `
      <w:p>
        <w:r><w:rPr><w:b/><w:color w:val="B22222"/></w:rPr><w:t>⚠ Guardrail: </w:t></w:r>
        <w:r><w:t>${escapeXml(trap)}</w:t></w:r>
      </w:p>
    `;
  }

  // Footer / Disclaimer
  docBody += `
    <w:p><w:pPr><w:spacing w:before="360" w:after="100"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr>
        <w:t>Grounded scenario modeling based on Title 8 of the Code of Federal Regulations (8 CFR). Not formal legal advice. Consult with licensed immigration counsel before petition filing.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="144A86"/></w:rPr>
        <w:t>Generated by INVISA F-1 Navigator • https://f1-navigator.invisa-us.com/ • Invisa Home Page: https://invisa-us.com/</w:t>
      </w:r>
    </w:p>
  `;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docBody}
  </w:body>
</w:document>`;

  const files = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'word/_rels/document.xml.rels', content: docRelsXml },
    { name: 'word/styles.xml', content: stylesXml },
    { name: 'word/document.xml', content: documentXml }
  ];

  const zipBytes = createZip(files);
  return new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export function downloadDocxReport(profile, reportData, pathwayTitle) {
  const blob = generateDocxBlob(profile, reportData, pathwayTitle);
  const candidateSlug = (profile.fullName || 'Candidate').trim().replace(/[^a-zA-Z0-9]+/g, '_');
  const pathwaySlug = (reportData.pathwayId || 'Strategy').replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `F1Navigator_${candidateSlug}_${pathwaySlug}_ActionPlan.docx`;

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
}

