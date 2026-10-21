/** Rebuild the public, branded AUREON company profile from checked-in content. */
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat, chmod } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { businessActivities } from '../lib/business-activities.ts';
import { aureonVideos, videoDuration, videoTime } from '../lib/video-content.ts';
import { SUPPORT_EMAIL } from '../lib/contact.ts';

const ORIGIN = 'https://aureon-preview.onrender.com';
const EDITION = 'October 21, 2026';
const PDF = 'public/documents/aureon-company-profile.pdf';
const CACHE = '.aureon/company-profile';
const W = 595.28, H = 841.89, M = 42, CW = W - M * 2;
const C = { paper: '#F7F3EB', white: '#FFFFFF', ink: '#24252A', muted: '#64666D', gold: '#AA8134', pale: '#E9E0D0', dark: '#0A0A0C', line: '#D8D0C2', light: '#D7C18C' };
await mkdir('public/documents', { recursive: true });
await mkdir(CACHE, { recursive: true });
const font = (family: string, weight: number, style = 'normal') => `node_modules/@fontsource/${family}/files/${family}-latin-${weight}-${style}.woff`;
const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, bufferPages: true, compress: true, info: { Title: 'AUREON | Company Profile & Investor Guide', Author: 'AUREON', Subject: 'Business activities, investor processes, product information and responsible growth', Keywords: 'AUREON, company profile, business overview, investor guide', CreationDate: new Date(), ModDate: new Date() } });
doc.registerFont('Sans', font('dm-sans', 400));
doc.registerFont('Bold', font('dm-sans', 700));
doc.registerFont('Serif', font('cormorant-garamond', 500));
doc.registerFont('Italic', font('cormorant-garamond', 500, 'italic'));
const output = createWriteStream(PDF); doc.pipe(output);
const blocks: any[] = [], pages: any[] = [], used = new Set<string>();
const images = new Map<string, Buffer>();
const websitePictures = [...businessActivities.map(a => `public/images/strategies/${a.id}.png`), 'public/images/cards/aureon-card-concepts.png', ...aureonVideos.map(v => `public/videos/${v.id}.jpg`)];
for (const path of [...websitePictures, 'public/images/company/aureon-perspective.png', 'public/images/company/aureon-growth.png']) images.set(path, await sharp(path).flatten({ background: C.dark }).resize({ width: 1500, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer());
function text(value: string, x: number, y: number, width: number, size = 10, family = 'Sans', color = C.ink, options: any = {}) {
  const { maxHeight = H - 48 - y, minSize = Math.min(size, 8.5), ...settings } = options;
  const format = { width, lineGap: 3, ...settings };
  let fitted = size, height = 0;
  while (true) { doc.font(family).fontSize(fitted); height = doc.heightOfString(value, format); if (height <= maxHeight + .1 || fitted <= minSize) break; fitted -= .25; }
  if (height > maxHeight + .5 || y + height > H - 8) throw new Error(`Text overflow on page ${pages.length}: ${value.slice(0, 65)} (${height.toFixed(1)} > ${maxHeight.toFixed(1)})`);
  doc.fillColor(color).text(value, x, y, format);
  blocks.push({ page: doc.bufferedPageRange().start + (doc as any)._pageBuffer.indexOf(doc.page) + 1, value, x, y, width, height, size: fitted });
  return height;
}
function rule(x: number, y: number, width: number, color = C.line) { doc.save().strokeColor(color).lineWidth(.6).moveTo(x, y).lineTo(x + width, y).stroke().restore(); }
function logo(x: number, y: number, size = 22, color = C.gold) { doc.save().translate(x, y).scale(size / 32).lineWidth(1.3).strokeColor(color).fillColor(color).path('M16 3 30 28H2L16 3Z').stroke().path('M16 12 25 28H7l9-16Z').stroke().path('M11.5 20 16 28 20.5 20Z').fill().restore(); }
function brand(dark = false, large = false) { logo(M, 29, large ? 32 : 21, dark ? C.light : C.gold); text('AUREON', M + (large ? 44 : 31), 31, 230, large ? 18 : 10, 'Sans', dark ? C.light : C.ink, { characterSpacing: large ? 5 : 3, maxHeight: 32 }); }
function page(title: string, kicker: string, subtitle = '', destination = '') {
  doc.addPage(); pages.push({ title, destination: destination || `page-${pages.length + 1}`, dark: false });
  doc.rect(0, 0, W, H).fill(C.paper); brand(); text(kicker.toUpperCase(), 300, 34, 253, 7, 'Sans', C.muted, { align: 'right', characterSpacing: 1, maxHeight: 18 }); rule(M, 64, CW);
  doc.addNamedDestination(pages.at(-1).destination, 'Fit'); doc.outline.addItem(title);
  text(title, M, 82, CW, 34, 'Serif', C.ink, { maxHeight: 55, minSize: 27 });
  if (subtitle) text(subtitle, M, 133, CW, 10.5, 'Sans', C.muted, { maxHeight: 39 });
}
function picture(path: string, x: number, y: number, width: number, height: number, cover = false) {
  const bytes = images.get(path); if (!bytes) throw new Error(`Missing picture: ${path}`); used.add(path);
  doc.save().rect(x, y, width, height).fill(C.dark).rect(x, y, width, height).clip();
  doc.image(bytes, x, y, { ...(cover ? { cover: [width, height] } : { fit: [width, height] }), align: 'center', valign: 'center' }); doc.restore();
}
function box(title: string, body: string, x: number, y: number, width: number, height = 108, dark = false) {
  doc.roundedRect(x, y, width, height, 3).fill(dark ? '#151516' : C.white);
  const headingHeight = text(title.toUpperCase(), x + 14, y + 13, width - 28, 8, 'Bold', dark ? C.light : C.gold, { maxHeight: 32, minSize: 7.5, characterSpacing: .45 });
  const bodyTop = Math.max(33, 13 + headingHeight + 8);
  text(body, x + 14, y + bodyTop, width - 28, 9.4, 'Sans', dark ? '#D4D0C6' : C.ink, { maxHeight: height - bodyTop - 11 });
}
function note(title: string, body: string, y: number, height = 85) { doc.rect(M, y, CW, height).fill(C.pale); doc.rect(M, y, 2, height).fill(C.gold); text(title.toUpperCase(), M + 16, y + 13, CW - 32, 8, 'Bold', C.gold, { maxHeight: 20, characterSpacing: .7 }); text(body, M + 16, y + 34, CW - 32, 9.5, 'Sans', C.ink, { maxHeight: height - 44 }); }
function arrow(x: number, y: number, length: number, color = C.gold) { doc.save().strokeColor(color).lineWidth(1).moveTo(x, y).lineTo(x + length, y).lineTo(x + length - 4, y - 3).moveTo(x + length, y).lineTo(x + length - 4, y + 3).stroke().restore(); }
function flow(items: { title: string; body: string }[], y: number, height = 126) { const gap = 17, width = (CW - gap * (items.length - 1)) / items.length; items.forEach((item, index) => { box(item.title, item.body, M + index * (width + gap), y, width, height); if (index < items.length - 1) arrow(M + (index + 1) * width + index * gap + 2, y + height / 2, gap - 4); }); }
function link(label: string, target: string, x: number, y: number, width = CW, size = 10) { text(label, x, y, width, size, 'Sans', C.gold, { link: target, underline: true, maxHeight: 40 }); }
function rows(items: { title: string; body: string }[], y: number, rowHeight: number) { items.forEach((item, i) => { const top = y + i * rowHeight; rule(M, top, CW); text(item.title, M, top + 13, CW, 14, 'Serif', C.ink, { maxHeight: 28 }); text(item.body, M, top + 43, CW, 10, 'Sans', C.muted, { maxHeight: rowHeight - 54 }); }); }

// 01 — Cover.
doc.addPage(); pages.push({ title: 'Company profile', destination: 'cover', dark: true }); doc.rect(0, 0, W, H).fill(C.dark); brand(true, true); doc.addNamedDestination('cover', 'Fit'); doc.outline.addItem('AUREON company profile');
text('A different perspective.', M, 110, CW, 11, 'Sans', C.light, { characterSpacing: 1, maxHeight: 28 });
text('Company profile.', M, 155, CW, 55, 'Serif', C.white, { maxHeight: 75 });
text('Business & investor overview', M, 228, CW, 18, 'Serif', '#E5D8BD', { maxHeight: 34 });
text('OCTOBER 2026  /  EDITION 01', M, 276, CW, 8, 'Sans', C.light, { maxHeight: 20, characterSpacing: 1.4 });
picture('public/images/company/aureon-perspective.png', 0, 321, W, 397, true);
text('Where value takes shape.', M, 749, CW, 24, 'Italic', C.light, { maxHeight: 34 });

// 02 — Navigation and context.
page('A considered introduction.', 'Inside this publication', 'A coherent view of the brand, business themes, investor experience and the standards that put each decision in context.', 'contents');
text('This profile brings together AUREON’s company-reported business activities and the current website’s product information. It explains commercial possibilities, operating costs, account processes and the questions that support informed due diligence.', M, 184, CW, 11, 'Sans', C.ink, { maxHeight: 72 });
note('Publication context', 'For information, not an offer document, audited financial statement or regulatory authorization. Business descriptions are company-supplied. Sector illustrations depict business themes; they do not establish ownership, operating results or custody. Read current terms and risks before committing capital.', 270, 98);
const contents = [
 ['Company & business map', '03–04', 'overview'], ['Nine business perspectives', '05–13', 'sector-crypto-mining'], ['Value mechanics & investment plans', '14–15', 'economics'], ['The investor journey & transactions', '16–18', 'journey'], ['Security & operational controls', '19', 'security'], ['The AUREON card collection', '20', 'cards'], ['Learning & video guides', '21', 'guides'], ['Responsible growth & accountability', '22–23', 'growth'], ['Risks, policies & due diligence', '24–25', 'risks'], ['Questions, contact & resources', '26–27', 'questions'],
];
contents.forEach(([label, number, dest], i) => { const y = 396 + i * 34; rule(M, y + 28, CW); text(label, M, y, CW - 80, 11, 'Sans', C.ink, { maxHeight: 25 }); text(number, W - M - 65, y, 65, 11, 'Sans', C.gold, { align: 'right', maxHeight: 25 }); doc.goTo(M, y, CW, 29, dest); });
text(`Edition: ${EDITION}. Product parameters are a dated snapshot; current website terms and account records take precedence.`, M, 757, CW, 8.5, 'Sans', C.muted, { maxHeight: 35 });

// 03 — Brand and company overview.
page('Less noise. More perspective.', 'The company & the platform', 'AUREON combines business information, digital-asset deposit instructions, investment records and account controls in one considered experience.', 'overview');
picture('public/videos/introduction.jpg', M, 184, CW, 288);
const col3 = (CW - 24) / 3;
box('Clarity', 'Present plan terms, transaction status and the distinction between estimates and available funds.', M, 495, col3, 126);
box('Deliberate design', 'Make registration, verification, deposits, investment records and support easier to navigate.', M + col3 + 12, 495, col3, 126);
box('Transparent context', 'Explain costs, risks, review steps and the evidence needed to assess business claims.', M + (col3 + 12) * 2, 495, col3, 126);
note('Company identity & permissions', 'AUREON is the platform brand. Contracting entity details, registered address, leadership and financial-service permissions should be obtained from original records and independently checked. This publication supplies no verified registration or license references and implies no regulatory approval.', 649, 113);

// 04 — Sector map.
page('Nine connected perspectives.', 'The business map', 'A map of company-reported activities and investment interests. It is not a portfolio allocation, valuation or verified asset register.', 'business-map');
businessActivities.forEach((activity, i) => { const width = (CW - 24) / 3, x = M + (i % 3) * (width + 12), y = 184 + Math.floor(i / 3) * 148; picture(`public/images/strategies/${activity.id}.png`, x, y, width, width * 2 / 3); text(`${activity.number} / ${activity.title}`, x, y + width * 2 / 3 + 9, width, 10, 'Sans', C.ink, { maxHeight: 30, minSize: 9 }); doc.goTo(x, y, width, 138, `sector-${activity.id}`); });
flow([{ title: 'Commercial activity', body: 'Identify the source of receipts and the rights supporting it.' }, { title: 'Operating economics', body: 'Deduct costs, financing, losses and obligations.' }, { title: 'Evidence & reporting', body: 'Reconcile results and disclose the basis for any allocation.' }], 661, 108);

// 05–13 — Full sector profiles, with every original sector image.
for (const activity of businessActivities) {
  page(activity.title, `${activity.number} / ${activity.theme}`, activity.id === 'market-trading' ? `${activity.summary} AUREON reports 7–15 years of trader experience.` : activity.summary, `sector-${activity.id}`);
  picture(`public/images/strategies/${activity.id}.png`, M, 177, CW, 300);
  const width = (CW - 16) / 2;
  box('How revenue can arise', activity.revenue, M, 499, width, 130);
  box('What determines the margin', activity.margin, M + width + 16, 499, width, 130);
  box('Key risk', activity.risk, M, 645, width, 130);
  box('Supporting records', activity.evidence, M + width + 16, 645, width, 130);
  if (activity.id === 'market-trading') text('Trader experience is company-reported; independent biographies and credentials should support it.', M, 783, CW, 7.5, 'Sans', C.muted, { maxHeight: 22, minSize: 7 });
}

// 14 — Business economics, with no invented performance chart.
page('Revenue is a starting point.', 'How value is assessed', 'Commercial receipts and an investment return are different measures. The route between them includes costs, losses, financing and investor rights.', 'economics');
flow([{ title: '01 / Receipts', body: 'Sales, service fees, rents or reconciled realized gains.' }, { title: '02 / Deductions', body: 'Operating costs, financing, taxes, fees and losses.' }, { title: '03 / Net result', body: 'A defined-period outcome that can be positive or negative.' }, { title: '04 / Allocation', body: 'Subject to agreements, liabilities, liquidity and applicable law.' }], 184, 142);
text('Understand the three account views.', M, 364, CW, 25, 'Serif', C.ink, { maxHeight: 38 });
box('Available funds', 'Cleared ledger funds currently available for eligible account actions.', M, 414, col3, 124);
box('Committed principal', 'Funds allocated to active investment records and their recorded terms.', M + col3 + 12, 414, col3, 124);
box('Target estimates', 'Time-based arithmetic illustrations. They are not cash, realized trading gains or a guaranteed return.', M + (col3 + 12) * 2, 414, col3, 124);
note('Evidence before conclusions', 'Source statements, account reconciliations, asset rights, expenses and liabilities should support reported results. Business revenue does not automatically become investor earnings. This diagram is an explanatory framework, not a financial statement or a verified distribution formula.', 579, 107);
link('Explore business activities and reporting standards', `${ORIGIN}/approach`, M, 731);

// 15 — Dated, checked plan catalogue.
page('Five plans. Clear parameters.', 'Investment catalogue', 'USD parameters checked against the live plan catalogue for this edition. Rates below are illustrative targets, not achieved or guaranteed returns.', 'plans');
note('Capital is at risk', 'The daily targets of 2.5%–5% and monthly target of 10% are exceptionally high. Displaying them does not demonstrate that they can be achieved or sustained. You can lose your entire investment.', 184, 85);
const planRows = [ ['Starter', '$100–$1,999', '2.5% / day', '7 days'], ['Elite', '$2,000–$9,999', '3% / day', '7 days'], ['Gold', '$10,000–$49,999', '4% / day', '7 days'], ['Platinum', '$50,000–$499,999', '5% / day', '7 days'], ['Shareholder', '$15,000–$1,000,000', '10% / month', '365 days'] ];
const columns = [M + 12, M + 122, M + 298, M + 417], widths = [100, 171, 115, 80];
doc.rect(M, 296, CW, 33).fill(C.ink); ['Plan', 'Investment range', 'Target', 'Duration'].forEach((label, i) => text(label, columns[i], 305, widths[i], 8.5, 'Bold', C.white, { maxHeight: 20 }));
planRows.forEach((row, i) => { const y = 329 + i * 48; doc.rect(M, y, CW, 48).fill(i % 2 ? '#F0E9DC' : C.white); row.forEach((value, j) => text(value, columns[j], y + 15, widths[j], 10, j === 0 ? 'Bold' : 'Sans', C.ink, { maxHeight: 24, minSize: 9 })); });
text('Read the numbers in context.', M, 601, CW, 24, 'Serif', C.ink, { maxHeight: 36 });
text('Illustrative accrual is linear, capped at the recorded duration and separate from available funds. It does not compound earnings into principal. Monthly targets use a fixed 365-day annualisation. Current eligibility, terms and account configuration govern access.', M, 645, CW, 10.5, 'Sans', C.muted, { maxHeight: 66 });
text('“Shareholder” is a product name, not evidence of equity ownership or a legal dividend entitlement. Rights require the applicable agreements and legal structure.', M, 724, CW, 9, 'Sans', C.muted, { maxHeight: 43 });
link('Current catalogue and risk disclosure', `${ORIGIN}/plans`, M, 778, CW, 8.5);

// 16 — Investor journey.
page('Every step, considered.', 'The investor journey', 'Follow the record from account creation to review, allocation and withdrawal. A status always has a specific meaning.', 'journey');
const journey = [ ['01 / Register', 'Enter your own name and email, choose a unique password and review the terms.'], ['02 / Verify', 'Verify email, submit identity details for operator review and enable an authenticator.'], ['03 / Select a route', 'Use the current deposit workspace to choose the exact asset, network and destination.'], ['04 / Submit evidence', 'Record the actual transaction hash and declared value for operator verification.'], ['05 / Review & credit', 'An authorised operator checks the transfer before any cleared balance is credited.'], ['06 / Assess a plan', 'Read the risk disclosure and plan terms before allocating an eligible available balance.'], ['07 / Track records', 'Review principal, transaction status and illustrative estimates as distinct measures.'], ['08 / Request withdrawal', 'Confirm destination and authenticator code; follow the review and payment reference.'] ];
journey.forEach(([title, body], i) => { const width = (CW - 16) / 2; box(title, body, M + (i % 2) * (width + 16), 184 + Math.floor(i / 2) * 132, width, 118); });
note('Before financial activity', 'Verified email, approved platform identity review, two-factor authentication, available funds and enabled funding are account gates. Manual identity review alone is not independent identity-provider verification or certification of AML compliance.', 707, 95);

// 17 — Asset/network routes and deposit guide image.
page('A careful funding process.', 'Deposits & receiving routes', 'Use current authenticated account instructions. A submitted transaction reference enters review; it does not itself create cleared funds.', 'deposits');
picture('public/videos/deposit-guide.jpg', M, 181, CW, 287.6);
const routes = [['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['USDT', 'TRC20'], ['BNB', 'BSC'], ['SOL', 'Solana'], ['USDT', 'ERC20']];
text('Supported asset / network routes', M, 493, CW, 18, 'Serif', C.ink, { maxHeight: 28 });
routes.forEach(([asset, network], i) => { const y = 533 + i * 24; rule(M, y + 21, CW); text(asset, M + 8, y, 100, 10, 'Bold', C.ink, { maxHeight: 19 }); text(network, M + 140, y, CW - 150, 10, 'Sans', C.muted, { maxHeight: 19 }); });
note('Use the live destination', 'Copy or scan the current address in your investor workspace and recheck every character and network in the sending wallet. This document intentionally prints no receiving addresses. Wrong-network transfers can be irreversible; operator review must verify receipt and value before credit.', 699, 91);

// 18 — Withdrawal image and reserve/review/payment diagram.
page('A request is the beginning.', 'Withdrawals & transfers', 'Available balance, review status and actual blockchain payment are separate parts of the process.', 'withdrawals');
picture('public/videos/withdrawal-guide.jpg', M, 181, CW, 287.6);
flow([{ title: 'Request', body: 'Confirm amount, supported asset, network, destination and authenticator code.' }, { title: 'Reserve', body: 'Requested funds are reserved while the record is under review.' }, { title: 'Review', body: 'An authorised operator checks eligibility, destination and available liquidity.' }, { title: 'Payment record', body: 'Follow the outcome and blockchain reference when payment is recorded.' }], 495, 132);
note('Approval and settlement are distinct', 'An application approval does not broadcast cryptocurrency. External payouts require operator action and a transaction reference. A declined request releases the reservation under the applicable workflow. Internal balance transfers are reviewed ledger records, not automatic blockchain payments.', 661, 107);

// 19 — Architecture and operating controls.
page('Trust is built in the details.', 'Security & operations', 'Specific controls support account integrity. They do not eliminate market, counterparty, custody or operational risk.', 'security');
flow([{ title: 'Account interfaces', body: 'Separate public, investor and administrator workspaces.' }, { title: 'Protected service', body: 'Authenticated sessions, role checks, validation and sensitive-action codes.' }, { title: 'Durable records', body: 'Account records, monetary ledger entries, review history and audit events.' }], 184, 134);
box('Access protection', 'Hashed passwords, HTTP-only sessions and authenticator-based two-factor checks support account security. Passkeys are supported in account settings.', M, 355, (CW - 16) / 2, 123);
box('Wallet ownership', 'Supported wallet proofs establish a signed ownership statement. They do not authorise spending, establish source of funds or send cryptocurrency.', M + (CW + 16) / 2, 355, (CW - 16) / 2, 123);
box('Recovery & backups', 'Encrypted backup/restore tools are available. Automatic off-site backups require private storage, saved recovery material and operator configuration.', M, 494, (CW - 16) / 2, 123);
box('Monitoring & review', 'Health and independent uptime checks support availability monitoring. Transaction review and administrator audit trails preserve operational context.', M + (CW + 16) / 2, 494, (CW - 16) / 2, 123);
note('Assurance has a separate standard', 'No completed independent penetration test, custody audit, insurance coverage or regulatory authorization is established by this publication. External reviews should identify the reviewer, date, scope, findings and any limitations. Wallet addresses alone do not prove reserves or segregation.', 653, 116);

// 20 — Card design artwork with accurate product scope.
page('The AUREON card collection.', 'Design & application experience', 'Gold and charcoal finishes, the company mark and front/back design views connect the card collection to the AUREON identity.', 'cards');
picture('public/images/cards/aureon-card-concepts.png', M, 180, CW, CW * 2 / 3);
box('Preferences & preliminary review', 'The investor workspace records network-design and physical/virtual preferences, country of residence, intended use and acknowledgements. Applicants can follow review messages and withdraw an active request. Administrators can review records and preserve decision history.', M, 548, (CW - 16) / 2, 207);
box('Issuance & payment requirements', 'The current process does not issue a card, approve credit or provide a payment facility. Visa and Mastercard designs are preferences, not evidence of a confirmed network partnership. A licensed issuer, approved program, eligible territories, underwriting, fees and cardholder terms are required before issuance or international use.', M + (CW + 16) / 2, 548, (CW - 16) / 2, 207);
link('Explore the designs and current program information', `${ORIGIN}/cards`, M, 776, CW, 8.5);

// 21 — Every website video poster, paired with its guide.
page('Guidance you can return to.', 'The video library', 'Five short videos combine ambient music, English captions, transcripts and chapter links. Follow the current website for playback and downloads.', 'guides');
aureonVideos.forEach((video, i) => { const y = 183 + i * 116; picture(`public/videos/${video.id}.jpg`, M, y, 145, 81.6); text(`${video.category.toUpperCase()} / ${videoTime(videoDuration(video))}`, 204, y + 1, 349, 7.5, 'Sans', C.gold, { maxHeight: 18, characterSpacing: .7 }); text(video.title, 204, y + 22, 349, 17, 'Serif', C.ink, { maxHeight: 30 }); text(video.description, 204, y + 50, 349, 9.4, 'Sans', C.muted, { maxHeight: 41 }); link('Watch the guide', `${ORIGIN}/videos#${video.id}`, 204, y + 94, 349, 8); });

// 22 — New growth artwork and priorities, without fabricated growth metrics.
page('Growth with a clear foundation.', 'Development priorities', 'A framework for responsible development, not a promise of financial performance or a statement that every milestone is complete.', 'growth');
picture('public/images/company/aureon-growth.png', M, 180, CW, CW * 2 / 3);
box('Governance & evidence', 'Publish verifiable entity, leadership, asset-rights and reporting information, with accountable ownership of decisions.', M, 543, (CW - 16) / 2, 106);
box('Resilient operations', 'Complete recovery setup, rehearse restores, address review findings and improve incident response.', M + (CW + 16) / 2, 543, (CW - 16) / 2, 106);
box('Suitable partnerships', 'Assess licensed and appropriate partners against product scope, jurisdictions, safeguarding and customer terms.', M, 665, (CW - 16) / 2, 106);
box('Education & service', 'Develop clear guidance, accessible account flows and support processes that explain the status of each action.', M + (CW + 16) / 2, 665, (CW - 16) / 2, 106);

// 23 — Reporting evidence diagram.
page('Make the method visible.', 'Transparency & accountability', 'A reporting standard should connect each conclusion to identifiable records, responsible people and a defined review scope.', 'reporting');
flow([{ title: 'Source records', body: 'Bank, wallet, broker, property, supplier and operating evidence.' }, { title: 'Reconciliation', body: 'Match receipts, expenses, assets and obligations for a defined period.' }, { title: 'Independent review', body: 'Obtain appropriately scoped security, legal and financial assessment.' }, { title: 'Clear disclosure', body: 'Explain methodology, limitations, rights and material changes.' }], 185, 147);
rows([{ title: 'Operating evidence', body: 'Identify the operator, contractual interests, activity records, costs and named responsible personnel.' }, { title: 'Financial context', body: 'Report assets and liabilities together. Separate realized results, unrealized valuations, fees and cash available for obligations.' }, { title: 'Investor communication', body: 'Explain pending versus completed actions, complaints handling, risks, material changes and the source of each published claim.' }], 371, 112);
note('A framework, not a certificate', 'This publication does not supply an independent audit report or a verified performance record. Reporting and review priorities describe the evidence investors should be able to assess; they do not certify that all documents or assessments already exist.', 704, 98);

// 24 — Material risks.
page('Understand the whole picture.', 'Risk & due diligence', 'Digital-asset investments are speculative. Capital, including your entire investment, can be lost. Seek independent advice suited to your circumstances.', 'risks');
const risks = [ ['Market & liquidity', 'Prices can fall rapidly; assets may become illiquid. Stablecoins can lose their peg. Redemptions can be delayed or unavailable.'], ['Targets & evidence', 'Exceptionally high targets are not verified results. Calculators and time counters do not prove trading activity, solvency or cash available for withdrawal.'], ['Custody & counterparties', 'Wallets, exchanges, issuers or the operator may fail. Public addresses do not prove control, segregated assets, insurance or sufficient reserves.'], ['Blockchain transfers', 'Wrong addresses, networks, contracts or memo fields can cause permanent loss. Congestion, software defects and confirmation delays can affect transfers.'], ['Legal & territory', 'Rules differ by country and product. Confirm the actual operator, permissions, territorial eligibility, contracts, complaint routes and tax obligations.'], ['Security & operations', 'Compromise, loss of keys, insider misconduct, outages and data incidents can cause loss. Account controls reduce some risks but cannot remove all of them.'] ];
risks.forEach(([title, body], i) => box(title, body, M + (i % 2) * ((CW + 16) / 2), 185 + Math.floor(i / 2) * 180, (CW - 16) / 2, 160));
link('Read the complete current risk disclosure', `${ORIGIN}/legal/risk`, M, 752);

// 25 — Policy and rights map.
page('Rights, responsibilities & data.', 'Policy overview', 'This overview does not replace the current terms, privacy notice, identity policy or the legal advice required for a specific offering.', 'policies');
const policies = [ ['Account & product terms', 'Review eligibility, the contracting entity, governing law, fees, liquidity, dispute handling and the precise rights attaching to each product. Current public terms contain operator-specific details that require completion and legal review.', '/legal/terms'], ['Privacy & data rights', 'Account, identity, financial, security and communication records support defined operational purposes. Raise access, correction, deletion or other applicable requests through support. Lawful retention obligations may limit deletion.', '/legal/privacy'], ['Identity & transaction review', 'The platform collects identity information and records operator decisions. Manual approval alone is not independent document verification, sanctions clearance or a complete regulated KYC/AML program.', '/legal/aml'], ['Complaints & escalation', 'Use the support form or published email with the relevant reference. Obtain the operator’s final complaints procedure, responsible entity and applicable external escalation route. Never send credentials or private wallet keys.', '/support#contact'] ];
policies.forEach(([title, body, target], i) => { const y = 183 + i * 148; box(title, body, M, y, CW, 127); link('Read current information', ORIGIN + target, M + 14, y + 100, CW - 28, 8); });

// 26 — Questions and referral context.
page('Questions worth asking.', 'A practical reference', 'Use these answers alongside the current website, signed terms and advice appropriate to your location and circumstances.', 'questions');
rows([{ title: 'Are target returns guaranteed?', body: 'No. Targets and calculator outputs are illustrations. Actual gains, repayment and liquidity depend on real assets, operating results and obligations.' }, { title: 'Is the dashboard counter available money?', body: 'No. Available funds, committed principal and target estimates are distinct. A growing estimate does not demonstrate realized profit or withdrawable funds.' }, { title: 'Does “Shareholder” grant ownership?', body: 'The plan name alone does not issue shares or establish legal dividend rights. Review the actual legal structure and agreements.' }, { title: 'Can the card designs be used for purchases?', body: 'No. The workspace records preferences and preliminary review. Cards, credit and payment functionality require a genuine approved issuing program.' }, { title: 'How do referrals work?', body: 'A referral relationship can be recorded at registration. Commission requires operator verification of a funded, realized entitlement. Registration alone earns nothing; no automatic or multi-level schedule is active.' }, { title: 'What should support never request?', body: 'Passwords, seed phrases, private wallet keys and one-time authentication codes. Send the relevant transaction or application reference instead.' }], 182, 99);

// 27 — Contact, QR and useful links.
page('Continue the conversation.', 'Contact & resources', 'Use the published project channels for account, transaction, identity and privacy enquiries. Verify the site address before signing in.', 'contact');
picture('public/images/company/aureon-growth.png', M, 181, CW, 215, true);
text('Project support', M, 435, 340, 10, 'Bold', C.gold, { maxHeight: 22 }); link(SUPPORT_EMAIL, `mailto:${SUPPORT_EMAIL}`, M, 463, 345, 17);
text('Website', M, 514, 340, 10, 'Bold', C.gold, { maxHeight: 22 }); link('aureon-preview.onrender.com', ORIGIN, M, 540, 345, 11);
const qrSvg = renderToStaticMarkup(createElement(QRCodeSVG, { value: ORIGIN, size: 256, level: 'M', bgColor: C.paper, fgColor: C.ink }));
const qr = await sharp(Buffer.from(qrSvg)).png().toBuffer(); await writeFile(`${CACHE}/website-qr.png`, qr); doc.image(qr, W - M - 130, 435, { width: 130, height: 130 }); doc.link(W - M - 130, 435, 130, 130, ORIGIN);
text('Open the website', W - M - 130, 577, 130, 8, 'Sans', C.muted, { align: 'center', maxHeight: 20 });
const resourceLinks = [['Business overview', '/approach'], ['Investment plans', '/plans'], ['Video guides', '/videos'], ['Card information', '/cards'], ['Security & transparency', '/security'], ['Terms & risk information', '/legal']];
resourceLinks.forEach(([label, target], i) => link(label, ORIGIN + target, M + (i % 2) * ((CW + 16) / 2), 640 + Math.floor(i / 2) * 37, (CW - 16) / 2, 10));
text(`Company profile / Edition 01 / ${EDITION}\nCurrent product details, eligibility and terms should always be checked on the website.`, M, 759, CW, 8, 'Sans', C.muted, { maxHeight: 36 });

// 28 — Closing brand page.
doc.addPage(); pages.push({ title: 'A considered perspective', destination: 'closing', dark: true }); doc.rect(0, 0, W, H).fill(C.dark); brand(true, true); doc.addNamedDestination('closing', 'Fit'); doc.outline.addItem('A considered perspective');
text('Perspective.\nWith purpose.', M, 119, CW, 48, 'Serif', C.white, { maxHeight: 127 });
picture('public/images/company/aureon-growth.png', 0, 283, W, 397, true);
text('A considered approach. A clearer view.', M, 725, CW, 22, 'Italic', C.light, { maxHeight: 37 });
link('aureon-preview.onrender.com', ORIGIN, M, 775, CW, 10);

if (pages.length !== 28) throw new Error(`Unexpected profile length: ${pages.length}`);
for (const path of websitePictures) if (!used.has(path)) throw new Error(`Website image omitted: ${path}`);
for (let index = 0; index < pages.length; index++) {
  doc.switchToPage(index); const dark = pages[index].dark; rule(M, 808, CW, dark ? '#54482F' : C.line);
  text('AUREON / COMPANY PROFILE', M, 818, 300, 6.5, 'Sans', dark ? C.light : C.muted, { maxHeight: 12, characterSpacing: .8 });
  text(`${String(index + 1).padStart(2, '0')} / 28`, W - M - 65, 816, 65, 8, 'Sans', dark ? C.light : C.gold, { align: 'right', maxHeight: 15 });
}
doc.end(); await finished(output);
const bytes = await readFile(PDF); const hash = createHash('sha256').update(bytes).digest('hex');
const manifest = { title: 'AUREON Company Profile & Investor Guide', edition: EDITION, pageCount: pages.length, bytes: (await stat(PDF)).size, pdf: '/documents/aureon-company-profile.pdf', cover: '/images/company/aureon-perspective.png', sha256: hash };
await writeFile('public/documents/aureon-company-profile.json', JSON.stringify(manifest, null, 2) + '\n');
await chmod(PDF, 0o644); await chmod('public/documents/aureon-company-profile.json', 0o644);
await writeFile(`${CACHE}/layout.json`, JSON.stringify({ pages, blocks, websitePictures, usedImages: [...used] }, null, 2));
console.log(JSON.stringify({ pdf: PDF, pages: pages.length, bytes: bytes.length, websitePictures: websitePictures.length, newPictures: 2, sha256: hash }));
