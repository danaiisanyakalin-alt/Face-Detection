const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.post('/upload', (req, res) => {
  const image = req.body.image;

  if (!image) {
    return res.status(400).send('No image data received.');
  }

  const base64Data = image.replace(/^data:image\/png;base64,/, '');

  const buffer = Buffer.from(base64Data, 'base64');

  const fileName = `image_${Date.now()}.png`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      return res.status(500).send('Failed to save the image.');
    }
    res.send(`File uploaded successfully: ${fileName}`);
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
