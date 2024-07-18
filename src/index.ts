import { Client as AdbClient } from "adb-ts";
import { writeFile } from "node:fs/promises";
import axios from "axios";

import { join } from "node:path";

import { setTimeout } from "node:timers/promises";
import { base64_encode ,wait} from "./utils";

import {
  COORDINATES_LOST_INPUT,
  COORDINATES_INPUT,
  COORDINATES_INPUT_X,
  COORDINATES_INPUT_Y,
  BACK_TO_MYSELF_FORT_BTN,
  SEARCH_BTN,
  CITY_LOCATIONS,
  AREA_CODE_INPUT,
  dafaguan,
  gonjue,
  jianzhushi,
  kexuejia,
  role_set_consent_btn,
  //TIMEOUT
  NEW_CLICK_IDLE_TIMEOUT,
  INPUT_CONFIRM,
  NEXT_LOOP_DURATION,
  QUICK_TRAVEL_TIMEOUT,
  SLOW_TRAVEL_TIMEOUT,
  LOCATION_QUERY_LOOP,
} from "./constant";
import { getLastLocation } from "./services/api";

const adb = new AdbClient({
  // bin: "C:\\Users\\admin\\Desktop\\JD\\title-script\\platform-tools\\adb.exe",
  bin: "/Users/super/yjd/platform-tools",
  host: "127.0.0.1",
  port: 5037,
});
const OPENCY_SERVER_URL = "http://localhost:3001";

const [device] = await adb.map((device) => device);

const isInHomeLnad = async (): Promise<boolean> => {
  const screenshotBuffer = await device.screenshot();
  const isIn = await axios
    .post(`${OPENCY_SERVER_URL}/is_in_homeland`, {
      imgBase64: screenshotBuffer.toString("base64"),
    })
    .then((res) => res.data);
  return isIn;
};

const getTitleButtonCoordinates = async (
  cityLocationIndex = 0
): Promise<Record<"x" | "y", number>> => {
  console.log("cityLocationIndex", cityLocationIndex);
  if (cityLocationIndex > CITY_LOCATIONS.length) {
    throw new Error("You might have entered the wrong coordinates.");
  }

  // Tap city
  await device.shell(`input tap ${CITY_LOCATIONS[cityLocationIndex]}`);

  await setTimeout(750);

  const screenshotBuffer = await device.screenshot();

  const addTitleButtoncoordinates = await axios
    .post(`${OPENCY_SERVER_URL}/find_cutout_position`, {
      imgBase64: screenshotBuffer.toString("base64"),
    })
    .then((res) => {
      return res.data
    });
    
  if (!addTitleButtoncoordinates) {
    return getTitleButtonCoordinates(cityLocationIndex + 1);
  }

  return addTitleButtoncoordinates;
};

async function main() {


  try {
    const location = await getLastLocation();
    if (!location) {
      console.log("location 为空，5秒后loop", location);
      return LOCATION_QUERY_LOOP;
    }
    console.log('new location，', location)
    // return;
    // location格式为：719,437,公爵,c11360,unchanged
    // const location = await getLastLocation();
    // const location = "597,467,公爵,544,unchanged";
    // const location = "438,299,公爵,c11360,unchanged";
    const locationArr = location.split(",");
    const [userCorX, userCorY, titleType, areaCode] = locationArr;
    const is_in_homeland = await isInHomeLnad();

    /**
     * 唤起坐标输入框
     */
    console.log('is_in_homeland',is_in_homeland)
    await device.shell(
      `input tap ${is_in_homeland ? COORDINATES_INPUT : COORDINATES_LOST_INPUT}`
    );
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);
    await device.shell(`input tap ${AREA_CODE_INPUT}`);



    
    // await device.shell(
    //   "input keyevent --longpress 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67"
    // );
    /**
     * deletle
     */
    for(let i=0;i<20;i++){
      await device.shell(
        "input keyevent 67"
      );
    }
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);
    await device.shell(`input text ${areaCode || "544"}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);
    await device.shell(`input tap 491 565`); //点击其他位置，避免下面的事件不生效
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);
    
    await device.shell(`input tap ${COORDINATES_INPUT_X}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);

    await device.shell(`input text ${userCorX}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);

    await device.shell(`input tap 491 565`); //点击其他位置，避免下面的事件不生效
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);

    await device.shell(`input tap ${COORDINATES_INPUT_Y}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);

    await device.shell(`input text ${userCorY}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);

    await device.shell(`input tap 491 565`); //点击其他位置，避免下面的事件不生效
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);

    await device.shell(`input tap ${SEARCH_BTN}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);


    
    console.log(
      is_in_homeland,
      areaCode,
      !is_in_homeland && (areaCode || areaCode == "544")
    );
    if (
      (is_in_homeland && areaCode !== "544") ||
      (!is_in_homeland && (!areaCode || areaCode == "544"))
    ) {
      console.log("SLOW_TRAVEL_TIMEOUT");
      await setTimeout(SLOW_TRAVEL_TIMEOUT);
    } else {
      console.log("QUICK_TRAVEL_TIMEOUT");
      await setTimeout(QUICK_TRAVEL_TIMEOUT);
    }

    const titlePos = await getTitleButtonCoordinates();

    if(!titlePos){
      console.log('rok title no found； reloop')
      return LOCATION_QUERY_LOOP
    }

    const realTitlePos = { x: titlePos.x + 10, y: titlePos.y + 50 }; //增加title btn的偏移量

    await device.shell(`input tap ${realTitlePos.x} ${realTitlePos.y}`);
    let rolePos = "";
    if (titleType === "公爵") {
      rolePos = gonjue;
    }
    if (titleType === "大建筑师") {
      rolePos = jianzhushi;
    }
    if (titleType === "大科学家") {
      rolePos = kexuejia;
    }
    if (titleType === "大法官") {
      rolePos = dafaguan;
    }
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);
    await device.shell(`input tap ${rolePos}`);
    await setTimeout(NEW_CLICK_IDLE_TIMEOUT);
    await device.shell(`input tap ${role_set_consent_btn}`);
    console.log(`头衔已发放，等待${NEXT_LOOP_DURATION}ms后重新开始`, location);
    return NEXT_LOOP_DURATION;
  } catch (error) {
    console.log("error occured but cached", error);
    return LOCATION_QUERY_LOOP;
  }
}

while (true) {
  const timeout = await main();
  await setTimeout(timeout);
}
