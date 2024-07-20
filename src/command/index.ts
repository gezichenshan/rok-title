import axios from "axios";
import { setTimeout as wait } from "node:timers/promises";
import { Device } from "adb-ts";
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
} from "../constant";
import { Location } from "../model";
import { updateLocation } from "../services/api";

const OPENCY_SERVER_URL = "http://localhost:3001";

const locationQueue: Location[] = []

function isLocationInQueue(location: Location) {
    return locationQueue.findIndex(l => l.id === location.id) > -1
}
function removeLocationFromQueue(location: Location) {
    const idx = locationQueue.findIndex(l => l.id === location.id)
    if (idx > -1) {
        locationQueue.splice(idx, 1)
    }
}
function isMapChanged(inHome: boolean, areaCode: string) {
    if (inHome) {//如果在国内，但是areacode包含字母,说明要跳转到失落,所以changed
        return /[^0-9]/.test(areaCode)
    } else {
        return !/[^0-9]/.test(areaCode)
    }
}

function clearLocationQuery(location: Location) {
    removeLocationFromQueue(location)
    updateLocation(location)
}

export async function run(device: Device, location: Location) {
    if (isLocationInQueue(location)) {
        console.log('location already in queue')
        return LOCATION_QUERY_LOOP
    }
    locationQueue.push(location)

    console.log('start to handle location：', location)


    const isInHomeLnad = async (): Promise<boolean> => {
        const screenshotBuffer = await device.screenshot();
        const isIn = await axios
            .post(`${OPENCY_SERVER_URL}/is_in_homeland`, {
                imgBase64: screenshotBuffer.toString("base64"),
            })
            .then((res) => res.data);
        return isIn;
    };
    const getTitleButtonCoordinates = async (cityLocationIndex = 0): Promise<Record<"x" | "y", number> | 0> => {
        console.log("cityLocationIndex", cityLocationIndex);
        if (cityLocationIndex >= CITY_LOCATIONS.length) {
            console.log("You might have entered the wrong coordinates.");
            return 0
        }
        console.log(CITY_LOCATIONS[cityLocationIndex])
        // Tap city
        await device.shell(`input tap ${CITY_LOCATIONS[cityLocationIndex]}`);
        await wait(750);
        const screenshotBuffer = await device.screenshot();
        const addTitleButtoncoordinates = await axios
            .post(`${OPENCY_SERVER_URL}/find_cutout_position`, {
                imgBase64: screenshotBuffer.toString("base64"),
            })
            .then((res) => {
                return res.data;
            });
        if (!addTitleButtoncoordinates) {
            return getTitleButtonCoordinates(cityLocationIndex + 1);
        }
        return addTitleButtoncoordinates;
    };

    try {
        const {
            x: userCorX,
            y: userCorY,
            type: titleType,
            kindom,
            lost,
        } = location;
        const areaCode = lost || kindom;

        const is_in_homeland = await isInHomeLnad();

        /**
         * 唤起坐标输入框
         */
        console.log("is_in_homeland", is_in_homeland);
        await device.shell(
            `input tap ${is_in_homeland ? COORDINATES_INPUT : COORDINATES_LOST_INPUT}`
        );
        await wait(NEW_CLICK_IDLE_TIMEOUT);
        await device.shell(`input tap ${AREA_CODE_INPUT}`);

        /**
         * deletle
         */
        for (let i = 0; i < 20; i++) {
            await device.shell("input keyevent 67");
        }
        await wait(NEW_CLICK_IDLE_TIMEOUT);
        await device.shell(`input text ${areaCode || "544"}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);
        await device.shell(`input tap 491 565`); //点击其他位置，避免下面的事件不生效
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input tap ${COORDINATES_INPUT_X}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input text ${userCorX}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input tap 491 565`); //点击其他位置，避免下面的事件不生效
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input tap ${COORDINATES_INPUT_Y}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input text ${userCorY}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input tap 491 565`); //点击其他位置，避免下面的事件不生效
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        await device.shell(`input tap ${SEARCH_BTN}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);

        if (
            isMapChanged(is_in_homeland, areaCode)
        ) {
            console.log("SLOW_TRAVEL_TIMEOUT");
            await wait(SLOW_TRAVEL_TIMEOUT);
        } else {
            console.log("QUICK_TRAVEL_TIMEOUT");
            await wait(QUICK_TRAVEL_TIMEOUT);
        }

        const titlePos = await getTitleButtonCoordinates();

        if (!titlePos) {
            console.log("rok title no found； reloop");
            clearLocationQuery({ ...location, failed: true })
            return LOCATION_QUERY_LOOP;
        }

        console.log('titlePos', titlePos)

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
        await wait(NEW_CLICK_IDLE_TIMEOUT);
        await device.shell(`input tap ${rolePos}`);
        await wait(NEW_CLICK_IDLE_TIMEOUT);
        await device.shell(`input tap ${role_set_consent_btn}`);
        console.log(`头衔已发放，等待${NEXT_LOOP_DURATION}ms后重新开始`, location);
        //after NEXT_LOOP_DURATION milsecs remove location in queue and call API set location unhandled=true
        await wait(NEXT_LOOP_DURATION)
        console.log('clearLocationQuery')
        clearLocationQuery(location)
    } catch (error) {
        console.log("error occured but cached", error);
        return LOCATION_QUERY_LOOP;
    }
}

