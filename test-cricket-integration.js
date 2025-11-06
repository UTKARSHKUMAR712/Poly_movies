// Test cricket integration in dev server
const axios = require('axios');

async function testCricketIntegration() {
    console.log('🏏 Testing Cricket Integration...\n');

    const baseUrl = 'http://localhost:3001';

    try {
        // Test 1: Health check
        console.log('1. Testing server health...');
        const healthResponse = await axios.get(`${baseUrl}/health`);
        console.log('✅ Server is healthy:', healthResponse.data.status);

        // Test 2: Cricket test endpoint
        console.log('\n2. Testing cricket test endpoint...');
        const testResponse = await axios.get(`${baseUrl}/api/cricket/test`);
        console.log('✅ Cricket test successful:', testResponse.data);

        // Test 3: Cricket matches endpoint
        console.log('\n3. Testing cricket matches endpoint...');
        const matchesResponse = await axios.get(`${baseUrl}/api/cricket/matches`, { timeout: 20000 });
        console.log('✅ Cricket matches successful, got', matchesResponse.data.matches?.length || 0, 'matches');

        console.log('\n🎉 All cricket integration tests passed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the dev server is running: npm run dev');
        } else if (error.response) {
            console.log('📄 Response status:', error.response.status);
            console.log('📄 Response data:', error.response.data);
        }

        process.exit(1);
    }
}

if (require.main === module) {
    testCricketIntegration();
}

module.exports = { testCricketIntegration };