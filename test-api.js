// Test script for event-participants endpoint
const fetch = require('node-fetch');

async function testEventParticipants() {
  try {
    console.log('Testing event-participants endpoint...');
    
    // Test POST request
    const response = await fetch('http://localhost:3005/api/event-participants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        eventId: '123e4567-e89b-12d3-a456-426614174001'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEventParticipants(); 