const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Builds a landscape A4 certificate PDF and resolves it as a Buffer.
//
// NOTE: pdfkit's built-in fonts (Helvetica) do not shape Arabic script, so the
// structural labels are English and the student/course names are drawn as-is.
// For fully Arabic certificates, embed an Arabic TTF (e.g. Cairo/Amiri) via
// doc.font(<path>) — kept out of scope here to avoid bundling a font binary.
const generateCertificatePdf = async ({
  studentName,
  courseName,
  issueDate,
  certificateId,
  verifyUrl,
}) => {
  const qrDataUrl = await QRCode.toDataURL(verifyUrl || '', { margin: 1, width: 150 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width;
    const height = doc.page.height;
    const primary = '#203f9a';
    const accent = '#b5507b';

    // Background + decorative double border.
    doc.rect(0, 0, width, height).fill('#ffffff');
    doc.lineWidth(6).strokeColor(primary).rect(24, 24, width - 48, height - 48).stroke();
    doc.lineWidth(1.5).strokeColor(accent).rect(36, 36, width - 72, height - 72).stroke();

    // Heading.
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(34)
      .text('Certificate of Completion', 0, 90, { align: 'center' });
    doc.fillColor(accent).font('Helvetica').fontSize(13)
      .text('This certificate is proudly presented to', 0, 150, { align: 'center' });

    // Recipient.
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(30)
      .text(studentName || 'Student', 0, 185, { align: 'center' });

    // Course line.
    doc.fillColor('#374151').font('Helvetica').fontSize(14)
      .text('for successfully completing the course', 0, 235, { align: 'center' });
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(20)
      .text(courseName || 'Course', 0, 260, { align: 'center' });

    // Footer meta (left) + QR (right).
    const footerY = height - 150;
    const issued = issueDate ? new Date(issueDate) : new Date();
    doc.fillColor('#374151').font('Helvetica').fontSize(11)
      .text(`Issue Date: ${issued.toISOString().split('T')[0]}`, 70, footerY, { align: 'left' })
      .text(`Certificate ID: ${certificateId || ''}`, 70, footerY + 18, { align: 'left' });

    doc.image(qrBuffer, width - 70 - 110, footerY - 30, { width: 110, height: 110 });
    doc.fillColor('#6b7280').font('Helvetica').fontSize(8)
      .text('Scan to verify', width - 70 - 110, footerY + 82, { width: 110, align: 'center' });

    doc.end();
  });
};

module.exports = { generateCertificatePdf };
