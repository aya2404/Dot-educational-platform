import React from 'react';
import logoImage from '../../assets/dot-jordan-logo.png';
import { useTheme } from '../../context/ThemeContext';

// Logo/name resolution (tenant over global over bundled default):
//   • On the login page (pre-auth) only the global layer is loaded, so the
//     global logo/name shows.
//   • Inside a tenant's dashboard the tenant logo/name overrides it.
const BrandLogo = ({ compact = false, align = 'start', className = '' }) => {
  const { settings, globalSettings } = useTheme();
  const logoSrc = settings?.logoUrl || globalSettings?.logoUrl || logoImage;
  const title = settings?.platformName || globalSettings?.platformName || 'Dot Jordan';

  return (
    <div className={`brand-lockup brand-lockup--${align} ${compact ? 'brand-lockup--compact' : ''} ${className}`.trim()}>
      <img src={logoSrc} alt={title} className="brand-lockup__image" />
      <div className="brand-lockup__text">
        <strong className="brand-lockup__title">{title}</strong>
      </div>
    </div>
  );
};

export default BrandLogo;
