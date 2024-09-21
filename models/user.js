import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const { Schema, model } = mongoose;

const UserSchema = Schema({
    name:{
        type:String,
        require:true
    },
    surname:{
        type:String
    },
    bio:{
        type:String
    },
    nick:{
        type:String,
        require:true,
        unique: true
    },
    email:{
        type:String,
        require:true,
        unique: true 
    },
    friends: [{ 
        type: Schema.Types.ObjectId,  
        ref: 'User' 
    }], // IDs de amigos
    password:{
        type:String,
        require:true
    },
    role:{
        type:String,
        default:"role_user"
    },
    image:{
        type:String,
        default:"default.png"
    },
    eliminado:{
        type: Boolean,
        default: false
    },
    online: { 
        type: Boolean, 
        default: false 
    },
    create_at:{
        type:Date,
        default:Date.now

    }

});

UserSchema.plugin(mongoosePaginate);

const User = model('User', UserSchema, 'users');

export default User;