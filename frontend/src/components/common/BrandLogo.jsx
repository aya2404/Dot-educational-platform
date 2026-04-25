import React from 'react';
import logoImage from '../../assets/dot-jordan-logo.png';

const BrandLogo = ({ compact = false, align = 'start', className = '' }) => (
  <div className={`brand-lockup brand-lockup--${align} ${compact ? 'brand-lockup--compact' : ''} ${className}`.trim()}>
    <img src={logoImage} alt="Dot Jordan" className="brand-lockup__image" />
    <div className="brand-lockup__text">
      <strong className="brand-lockup__title">Dot Jordan</strong>
    </div>
  </div>
);

export default BrandLogo;
