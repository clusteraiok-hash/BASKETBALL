const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

class DatabaseBackup {
    constructor(dbPath, backupDir = './backups') {
        this.dbPath = dbPath;
        this.backupDir = backupDir;
        this.maxBackups = 30; // Keep last 30 backups
        this.compressionEnabled = true;
        
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Create full database backup
    async createFullBackup(options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `basketball_full_${timestamp}.sql`;
        const backupPath = path.join(this.backupDir, backupName);
        
        try {
            console.log(`Creating full backup: ${backupName}`);
            
            // Use SQLite's .dump command for full backup
            const dumpCommand = `sqlite3 "${this.dbPath}" ".dump" > "${backupPath}"`;
            
            await this.executeCommand(dumpCommand);
            
            // Verify backup was created
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file was not created');
            }
            
            // Get backup file size
            const stats = fs.statSync(backupPath);
            const fileSize = stats.size;
            
            // Compress backup if enabled
            let compressedPath = null;
            let compressedSize = null;
            
            if (this.compressionEnabled) {
                const compressedResult = await this.compressBackup(backupPath);
                compressedPath = compressedResult.path;
                compressedSize = compressedResult.size;
                
                // Remove uncompressed backup
                fs.unlinkSync(backupPath);
            }
            
            // Create backup metadata
            const metadata = {
                type: 'full',
                timestamp: new Date().toISOString(),
                original_path: backupPath,
                compressed_path: compressedPath,
                file_size: fileSize,
                compressed_size: compressedSize,
                compression_ratio: compressedSize ? (compressedSize / fileSize) : null,
                checksum: await this.calculateChecksum(compressedPath || backupPath),
                database_stats: await this.getDatabaseStats(),
                options: options
            };
            
            // Save metadata
            const metadataPath = (compressedPath || backupPath) + '.meta';
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            // Clean up old backups
            await this.cleanupOldBackups();
            
            console.log(`✅ Full backup completed successfully`);
            console.log(`📁 Backup: ${compressedPath || backupPath}`);
            console.log(`📊 Size: ${this.formatFileSize(compressedSize || fileSize)}`);
            
            return {
                success: true,
                type: 'full',
                path: compressedPath || backupPath,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('❌ Full backup failed:', error);
            
            // Clean up on failure
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            
            throw error;
        }
    }

    // Create incremental backup (using WAL changes)
    async createIncrementalBackup(options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `basketball_incremental_${timestamp}.sql`;
        const backupPath = path.join(this.backupDir, backupName);
        
        try {
            console.log(`Creating incremental backup: ${backupName}`);
            
            // Export only recent changes (last 24 hours)
            const sql = `
                -- Incremental backup for ${new Date().toISOString()}
                
                -- Export recent users
                .dump users WHERE created_at >= datetime('now', '-1 day');
                
                -- Export recent bookings
                .dump bookings WHERE created_at >= datetime('now', '-1 day');
                
                -- Export recent sessions
                .dump sessions WHERE created_at >= datetime('now', '-1 day');
                
                -- Export recent audit logs
                .dump audit_logs WHERE created_at >= datetime('now', '-1 day');
            `;
            
            // Create temporary SQL file
            const tempSqlPath = path.join(this.backupDir, `temp_${timestamp}.sql`);
            fs.writeFileSync(tempSqlPath, sql);
            
            // Execute backup
            const dumpCommand = `sqlite3 "${this.dbPath}" < "${tempSqlPath}" > "${backupPath}"`;
            await this.executeCommand(dumpCommand);
            
            // Clean up temp file
            fs.unlinkSync(tempSqlPath);
            
            // Verify backup
            if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
                fs.unlinkSync(backupPath);
                throw new Error('Incremental backup failed - no data to backup');
            }
            
            // Create metadata
            const metadata = {
                type: 'incremental',
                timestamp: new Date().toISOString(),
                path: backupPath,
                file_size: fs.statSync(backupPath).size,
                checksum: await this.calculateChecksum(backupPath),
                time_range: '24_hours',
                options: options
            };
            
            // Save metadata
            const metadataPath = backupPath + '.meta';
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            console.log(`✅ Incremental backup completed successfully`);
            console.log(`📁 Backup: ${backupPath}`);
            console.log(`📊 Size: ${this.formatFileSize(metadata.file_size)}`);
            
            return {
                success: true,
                type: 'incremental',
                path: backupPath,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('❌ Incremental backup failed:', error);
            throw error;
        }
    }

    // Restore database from backup
    async restoreFromBackup(backupPath, options = {}) {
        try {
            console.log(`🔄 Restoring database from: ${backupPath}`);
            
            // Verify backup exists
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file not found');
            }
            
            // Load metadata if available
            const metadataPath = backupPath + '.meta';
            let metadata = null;
            
            if (fs.existsSync(metadataPath)) {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                console.log(`📋 Backup metadata: ${metadata.type} backup from ${metadata.timestamp}`);
            }
            
            // Create backup of current database before restore
            if (!options.skipCurrentBackup) {
                console.log('📦 Creating backup of current database...');
                await this.createFullBackup({ pre_restore: true });
            }
            
            // Decompress if needed
            let sqlPath = backupPath;
            if (backupPath.endsWith('.gz')) {
                sqlPath = await this.decompressBackup(backupPath);
            }
            
            // Close database connections if any
            const tempDbPath = this.dbPath + '.temp';
            
            // Create new database from backup
            const restoreCommand = `sqlite3 "${tempDbPath}" < "${sqlPath}"`;
            await this.executeCommand(restoreCommand);
            
            // Verify restored database
            const testQuery = `sqlite3 "${tempDbPath}" "SELECT COUNT(*) FROM users;"`;
            const result = await this.executeCommand(testQuery);
            
            if (!result || parseInt(result.trim()) === 0) {
                throw new Error('Restored database appears to be empty or corrupted');
            }
            
            // Replace original database
            if (fs.existsSync(this.dbPath)) {
                fs.unlinkSync(this.dbPath);
            }
            fs.renameSync(tempDbPath, this.dbPath);
            
            // Clean up temporary files
            if (sqlPath !== backupPath && sqlPath.endsWith('.temp')) {
                fs.unlinkSync(sqlPath);
            }
            
            console.log(`✅ Database restored successfully from backup`);
            
            if (metadata) {
                console.log(`📊 Restored ${metadata.type} backup from ${metadata.timestamp}`);
                console.log(`📋 Original file size: ${this.formatFileSize(metadata.file_size || metadata.compressed_size)}`);
            }
            
            return {
                success: true,
                restored_from: backupPath,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('❌ Database restore failed:', error);
            
            // Clean up temporary files
            const tempDbPath = this.dbPath + '.temp';
            if (fs.existsSync(tempDbPath)) {
                fs.unlinkSync(tempDbPath);
            }
            
            throw error;
        }
    }

    // Compress backup file
    async compressBackup(filePath) {
        const compressedPath = filePath + '.gz';
        
        try {
            const gzipCommand = `gzip -c "${filePath}" > "${compressedPath}"`;
            await this.executeCommand(gzipCommand);
            
            const stats = fs.statSync(compressedPath);
            
            return {
                path: compressedPath,
                size: stats.size
            };
            
        } catch (error) {
            console.error('Compression failed:', error);
            throw error;
        }
    }

    // Decompress backup file
    async decompressBackup(compressedPath) {
        const decompressedPath = compressedPath.replace('.gz', '.temp');
        
        try {
            const gunzipCommand = `gunzip -c "${compressedPath}" > "${decompressedPath}"`;
            await this.executeCommand(gunzipCommand);
            
            return decompressedPath;
            
        } catch (error) {
            console.error('Decompression failed:', error);
            throw error;
        }
    }

    // Calculate file checksum
    async calculateChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (data) => {
                hash.update(data);
            });
            
