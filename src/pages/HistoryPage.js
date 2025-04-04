import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useECG } from '../context/ECGContext';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { measurementHistory, saveResults } = useECG();
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // If no measurement history
  if (measurementHistory.length === 0) {
    return (
      <Container>
        <h2 className="mb-4">Measurement History</h2>
        <Alert variant="info">
          <Alert.Heading>No Measurement History</Alert.Heading>
          <p>You don't have any ECG measurement and analysis history yet.</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="primary" onClick={() => navigate('/measure')}>
              Go to ECG Measurement
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // View details of selected record
  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  // View analysis results again
  const handleViewResult = (record) => {
    saveResults(record);
    navigate('/results');
  };

  return (
    <Container>
      <h2 className="mb-4">Measurement History</h2>
      
      {measurementHistory.map((record) => (
        <Card key={record.id} className="mb-3">
          <Card.Body>
            <Row>
              <Col md={8}>
                <h5>{record.prediction}</h5>
                <p className="text-muted">
                  Date: {new Date(record.date).toLocaleString()}
                </p>
                <p>
                  Confidence: {record.confidence.toFixed(2)}%
                  <Badge 
                    bg={record.prediction === 'Normal' ? 'success' : 'warning'} 
                    className="ms-2"
                  >
                    {record.prediction === 'Normal' ? 'Normal' : 'Consult a doctor'}
                  </Badge>
                </p>
                <p>
                  Data: 
                  <Badge bg="primary" className="ms-2">Lead 1: {record.lead1DataLength} points</Badge>
                  {record.lead2DataLength > 0 && (
                    <Badge bg="primary" className="ms-2">Lead 2: {record.lead2DataLength} points</Badge>
                  )}
                  {record.lead3DataLength > 0 && (
                    <Badge bg="primary" className="ms-2">Lead 3: {record.lead3DataLength} points</Badge>
                  )}
                </p>
              </Col>
              <Col md={4} className="d-flex align-items-center justify-content-end">
                <Button 
                  variant="outline-secondary" 
                  className="me-2"
                  onClick={() => handleViewDetails(record)}
                >
                  Details
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => handleViewResult(record)}
                >
                  View Results
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ))}
      
      {/* Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Analysis Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <>
              <h4>{selectedRecord.prediction}</h4>
              <p className="text-muted">
                Date: {new Date(selectedRecord.date).toLocaleString()}
              </p>
              
              <div className="mb-3">
                <h5>Class Probabilities</h5>
                {selectedRecord.probabilities && Object.entries(selectedRecord.probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([className, probability]) => (
                    <div key={className} className="mb-2">
                      <div className="d-flex justify-content-between">
                        <span>{className}</span>
                        <span>{(probability * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
              </div>
              
              {selectedRecord.spectrogram_base64 && (
                <div className="mb-3">
                  <h5>Spectrogram</h5>
                  <div className="text-center">
                    <img 
                      src={`data:image/png;base64,${selectedRecord.spectrogram_base64}`} 
                      alt="ECG Spectrogram"
                      className="img-fluid"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <h5>Measurement Information</h5>
                <ul>
                  <li>Lead 1: {selectedRecord.lead1DataLength} points</li>
                  {selectedRecord.lead2DataLength > 0 && (
                    <li>Lead 2: {selectedRecord.lead2DataLength} points</li>
                  )}
                  {selectedRecord.lead3DataLength > 0 && (
                    <li>Lead 3: {selectedRecord.lead3DataLength} points</li>
                  )}
                  <li>Processing time: {selectedRecord.processing_time.toFixed(2)} seconds</li>
                </ul>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowModal(false);
              handleViewResult(selectedRecord);
            }}
          >
            View Results
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HistoryPage;