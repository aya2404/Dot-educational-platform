const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Builds a landscape A4 certificate PDF and resolves it as a Buffer.
//
// The look is driven by an optional `template` (CertificateTemplate). Every field
// falls back to the original hardcoded design, so callers may pass nothing.
//
// NOTE: pdfkit's built-in fonts (Helvetica) do not shape Arabic script, so Arabic
// template text will not render with correct joining. For fully Arabic
// certificates, embed an Arabic TTF (e.g. Cairo/Amiri) via doc.font(<path>) —
// kept out of scope here to avoid bundling a font binary.
const DEFAULTS = {
  titleText: 'Certificate of Completion',
  bodyText: 'This certificate is proudly presented to',
  primaryColor: '#6d5acf',
  accentColor: '#b5507b',
  signature1: 'Academy Director',
  signature1Name: '',
  signature2: 'Supervising Instructor',
  signature2Name: '',
  footerText: '',
  issueDateText: 'Issue Date',
};

// Resolve a logo URL to an embeddable image buffer. pdfkit cannot fetch remote
// URLs, so only local /uploads (or absolute file) paths are embedded; anything
// else (or any error) is skipped silently.
const resolveLogoBuffer = (logoUrl) => {
  try {
    if (!logoUrl || typeof logoUrl !== 'string') return null;
    const match = logoUrl.match(/\/uploads\/(.+)$/);
    if (!match) return null;
    const filePath = path.join(__dirname, '..', 'uploads', match[1]);
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) return null; // pdfkit: PNG/JPEG only
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
};

const generateCertificatePdf = async ({
  studentName,
  courseName,
  issueDate,
  certificateId,
  verifyUrl,
  template = {},
} = {}) => {
  const t = { ...DEFAULTS, ...(template || {}) };
  const primary = t.primaryColor || DEFAULTS.primaryColor;
  const accent = DEFAULTS.accentColor;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl || '', { margin: 1, width: 150 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const logoBuffer = resolveLogoBuffer(t.logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width;
    const height = doc.page.height;

    // Background + decorative double border.
    doc.rect(0, 0, width, height).fill('#ffffff');
    doc.lineWidth(6).strokeColor(primary).rect(24, 24, width - 48, height - 48).stroke();
    doc.lineWidth(1.5).strokeColor(accent).rect(36, 36, width - 72, height - 72).stroke();

    // Optional logo (centered, top).
    let headingY = 90;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, width / 2 - 35, 52, { fit: [70, 60], align: 'center' });
        headingY = 120;
      } catch {
        /* corrupt image — ignore and keep default heading position */
      }
    }

    // Heading + intro line.
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(34)
      .text(t.titleText, 0, headingY, { align: 'center' });
    doc.fillColor(accent).font('Helvetica').fontSize(13)
      .text(t.bodyText, 0, headingY + 60, { align: 'center' });

    // Recipient.
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(30)
      .text(studentName || 'Student', 0, headingY + 95, { align: 'center' });

    // Course line.
    doc.fillColor('#374151').font('Helvetica').fontSize(14)
      .text('for successfully completing the course', 0, headingY + 145, { align: 'center' });
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(20)
      .text(courseName || 'Course', 0, headingY + 170, { align: 'center' });

    // Signatures row.
    const sigY = height - 170;
    const drawSignature = (x, name, label) => {
      doc.lineWidth(1).strokeColor('#9ca3af').moveTo(x, sigY + 24).lineTo(x + 160, sigY + 24).stroke();
      if (name) {
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12)
          .text(name, x, sigY + 4, { width: 160, align: 'center' });
      }
      doc.fillColor('#6b7280').font('Helvetica').fontSize(10)
        .text(label || '', x, sigY + 30, { width: 160, align: 'center' });
    };
    drawSignature(90, t.signature1Name, t.signature1);
    drawSignature(width - 90 - 160, t.signature2Name, t.signature2);

    // Footer meta (left) + QR (right).
    const footerY = height - 90;
    const issued = issueDate ? new Date(issueDate) : new Date();
    doc.fillColor('#374151').font('Helvetica').fontSize(11)
      .text(`${t.issueDateText}: ${issued.toISOString().split('T')[0]}`, 70, footerY, { align: 'left' })
      .text(`Certificate ID: ${certificateId || ''}`, 70, footerY + 16, { align: 'left' });

    if (t.footerText) {
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(9)
        .text(t.footerText, 0, height - 40, { align: 'center' });
    }

    doc.image(qrBuffer, width - 70 - 96, footerY - 60, { width: 96, height: 96 });
    doc.fillColor('#6b7280').font('Helvetica').fontSize(8)
      .text('Scan to verify', width - 70 - 96, footerY + 40, { width: 96, align: 'center' });

    doc.end();
  });
};

module.exports = { generateCertificatePdf };
