import React from 'react';
import logo from './images/logo.png';
import './App.css';

function App() {
  return (
    <div className="flex-center position-ref full-height">
      <a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/ezmajoarg">
        <img src={ logo } alt="Logo Ezmajo" className="logo" />
      </a>
    </div>
  );
}

export default App;
