const mongoose = require('mongoose');
require('dotenv').config();

const checkPosts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const Post = require('./models/Post');
        const posts = await Post.find().populate('authorId', 'email');
            
        console.log('📊 Total posts in DB:', posts.length);
        
        if (posts.length === 0) {
            console.log('⚠️  NO POSTS IN DATABASE!');
            console.log('\n💡 You need to create posts first!');
        } else {
            posts.forEach((p, i) => {
                console.log(`\nPost ${i+1}:`);
                console.log('  Title:', p.title);
                console.log('  Status:', p.status);
                console.log('  Author:', p.authorId?.email || 'Unknown');
            });
            
            const approved = posts.filter(p => p.status === 'APPROVED');
            console.log('\n✅ Approved posts:', approved.length);
            console.log('⏳ Pending posts:', posts.filter(p => p.status === 'PENDING').length);
            console.log('❌ Rejected posts:', posts.filter(p => p.status === 'REJECTED').length);
            
            if (approved.length === 0) {
                console.log('\n⚠️  WARNING: No APPROVED posts! Users will see empty homepage.');
                console.log('💡 Login as ADMIN and approve some posts from the dashboard!');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkPosts();
