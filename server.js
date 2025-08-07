import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import AWS from 'aws-sdk';
import crypto from 'crypto';

import sharp from 'sharp';

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';


dotenv.config();

const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey,
    },
    region: bucketRegion,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// //to read req.body
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

//storage has to be changed to memory storage not disk storage because it is not for local files it is s3
const storage = multer.memoryStorage();

const upload = multer({storage: storage });

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

//get all posts with signed URLs
app.get('/posts', async (req, res) => {
  const prisma = new PrismaClient();
  const posts = await prisma.post.findMany({orderBy: [{ createdAt: 'desc' }]});

  for(const post of posts) {
    const getObjectParams = {
      Bucket: bucketName,
      Key: post.imageName,
    };

    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    post.imageUrl = url; // Add the signed URL to the post object
  }

  res.json(posts);
});

//post request to upload the image
app.post('/upload', upload.single('image'), async (req, res) => {
    // const caption = req.body.caption;
    // console.log("Caption: ", caption);
    console.log("req.body", req.body);
    console.log("req.file", req.file);

    //resize the image to 1920x1080 and save it as a new buffer.
    const buffer = await sharp(req.file.buffer).resize({height: 1920, width: 1080, fit: "contain"}).toBuffer();

    const imageName = randomImageName();
    const params = {
        Bucket: bucketName,
        Key: imageName,
        Body: buffer, // Buffer the resized image
        ContentType: req.file.mimetype,
      };

      const prisma = new PrismaClient();

      const post = await prisma.post.create({
        data: {
          caption: req.body.caption,
          imageName: imageName
        }
});

    
    const command = new PutObjectCommand(params);
    await s3.send(command);
  
    res.send(post)
  });

  app.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;
    const prisma = new PrismaClient();

    const post = await prisma.post.findUnique({where: {id: parseInt(id)}})
    if(!post) {
      res.status(404).send({message: "Post not found"})
      return;
    }
    const params = {
      Bucket: bucketName,
      Key: post.imageName,
    };
    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    await prisma.post.delete({where: {id: parseInt(id)}})

    res.send(post)
    
  })

app.listen(8000, () => console.log('Server started on port 8000'));