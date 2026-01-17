import React, { useState } from 'react';
import TopBar from './header/TopBar';
import MainHeader from './header/MainHeader';
import Navigation from './header/Navigation';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header>
      <TopBar />
      <MainHeader onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
      <Navigation isOpen={!isMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
};

export default Header;
