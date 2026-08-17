import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { OctopusProvider } from './context/OctopusContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <OctopusProvider>
        <App />
      </OctopusProvider>
    </HashRouter>
  </React.StrictMode>
);
