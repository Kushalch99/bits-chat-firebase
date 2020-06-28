const {admin,db} = require('../utils/admin');
const firebase = require('firebase');
const config  = require('../utils/config');
firebase.initializeApp(config);
const {validateSignupData, validateLoginData,reduceUserDetails} = require('../utils/helperMethods');

//signup user
exports.signUp = (req,res)=>{
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle
    }
    const {errors,valid} = validateSignupData(newUser);
    if(!valid){
        return res.status(400).json(errors);
    }
    const noImage = 'no-face.png';
    let token,userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({handle:'this handle is already taken'});
        }else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password);
        }
    })
    .then((data)=>{
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then((idtoken)=>{
        token = idtoken;
        const userCredentials = {
            handle:newUser.handle,
            email:newUser.email,
            createdAt:new Date().toISOString(),
            imageUrl:`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
            userId:userId
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(()=>{
        return res.status(201).json({token})
    })
    .catch(err=>{
        console.error(err);
        if(err.code == 'auth/email-already-in-use'){
            return res.status(400).json({email:'Email already in use'});
        }
        return res.status(500).json({general:"Something went wrong please try again"});
    });
}

//login user
exports.login = (req,res)=>{
    const user = {
        email:req.body.email,
        password:req.body.password
    }
    const {errors,valid} = validateLoginData(user);
    if(!valid){
        return res.status(400).json(errors);
    }
    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
    .then((data)=>{
        return data.user.getIdToken();
    })
    .then((token)=>{
        return res.json({token});
    })
    .catch((err)=>{
        return res.status(403).json({general:'Wrong credentials please try again'});
    });
     
}

//Add user details
exports.addUserDetails = (req,res)=>{
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then((data)=>{
        return res.json({message:'Details added successfully'});
    })
    .catch((err)=>{
        console.error(err);
        return res.status(500).json({error:err.code});
    });
}
//get any users details
exports.getUserDetails = (req,res)=>{
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
    .then(doc=>{
        if(doc.exists){
            userData.user = doc.data();
            return db.collection('screams').where('userHandle','==',req.params.handle)
            .orderBy('createdAt','desc')
            .get();
        }else{
            return res.status(404).json({error:"User not found"});
        }
    })
    .then(data=>{
        userData.screams = [];
        data.forEach(doc=>{
            userData.screams.push({
                body:doc.data().body,
                createdAt:doc.data().createdAt,
                userHandle:doc.data().handle,
                userImage:doc.data().imageUrl,
                likeCount:doc.data().likeCount,
                commentCount:doc.data().commentCount,
                screamId:doc.id
            });
        });
        return res.json(userData);
    })
    .catch(err=>{
        console.error(err);
        return res.status(500).json({error:err.code});
    })
}


//get authenticated user
exports.getAuthenticatedUser = (req,res)=>{
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
    .then(doc=>{
        if(doc.exists){
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle','==',req.user.handle).get();
        }
    })
    .then(data=>{
        userData.likes = [];
        data.forEach(doc=>{
            userData.likes.push(doc.data())
        });
        return db.collection('notification').where('recipient','==',req.user.handle)
            .orderBy('createdAt','desc').limit(10).get();
    })
    .then((data)=>{
        userData.notification = [];
        data.forEach(doc=>{
            userData.notification.push({
                recipient:doc.data().recipient,
                sender:doc.data().sender,
                createdAt:doc.data().createdAt,
                type:doc.data().type,
                read:doc.data().read,
                notificationId:doc.id
            })
        });
        return res.json(userData);
    })
    .catch(err=>{
        console.error(err);
        res.status(500).json({error:err.code});
    });
}

//upload user image
exports.uploadImage = (req,res)=>{
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({headers:req.headers});
    let imageFileName;
    let imageToBeUploaded = {};
    busboy.on('file',(fieldname,file,filename,encoding,mimetype)=>{
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return res.status(400).json({error:"Wrong file type submitted"});
        }
        const imageExtension = filename.split('.')[filename.split('.').length -1];
        imageFileName = `${Math.round(Math.random()*1000000).toString()}.${imageExtension}`;
        const filePath = path.join(os.tmpdir(),imageFileName).toString();
        imageToBeUploaded = { filePath , mimetype };
        file.pipe(fs.createWriteStream(filePath));
    });
    busboy.on('finish',()=>{
        admin.storage().bucket().upload(imageToBeUploaded.filePath,{
            resumable:false,
            metadata:{
                metadata:{
                    contentType:imageToBeUploaded.mimetype,
                }
            }
        })
        .then(()=>{
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({
                imageUrl:imageUrl
            });
        })
        .then(()=>{
            res.json({message:"Image Uploaded Sucessfully"});
        })
        .catch(err=>{
            console.log(err);
            return res.status(500).json({error:err.code});
        });
    });
    busboy.end(req.rawBody);
}

exports.markNotificationRead = (req,res)=>{
    let batch = db.batch();
    req.body.forEach(notificationId =>{
        const notification = db.doc(`/notification/${notificationId}`);
        batch.update(notification,{read:true});
    });
    batch.commit()
    .then(()=>{
        return res.json({message:'Notification marked read'});
    })
    .catch(err=>{
        console.error(err);
        return res.status(500).json({error:err.code});
    });
}