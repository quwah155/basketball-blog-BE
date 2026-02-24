const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Comment text is required'],
        trim: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Virtual field for post
commentSchema.virtual('post', {
    ref: 'Post',
    localField: 'postId',
    foreignField: '_id',
    justOne: true
});

// Virtual field for author
commentSchema.virtual('author', {
    ref: 'User',
    localField: 'authorId',
    foreignField: '_id',
    justOne: true
});

// Include virtuals when converting to JSON
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

// Index for faster queries
commentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
