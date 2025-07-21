import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Images');
    },


    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + '-' + path.extname(file.originalname));
    }


});

const upload = multer({ storage });

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('image'), (req, res) => {
    res.send("image has been uploaded");
  });

app.listen(8000, () => console.log('Server started on port 8000'));