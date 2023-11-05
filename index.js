const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app=express();
const port=process.env.PORT||5000;


//middleware
app.use(cors({
    origin:['http://localhost:5173'],
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
    console.log(req.method,req.url);
    next();
}

const verifyToken=(req,res,next)=>{
    
    const token=req?.cookies?.token;
    if(!token)
    {
        return res.status(401).send({message:'Unauthorized Access'})
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err)
        {
            return res.send({message:'Unauthorized Access'})
        }
        req.user=decoded;
        next();
    })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection= client.db('registrationDB').collection('users');
    const assignmentsCollection=client.db('assignmentsDB').collection('assignments');




    app.post('/jwt',async(req,res)=>{
        const user=req.body;
        const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn:'1h'});

        res.cookie('token',token,{
            httpOnly:true,
            secure:true,
            sameSite:'none'
        })
        .send({success:true});
    })
    app.post('/logout',async(req,res)=>{
        const user=req.body;
        console.log('logging out',user);
        res.clearCookie('token',{maxAge:0}).send({success:true})
    })

    app.get('/assignments', logger, async(req,res)=>{
        let query={};
        if(req.query?.email){
            query={email: req.query.email}
        }
        const cursor=assignmentsCollection.find();
        const result1=await cursor.toArray();
        res.send(result1);
    })
    app.post('/assignments',async(req,res)=>{
        const assignment=req.body;
        const result1= await assignmentsCollection.insertOne(assignment);
        console.log(result1);
        res.send(result1);
    })

    app.get('/users',async(req,res)=>{
        const cursor=usersCollection.find();
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
    await client.db("admin").command({ ping: 1 });
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

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
})