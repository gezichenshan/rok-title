import { Client as AdbClient } from "adb-ts";

import { setTimeout } from "node:timers/promises";

import {
  LOCATION_QUERY_LOOP,
} from "./constant";
import { Location } from "../model";
import { getLocations } from "./services/api";


import { run } from './command'

const adb = new AdbClient({
  // bin: "C:\\Users\\admin\\Desktop\\JD\\title-script\\platform-tools\\adb.exe",
  bin: "/Users/super/yjd/platform-tools",
  host: "127.0.0.1",
  port: 5037,
});


const kindomDeviceTransportIdMap = {
  '544': '2',
  '545': '3'
}


const devices = await adb.map((device) => device);

// console.log(devices)

async function main() {
  try {
    const locations = await getLocations()
    if (!locations || locations.length === 0) {
      console.log("locations 为空，5秒后loop");
      return LOCATION_QUERY_LOOP;
    }

    locations.forEach(async (loc) => {
      const device = devices.find(d => d.transportId === kindomDeviceTransportIdMap[loc.kindom])
      if (!device) {
        return
      }
      run(device, loc)
    })
    return LOCATION_QUERY_LOOP
  } catch (error) {
    console.log('main error:', error)
    return LOCATION_QUERY_LOOP
  }
}

while (true) {
  const timeout = await main();
  await setTimeout(timeout);
}
