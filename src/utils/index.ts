import fs from "fs";

export function base64_encode(file: string) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString("base64");
}

export function wait(time:number){
 return new Promise((resolve)=>{
  setTimeout(() => {
    resolve('')
  }, time);
 })
}