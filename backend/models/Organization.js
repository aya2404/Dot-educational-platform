const mongoose = require('mongoose');

// Per-tenant white-labeling / branding settings. Exactly one document per
// tenant (unique tenantId); created on first read with sensible defaults.
const organizationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: '',
    },

    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },

    primaryColor: {
      type: String,
      default: '#6d5acf',
    },

    secondaryColor: {
      type: String,
      default: '#ff6b6b',
    },

    platformName: {
      type: String,
      trim: true,
      default: 'Dot Jordan',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Organization', organizationSchema);
