import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import theme from './theme';

// Design system tokens — must come before other CSS
import './styles/tokens.css';
import './styles/UserLayout.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline normalises browser defaults and applies MUI background */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
