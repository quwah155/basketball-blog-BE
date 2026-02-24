const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const updateAdminPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminEmail = process.env.ADMIN_EMAIL;
        const newPassword = process.env.ADMIN_PASSWORD;

        // Find the admin user
        const admin = await User.findOne({ email: adminEmail });
        
        if (!admin) {
            console.log('❌ Admin user not found!');
            process.exit(1);
        }

        console.log('✅ Admin found. Updating password...');

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        admin.password = hashedPassword;
        await admin.save();

        console.log('✅ Password updated successfully!');
        console.log('\nNew credentials:');
        console.log('Email:', adminEmail);
        console.log('Password:', newPassword);
        console.log('\n🔐 You can now login with these credentials!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating password:', error);
        process.exit(1);
    }
};

updateAdminPassword();
