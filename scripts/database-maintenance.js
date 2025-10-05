#!/usr/bin/env node

/**
 * Database Maintenance Script
 * 
 * This script provides a command-line interface for managing database cleanup
 * and maintenance operations. It calls the Firebase Functions directly.
 * 
 * Usage:
 *   node scripts/database-maintenance.js health-check
 *   node scripts/database-maintenance.js cleanup emails --days=30 --dry-run
 *   node scripts/database-maintenance.js cleanup pending_signups --days=7
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFunctions } = require('firebase-admin/functions');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const functions = getFunctions();

async function runHealthCheck() {
  console.log('🔍 Running database health check...\n');

  try {
    const healthCheck = functions.httpsCallable('databaseHealthCheck');
    const result = await healthCheck();
    
    if (result.data.success) {
      const report = result.data.healthReport;
      
      console.log('📊 Database Health Report');
      console.log('========================');
      console.log(`Timestamp: ${report.timestamp}\n`);
      
      // Display collection statistics
      Object.entries(report.collections).forEach(([collection, stats]) => {
        console.log(`📁 ${collection}:`);
        console.log(`   Total documents: ${stats.total}`);
        if (stats.oldProcessed) console.log(`   Old processed: ${stats.oldProcessed}`);
        if (stats.oldFailed) console.log(`   Old failed: ${stats.oldFailed}`);
        if (stats.expired) console.log(`   Expired: ${stats.expired}`);
        console.log(`   Cleanup opportunity: ${stats.cleanupOpportunity}\n`);
      });
      
      // Display summary
      console.log('📋 Summary:');
      console.log(`   Total cleanup opportunity: ${report.summary.totalCleanupOpportunity} documents\n`);
      
      // Display recommendations
      console.log('💡 Recommendations:');
      report.summary.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      
    } else {
      console.error('❌ Health check failed:', result.data);
    }
    
  } catch (error) {
    console.error('❌ Error running health check:', error.message);
  }
}

async function runCleanup(collection, options = {}) {
  const { days = 30, dryRun = true } = options;
  
  console.log(`🧹 Running cleanup for ${collection}...`);
  console.log(`   Days old: ${days}`);
  console.log(`   Dry run: ${dryRun}\n`);
  
  try {
    const manualCleanup = functions.httpsCallable('manualCleanup');
    const result = await manualCleanup({
      collection,
      daysOld: days,
      dryRun
    });
    
    if (result.data.success) {
      if (dryRun) {
        console.log('✅ Dry run completed:');
        console.log(`   ${result.data.message}`);
        console.log(`   Would delete: ${result.data.wouldDeleteCount} documents`);
      } else {
        console.log('✅ Cleanup completed:');
        console.log(`   ${result.data.message}`);
        console.log(`   Deleted: ${result.data.deletedCount} documents`);
      }
    } else {
      console.error('❌ Cleanup failed:', result.data);
    }
    
  } catch (error) {
    console.error('❌ Error running cleanup:', error.message);
  }
}

function printUsage() {
  console.log(`
Database Maintenance Script

Usage:
  node scripts/database-maintenance.js <command> [options]

Commands:
  health-check                    Run database health check
  cleanup <collection> [options]  Run manual cleanup

Collections:
  emails                         Email collection
  pending_signups               Pending signup codes
  pending_password_resets       Pending password reset codes

Options:
  --days=<number>               Age threshold in days (default: 30)
  --dry-run                     Preview mode (default: true)
  --execute                     Actually perform cleanup (overrides dry-run)

Examples:
  node scripts/database-maintenance.js health-check
  node scripts/database-maintenance.js cleanup emails --days=30 --dry-run
  node scripts/database-maintenance.js cleanup emails --days=30 --execute
  node scripts/database-maintenance.js cleanup pending_signups --days=7 --execute
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    return;
  }
  
  const command = args[0];
  
  if (command === 'health-check') {
    await runHealthCheck();
    return;
  }
  
  if (command === 'cleanup') {
    const collection = args[1];
    if (!collection) {
      console.error('❌ Collection name is required for cleanup command');
      printUsage();
      return;
    }
    
    // Parse options
    const options = {};
    args.slice(2).forEach(arg => {
      if (arg.startsWith('--days=')) {
        options.days = parseInt(arg.split('=')[1]);
      } else if (arg === '--execute') {
        options.dryRun = false;
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      }
    });
    
    await runCleanup(collection, options);
    return;
  }
  
  console.error(`❌ Unknown command: ${command}`);
  printUsage();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
