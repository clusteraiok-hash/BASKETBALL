# Basketball Booking System - Local Version

A complete basketball court booking system that runs locally without external APIs or payment processing.

## 🏀 Features

### Core Functionality
- **User Authentication**: Registration and login system
- **Court Management**: Multiple courts with different capacities and pricing
- **Real-time Booking**: Book courts with time slot selection
- **Admin Dashboard**: View stats and manage all bookings
- **Document System**: Download forms and policies
- **Responsive Design**: Works on desktop, tablet, and mobile

### Booking System
- **3 Professional Courts**:
  - Main Court: ₹500/hour, 10 players capacity
  - Training Court B: ₹300/hour, 6 players capacity  
  - Half Court C: ₹200/hour, 5 players capacity
- **Time Slots**: 6 AM to 10 PM daily
- **Real-time Availability**: Check available slots before booking
- **Instant Confirmation**: Bookings confirmed immediately
- **Cancellation**: Cancel pending bookings

### Admin Features
- **Dashboard Stats**: Total bookings, revenue, pending confirmations
- **Booking Management**: View and manage all user bookings
- **User Management**: Monitor registered users
- **Real-time Updates**: Live statistics

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Terminal/command prompt access

### Installation

1. **Clone/Download the project to your local machine**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   ```
   http://localhost:3000
   ```

## 👤 Demo Accounts

The system comes with pre-configured demo accounts:

### Admin Account
- **Email**: admin@basketball.com
- **Password**: admin123
- **Access**: Full admin dashboard and management features

### User Accounts
- **Email**: rahul@example.com
- **Password**: user123

- **Email**: priya@example.com  
- **Password**: user123

## 📱 How to Use

### For New Users
1. Click **Register** to create an account
2. Fill in your details (name, email, phone, password)
3. Login with your new credentials
4. Browse available courts in the **Courts** section
5. Click on a court to select it
6. Go to **Book Court** section
7. Select date and time slots
8. Confirm your booking

### For Admin Users
1. Login with admin credentials
2. Click **Admin** button in navigation
3. View real-time statistics
4. Monitor all bookings
5. Manage bookings as needed

## 🏗️ Technical Architecture

### Backend (Node.js + Express)
- **Server**: Express.js web server
- **Database**: JSON file storage (no external DB needed)
- **Authentication**: JWT-like token system
- **Security**: Password hashing with bcryptjs
- **API**: RESTful endpoints for all operations

### Frontend (Vanilla JavaScript)
- **No Framework**: Pure HTML/CSS/JavaScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide icons
- **Responsive**: Mobile-first design
- **Local Storage**: Session persistence

### Data Structure
```json
{
  "users": [
    {
      "id": "user_001",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "9876543210",
      "role": "user",
      "createdAt": "2026-01-21T10:00:00.000Z"
    }
  ],
  "courts": [
    {
      "id": "court_001",
      "name": "Main Court",
      "location": "Building A - Ground Floor",
      "pricePerHour": 500,
      "capacity": 10,
      "amenities": "Scoreboard, Lights, Changing Room"
    }
  ],
  "bookings": [
    {
      "id": "booking_001",
      "userId": "user_001",
      "courtId": "court_001",
      "date": "2026-01-21",
      "startTime": "09:00",
      "endTime": "11:00",
      "status": "confirmed",
      "totalPrice": 1000
    }
  ],
  "sessions": [
    {
      "token": "uuid-token",
      "userId": "user_001",
      "expiresAt": "2026-01-28T10:00:00.000Z"
    }
  ]
}
```

## 📁 Project Structure

```
basketball-booking-local/
├── server.js                 # Main Express server
├── package.json              # Dependencies and scripts
├── data/                    # Data storage
│   └── database.json       # Main database file
├── scripts/                 # Utility scripts
│   └── init-data.js       # Database initialization
├── public/                  # Frontend files
│   ├── index.html          # Main application page
│   ├── js/
│   │   └── app.js         # Frontend JavaScript
│   └── images/           # Court images (if available)
└── README.md             # This documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Courts
- `GET /api/courts` - Get all courts
- `GET /api/courts/:id` - Get specific court
- `GET /api/courts/:id/availability/:date` - Check availability

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id` - Update booking status

### Admin
- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/stats` - Get system statistics

## 🎯 Business Logic

### Booking Flow
1. **Select Court**: User browses and selects a court
2. **Check Availability**: System shows available time slots
3. **Choose Time**: User selects date and time range
4. **Calculate Price**: System calculates total cost
5. **Confirm Booking**: Instant confirmation without payment
6. **Manage Booking**: User can view/cancel pending bookings

### Time Slot System
- **Operating Hours**: 6:00 AM to 10:00 PM
- **Slot Duration**: 1-hour increments
- **Conflict Prevention**: No double bookings allowed
- **Real-time Updates**: Live availability checking

### Security Features
- **Password Hashing**: bcryptjs for secure storage
- **Session Management**: Token-based authentication
- **Input Validation**: Server-side validation on all inputs
- **Role-based Access**: Admin-only features protected

## 🔒 Security Considerations

- ✅ Passwords are hashed using bcryptjs
- ✅ Token-based session management
- ✅ Input validation on all endpoints
- ✅ Role-based access control
- ⚠️ Local storage (not secure for production)
- ⚠️ No HTTPS (local development only)

## 🎨 UI/UX Features

- **Responsive Design**: Works on all device sizes
- **Modern Interface**: Clean, professional design
- **Toast Notifications**: User-friendly feedback
- **Loading States**: Visual feedback during operations
- **Smooth Animations**: CSS transitions and hover effects
- **Accessibility**: Semantic HTML and keyboard navigation

## 📊 Dashboard Features

### For Regular Users
- **My Bookings**: View all personal bookings
- **Booking Status**: Track confirmation status
- **Cancellation**: Cancel pending bookings
- **Booking History**: Complete booking record

### For Admin Users
- **System Statistics**: Real-time booking metrics
- **Revenue Tracking**: Total and confirmed revenue
- **User Management**: Monitor registered users
- **Booking Oversight**: View and manage all bookings

## 🚀 Future Enhancements

### Potential Upgrades
1. **Payment Integration**: Stripe/Razorpay for actual payments
2. **Email Notifications**: Send booking confirmations via email
3. **Calendar Integration**: Export bookings to calendars
4. **Multi-court Availability**: Check multiple courts simultaneously
5. **Recurring Bookings**: Weekly/monthly booking options
6. **Mobile App**: React Native app
7. **Advanced Analytics**: Detailed usage reports
8. **Player Profiles**: Track player preferences and history

### Scalability Improvements
1. **Database**: Upgrade to PostgreSQL or MongoDB
2. **Cloud Hosting**: Deploy to AWS/Google Cloud
3. **Load Balancing**: Multiple server instances
4. **CDN**: Static asset delivery optimization

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Initialize database (if needed)
npm run init
```

## 📞 Support

For any issues or questions:

1. **Check Console**: Open browser dev tools for errors
2. **Restart Server**: Stop and restart the Node.js server
3. **Clear Browser Cache**: Hard refresh the page
4. **Check File Permissions**: Ensure write access to data folder

## 🎉 Conclusion

This basketball booking system provides a complete, professional solution for managing court reservations without any external dependencies. It's perfect for:

- **Local Basketball Courts** 
- **Training Academies**
- **School Facilities**
- **Community Centers**
- **Sports Complexes**

The system is production-ready for local deployment and can be easily extended with additional features as needed.

**Enjoy your basketball court booking system! 🏀**