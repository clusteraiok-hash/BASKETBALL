const Database = require('./database');

// Migration script to convert JSON data to SQLite
async function migrateFromJSON() {
    const db = new Database();
    
    try {
        console.log('Starting migration from JSON to SQLite...');
        
        // Initialize database
        await db.initialize();
        
        // Check if JSON data file exists
        const fs = require('fs');
        const jsonPath = './data/database.json';
        
        if (fs.existsSync(jsonPath)) {
            console.log('Found existing JSON data file, migrating...');
            
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            
            // Migrate users
            if (jsonData.users && jsonData.users.length > 0) {
                console.log(`Migrating ${jsonData.users.length} users...`);
                
                for (const user of jsonData.users) {
                    try {
                        // Check if user already exists
                        const existingUser = await db.getUserByEmail(user.email);
                        if (!existingUser) {
                            await db.run(`
                                INSERT OR IGNORE INTO users (
                                    id, name, email, password, phone, role, is_verified, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                user.id,
                                user.name,
                                user.email,
                                user.password, // Already hashed
                                user.phone,
                                user.role || 'user',
                                true, // Mark as verified for migrated data
                                user.createdAt || new Date().toISOString()
                            ]);
                        }
                    } catch (error) {
                        console.error(`Error migrating user ${user.email}:`, error.message);
                    }
                }
            }
            
            // Migrate courts
            if (jsonData.courts && jsonData.courts.length > 0) {
                console.log(`Migrating ${jsonData.courts.length} courts...`);
                
                for (const court of jsonData.courts) {
                    try {
                        await db.run(`
                            INSERT OR IGNORE INTO courts (
                                id, name, location, description, price_per_hour,
                                amenities, capacity, image_url, is_active, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            court.id,
                            court.name,
                            court.location,
                            court.description,
                            court.pricePerHour,
                            court.amenities,
                            court.capacity,
                            court.imageUrl,
                            court.isActive !== false,
                            court.createdAt || new Date().toISOString()
                        ]);
                    } catch (error) {
                        console.error(`Error migrating court ${court.id}:`, error.message);
                    }
                }
            }
            
            // Migrate bookings
            if (jsonData.bookings && jsonData.bookings.length > 0) {
                console.log(`Migrating ${jsonData.bookings.length} bookings...`);
                
                for (const booking of jsonData.bookings) {
                    try {
                        await db.run(`
                            INSERT OR IGNORE INTO bookings (
                                id, user_id, court_id, date, start_time, end_time,
                                status, total_price, payment_id, payment_status, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            booking.id,
                            booking.userId,
                            booking.courtId,
                            booking.date,
                            booking.startTime,
                            booking.endTime,
                            booking.status || 'pending',
                            booking.totalPrice,
                            booking.paymentId,
                            booking.paymentId ? 'paid' : 'pending',
                            booking.createdAt || new Date().toISOString()
                        ]);
                    } catch (error) {
                        console.error(`Error migrating booking ${booking.id}:`, error.message);
                    }
                }
            }
            
            // Migrate sessions
            if (jsonData.sessions && jsonData.sessions.length > 0) {
                console.log(`Migrating ${jsonData.sessions.length} sessions...`);
                
                for (const session of jsonData.sessions) {
                    try {
                        await db.run(`
                            INSERT OR IGNORE INTO sessions (
                                id, user_id, token, token_type, expires_at,
                                ip_address, user_agent, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            session.id,
                            session.userId,
                            session.token,
                            'access',
                            session.expiresAt,
                            session.ipAddress,
                            session.userAgent,
                            session.createdAt || new Date().toISOString()
                        ]);
                    } catch (error) {
                        console.error(`Error migrating session ${session.id}:`, error.message);
                    }
                }
            }
            
            console.log('Migration completed successfully!');
            
            // Create backup of original JSON file
            const backupPath = `./data/database_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            fs.copyFileSync(jsonPath, backupPath);
            console.log(`Original JSON file backed up to: ${backupPath}`);
            
        } else {
            console.log('No existing JSON data file found. Starting with fresh database.');
        }
        
        // Show database statistics
        const stats = await db.getDatabaseStats();
        console.log('\nDatabase Statistics:');
        Object.entries(stats).forEach(([table, count]) => {
            console.log(`${table}: ${count} records`);
        });
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await db.close();
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateFromJSON()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateFromJSON };