import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#F8FAFC',
      paper:   '#FFFFFF',
    },
    primary: {
      light:        '#EFF6FF',
      main:         '#3B82F6',
      dark:         '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main:         '#64748B',
      contrastText: '#FFFFFF',
    },
    success: {
      main:  '#10B981',
      light: '#D1FAE5',
    },
    warning: {
      main:  '#F59E0B',
      light: '#FEF3C7',
    },
    error: {
      main:  '#EF4444',
      light: '#FEE2E2',
    },
    info: {
      main:  '#3B82F6',
      light: '#DBEAFE',
    },
    text: {
      primary:   '#1E293B',
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

    h1: { fontSize: '2rem',    fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: '1.5rem',  fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 },
    h4: { fontSize: '1.125rem',fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1rem',    fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '0.875rem',fontWeight: 600, lineHeight: 1.4 },

    body1:   { fontSize: '0.875rem',  lineHeight: 1.6 },
    body2:   { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem',   lineHeight: 1.4 },
    button:  { fontSize: '0.875rem',  fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  },

  shape: { borderRadius: 8 },

  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 12px rgba(0,0,0,0.08)',
    '0 8px 24px rgba(0,0,0,0.07)',
    '0 12px 32px rgba(0,0,0,0.08)',
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
          fontFamily: "'Inter', sans-serif",
        },
        containedPrimary: {
          background: '#3B82F6',
          '&:hover': { background: '#2563EB' },
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
          background: '#FFFFFF',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3B82F6', borderWidth: 1 },
        },
        notchedOutline: { borderColor: '#E2E8F0' },
        input: { padding: '9px 14px', height: 'auto' },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: '#64748B',
          fontFamily: "'Inter', sans-serif",
          '&.Mui-focused': { color: '#3B82F6' },
        },
      },
    },

    /* ── Select ── */
    MuiSelect: {
      styleOverrides: {
        select: { padding: '9px 14px', fontSize: '0.875rem' },
      },
    },

    /* ── Card / Paper ── */
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          background: '#FFFFFF',
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          background: '#FFFFFF',
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: { fontFamily: "'Inter', sans-serif" },
      },
    },

    /* ── Chip ── */
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 24,
          fontFamily: "'Inter', sans-serif",
        },
      },
    },

    /* ── Dialog ── */
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1rem', fontWeight: 700,
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          fontFamily: "'Inter', sans-serif",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '20px 24px' } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '12px 24px', borderTop: '1px solid #E2E8F0', gap: 8 },
      },
    },

    /* ── Table ── */
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            background: '#F8FAFC',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748B',
            borderBottom: '1px solid #E2E8F0',
            padding: '10px 16px',
            fontFamily: "'Inter', sans-serif",
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
            borderBottom: '1px solid #F1F5F9',
            color: '#1E293B',
            fontFamily: "'Inter', sans-serif",
          },
          '& .MuiTableRow-root': {
            '&:hover': { background: '#F8FAFC' },
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
          background: '#1E293B',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 6,
          padding: '5px 9px',
          fontFamily: "'Inter', sans-serif",
        },
        arrow: { color: '#1E293B' },
      },
    },

    /* ── Divider ── */
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#E2E8F0' } },
    },

    /* ── AppBar ── */
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          color: '#1E293B',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        },
      },
    },

    /* ── Switch ── */
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: '#3B82F6' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#3B82F6' },
        },
      },
    },

    /* ── CssBaseline — enforce light background everywhere ── */
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F8FAFC',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: '#1E293B',
        },
      },
    },
  },
});

export default theme;
