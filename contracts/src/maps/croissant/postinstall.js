const TONK_URL_HTTP = process.env.TONK_URL_HTTP;
if (!TONK_URL_HTTP) {
    throw new Error("TONK_URL_HTTP env var not set");
}

async function register_building(id, readable_id, is_tower, message, location) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        id: id,
        is_tower: is_tower,
        task_message: message,
        readable_id: readable_id,
        location,
    });

    var requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
    };

    return fetch(`${TONK_URL_HTTP}/building`, requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.log("error", error));
}

const HEX_DUMP_MESSAGE = "Download garbage data";
const MEME_GEN_MESSAGE = "Download steamed hams";
const SELFIE_POINT_MESSAGE = "Download vacation selfies";

async function register_all() {
    await register_building(
        "0x34cf8a7e0000000000000000000000000000fff3fff80015",
        "COMPUTE CENTER",
        true,
        "",
        ["0x0", "0xfff3", "0xfff8", "0x0015"],
    );
    await register_building(
        "0x34cf8a7e0000000000000000000000000000ffea00020014",
        "DATA DUMP NORTH",
        false,
        HEX_DUMP_MESSAGE,
        ["0x0", "0xffea", "0x0002", "0x0014"],
    );
    await register_building(
        "0x34cf8a7e0000000000000000000000000000fff7fffa000f",
        "DATA DUMP EAST",
        false,
        MEME_GEN_MESSAGE,
        ["0x0", "0xfff7", "0xfffa", "0x000f"],
    );
    await register_building(
        "0x34cf8a7e0000000000000000000000000000ffeefff5001d",
        "DATA DUMP WEST",
        false,
        SELFIE_POINT_MESSAGE,
        ["0x0", "0xffee", "0xfff5", "0x001d"],
    );
}

register_all();
