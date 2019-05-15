// IMPORTS
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const request = require('request');

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
  }

  flipElectronUpdate = (currentVersion) => {
    return currentVersion == this.ELECTRON_UPDATE_A
      ? this.ELECTRON_UPDATE_B : this.ELECTRON_UPDATE_A;
  }

  downloadElectronUpdate = (version) => {
    const filename = `electron-v${version}-${this.OS}-${this.PLATFORM}.zip`
    const endpoint = `${this.UPDATE_SERVER}/${filename}`;
    const file = fs.createWriteStream(filename);
    return new Promise((resolve) => {
      request(endpoint, {
        "auth" : {
          "username" : this.UPDATE_SERVER_USER,
          "password" : this.UPDATE_SERVER_PASSWORD
        }
      }).pipe(file).on('finish', resolve);
    })
  }
}

const em = new ElectronUpdateManager();

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/latest/electron', (req, res) => {
  const latestVersion = em.flipElectronUpdate(req.body.currentVersion);
  res.send({ latest: latestVersion });
});

app.get('/download/electron/:version',  async (req, res) => {
  await em.downloadElectronUpdate(req.params.version);
  res.sendStatus(200);
});

app.listen(port, () => console.log(`Electron Update Manager running on port: ${port}!`))
