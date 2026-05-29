// Generate PO number
export function generatePONumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `PO-${timestamp}-${random}`;
}

// Generate SO number
export function generateSONumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `SO-${timestamp}-${random}`;
}

// Format currency
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Get IP address from request
export function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    req.ip
  );
}

// Calculate pagination
export function calculatePagination(page = 1, limit = 10) {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
}

// Success response builder
export function successResponse(data, message = null, code = 200) {
  return {
    success: true,
    data,
    message,
    code,
  };
}

// Error response builder
export function errorResponse(error, code = 400) {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message,
    code,
  };
}

export default {
  generatePONumber,
  generateSONumber,
  formatCurrency,
  getClientIP,
  calculatePagination,
  successResponse,
  errorResponse,
};
