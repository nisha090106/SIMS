import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Drawer,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Download, FileDown } from 'lucide-react';
import { format, subDays } from 'date-fns';

const ReportViewer = ({
  title,
  filters,
  onFiltersChange,
  loading,
  error,
  data,
  summary,
  columns,
  onExport,
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const userRole = localStorage.getItem('userRole') || 'staff';

  const handleFilterChange = (field, value) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleDatePreset = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    onFiltersChange({
      ...filters,
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    });
  };

  const getPresetButtons = () => [
    { label: 'Today', days: 0 },
    { label: 'This Week', days: 7 },
    { label: 'This Month', days: 30 },
    { label: 'Last Month', days: 60 },
  ];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
      {/* Left Panel - Filters */}
      <Drawer
        variant="permanent"
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 300,
            boxSizing: 'border-box',
            p: 2,
            overflowY: 'auto',
            mt: '64px',
            height: 'calc(100vh - 64px)',
          },
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Date Range Presets */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Date Range Presets:</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {getPresetButtons().map(preset => (
              <Button
                key={preset.label}
                size="small"
                variant={
                  preset.days === 0 && filters.from === format(new Date(), 'yyyy-MM-dd')
                    ? 'contained'
                    : 'outlined'
                }
                onClick={() => handleDatePreset(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Custom Filters from Children */}
        {children}
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header with Title and Export */}
        <Box sx={{ p: 3, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{title}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download size={18} />}
              onClick={() => onExport('csv')}
              disabled={loading || !data || data.length === 0}
            >
              CSV
            </Button>
            {userRole === 'admin' && (
              <Button
                variant="outlined"
                startIcon={<FileDown size={18} />}
                onClick={() => onExport('pdf')}
                disabled={loading || !data || data.length === 0}
              >
                PDF
              </Button>
            )}
          </Box>
        </Box>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : data && data.length > 0 ? (
            <>
              {/* Summary Cards */}
              {summary && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Object.entries(summary).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={3} key={key}>
                      <Card>
                        <CardContent>
                          <Typography color="textSecondary" variant="caption" sx={{ textTransform: 'uppercase' }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Data Table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      {columns.map(col => (
                        <TableCell key={col.field} align={col.align || 'left'}>
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map(col => (
                          <TableCell key={col.field} align={col.align || 'left'}>
                            {col.render ? col.render(row[col.field], row) : row[col.field]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="textSecondary">No data available for the selected filters</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ReportViewer;