            stream.on('end', () => {
                resolve(hash.digest('hex'));
            });
            
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }

    // Get database statistics
    async getDatabaseStats() {
        try {
            const queries = [
                "SELECT COUNT(*) as count FROM users;",
                "SELECT COUNT(*) as count FROM courts;",
                "SELECT COUNT(*) as count FROM bookings;",
                "SELECT COUNT(*) as count FROM sessions;",
                "SELECT COUNT(*) as count FROM audit_logs;"
            ];
            
            const stats = {};
            
            for (const query of queries) {
                const tableName = query.match(/FROM (\w+);/)[1];
                const result = await this.executeCommand(`sqlite3 "${this.dbPath}" "${query}"`);
                stats[tableName] = parseInt(result.trim());
            }
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get database stats:', error);
            return {};
        }
    }

    // Clean up old backups
    async cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const backupFiles = files
                .filter(file => file.endsWith('.sql') || file.endsWith('.gz'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.statSync(path.join(this.backupDir, file)).mtime
                }))
                .sort((a, b) => b.time - a.time);
            
            if (backupFiles.length > this.maxBackups) {
                const filesToDelete = backupFiles.slice(this.maxBackups);
                
                for (const file of filesToDelete) {
                    // Delete backup file
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    
                    // Delete metadata file
                    const metadataPath = file.path + '.meta';
                    if (fs.existsSync(metadataPath)) {
                        fs.unlinkSync(metadataPath);
                    }
                    
                    console.log(`🗑️ Deleted old backup: ${file.name}`);
                }
            }
            
        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
        }
    }

    // List available backups
    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const backups = [];
            
            for (const file of files) {
                if (file.endsWith('.meta')) {
                    const metadataPath = path.join(this.backupDir, file);
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    
                    backups.push({
                        name: file.replace('.meta', ''),
                        type: metadata.type,
                        timestamp: metadata.timestamp,
                        size: metadata.compressed_size || metadata.file_size,
                        path: metadata.compressed_path || metadata.original_path || metadata.path,
                        checksum: metadata.checksum
                    });
                }
            }
            
            return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    // Verify backup integrity
    async verifyBackup(backupPath) {
        try {
            console.log(`🔍 Verifying backup integrity: ${backupPath}`);
            
            // Check if file exists
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file not found');
            }
            
            // Load metadata
            const metadataPath = backupPath + '.meta';
            if (!fs.existsSync(metadataPath)) {
                throw new Error('Backup metadata not found');
            }
            
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            
            // Calculate current checksum
            const currentChecksum = await this.calculateChecksum(backupPath);
            
            // Compare checksums
            if (currentChecksum !== metadata.checksum) {
                throw new Error('Backup checksum mismatch - file may be corrupted');
            }
            
            // Test SQL syntax if it's a SQL backup
            if (backupPath.endsWith('.sql')) {
                const tempDbPath = path.join(this.backupDir, 'temp_verify.db');
                
                try {
                    const testCommand = `sqlite3 "${tempDbPath}" < "${backupPath}"`;
                    await this.executeCommand(testCommand);
                    
                    // Clean up temp database
                    if (fs.existsSync(tempDbPath)) {
                        fs.unlinkSync(tempDbPath);
                    }
                    
                } catch (error) {
                    if (fs.existsSync(tempDbPath)) {
                        fs.unlinkSync(tempDbPath);
                    }
                    throw new Error('Backup SQL syntax is invalid');
                }
            }
            
            console.log(`✅ Backup integrity verified successfully`);
            
            return {
                success: true,
                verified: true,
                checksum: currentChecksum,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('❌ Backup verification failed:', error);
            return {
                success: false,
                verified: false,
                error: error.message
            };
        }
    }

    // Execute shell command
    executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    // Format file size for display
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    // Schedule automatic backups
    scheduleAutomaticBackup(intervalHours = 6) {
        console.log(`📅 Scheduling automatic backups every ${intervalHours} hours`);
        
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        setInterval(async () => {
            try {
                console.log('🔄 Starting automatic backup...');
                await this.createFullBackup({ automatic: true });
                console.log('✅ Automatic backup completed');
            } catch (error) {
                console.error('❌ Automatic backup failed:', error);
            }
        }, intervalMs);
    }
}

module.exports = DatabaseBackup;