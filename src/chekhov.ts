import * as path from "path";

const { chromium } = require('playwright');
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const port = 1999

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const downloadSelector = "#menu > div > fieldset > div:nth-child(4) > div > a:nth-child(1)";
const param_names: string[] = [
    "param-unit_width",
    "param-pen_width",
    "param-cap_height",
    "param-bar_height",
    "param-ascender_height",
    "param-descender_height",
    "param-x_height",
    "param-horizontal_increase",
    "param-vertical_increase",
    "param-contrast",
    "param-superness",
    "param-slant",
    "param-aperture",
    "param-corner",
    "param-overshoot",
    "param-taper"];

let browser;
let page;
let input: number[]= [1.32, .83, .89, .38, .85, .72, .55, .45, .37, 1.12, .8, .24, .42, .35, .35, .85];

let hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)

async function init(){
    console.log("Setting up...")
    browser = await chromium.launch({ headless: false, slowMo: 50});
    page = await browser.newPage({acceptDownloads: true});
    await page.goto("https://www.metaflop.com/modulator"); //Go to Metaflop
    await page.waitForLoadState("networkidle");
    await page.click("#parameter-panel > div > div > div:nth-child(2) > div > a.parameter-panel-mode-toggle.adjusters"); //Nerd mode
    await sleep(1000);
    console.log("Done with setup!")
}

async function download_font(params: number[]){//Does the whole rigamarole
    for(let i: number = 0; i < params.length; i++){ //Round each parameter to 2 decimal places
        params[i] = Math.round((params[i] + Number.EPSILON) * 100) / 100
    }
    let filename: string = `fonts/font`+hashCode(params.toString()) + ".otf"; //Generate a unique hash filename for that font
    if(params.length != 16){
        console.log("params must be 16 values long!");
        return null;
    }
    for (let i = 0; i < 16; i++){
        await page.fill("#"+param_names[i], params[i].toString());
    }
    await sleep(1000);
    const [download] = await Promise.all([page.waitForEvent("download"), page.click(downloadSelector)]);
    await download.saveAs(filename);
    // await console.log("Download complete!")
    return filename;
}

app.get("/", async (req, res) => {
    let input = req.body;
    let font_path: string = await download_font(input);
    await res.sendFile(path.join(__dirname, '../fonts', 'test-font.otf'));
})

app.listen(port, () => {
    console.log(`Chekhov is now listening at http://localhost:${port}`);
});


(async () => {
    await init();
})();
