const mongoose = require('mongoose');

// A course-completion certificate. One per (student, course). The PDF itself is
// regenerated on demand (not stored); this record is the source of truth for
// verification. `certificateId` is the public, human-shareable identifier.
const certificateSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الطالب مطلوب'],
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'الكورس مطلوب'],
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    certificateId: {
      type: String,
      unique: true,
    },

    // The value encoded in the certificate's QR code (the verification URL).
    qrCodeData: {
      type: String,
      default: '',
    },

    isRevoked: {
      type: Boolean,
      default: false,
    },

    // Multi-tenancy isolation key (inherited from the student's tenant).
    tenantId: {
      type: String,
      required: true,
      default: 'default',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One certificate per student per course.
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

// Generate a unique, shareable certificateId before the first save.
certificateSchema.pre('validate', function generateCertificateId(next) {
  if (!this.certificateId) {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.certificateId = `CERT-${Date.now()}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
