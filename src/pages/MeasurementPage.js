import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import WebSocketService from '../services/WebSocketService';
import ApiService from '../services/ApiService';
import ECGChart from '../components/ECGChart';
import { useECG } from '../context/ECGContext';

const MobileMeasurementPage = () => {
  const navigate = useNavigate();
  const { 
    currentLead, 
    switchLead, 
    saveLeadData, 
    lead1Data,
    lead2Data,
    lead3Data,
    saveResults
  } = useECG();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [error, setError] = useState('');
  const [receiveBuffer, setReceiveBuffer] = useState([]);
  const [lastReceivedData, setLastReceivedData] = useState([]);
  
  const maxRecordingTimeSeconds = 15;

  // Function to save data for current lead
  const saveCurrentLeadData = useCallback((data) => {
    if (data.length > 0) {
      saveLeadData(currentLead, data);
    }
  }, [currentLead, saveLeadData]);
  
  // Process data received from ESP32
  const processReceivedData = useCallback((data) => {
    // WebSocket data is always string
    const lines = data.toString().split('\n');
    
    lines.forEach(line => {
      if (line.trim() === '') return;
      
      if (line.startsWith('STATUS:')) {
        const status = line.substring(7);
        // ไม่ต้องเปลี่ยนค่า isMeasuring เองแล้ว เนื่องจากเราจัดการโดยตรงใน
        // handleStartMeasurement และ handleStopMeasurement
        // ป้องกันไม่ให้มีการเปลี่ยนค่าโดยอัตโนมัติจาก device
        /*
        if (status === 'MEASURING') {
          setIsMeasuring(true);
        } else if (status === 'READY') {
          setIsMeasuring(false);
        }
        */
      } else if (line.startsWith('BUFFER:FULL')) {
        // ไม่ต้องตั้งค่า isMeasuring เป็น false ที่นี่ เพราะจะทำให้ปุ่มเปลี่ยนก่อนเวลา
        //setIsMeasuring(false);
        saveCurrentLeadData([...receiveBuffer]);
        setReceiveBuffer([]);
      } else if (line.startsWith('DATA:START')) {
        // Start collecting data
        setReceiveBuffer([]);
      } else if (line.startsWith('DATA:END')) {
        // End of data
        saveCurrentLeadData([...receiveBuffer]);
        setReceiveBuffer([]);
      } else if (line.includes(',')) {
        // If it's ECG data (comma-separated)
        const values = line.split(',').map(v => parseInt(v.trim()));
        setReceiveBuffer(prev => [...prev, ...values]);
        setLastReceivedData(prev => {
          const newData = [...prev, ...values];
          // Keep only last 500 points for display
          if (newData.length > 500) {
            return newData.slice(newData.length - 500);
          }
          return newData;
        });
      } else if (!isNaN(Number(line.trim()))) {
        // ECG Data point
        const value = Number(line.trim());
        setReceiveBuffer(prev => [...prev, value]);
        setLastReceivedData(prev => {
          const newData = [...prev, value];
          // Keep only last 500 points for display
          if (newData.length > 500) {
            return newData.slice(newData.length - 500);
          }
          return newData;
        });
      }
    });
  }, [receiveBuffer, saveCurrentLeadData]);
  
  // Setup WebSocket callbacks
  useEffect(() => {
    WebSocketService.onConnectionChanged = (connected) => {
      setIsConnected(connected);
      if (connected) {
        setError('');
      }
    };
    
    WebSocketService.onError = (message) => {
      setError(message);
    };
    
    WebSocketService.onDataReceived = (data) => {
      // Process received data
      processReceivedData(data);
    };
    
    return () => {
      // Cleanup
      WebSocketService.onConnectionChanged = null;
      WebSocketService.onError = null;
      WebSocketService.onDataReceived = null;
    };
  }, [processReceivedData]);

  // Start measurement
  const handleStartMeasurement = async () => {
    if (isConnected) {
      setLastReceivedData([]);
      setRecordingTime(0); // Reset the recording time only when starting a new measurement
      
      // ตั้งค่า measuring state ให้เป็น true ทันที - แก้ปัญหาต้องกด Start 2 ครั้ง
      setIsMeasuring(true);
      
      // ส่งคำสั่งไปยังอุปกรณ์
      await WebSocketService.sendCommand(`LEAD:${currentLead}`);
      await WebSocketService.sendCommand('START');
      
      // Setup timer for recording
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxRecordingTimeSeconds) {
            handleStopMeasurement();
            clearInterval(interval);
            return maxRecordingTimeSeconds; // Keep it at max value instead of resetting
          }
          return prev + 1;
        });
      }, 1000);
      
      setRecordingInterval(interval);
    } else {
      setError('Please connect to a device first');
    }
  };
  
  // Stop measurement
  const handleStopMeasurement = async () => {
    if (isConnected) {
      // ต้องตั้งค่า isMeasuring เป็น false ก่อนที่จะมีการเปลี่ยนแปลงอื่นๆ
      setIsMeasuring(false);
      
      await WebSocketService.sendCommand('STOP');
      
      // Clear timer
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      // Save current buffer
      if (receiveBuffer.length > 0) {
        saveCurrentLeadData([...receiveBuffer]);
        setReceiveBuffer([]);
      }
    }
  };
  
  // Handle navigation to next lead or results page
  const handleNext = async () => {
    // Check if we're still measuring
    if (isMeasuring) {
      setError('Please wait for the measurement to complete or stop it manually');
      return;
    }
    
    // Check if current lead data meets minimum requirements
    const currentLeadData = getLeadData(currentLead);
    if (currentLeadData.length === 0 || recordingTime < maxRecordingTimeSeconds) {
      setError(`Please complete a full ${maxRecordingTimeSeconds}-second recording for Lead ${currentLead}`);
      return;
    }
    
    if (currentLead < 3) {
      // Move to next lead
      switchLead(currentLead + 1);
      
      if (isConnected) {
        await WebSocketService.sendCommand(`LEAD:${currentLead + 1}`);
      }
    } else {
      // All leads measured, go to results
      if (lead1Data.length > 0) {
        try {
          const requestData = {
            signal_lead1: lead1Data,
            signal_lead2: lead2Data.length > 0 ? lead2Data : null,
            signal_lead3: lead3Data.length > 0 ? lead3Data : null,
            sampling_rate: 360 // Assuming 360Hz sampling rate
          };
          
          const results = await ApiService.analyzeECG(requestData);
          saveResults(results);
          
          // Navigate to results page
          navigate('/results');
        } catch (err) {
          setError(`Analysis failed: ${err.message}`);
        }
      } else {
        setError('Please measure Lead 1 first');
      }
    }
  };
  
  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    };
  }, [recordingInterval]);
  
  const getLeadData = (leadNumber) => {
    switch (leadNumber) {
      case 1: return lead1Data;
      case 2: return lead2Data;
      case 3: return lead3Data;
      default: return [];
    }
  };
  
  // Initial state for IP address input modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [ipAddress, setIpAddress] = useState(localStorage.getItem('watjaiIpAddress') || '');
  const [isConnecting, setIsConnecting] = useState(false);

  // Function to disconnect from device
  const handleDisconnect = async () => {
    if (isConnected) {
      try {
        await WebSocketService.disconnect();
        // WebSocketService.onConnectionChanged จะถูกเรียกโดยอัตโนมัติเมื่อตัดการเชื่อมต่อ
      } catch (err) {
        setError(`Disconnect error: ${err.message}`);
      }
    }
  };

  // Connection status message
  const connectionStatusMessage = isConnected ? 
    'Connected to device' : 
    'Not connected to device';
  
  // Function to handle connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Save IP to localStorage for future use
      if (ipAddress) {
        localStorage.setItem('watjaiIpAddress', ipAddress);
      }

      const success = await WebSocketService.connect(ipAddress);
      if (!success) {
        setError('Could not connect to device');
      } else {
        setShowConnectModal(false);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Get status for Next button
  const canProceedToNext = () => {
    if (isMeasuring) return false;
    
    const currentLeadData = getLeadData(currentLead);
    // Can only proceed if we have data
    return currentLeadData.length > 0;
  };

  return (
    <div className="mobile-measurement-page">
      <div className="top-section p-3">
        
        
        <div className="connection-status mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span className="status-text">{connectionStatusMessage}</span>
            </div>
            {!isConnected && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => setShowConnectModal(true)}
              >
                Connect Device
              </Button>
            )}
          </div>
        </div>
        
        <div className="recording-status d-flex align-items-center mb-3">
          <div>Recording: {recordingTime}s / {maxRecordingTimeSeconds}s</div>
          <Button 
            variant={isMeasuring ? "danger" : "success"}
            className="ms-auto"
            onClick={isMeasuring ? handleStopMeasurement : handleStartMeasurement}
            disabled={!isConnected}
            style={{
              backgroundColor: isMeasuring ? "#dc3545" : "#75b798",
              borderColor: isMeasuring ? "#dc3545" : "#75b798"
            }}
          >
            {isMeasuring ? 'Stop' : (getLeadData(currentLead).length > 0 && !isMeasuring ? `Start Again` : `Start Lead ${currentLead}`)}
          </Button>
        </div>
      </div>
      
      {/* Connection Modal */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="connection-modal">
            <div className="modal-header">
              <h5>Connect to Device</h5>
              <button 
                className="close-button" 
                onClick={() => setShowConnectModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label htmlFor="ipAddress" className="mb-2">Device IP Address:</label>
                <input 
                  type="text" 
                  id="ipAddress"
                  className="form-control"
                  placeholder="e.g., 192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
                <small className="form-text text-muted">
                  Enter the IP Address of your ESP32 device connected to your WiFi network
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowConnectModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConnect}
                disabled={isConnecting || !ipAddress}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="ecg-monitor-section p-3">
        <h2 className="mb-3">Real-time ECG Monitor</h2>
        
        <div className="lead-graphs">
          {[1, 2, 3].map(leadNumber => (
            <div key={leadNumber} className="lead-container mb-4">
              <h5 className="mb-2">Lead {leadNumber === 1 ? 'I' : leadNumber === 2 ? 'II' : 'III'}</h5>
              <div className="ecg-chart-container">
                {currentLead === leadNumber ? (
                  <ECGChart 
                    data={lastReceivedData.length > 0 ? lastReceivedData : getLeadData(leadNumber)}
                    label={`Lead ${leadNumber}`}
                    color={leadNumber === 1 ? 'rgb(255, 99, 132)' : (leadNumber === 2 ? 'rgb(54, 162, 235)' : 'rgb(75, 192, 192)')}
                  />
                ) : getLeadData(leadNumber).length > 0 ? (
                  <ECGChart 
                    data={getLeadData(leadNumber)}
                    label={`Lead ${leadNumber}`}
                    color={leadNumber === 1 ? 'rgb(255, 99, 132)' : (leadNumber === 2 ? 'rgb(54, 162, 235)' : 'rgb(75, 192, 192)')}
                  />
                ) : (
                  <div className="empty-chart" style={{height: '100px', backgroundColor: '#f8f9fa', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <span className="text-muted">No data for Lead {leadNumber}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="instructions-section p-3 text-center">
        <p className="instruction-text mb-4">Please remain still and breathe normally</p>
        
        <Button 
          variant="primary" 
          size="lg" 
          className="next-button w-100 py-3"
          onClick={handleNext}
          disabled={!canProceedToNext()}
        >
          Next <i className="fas fa-arrow-right ms-2"></i>
        </Button>
        
        {!isConnected && (
          <div className="mt-3 text-danger text-center">
            <small>Please connect to a device before starting measurement</small>
          </div>
        )}
        
        {isConnected && !canProceedToNext() && !isMeasuring && (
          <div className="mt-3 text-warning text-center">
            <small>Please complete a recording to continue</small>
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="danger" className="m-3">
          {error}
        </Alert>
      )}
      
      <style jsx>{`
        .mobile-measurement-page {
          max-width: 768px;
          margin: 0 auto;
          background-color: #f9f9f9;
          min-height: 100vh;
        }
        
        .top-section {
          background-color: #ffffff;
          border-bottom: 1px solid #eee;
        }
        
        .ecg-monitor-section {
          background-color: #ffffff;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        
        .instructions-section {
          background-color: #ffffff;
          padding-bottom: 80px;
        }
        
        .next-button {
          background-color: #4c6ef5;
          border-color: #4c6ef5;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          font-size: 14px;
        }
        
        .status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .connected .status-dot {
          background-color: #28a745;
        }
        
        .disconnected .status-dot {
          background-color: #dc3545;
        }
        
        .connected .status-text {
          color: #28a745;
        }
        
        .disconnected .status-text {
          color: #dc3545;
        }
        
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .connection-modal {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        .form-control {
          display: block;
          width: 100%;
          padding: 0.375rem 0.75rem;
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.5;
          color: #212529;
          background-color: #fff;
          background-clip: padding-box;
          border: 1px solid #ced4da;
          border-radius: 0.25rem;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        
        .form-text {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.875em;
        }
      `}</style>
    </div>
  );
};

export default MobileMeasurementPage;