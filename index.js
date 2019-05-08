// IMPORTS
const express = require('express')
const { exec } = require('child_process');
const fs = require('fs');

// EXPRESS CONSTS
const app = express();
const port = 3000;

// JSON FIELDS
const ELECTRON_COMMAND = 'electronCommand';
const APP_DIRECTORY = 'appDirectory';
const PID_FILE = 'pidFile';

class ElectronRunner {
  constructor() {
    let rawCommands = fs.readFileSync('commands.json');
    let jsonData = JSON.parse(rawCommands);

    this.ELECTRON_COMMAND = jsonData[ELECTRON_COMMAND];
    this.APP_DIRECTORY = jsonData[APP_DIRECTORY];
    this.PID_FILE = jsonData[PID_FILE];
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
          return
        }

        // successfully killed previously running electron
        setTimeout(() => {
          res(0)
        }, 3000);

      });
    })
  }

  startElectron = () => {
    exec(`${this.ELECTRON_COMMAND} ${this.APP_DIRECTORY}  & echo $! > ${this.PID_FILE}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        console.error(`exec error code: ${error.code}`);
        rej({
          'error': error
        })
        return
      }

      // successfully started running electron
      res(0)
    });
  }
}


app.get('/', (req, res) => res.send('Hello World!'))

app.post('/update', async (req, res) => {
  const er = new ElectronRunner();

  try {
    let PID = await er.getElectronPID();
    let killOutput = await er.killElectronPID(PID);

    if (killOutput === 0) {
      let electronPID = await er.startElectron();
      console.log(electronPID)
      res.sendStatus(200);
    } else { throw 'something went wrong with the server'; }


  } catch(e) {
    res.sendStatus(500);
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
