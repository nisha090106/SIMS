import { createTheme } from '@mui/material/styles';

/**
 * SIMS MUI Theme
 * Overrides MUI's default palette, typography, shape and component defaults
 * to match the SIMS design token system.
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#F8FAFC',
      paper:   '#FFFFFF',
    },
    primary: {
      light:        '#EFF6FF',
      main:         '#2563EB',
      dark:         '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main:         '#64748B',
      contrastText: '#FFFFFF',
    },
    success: {
      main:  '#16A34A',
      light: '#F0FDF4',
    },
    warning: {
      main:  '#D97706',
      light: '#FFFBEB',
    },
    error: {
      main:  '#DC2626',
      light: '#FEF2F2',
    },
    info: {
      main:  '#0891B2',
      light: '#ECFEFF',
    },
    text: {
      primary:   '#0F172A',
      secondary: '#64748B',
      disabled:  '#94A3B8',
    },
    divider: '#E2E8F0',
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeightLight:   300,
    fontWeightRegular: 400,
    fontWeightMedium:  500,
    fontWeightBold:    700,

    h1: { fontSize: '2rem',   fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.25rem',fontWeight: 700, lineHeight: 1.3 },
    h4: { fontSize: '1.125rem',fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1rem',   fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '0.875rem',fontWeight: 600, lineHeight: 1.4 },

    body1: { fontSize: '0.875rem', lineHeight: 1.6 },  // 14px
    body2: { fontSize: '0.8125rem',lineHeight: 1.5 },  // 13px
    caption:{ fontSize: '0.75rem', lineHeight: 1.4 },  // 12px
    button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  },

  shape: {
    borderRadius: 8, // --radius-md
  },

  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)', // shadow-card
    '0 4px 12px rgba(0,0,0,0.10)',                              // shadow-elevated
    '0 8px 24px rgba(0,0,0,0.08)',
    '0 12px 32px rgba(0,0,0,0.10)',
    ...Array(20).fill('none'),
  ],

  components: {
    /* ── Button ── */
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.875rem',
          padding: '7px 16px',
        },
        containedPrimary: {
          background: '#2563EB',
          '&:hover': { background: '#1D4ED8' },
        },
      },
    },

    /* ── TextField / Input ── */
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
          fontFamily: "'Inter', sans-serif",
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CBD5E1',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2563EB',
            borderWidth: 1,
          },
        },
        notchedOutline: {
          borderColor: '#E2E8F0',
        },
        input: {
          padding: '9px 14px',
          height: 'auto',
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: '#64748B',
          '&.Mui-focused': { color: '#2563EB' },
        },
      },
    },

    /* ── Select ── */
    MuiSelect: {
      styleOverrides: {
        select: {
          padding: '9px 14px',
          fontSize: '0.875rem',
        },
      },
    },

    /* ── Card / Paper ── */
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        },
      },
    },

    /* ── Chip (used as badges) ── */
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 24,
        },
      },
    },

    /* ── Dialog ── */
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 700,
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '20px 24px' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px',
          borderTop: '1px solid #E2E8F0',
          gap: 8,
        },
      },
    },

    /* ── Table ── */
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            background: '#F1F5F9',
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748B',
            borderBottom: '1px solid #E2E8F0',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontSize: '0.875rem',
            padding: '11px 16px',
            borderBottom: '1px solid #E2E8F0',
            color: '#0F172A',
          },
          '& .MuiTableRow-root:last-child .MuiTableCell-root': {
            borderBottom: 'none',
          },
        },
      },
    },

    /* ── Tooltip ── */
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: '#0F172A',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 6,
          padding: '5px 9px',
        },
        arrow: { color: '#0F172A' },
      },
    },

    /* ── Divider ── */
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#E2E8F0' },
      },
    },

    /* ── AppBar ── */
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          color: '#0F172A',
        },
      },
    },

    /* ── Switch ── */
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: '#2563EB' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#2563EB' },
        },
      },
    },
  },
});

export default theme;
