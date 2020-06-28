const admin = require('firebase-admin');
var serviceAccount = require("../serviceKey.json");
admin.initializeApp({
    credential:admin.credential.cert(serviceAccount),
    databaseURL: "https://bitschat-29b15.firebaseio.com",
    storageBucket:"gs://bitschat-29b15.appspot.com"
});
const db = admin.firestore();

module.exports = { admin , db }