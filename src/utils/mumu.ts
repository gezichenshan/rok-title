import { spawn } from "child_process";
import path from 'path'
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Client as AdbClient } from "adb-ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(){

const adb = new AdbClient({
    // bin: "C:\\Users\\admin\\Desktop\\JD\\title-script\\platform-tools\\adb.exe",
    bin: "/Users/super/yjd/platform-tools",
    host: "127.0.0.1",
    port: 5037,
  });
  const devices = await adb.map((device) => device);
  console.log(devices)
  const device = devices.find(d=>d.transportId==='2')
  await device!.shell(`input tap 195 19`);
}
main()



const tap = (device:string)=> (x: string, y: string)=> {
  // ./mumutool control 0 --action run_cmd --cmd "input tap 195 19"
  const ls = spawn(
    join(__dirname,"../mumutool",),
    ['control', device, '--action', 'run_cmd', '--cmd', `input tap ${x} ${y}`]
  );
// control 0 --action run_cmd --cmd "input tap 195 19"

  ls.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  ls.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

const screenshot = (device:string)=>{
    const ls = spawn(
        join(__dirname,"../mumutool",),
        ['control', device, '--action', 'run_cmd', '--cmd', `screencap -p > /Screenshots/screeshot.png`]
      );
    ls.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });
    
      ls.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });
    
      ls.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
      });
}
// screenshot('0')