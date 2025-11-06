// Test script for cricket proxy
const { CricketProxy } = require('./proxy.js');

async function testCricketProxy() {
    console.log('🏏 Testing Cricket Proxy...');
    
    try {
        const proxy = new CricketProxy(5051);
        const server = await proxy.start();
        
        console.log('✅ Cricket proxy started successfully');
        
        // Test the endpoints
        const axios = require('axios');
        
        // Test health endpoint
        try {
            const healthResponse = await axios.get('http://localhost:5051/health');
            console.log('✅ Health check:', healthResponse.data);
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        }
        
        // Test matches endpoint
        try {
            console.log('🏏 Testing matches endpoint...');
            const matchesResponse = await axios.get('http://localhost:5051/matches', { timeout: 10000 });
            console.log('✅ Matches endpoint working, got', matchesResponse.data.matches?.length || 0, 'matches');
        } catch (error) {
            console.error('❌ Matches endpoint failed:', error.message);
        }
        
        // Keep server running for manual testing
        console.log('\n🏏 Cricket proxy is running. Test URLs:');
        console.log('   Health: http://localhost:5051/health');
        console.log('   Test: http://localhost:5051/test');
        console.log('   Matches: http://localhost:5051/matches');
        console.log('\nPress Ctrl+C to stop');
        
    } catch (error) {
        console.error('❌ Failed to start cricket proxy:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testCricketProxy();
}

module.exports = { testCricketProxy };