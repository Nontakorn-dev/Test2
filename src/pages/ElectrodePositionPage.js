import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const ElectrodePositionPage = () => {
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState('I');

  // Function to handle navigation to measurement page
  const handleStartRecording = () => {
    navigate('/measure');
  };
  
  // Function to handle lead selection
  const handleLeadSelection = (lead) => {
    setSelectedLead(lead);
  };
  
  // Function to go back
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="electrode-position-page">
      <div className="header-bar">
        <div className="container d-flex align-items-center">
          <button className="back-button" onClick={handleGoBack}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h1 className="header-title">Position the electrodes</h1>
        </div>
      </div>
      
      <div className="position-diagram-container">
        <div className="diagram-frame">
          {/* 
            ตรงนี้คุณจะใส่รูปภาพ โดยมีรูปแยกตาม Lead ที่เลือก
            เช่น Lead I จะโชว์รูปของ Lead I, Lead II จะโชว์รูปของ Lead II 
          */}
          <div className="image-placeholder">
            {selectedLead === 'I' && (
              <img 
                src="/images/lead-I-placement.png" 
                alt="Lead I Electrode Placement" 
                className="diagram-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><path d="M200,20 C270,20 330,80 330,150 C330,220 270,280 200,280 C130,280 70,220 70,150 C70,80 130,20 200,20 Z" fill="none" stroke="black" stroke-width="2"/><circle cx="150" cy="120" r="20" fill="#8B4513"/><circle cx="250" cy="120" r="20" fill="#DAA520"/><circle cx="160" cy="220" r="20" fill="#556B2F"/><circle cx="200" cy="170" r="30" stroke="black" fill="white" stroke-width="2"/><text x="200" y="175" font-family="Arial" font-size="12" text-anchor="middle">WATJAI</text></svg>';
                }}
              />
            )}
            {selectedLead === 'II' && (
              <img 
                src="/images/lead-II-placement.png" 
                alt="Lead II Electrode Placement" 
                className="diagram-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><path d="M200,20 C270,20 330,80 330,150 C330,220 270,280 200,280 C130,280 70,220 70,150 C70,80 130,20 200,20 Z" fill="none" stroke="black" stroke-width="2"/><circle cx="150" cy="120" r="20" fill="#8B4513"/><circle cx="250" cy="120" r="20" fill="#DAA520"/><circle cx="160" cy="220" r="20" fill="#556B2F"/><circle cx="200" cy="170" r="30" stroke="black" fill="white" stroke-width="2"/><text x="200" y="175" font-family="Arial" font-size="12" text-anchor="middle">WATJAI</text></svg>';
                }}
              />
            )}
            {selectedLead === 'III' && (
              <img 
                src="/images/lead-III-placement.png" 
                alt="Lead III Electrode Placement" 
                className="diagram-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><path d="M200,20 C270,20 330,80 330,150 C330,220 270,280 200,280 C130,280 70,220 70,150 C70,80 130,20 200,20 Z" fill="none" stroke="black" stroke-width="2"/><circle cx="150" cy="120" r="20" fill="#8B4513"/><circle cx="250" cy="120" r="20" fill="#DAA520"/><circle cx="160" cy="220" r="20" fill="#556B2F"/><circle cx="200" cy="170" r="30" stroke="black" fill="white" stroke-width="2"/><text x="200" y="175" font-family="Arial" font-size="12" text-anchor="middle">WATJAI</text></svg>';
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      <div className="lead-selection-container">
        <div className="lead-buttons">
          <button 
            className={`lead-button ${selectedLead === 'I' ? 'active' : ''}`}
            onClick={() => handleLeadSelection('I')}
          >
            DI
          </button>
          <button 
            className={`lead-button ${selectedLead === 'II' ? 'active' : ''}`}
            onClick={() => handleLeadSelection('II')}
          >
            DII
          </button>
          <button 
            className={`lead-button ${selectedLead === 'III' ? 'active' : ''}`}
            onClick={() => handleLeadSelection('III')}
          >
            DIII
          </button>
        </div>
      </div>
      
      <div className="action-button-container">
        <Button 
          variant="primary" 
          size="lg" 
          className="start-recording-button"
          onClick={handleStartRecording}
        >
          Start Recording
        </Button>
      </div>
      
      <style jsx>{`
        .electrode-position-page {
          max-width: 768px;
          margin: 0 auto;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9f9f9;
        }
        
        .header-bar {
          background-color: white;
          color: black;
          padding: 15px 0;
          width: 100%;
          border-bottom: 1px solid #eee;
        }
        
        .back-button {
          background: none;
          border: none;
          font-size: 18px;
          margin-right: 10px;
          color: black;
        }
        
        .header-title {
          font-size: 1.2rem;
          font-weight: 500;
          margin: 0;
        }
        
        .position-diagram-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        
        .diagram-frame {
          width: 100%;
          max-width: 500px;
          aspect-ratio: 1 / 1;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: white;
        }
        
        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .diagram-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .lead-selection-container {
          padding: 20px;
          display: flex;
          justify-content: center;
        }
        
        .lead-buttons {
          display: flex;
          gap: 20px;
        }
        
        .lead-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: white;
          border: 1px solid #ddd;
          font-weight: 500;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .lead-button.active {
          background-color: #4c6ef5;
          color: white;
          border-color: #4c6ef5;
        }
        
        .action-button-container {
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .start-recording-button {
          width: 100%;
          background-color: #4c6ef5;
          border-color: #4c6ef5;
          padding: 15px 0;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
};

export default ElectrodePositionPage;