import React from 'react';
import '../styles/PlaceholderPage.css';

const PlaceholderPage = ({ title, description }) => {
  return (
    <div className='placeholder-container'>
      <div className='placeholder-content'>
        <h1>{title}</h1>
        <p>{description || 'This page is coming soon. Please check back later.'}</p>
        <div className='placeholder-icon'>📝</div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
