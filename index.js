// IMPORTS
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const AWS = require('aws-sdk');
const { exec } = require('child_process');


// EXPRESS CONSTS
const app = express();
const port = 3000;

// JSON FIELDS
const ELECTRON_UPDATE_A = 'electronUpdateA';
const ELECTRON_UPDATE_B = 'electronUpdateB';
const ELECTRON_BASE_DIR = 'electronBaseDir';
const OS = 'os';
const PLATFORM = 'platform';
const ACCESS_KEY_ID = 'accessKeyId';
const SECRET_ACCESS_KEY = 'secretAccessKey';
const BUCKET = 'bucket';
const APP_DIRECTORY = 'appDirectory';
const PID_FILE = 'pidFile';

// CONSTS
const DARWIN = 'darwin';
const LINUX = 'linux';

// MIDDLEWARE
app.use(bodyParser.json());

class ElectronUpdateManager {
  constructor() {
    let updatesFile = fs.readFileSync('update.json');
    let jsonData = JSON.parse(updatesFile);

    this.ELECTRON_UPDATE_A = jsonData[ELECTRON_UPDATE_A];
    this.ELECTRON_UPDATE_B = jsonData[ELECTRON_UPDATE_B];
    this.ELECTRON_BASE_DIR = jsonData[ELECTRON_BASE_DIR];
    this.OS = jsonData[OS];
    this.PLATFORM = jsonData[PLATFORM];

    this.ACCESS_KEY_ID = jsonData[ACCESS_KEY_ID];
    this.SECRET_ACCESS_KEY = jsonData[SECRET_ACCESS_KEY];
    this.BUCKET = jsonData[BUCKET];

    this.APP_DIRECTORY = jsonData[APP_DIRECTORY];
    this.PID_FILE = jsonData[PID_FILE];
  }

  flipElectronUpdate = (currentVersion) => {
    return currentVersion == this.ELECTRON_UPDATE_A
      ? this.ELECTRON_UPDATE_B : this.ELECTRON_UPDATE_A;
  }

  getElectronZipFilename = (version) => `electron-v${version}-${this.OS}-${this.PLATFORM}.zip`;
  getElectronFolderName = (version) => {
    const zipFilename = this.getElectronZipFilename(version);
    return zipFilename.substring(0,zipFilename.length - 4);
  }

  downloadElectronUpdate = (version) => {
    const filename = this.getElectronZipFilename(version)
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

  getElectronPID = () => {
    return new Promise((res, rej) => {
      // FIX THIS TO READ PID FILE NAME FROM JSON
      fs.readFile('./pid', 'utf8', (err, data) => {
        if (err) {
          rej(err);
        }
        res(parseInt(data));
      })
    })
  }

  killElectronPID = (pid) => {
    return new Promise((res, rej) => {
      exec(`kill ${pid}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          console.error(`exec error code: ${error.code}`);
          rej({
            'error': error
          })
        }

        // successfully killed previously running electron
        setTimeout(() => {
          res(0)
        }, 3000);

      });
    })
  }

  runCommand = (command) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        console.error(`exec error code: ${error.code}`);
      }
    });

    return child.pid
  }

  startElectron = (version) => {
    let electronCommand = `${this.ELECTRON_BASE_DIR}/${this.getElectronFolderName(version)}`;

    if (electronCommand.includes(DARWIN)) {
      electronCommand = `${electronCommand}/Electron.app/Contents/MacOS/Electron`
    } else if (electronCommand.includes(LINUX)) {
      electronCommand = `${electronCommand}/electron`
    } else {
      throw Error('OS is not supported!')
    }
    const command = `${electronCommand} ${this.APP_DIRECTORY}  & echo $! > ${this.PID_FILE}`;

    return this.runCommand(command);
  }

  unzipElectron = (version) => {
    const zipFilename = this.getElectronZipFilename(version);
    const zipExtractDir = this.getElectronFolderName(version);
    const command = `unzip ${zipFilename} -d ${zipExtractDir}`;
    return this.runCommand(command);
  }
}

const em = new ElectronUpdateManager();

app.get('/', (req, res) => res.send('Hello World!'))

//-------------------------
// ELECTRON ENDPOINTS
//-------------------------
app.post('/latest/electron', (req, res) => {
  const latestVersion = em.flipElectronUpdate(req.body.currentVersion);
  res.send({ latest: latestVersion });
});

app.get('/download/electron/:version',  async (req, res) => {
  const data = await em.downloadElectronUpdate(req.params.version);
  res.send({data: data});
});

app.post('/install/electron/:version', (req, res) => {
  /*
  *  To install the steps are:
  *   1. Unzip the electron dist
  *   2. Kill the Electron PID
  *   3. Start the new Electron
  */

  const version = req.params.version;
  em.unzipElectron(version);

  res.sendStatus(200);
});

app.post('/run/electron/:version', async (req, res) => {
  try {
    let PID = await em.getElectronPID();
    let killOutput = await em.killElectronPID(PID);

    if (killOutput === 0) {
      let electronPID = await em.startElectron(req.params.version);
      res.send({ pid: electronPID });
    } else { throw 'something went wrong with the server'; }
  } catch(e) {
    console.log(e)
    res.sendStatus(500);
  }
})

app.listen(port, () => console.log(`Electron Update Manager running on port: ${port}!`))
