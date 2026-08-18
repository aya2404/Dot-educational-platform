const PlatformSettings = require('../models/PlatformSettings');

// Only #rgb / #rrggbb (optionally alpha) hex colours are accepted for CSS custom
// properties, so a value can never inject arbitrary CSS.
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// A URL is only stored if it is an http(s) URL or a local /uploads path — never a
// javascript:/data: scheme that could execute when rendered.
const isSafeUrl = (value) => /^(https?:\/\/|\/)/.test(value);

// Find-or-create the singleton global document (idempotent, concurrency-safe).
const ensurePlatformSettings = async () => {
  const existing = await PlatformSettings.findOne({ key: 'global' });
  if (existing) return existing;
  try {
    return await PlatformSettings.create({ key: 'global' });
  } catch (error) {
    if (error.code === 11000) {
      return PlatformSettings.findOne({ key: 'global' }); // created concurrently
    }
    throw error;
  }
};

// GET /api/platform/settings — PUBLIC (no auth). The login page (pre-auth) needs
// the global logo/favicon/name, so this read is intentionally open; it exposes
// only already-public branding. Writes remain Super-Admin-only (see the route).
const getPlatformSettings = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    return res.json({
      success: true,
      data: {
        platformName: settings.platformName,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
      },
    });
  } catch (error) {
    console.error('getPlatformSettings error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// PUT /api/platform/settings — Super Admin only (enforced by the route's
// authorize('superadmin')). Global branding is not tenant-scoped.
const updatePlatformSettings = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const { platformName, primaryColor, secondaryColor, logoUrl, faviconUrl } = req.body;

    if (typeof platformName === 'string' && platformName.trim()) {
      settings.platformName = platformName.trim();
    }
    if (typeof primaryColor === 'string' && HEX_COLOR.test(primaryColor.trim())) {
      settings.primaryColor = primaryColor.trim();
    }
    if (typeof secondaryColor === 'string' && HEX_COLOR.test(secondaryColor.trim())) {
      settings.secondaryColor = secondaryColor.trim();
    }
    if (typeof logoUrl === 'string') {
      const clean = logoUrl.trim();
      settings.logoUrl = clean === '' || isSafeUrl(clean) ? clean : settings.logoUrl;
    }
    if (typeof faviconUrl === 'string') {
      const clean = faviconUrl.trim();
      settings.faviconUrl = clean === '' || isSafeUrl(clean) ? clean : settings.faviconUrl;
    }

    await settings.save();
    return res.json({
      success: true,
      data: {
        platformName: settings.platformName,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
      },
    });
  } catch (error) {
    console.error('updatePlatformSettings error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = { getPlatformSettings, updatePlatformSettings };
