import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Test1 ECG Screening Platform</h1>
          <p className="text-center lead">
            Cardiovascular disease screening platform using ECG and Deep Learning
          </p>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Measure ECG</Card.Title>
              <Card.Text>
                Connect to your Test1 device with ESP32 and AD8232 sensor to measure your ECG
              </Card.Text>
              <Link to="/electrode-position">
                <Button variant="primary">Start Measurement</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Analysis Results</Card.Title>
              <Card.Text>
                View your latest ECG analysis results
              </Card.Text>
              <Link to="/results">
                <Button variant="primary">Latest Results</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Measurement History</Card.Title>
              <Card.Text>
                View all your past measurements and analysis results
              </Card.Text>
              <Link to="/history">
                <Button variant="primary">View History</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>About Test1</Card.Title>
              <Card.Text>
                Test1 is a cardiovascular disease screening platform using ECG with Deep Learning technology.
                The system uses ResNet50 together with Transformer to analyze spectrograms converted from
                ECG signals measured by the AD8232 sensor.
              </Card.Text>
              <Card.Text>
                This platform makes heart disease screening more accessible without requiring expensive medical equipment,
                and can be used in hospitals, clinics, or at home.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;