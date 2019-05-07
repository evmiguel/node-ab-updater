const express = require('express')
const { exec } = require('child_process');
const fs = require('fs');
const app = express()
const port = 3000

getPID = () => {
  return new Promise((res, rej) => {
    fs.readFile('./pid', 'utf8', (err, data) => {
      if (err) {
        throw err;
      }
      res(parseInt(data));
    })
  })
}

killPID = (pid) => {
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
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      res({
        'output' : stdout,
      })
    });
  })
}
app.get('/', (req, res) => res.send('Hello World!'))

app.post('/update', async (req, res) => {
  let PID = await getPID()
  let killOutput = await killPID(PID);

  res.send(killOutput)

})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
