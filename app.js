const https = require('https');
const express = require('express');
const app = express();

let visitors = [];

function addVisitor(data) {
    let visitor = {};
    Object.assign(visitor, data);
    let exists = false;

    visitor.count = 1;
    visitors.forEach(v => {
        if ((!visitor.error && !v.error) || (visitor.error && v.error)) {
            if (v.country == visitor.country) {
                exists = true;
                v.data.push({
                    ip: visitor.ip,
                    ll: visitor.ll,
                })
                ++v.count;
            }
        }
    });
    
    if (!exists) {
        delete visitor.range;
        delete visitor.area;
        delete visitor.metro;
        delete visitor.cityStr;

        visitor.data = [{
            ip: visitor.ip,
            ll: visitor.ll,
        }];

        delete visitor.ip;
        delete visitor.ll;
        visitors.push(visitor);
    }

    return data;
}

// for testing purposes
function randomNum(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// for testing purposes
function randomIP() {
    return [
        `${randomNum(1, 9)}.${randomNum(0, 255)}.${randomNum(0, 255)}.${randomNum(0, 255)}`,
        `${randomNum(11, 171)}.${randomNum(0, 255)}.${randomNum(0, 255)}.${randomNum(0, 255)}`,
        `${randomNum(173, 191)}.${randomNum(0, 255)}.${randomNum(0, 255)}.${randomNum(0, 255)}`,
    ][randomNum(0, 2)];
}

function fetchIpInfo(ip) {
    // for testing purposes
    // ip = randomIP();
    ip = ip.split(':');
    ip = ip[ip.length - 1];
    //console.log(ip);
    return new Promise((resolve, reject) => {
        https.get(`https://js5.c0d3.com/location/api/ip/${ip}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', reject);
    });
}

async function getLocation(req, res, next) {
    try {
        const data = await fetchIpInfo(req.get('X-Forwarded-For') || req.ip);
        req.location = data;
        next();
    } catch (err) {
        return res.status(500).send(`ERROR! Couldn't get your client IP...`);
    }
}

app.set('view engine', 'ejs');
app.use('/images', express.static(__dirname + '/images'));

app.get('/visitors', getLocation, async (req, res) => {
    addVisitor(req.location);
    res.render(__dirname + '/index.ejs', { location: req.location });
});

app.get('/api/visitors', (_, res) => res.json(visitors));
app.get('/', (_, res) => res.redirect('/visitors'));

app.get('*', (req, res) => {
    res.status(404).end();
});

app.listen(process.env.PORT || 3000);