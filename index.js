const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const difficulties = require('./difficulties.json');
const cookieParser=require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
require('dotenv').config();
const app=express();
const port=process.env.PORT||5000;


//middleware
app.use(cors({
     origin:['https://ogsf-11.web.app',
     'https://ogsf-11.firebaseapp.com'
    ],
    credentials:true

}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.clkkquk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middlewares
const logger=(req,res,next)=>{
    console.log(req.method,req.url,req.email);
    next();
}

const verifyToken=(req,res,next)=>{
    
    const token=req?.cookies?.token;
    if(!token)
    {
        return res.status(401).send({message:'Unauthorized Access.no token'})
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err)
        {
            return res.status(401).send({message:'Unauthorized Access. some error occur'})
        }
        req.user=decoded;
        next();
    })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection= client.db('registrationDB').collection('users');
    const assignmentsCollection=client.db('assignmentsDB').collection('assignments');
    const submittedCollection=client.db('assignmentsDB').collection('submittedAssignments');
    const meetingPlatformsCollection=client.db('assignmentsDB').collection('meetingPlatforms');




    app.post('/jwt',logger,async(req,res)=>{
        const user=req.body;
        console.log(user)
        const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn:'1h'})

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            
        })
        .send({success:true});
    })
    app.post('/logout',async(req,res)=>{
        const user=req.body;
        console.log('logging out',user);
        res.clearCookie('token',{maxAge:0}).send({success:true})
    })

    app.get('/assignments', async(req,res)=>{
        let query={};
        if(req.query?.email){
            query={email: req.query.email}
        }
       
        const cursor=assignmentsCollection.find(query);
        const result1=await cursor.toArray();
        res.send(result1);
    })

    app.get('/assignments/:id',async(req,res)=>{
        const id=req.params.id;

        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            // Invalid ObjectId format
            return res.status(400).send('Invalid ObjectId format');
        }

        const query={_id: new ObjectId(id)}

        const options={
            projection:{title:1,email:1, image_url:1, short_description:1, type:1, marks:1}
        }

        const result= await assignmentsCollection.findOne(query,options);
        res.send(result);
    })

    app.put('/assignments/:id',async(req,res)=>{
        const id = req.params.id
        const filter = {
            _id: new ObjectId(id)
        }
        const newAssignment = req.body
        const options = {
            upsert: true,
        }
        const updatedAssignment = {
            $set: {
                image_url: newAssignment.image_url,
                title: newAssignment.title,
                type: newAssignment.type,
                marks: newAssignment.marks,
                short_description: newAssignment.short_description,
                dates:newAssignment.dates
            }
        }
        const result = await assignmentsCollection.updateOne(filter , updatedAssignment , options)
        console.log(result);
        res.send(result);
    })

    app.delete('/assignments/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id : new ObjectId(id)}
        const result=await assignmentsCollection.deleteOne(query);
        res.send(result)
    })

    app.get('/meetingPlatforms',async(req,res)=>{
        const cursor=meetingPlatformsCollection.find();
        const result=await cursor.toArray();
        res.send(result);
    })

    app.get('/submittedAssignments',async(req,res)=>{

        // if(req.user?.email!==req.query?.email)
        // {
        //     return req.status(403).send({message:'forbidden'})
        // }

        let query={};
        if(req.query?.email){
            query={email: req.query.email}
        }
        const cursor= submittedCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);

    })
    app.get('/submittedAssignments/:id',async(req,res)=>{
       
        const id=req.params.id;

        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            // Invalid ObjectId format
            return res.status(400).send('Invalid ObjectId format');
        }

        const query={_id: new ObjectId(id)}

        const options={
            projection:{obtainMarks:1,feedback:1,pdfLink:1}
        }

        const result= await submittedCollection.findOne(query,options);
        res.send(result);


    })

    app.put('/submittedAssignments/:id',async(req,res)=>{
        const id=req.params.id;
        const filter={_id : new ObjectId(id)}
        const updateSubmission=req.body;
        const options = {
            upsert: true,
        }
        const updatedSubmit={
          $set:{
            obtainMarks:updateSubmission.obtainMarks,
            feedback:updateSubmission.feedback,
            examinee:updateSubmission.examinee
        }  
        }
        const result = await submittedCollection.updateOne(filter , updatedSubmit,options)
        res.send(result);
    })

    app.post('/submittedAssignments',async(req,res)=>{
        const submittedAssignment=req.body;
        console.log(submittedAssignment)
        const result=await submittedCollection.insertOne(submittedAssignment)
        res.send(result);
    })

    app.post('/assignments',async(req,res)=>{
        const assignment=req.body;
        const result1= await assignmentsCollection.insertOne(assignment);
        console.log(result1);
        res.send(result1);
    })

    app.get('/users',async(req,res)=>{
        let query={};
        if(req.query?.email){
            query={email: req.query.email}
        }
        const cursor=usersCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);
    });

    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
       console.log(result);
        res.send(result);
    })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);








//checking server
app.get('/',(req,res)=>{
    res.send("Assignments server is running");
})

app.get('/difficulties',(req,res)=>{
    res.send(difficulties)
})

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
})