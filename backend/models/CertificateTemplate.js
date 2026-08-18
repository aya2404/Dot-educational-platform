const mongoose = require('mongoose');

// Per-tenant certificate template. Exactly one document per tenant (unique
// tenantId); created on first read with sensible defaults. Controls the wording,
// signatures, colour, and branding used when a certificate PDF is generated.
const certificateTemplateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: { type: String, trim: true, default: 'Default' },

    titleText: { type: String, trim: true, default: 'Certificate of Completion' },
    bodyText: {
      type: String,
      trim: true,
      default: 'This certificate is proudly presented to',
    },

    signature1: { type: String, trim: true, default: 'Academy Director' },
    signature1Name: { type: String, trim: true, default: '' },
    signature2: { type: String, trim: true, default: 'Supervising Instructor' },
    signature2Name: { type: String, trim: true, default: '' },

    primaryColor: { type: String, default: '#6d5acf' },
    fontFamily: { type: String, default: 'Cairo' },

    // Falls back to the organization/global logo when empty (resolved at gen time).
    logoUrl: { type: String, trim: true, default: '' },

    footerText: { type: String, trim: true, default: '' },
    issueDateText: { type: String, trim: true, default: 'Issue Date' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
