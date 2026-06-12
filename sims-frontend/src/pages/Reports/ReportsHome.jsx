import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import { BarChart3, TrendingDown, Truck, FileText, BoxSelect, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReportsHome = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'staff';

  const reports = [
    {
      id: 'inventory-valuation',
      title: 'Inventory Valuation',
      description: 'Stock value by product, category, and warehouse',
      icon: <BarChart3 size={40} />,
      color: '#2196F3',
    },
    {
      id: 'stock-movement',
      title: 'Stock Movement',
      description: 'Historical stock in/out, adjustments, and transfers',
      icon: <TrendingDown size={40} />,
      color: '#4CAF50',
    },
    {
      id: 'low-stock',
      title: 'Low Stock Alert',
      description: 'Items below reorder level with variance analysis',
      icon: <BoxSelect size={40} />,
      color: '#FF9800',
    },
    {
      id: 'purchase-orders',
      title: 'Purchase Orders',
      description: 'PO lifecycle, supplier performance, and lead times',
      icon: <Truck size={40} />,
      color: '#9C27B0',
    },
    {
      id: 'request-fulfillment',
      title: 'Request Fulfillment',
      description: 'Inventory request status and fulfillment metrics',
      icon: <FileText size={40} />,
      color: '#F44336',
    },
    {
      id: 'audit-log',
      title: 'Audit Log',
      description: 'System activity log with user, action, and timestamp tracking',
      icon: <Clock size={40} />,
      color: '#607D8B',
      adminOnly: true,
    },
  ];

  const filteredReports = reports.filter(r => !r.adminOnly || userRole === 'admin');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>Reports</Typography>
      <Typography color="textSecondary" sx={{ mb: 3 }}>
        Select a report to view detailed inventory, operational, and compliance metrics
      </Typography>

      <Grid container spacing={3}>
        {filteredReports.map(report => (
          <Grid item xs={12} sm={6} md={4} key={report.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              <Box
                sx={{
                  bgcolor: report.color,
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                {report.icon}
              </Box>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {report.title}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  {report.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button variant="contained" fullWidth onClick={() => navigate(`/reports/${report.id}`)}>
                  Run Report
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsHome;
