import React from 'react';
import TopBar from './header/TopBar';
import MainHeader from './header/MainHeader';
import Navigation from './header/Navigation';

const Header: React.FC = () => {
  return (
    <header>
      <TopBar />
      <MainHeader />
      <Navigation isOpen={true} />
    </header>
  );
};

export default Header;
