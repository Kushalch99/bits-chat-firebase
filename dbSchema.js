let db = {
    users:[
        {
            userId:"fdksjlsdfklsdf3943409",
            email:"kushalch99@gmail.com",
            handle:"user",
            createdAt:"2020-06-22T19:08:22.935Z",
            imageUrl:'image/kushal.jpg',
            bio:"hello everyone",
            website:"https://user.com",
            location:"India"
        }
    ],
    screams:[
        {
            userHandle:'user',
            body:'this is a scream body',
            createdAt: "2020-06-22T19:08:22.935Z",
            likeCount:5,
            commentCount:10
        }
    ],
    comments = [
        {
            userHandle:'user',
            screamId:"kdfjlakfldj",
            body:'this is a scream body',
            createdAt: "2020-06-22T19:08:22.935Z",   
        }
    ],
    notification = [
        {
            recipient:'user',
            sender:'kushal',
            read:'true|false',
            screamId:'ajldfjlsda',
            type:'like|comment',
            createdAt:"2020-06-22T19:08:22.935Z"
        }
    ]
}

const userDetails = {
    //Redux data
    credentials:{
        userId:"alkjfl948903",
        email:"kushalch99@gmail.com",
        handle:"user",
        createdAt:"2020-06-22T19:08:22.935Z",
        imageUrl:'image/kushal.jpg',
        bio:"hello everyone",
        website:"https://user.com",
        location:"India"
    },
    likes:[
        {
            userHandle:'user',
            screamId:"fjkdlfsdk09430"
        },
        {
            userHandle:'user',
            screamId:"fjkdlfsdk09430"
        }
    ]
}