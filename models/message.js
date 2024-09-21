import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const { Schema, model } = mongoose;

const MessageSchema = Schema({
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
    message: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date, default: Date.now
    }
});

MessageSchema.plugin(mongoosePaginate);

const Message = model('Message', MessageSchema, 'messages');

export default Message
