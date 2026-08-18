const mongoose = require('mongoose');

// Site-wide (global) branding controlled by the Super Admin. Exactly one
// document exists (keyed by the singleton `key: 'global'`). These values act as
// the platform-level fallback beneath each tenant's own Organization settings,
// and own the truly global elements (favicon, login-page logo, platform name).
const platformSettingsSchema = new mongoose.Schema(
  {
    // Singleton guard — there is only ever one global settings document.
    key: {
      type: String,
      default: 'global',
      unique: true,
      index: true,
    },

    platformName: {
      type: String,
      trim: true,
      default: 'Dot Jordan',
    },

    primaryColor: {
      type: String,
      default: '#6d5acf',
    },

    secondaryColor: {
      type: String,
      default: '#ff6b6b',
    },

    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },

    faviconUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
