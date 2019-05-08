// IMPORTS
const express = require('express')
const { exec } = require('child_process');
const fs = require('fs');

// EXPRESS CONSTS
const app = express();
const port = 3000;

// JSON FIELDS
const ELECTRON_VERSION_A = 'electronVersionA';
const ELECTRON_VERSION_B = 'electronVersionB';
const APP_DIRECTORY = 'appDirectory';
const PID_FILE = 'pidFile';

class ElectronRunner {
  constructor() {
    let rawCommands = fs.readFileSync('commands.json');
    let jsonData = JSON.parse(rawCommands);

    this.ELECTRON_VERSION_A = jsonData[ELECTRON_VERSION_A];
    this.ELECTRON_VERSION_B = jsonData[ELECTRON_VERSION_B];
    this.APP_DIRECTORY = jsonData[APP_DIRECTORY];
    this.PID_FILE = jsonData[PID_FILE];

    // this is the 'bit' that gets set
    this.currentElectronVersion = this.ELECTRON_VERSION_A;

  }

  getElectronPID = () => {
    return new Promise((res, rej) => {
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

  flipElectronVersion = () => {
    this.currentElectronVersion = this.currentElectronVersion == this.ELECTRON_VERSION_A
                                    ? this.ELECTRON_VERSION_B : this.ELECTRON_VERSION_A;

    return this.currentElectronVersion;
  }

  startElectron = () => {
    const electronCommand = this.flipElectronVersion();
    const command = `${electronCommand} ${this.APP_DIRECTORY}  & echo $! > ${this.PID_FILE}`;

    const child = exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          console.error(`exec error code: ${error.code}`);
          rej({
            'error': error
          })
          rej(error)
        }
      });

    return child.pid
  }
}

const er = new ElectronRunner();

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/update', async (req, res) => {
  try {
    let PID = await er.getElectronPID();
    let killOutput = await er.killElectronPID(PID);
    console.log(`killoutput: ${killOutput}`)

    if (killOutput === 0) {
      let electronPID = await er.startElectron();
      res.send({ pid: electronPID });
    } else { throw 'something went wrong with the server'; }


  } catch(e) {
    res.sendStatus(500);
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
