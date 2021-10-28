import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import adblock from "puppeteer-extra-plugin-adblocker";
import fs from "fs";

puppeteer.use(stealth());
puppeteer.use(adblock({blockTrackers: true}));

const UA = "Mozilla/5.0 (X11; U; FreeBSD i386; en-US) AppleWebKit/532.0 (KHTML, like Gecko) Chrome/4.0.207.0 Safari/532.0";
let cache = new Map();
const fileData = fs.readFileSync('cache.json');

function loadCache() {
    if (fileData.length === 0) {
        return;
    }
    cache = new Map(JSON.parse(fileData));
    console.log(cache.size);
}

function saveCache() {
    fs.writeFile('cache.json', JSON.stringify(Array.from(cache.entries())), function (err) {
        if (err) return console.log(err);
    });
}

const minimal_args = [
    '--autoplay-policy=user-gesture-required',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-setuid-sandbox',
    '--disable-speech-api',
    '--disable-sync',
    '--hide-scrollbars',
    '--ignore-gpu-blacklist',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--password-store=basic',
    '--use-gl=swiftshader',
    '--use-mock-keychain',
];

async function lookupSkin(path) {
    return puppeteer.launch({
        headless: false,
        args: minimal_args,
        userDataDir: './asset-cache',
        defaultViewport: {width: 200, height: 200}
    }).then(async browser => {
        console.log(`Obtaining all NameMC Profiles Using Skin ID: ${path}`);
        const page = await browser.newPage();
        await page.setUserAgent(UA);

        // Stupid workaround
        page.removeAllListeners("request");

        await page.setRequestInterception(true);
        page.on("request", async (req) => {
            try {
                switch (await req.resourceType()) {
                    case "image":
                    case "stylesheet":
                    case "font":
                        await req.abort();
                        break;
                    default:
                        await req.continue();
                        break;
                }
            } catch (e) {
                console.log(e);
            }
        });

        await page.goto(`https://namemc.com/skin/${path}`);

        const links = await page.$$eval(".player-list > a", as => as.map(a => a.href));

        const uuids = new Array();

        for (const link of links) {
            if (cache.has(link)) {
                uuids.push(cache.get(link));
            } else {
                await page.goto(link);
                try {
                    let idElement = await page.$x("/html/body/main/div/div[1]/div[1]/div[2]/div[1]/div[3]/samp");
                    const uuid = await page.evaluate(name => name.innerText, idElement[0]);
                    console.log(uuid);
                    uuids.push(uuid);
                    cache.set(link, uuid);
                } catch (e) {
                    console.log(e);
                }
            }
        }

        await browser.close();
        saveCache();
        return uuids;
    });
}

export {lookupSkin, loadCache, saveCache}