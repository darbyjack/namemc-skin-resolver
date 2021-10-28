import express from "express";
import {lookupSkin, loadCache, saveCache} from "./resolver.js";

const app = express();
const port = 3000;

app.set('json spaces', 4);

app.get('/skin', async (req, res) => {
    const skin = req.query.id;
    res.header("Content-Type", 'application/json');
    res.send(await lookupSkin(skin));
});

app.listen(port, () => {
    console.log(`Loading Cache...`);
    loadCache();
    setInterval(saveCache, 10000);
})