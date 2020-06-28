const functions = require('firebase-functions');
const express = require('express');
const app = express();
const  { getAllScreams, postScream,getScream,commentOnScream,likeScream,unlikeScream ,deleteScream}
     = require('./handlers/screams')
const {signUp, login ,uploadImage,addUserDetails,getAuthenticatedUser,getUserDetails,markNotificationRead} = require('./handlers/users')
const FBAuth = require('./utils/FBAuth');
const {db} = require('./utils/admin');

//screams route
app.get('/screams',FBAuth,getAllScreams)
app.post('/screams',FBAuth,postScream);
app.get('/screams/:screamId',getScream);
app.delete('/screams/:screamId',FBAuth,deleteScream);
app.get('/screams/:screamId/like',FBAuth,likeScream);
app.get('/screams/:screamId/unlike',FBAuth,unlikeScream);
app.post('/screams/:screamId/comment',FBAuth,commentOnScream);

//users route
app.post('/signup',signUp);
app.post('/login',login);
app.post('/user/image',FBAuth,uploadImage);
app.post('/user',FBAuth,addUserDetails);
app.get('/user',FBAuth,getAuthenticatedUser);
app.get('/user/:handle',getUserDetails);
app.post('/notifications',markNotificationRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
    .onCreate((snapshot)=>{
        return db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then(doc=>{
            if(doc.exists && doc.data().userHandle!==snapshot.data().userHandle){
                db.doc(`/notification/${snapshot.id}`).set({
                    createdAt:new Date().toISOString(),
                    recipient:doc.data().userHandle,
                    sender:snapshot.data().userHandle,
                    type:'like',
                    read:false,
                    screamId:doc.id
                });
            }
        })
        .catch(err=>{
            console.error(err);
        })
    });
exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
    .onDelete((snapshot)=>{
        return db.doc(`/notification/${snapshot.id}`)
            .delete()
            .catch(err=>{
                console.error(err);
            })
    });
exports.createNotificationOnLike = functions.firestore.document('comments/{id}')
    .onCreate((snapshot)=>{
        return db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then(doc=>{
            if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                db.doc(`/notification/${snapshot.id}`).set({
                    createdAt:new Date().toISOString(),
                    recipient:doc.data().userHandle,
                    sender:snapshot.data().userHandle,
                    type:'comment',
                    read:false,
                    screamId:doc.id
                });
            }
        })
        .catch(err=>{
            console.error(err);
        })
    });

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
    .onUpdate((change)=>{
        console.log(change.before.data());
        console.log(change.after.data()); 
        if(change.before.data().imageUrl!==change.after.data().imageUrl){
            let batch = db.batch();
            return db.collection('screams').where('userHandle','==',change.before.data().handle).get()
                .then((data)=>{
                data.forEach(doc => {
                    const scream = db.doc(`screams/${doc.id}`);
                    batch.update(scream,{imageUrl:change.after.data().imageUrl});
                });
            return batch.commit();
            });
        }else{
            return true;
        }
    });

exports.onScreamDelete = functions.firestore.document('screams/{screamId}')
    .onDelete((snapshot,context)=>{
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db.collection('comments')
            .where('screamId','==',screamId).get()
            .then((data)=>{
                data.forEach(doc=>{
                    batch.delete(db.doc(`/comments/${doc.id}`));
                })
                return db.collection('likes').where('screamId','==',screamId).get();
            })
            .then((data)=>{
                data.forEach(doc=>{
                    batch.delete(db.doc(`/likes/${doc.id}`));
                })
                return db.collection('notifications').where('screamId','==',screamId).get()
            })
            .then((data)=>{
                data.forEach(doc=>{
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch(err=>{
                console.error(err);
            })
        });
        