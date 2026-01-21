#!/usr/bin/env node

const DatabaseBackup = require('./backup');
const path = require('path');

// Configuration
const DB_PATH = './data/basketball.db';
const BACKUP_DIR = './backups';

async function main() {
    const command = process.argv[2];
    const backup = new DatabaseBackup(DB_PATH, BACKUP_DIR);
    
    try {
        switch (command) {
            case 'full':
                console.log('🏀 Basketball Booking - Full Database Backup');
                console.log('=' .repeat(50));
                await backup.createFullBackup();
                break;
                
            case 'incremental':
                console.log('🏀 Basketball Booking - Incremental Database Backup');
                console.log('=' .repeat(50));
                await backup.createIncrementalBackup();
                break;
                
            case 'restore':
                const backupPath = process.argv[3];
                if (!backupPath) {
                    console.error('❌ Please specify backup path to restore from');
                    process.exit(1);
                }
                console.log('🏀 Basketball Booking - Database Restore');
                console.log('=' .repeat(50));
                await backup.restoreFromBackup(backupPath);
                break;
                
            case 'list':
                console.log('🏀 Basketball Booking - Available Backups');
                console.log('=' .repeat(50));
                const backups = backup.listBackups();
                
                if (backups.length === 0) {
                    console.log('No backups found');
                } else {
                    console.log(`Found ${backups.length} backups:\n`);
                    
                    backups.forEach((backup, index) => {
                        console.log(`${index + 1}. ${backup.name}`);
                        console.log(`   Type: ${backup.type}`);
                        console.log(`   Date: ${new Date(backup.timestamp).toLocaleString()}`);
                        console.log(`   Size: ${backup.formatFileSize ? backup.formatFileSize(backup.size) : backup.size + ' bytes'}`);
                        console.log(`   Path: ${backup.path}`);
                        console.log('');
                    });
                }
                break;
                
            case 'verify':
                const verifyPath = process.argv[3];
                if (!verifyPath) {
                    console.error('❌ Please specify backup path to verify');
                    process.exit(1);
                }
                console.log('🏀 Basketball Booking - Backup Verification');
                console.log('=' .repeat(50));
                const result = await backup.verifyBackup(verifyPath);
                
                if (result.success) {
                    console.log('✅ Backup is valid and intact');
                } else {
                    console.log('❌ Backup verification failed:', result.error);
                    process.exit(1);
                }
                break;
                
            case 'auto':
                const hours = parseInt(process.argv[3]) || 6;
                console.log(`🏀 Basketball Booking - Automatic Backup Scheduler`);
                console.log(`📅 Backups scheduled every ${hours} hours`);
                console.log('=' .repeat(50));
                backup.scheduleAutomaticBackup(hours);
                
                // Keep process running
                console.log('⏰ Backup scheduler is running. Press Ctrl+C to stop.');
                process.on('SIGINT', () => {
                    console.log('\n🛑 Backup scheduler stopped');
                    process.exit(0);
                });
                
                // Prevent process from exiting
                await new Promise(() => {});
                break;
                
            default:
                console.log('🏀 Basketball Booking - Database Backup Utility');
                console.log('=' .repeat(50));
                console.log('');
                console.log('Usage:');
                console.log('  node backup-cli.js full                    - Create full backup');
                console.log('  node backup-cli.js incremental             - Create incremental backup');
                console.log('  node backup-cli.js restore <backup_path>    - Restore from backup');
                console.log('  node backup-cli.js list                    - List available backups');
                console.log('  node backup-cli.js verify <backup_path>    - Verify backup integrity');
                console.log('  node backup-cli.js auto [hours]            - Start automatic backup scheduler');
                console.log('');
                console.log('Examples:');
                console.log('  node backup-cli.js full');
                console.log('  node backup-cli.js restore ./backups/basketball_full_2026-01-21T10-30-00-000Z.sql');
                console.log('  node backup-cli.js auto 12');
                break;
        }
        
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        process.exit(1);
    }
}

// Run main function
if (require.main === module) {
    main();
}

module.exports = { main };