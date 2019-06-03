// IMPORTS
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const request = require('request');
const AWS = require('aws-sdk');

// EXPRESS CONSTS
const app = express();
const port = 3000;

// JSON FIELDS
const ELECTRON_UPDATE_A = 'electronUpdateA';
const ELECTRON_UPDATE_B = 'electronUpdateB';
const OS = 'os';
const PLATFORM = 'platform';
const UPDATE_SERVER = 'updateServer';
const UPDATE_SERVER_USER = 'updateServerUser';
const UPDATE_SERVER_PASSWORD = 'updateServerPassword'
const ACCESS_KEY_ID = 'accessKeyId';
const SECRET_ACCESS_KEY = 'secretAccessKey';
const BUCKET = 'bucket';

// MIDDLEWARE
app.use(bodyParser.json());

class ElectronUpdateManager {
  constructor() {
    let updatesFile = fs.readFileSync('update.json');
    let jsonData = JSON.parse(updatesFile);

    this.ELECTRON_UPDATE_A = jsonData[ELECTRON_UPDATE_A];
    this.ELECTRON_UPDATE_B = jsonData[ELECTRON_UPDATE_B];
    this.OS = jsonData[OS];
    this.PLATFORM = jsonData[PLATFORM];
    this.UPDATE_SERVER = jsonData[UPDATE_SERVER];
    this.UPDATE_SERVER_USER = jsonData[UPDATE_SERVER_USER];
    this.UPDATE_SERVER_PASSWORD = jsonData[UPDATE_SERVER_PASSWORD];

    this.ACCESS_KEY_ID = jsonData[ACCESS_KEY_ID];
    this.SECRET_ACCESS_KEY = jsonData[SECRET_ACCESS_KEY];
    this.BUCKET = jsonData[BUCKET];
  }

  flipElectronUpdate = (currentVersion) => {
    return currentVersion == this.ELECTRON_UPDATE_A
      ? this.ELECTRON_UPDATE_B : this.ELECTRON_UPDATE_A;
  }

  downloadElectronUpdate = (version) => {
    const filename = `electron-v${version}-${this.OS}-${this.PLATFORM}.zip`
    const key = `electron/${filename}`;
    const s3 = new AWS.S3({
      accessKeyId: this.ACCESS_KEY_ID,
      secretAccessKey: this.SECRET_ACCESS_KEY
    });

    const params = {
      Bucket: this.BUCKET,
      Key: key
    };

    return new Promise((res, rej) => {
      s3.getObject(params, function(err, data) {
        if (err) rej(err); // an error occurred
        else {
          fs.writeFile(filename, data.Body, (err) => {
            if (err) rej(err);
            res({downloaded: true});
          })
        }
      });
    });

  }
}

const em = new ElectronUpdateManager();

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/latest/electron', (req, res) => {
  const latestVersion = em.flipElectronUpdate(req.body.currentVersion);
  res.send({ latest: latestVersion });
});

app.get('/download/electron/:version',  async (req, res) => {
  const data = await em.downloadElectronUpdate(req.params.version);
  res.send({data: data});
});

app.listen(port, () => console.log(`Electron Update Manager running on port: ${port}!`))
