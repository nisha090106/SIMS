import React, { useContext } from 'react';
import ToastContext from '../context/ToastContext';
import '../styles/Toast.css';

const Toast = () => {
  const { toasts, removeToast } = useContext(ToastContext);

  return (
    <div className='toast-container'>
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className='toast-content'>
            <span>{toast.message}</span>
            <button
              className='toast-close'
              onClick={() => removeToast(toast.id)}
              aria-label='Close'
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Toast;
