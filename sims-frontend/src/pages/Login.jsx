import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Mail, Lock, ShieldCheck, Warehouse, TrendingUp, AlertTriangle } from 'lucide-react';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/Login.css';

// Validation schema
const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email address is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    dispatch(loginStart());

    try {
      console.log('🔑 Attempting authentication for:', values.email);
      const response = await authAPI.login(values);

      // Structure: { message, user: { id, full_name, email, role }, accessToken, refreshToken }
      const { user, accessToken, refreshToken, message } = response.data;

      // Save credentials in Redux store
      dispatch(
        loginSuccess({
          user,
          token: accessToken,
          refreshToken,
        }),
      );

      showToast(message || 'Welcome back to SIMS!', 'success');
      if (user.role === 'user') {
        navigate('/user-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);

      let errorMessage = 'Unable to log in. Please check your network and try again.';

      if (error.code === 'ERR_NETWORK') {
        errorMessage =
          'Network error: Cannot reach the backend. Please check if server is running on port 5000.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(loginFailure(errorMessage));
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className='login-page'>
      <div className='login-grid'>
        {/* Left Side: Premium Brand Showcase */}
        <div className='login-brand-side'>
          <div className='brand-overlay'></div>
          <div className='brand-content'>
            <div className='brand-logo-wrapper'>
              <span className='brand-logo-icon'>S</span>
              <span className='brand-logo-text'>SIMS</span>
            </div>

            <h1 className='brand-heading'>
              Smart Inventory <br />
              <span className='text-highlight'>Management System</span>
            </h1>

            <p className='brand-tagline'>
              Real-time synchronization, advanced logistics metrics, and intelligent supply-chain
              notifications in one cohesive console.
            </p>

            <div className='brand-features-list'>
              <div className='brand-feature-item'>
                <div className='bf-icon-box'>
                  <Warehouse size={18} />
                </div>
                <div>
                  <h4>Multi-Warehouse Control</h4>
                  <p>Coordinate inventories across multiple distributed zones seamlessly.</p>
                </div>
              </div>

              <div className='brand-feature-item'>
                <div className='bf-icon-box'>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h4>Smart Audit & Analytics</h4>
                  <p>In-depth logging, automatic reorder flags, and sales reports.</p>
                </div>
              </div>

              <div className='brand-feature-item'>
                <div className='bf-icon-box'>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4>Role-Based Protection</h4>
                  <p>
                    Rigorous security configurations customized for staff, managers, and admins.
                  </p>
                </div>
              </div>
            </div>

            <div className='brand-meta-stats'>
              <div className='b-stat'>
                <span className='b-stat-num'>99.9%</span>
                <span className='b-stat-lbl'>Uptime SLA</span>
              </div>
              <div className='b-stat'>
                <span className='b-stat-num'>Real-time</span>
                <span className='b-stat-lbl'>Data Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className='login-form-side'>
          <div className='form-container-wrapper'>
            <div className='form-header'>
              <h2>Account Sign In</h2>
              <p>Welcome back! Please enter your security credentials to access SIMS.</p>
            </div>

            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, isSubmitting, setValues, values }) => {
                // Interactive autofill helper for the demo accounts
                const handleQuickLogin = (email, password) => {
                  setValues({ email, password });
                  showToast(`Filled credentials for ${email.split('@')[0]}`, 'info');
                };

                return (
                  <Form className='login-styled-form'>
                    {/* Email Input */}
                    <div className='custom-input-group'>
                      <label htmlFor='email'>Email Address</label>
                      <div className='input-with-icon'>
                        <Mail className='input-icon' size={18} />
                        <Field
                          type='email'
                          id='email'
                          name='email'
                          placeholder='name@company.com'
                          className={`field-control ${errors.email && touched.email ? 'has-error' : ''}`}
                        />
                      </div>
                      {errors.email && touched.email && (
                        <span className='validation-error-msg'>{errors.email}</span>
                      )}
                    </div>

                    {/* Password Input */}
                    <div className='custom-input-group'>
                      <label htmlFor='password'>Password</label>
                      <div className='input-with-icon'>
                        <Lock className='input-icon' size={18} />
                        <Field
                          type='password'
                          id='password'
                          name='password'
                          placeholder='••••••••'
                          className={`field-control ${errors.password && touched.password ? 'has-error' : ''}`}
                        />
                      </div>
                      {errors.password && touched.password && (
                        <span className='validation-error-msg'>{errors.password}</span>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type='submit'
                      className='login-gradient-submit-btn'
                      disabled={isSubmitting || isLoading}
                    >
                      {isLoading ? (
                        <div className='button-loading-spinner-box'>
                          <svg className='anim-spin-loader' viewBox='0 0 24 24'>
                            <circle
                              className='circle-bg'
                              cx='12'
                              cy='12'
                              r='10'
                              stroke='currentColor'
                              strokeWidth='4'
                              fill='none'
                            />
                            <path
                              className='spinner-arc'
                              fill='currentColor'
                              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                            />
                          </svg>
                          <span>Validating Credentials...</span>
                        </div>
                      ) : (
                        <span>Sign In to Dashboard</span>
                      )}
                    </button>

                    {/* Quick Login Section */}
                    <div className='quick-login-credentials-panel'>
                      <div className='panel-title-row'>
                        <ShieldCheck size={14} className='badge-icon' />
                        <span>Interactive Demo Accounts (Click to Fill)</span>
                      </div>
                      <div className='credentials-badges-grid'>
                        <button
                          type='button'
                          className='demo-account-badge admin-badge'
                          onClick={() => handleQuickLogin('admin@sims.com', 'admin123')}
                        >
                          <div className='badge-role'>Administrator Account</div>
                          <div className='badge-details'>admin@sims.com</div>
                        </button>
                        <button
                          type='button'
                          className='demo-account-badge manager-badge'
                          onClick={() => handleQuickLogin('manager@sims.com', 'manager123')}
                        >
                          <div className='badge-role'>Logistics Manager</div>
                          <div className='badge-details'>manager@sims.com</div>
                        </button>
                        <button
                          type='button'
                          className='demo-account-badge staff-badge'
                          onClick={() => handleQuickLogin('staff@sims.com', 'staff123')}
                        >
                          <div className='badge-role'>Staff Account</div>
                          <div className='badge-details'>staff@sims.com</div>
                        </button>
                      </div>
                    </div>

                    {/* Footer Nav Links */}
                    <div className='login-navigation-footer-links'>
                      <p>
                        Don't have an account yet?{' '}
                        <Link to='/register' className='highlight-redirect-link'>
                          Register a new profile
                        </Link>
                      </p>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
