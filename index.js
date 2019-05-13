// IMPORTS
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

// EXPRESS CONSTS
const app = express();
const port = 3000;

// JSON FIELDS
const ELECTRON_UPDATE_A = 'electronUpdateA';
const ELECTRON_UPDATE_B = 'electronUpdateB';

// MIDDLEWARE
app.use(bodyParser.json());

class ElectronUpdateManager {
  constructor() {
    let updatesFile = fs.readFileSync('update.json');
    let jsonData = JSON.parse(updatesFile);

    this.ELECTRON_UPDATE_A = jsonData[ELECTRON_UPDATE_A];
    this.ELECTRON_UPDATE_B = jsonData[ELECTRON_UPDATE_B];
  }

  flipElectronUpdate = (currentVersion) => {
    return currentVersion == this.ELECTRON_UPDATE_A
      ? this.ELECTRON_UPDATE_B : this.ELECTRON_UPDATE_A;
  }
}

const em = new ElectronUpdateManager();

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/update', (req, res) => {
  console.log(req.body)
  console.log(`current ${req.body.currentVersion}`)
  const latestVersion = em.flipElectronUpdate(req.body.currentVersion);
  console.log(`latest ${latestVersion}`)
  res.send({ latest: latestVersion });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
