// const mongoose = require('mongoose');
// require('dotenv').config();

// const fixIndexes = async () => {
//     try {
//         // Connect to MongoDB
//         await mongoose.connect(process.env.MONGODB_URI);
//         console.log('Connected to MongoDB');

//         const db = mongoose.connection.db;
//         const usersCollection = db.collection('users');

//         // Get all indexes
//         const indexes = await usersCollection.indexes();
//         console.log('\nCurrent indexes:');
//         indexes.forEach(index => console.log('-', index.name));

//         // Drop the old username index
//         try {
//             await usersCollection.dropIndex('username_1');
//             console.log('\n✅ Successfully dropped old "username_1" index');
//         } catch (error) {
//             if (error.code === 27) {
//                 console.log('\n⚠️  Index "username_1" does not exist (already removed)');
//             } else {
//                 throw error;
//             }
//         }

//         // List indexes after removal
//         const newIndexes = await usersCollection.indexes();
//         console.log('\nRemaining indexes:');
//         newIndexes.forEach(index => console.log('-', index.name));

//         console.log('\n✅ Index fix completed successfully!');
//         process.exit(0);
//     } catch (error) {
//         console.error('❌ Error fixing indexes:', error);
//         process.exit(1);
//     }
// };

// fixIndexes();
