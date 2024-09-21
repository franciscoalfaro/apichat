import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const { Schema, model } = mongoose;

const FriendSchema = Schema({
    from: { 
        type: Schema.Types.ObjectId,        
        ref: 'User', 
        required: true 
    },
    to: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});
FriendSchema.plugin(mongoosePaginate);

const Friends = model('Friend', FriendSchema, 'friends');

export default Friends;
