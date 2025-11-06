// Startup script that ensures cricket proxy is running
const { startDevServer } = require('./dev-server.js');

async function startWithCricket() {
    console.log('🚀 Starting PolyMovies with Cricket Integration...\n');
    
    try {
        // Start the main dev server (which will also start cricket proxy)
        const server = await startDevServer(3001);
        
        console.log('\n✅ All services started successfully!');
        console.log('\n🔗 Available URLs:');
        console.log('   🌐 Main App: http://localhost:3001');
        console.log('   🏏 Cricket Test: http://localhost:3001/api/cricket/test');
        console.log('   🏏 Cricket Matches: http://localhost:3001/api/cricket/matches');
        console.log('   🏏 Direct Proxy: http://localhost:5051/test');
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down servers...');
            try {
                await server.stop();
                console.log('✅ Servers stopped gracefully');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start servers:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startWithCricket();
}

module.exports = { startWithCricket };