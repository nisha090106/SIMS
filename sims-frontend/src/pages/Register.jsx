import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { User, Mail, Lock, UserCheck, ShieldCheck, Warehouse, TrendingUp } from 'lucide-react';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/Register.css';

// Validation schema
const validationSchema = Yup.object().shape({
  full_name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Full Name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email address is required'),
  role: Yup.string()
    .oneOf(['staff', 'manager', 'admin', 'user'], 'Please select a valid role')
    .required('Account Role is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
});

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    dispatch(loginStart());

    try {
      console.log('📝 Registering user:', values.email, 'with role:', values.role);

      // Step 1: Call POST /api/auth/register
      const registerRes = await authAPI.register({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: values.role,
      });

      console.log('✅ Registration successful. Proceeding to Auto-Login...');

      // Step 2: Auto-login with registered credentials (POST /api/auth/login)
      const loginRes = await authAPI.login({
        email: values.email,
        password: values.password,
      });

      const { user, accessToken, refreshToken, message } = loginRes.data;

      // Save credentials in Redux store
      dispatch(
        loginSuccess({
          user,
          token: accessToken,
          refreshToken,
        }),
      );

      showToast('Account registered and logged in successfully!', 'success');
      if (user.role === 'user') {
        navigate('/user-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('❌ Registration/Login sequence failed:', error);

      let errorMessage = 'Could not complete registration. Please check inputs and try again.';

      if (error.code === 'ERR_NETWORK') {
        errorMessage =
          'Network error: Cannot reach the backend. Check if server is running on port 5000.';
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
    <div className='register-page'>
      <div className='register-grid'>
        {/* Left Side: Premium Brand Showcase (Matching Login Layout) */}
        <div className='register-brand-side'>
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
        <div className='register-form-side'>
          <div className='form-container-wrapper'>
            <div className='form-header'>
              <h2>Create Your Profile</h2>
              <p>Sign up now to begin managing inventory at enterprise scale.</p>
            </div>

            <Formik
              initialValues={{
                full_name: '',
                email: '',
                role: 'staff',
                password: '',
                confirmPassword: '',
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, isSubmitting }) => (
                <Form className='register-styled-form'>
                  {/* Full Name Input */}
                  <div className='custom-input-group'>
                    <label htmlFor='full_name'>Full Name</label>
                    <div className='input-with-icon'>
                      <User className='input-icon' size={18} />
                      <Field
                        type='text'
                        id='full_name'
                        name='full_name'
                        placeholder='John Doe'
                        className={`field-control ${errors.full_name && touched.full_name ? 'has-error' : ''}`}
                      />
                    </div>
                    {errors.full_name && touched.full_name && (
                      <span className='validation-error-msg'>{errors.full_name}</span>
                    )}
                  </div>

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

                  {/* Account Role Dropdown */}
                  <div className='custom-input-group'>
                    <label htmlFor='role'>Account Role</label>
                    <div className='input-with-icon'>
                      <UserCheck className='input-icon' size={18} />
                      <Field
                        as='select'
                        id='role'
                        name='role'
                        className={`field-control select-control ${errors.role && touched.role ? 'has-error' : ''}`}
                      >
                        <option value='user'>Requester / End User</option>
                        <option value='staff'>Staff Member (Warehouse Clerk)</option>
                        <option value='manager'>Logistics Manager</option>
                        <option value='admin'>System Administrator</option>
                      </Field>
                    </div>
                    {errors.role && touched.role && (
                      <span className='validation-error-msg'>{errors.role}</span>
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
                        placeholder='Min 6 characters'
                        className={`field-control ${errors.password && touched.password ? 'has-error' : ''}`}
                      />
                    </div>
                    {errors.password && touched.password && (
                      <span className='validation-error-msg'>{errors.password}</span>
                    )}
                  </div>

                  {/* Confirm Password Input */}
                  <div className='custom-input-group'>
                    <label htmlFor='confirmPassword'>Confirm Password</label>
                    <div className='input-with-icon'>
                      <Lock className='input-icon' size={18} />
                      <Field
                        type='password'
                        id='confirmPassword'
                        name='confirmPassword'
                        placeholder='Repeat your password'
                        className={`field-control ${errors.confirmPassword && touched.confirmPassword ? 'has-error' : ''}`}
                      />
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <span className='validation-error-msg'>{errors.confirmPassword}</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type='submit'
                    className='register-gradient-submit-btn'
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
                        <span>Creating Your Account...</span>
                      </div>
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </button>

                  {/* Navigation footer */}
                  <div className='register-navigation-footer-links'>
                    <p>
                      Already have an account?{' '}
                      <Link to='/login' className='highlight-redirect-link'>
                        Sign In here
                      </Link>
                    </p>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
