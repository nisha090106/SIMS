import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { SearchOff as SearchOffIcon } from '@mui/icons-material';
import Button from '../components/ui/Button';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const home = user?.role === 'user' ? '/user-dashboard' : user ? '/dashboard' : '/login';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-sans)',
        padding: 24,
        textAlign: 'center',
        gap: 0,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--color-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <SearchOffIcon style={{ fontSize: 40, color: 'var(--color-text-muted)' }} />
      </div>

      {/* Error code */}
      <p
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: 'var(--color-primary)',
          lineHeight: 1,
          marginBottom: 8,
          fontFamily: 'var(--font-sans)',
        }}
      >
        404
      </p>

      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 10,
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          maxWidth: 380,
          marginBottom: 32,
          lineHeight: 1.6,
        }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>

      <Button onClick={() => navigate(home)} size='md'>
        Back to Home
      </Button>
    </div>
  );
};

export default NotFound;
