const axios = require('axios');
const cheerio = require('cheerio');
const tmi = require("tmi.js");
const fs = require('fs')

const { declOfNum } = require('./my_modules/declOfNum');

const cmds = require('./json/cmd.json')
const counter = require('./json/counter.json')

//____________________________________________

var channel = 'dimill'

var config = {
    options: {
        debug: true
    },
    connection: {
        cluster: "aws",
        reconnect: true
    },
    identity: {
        username: 'alexmur_bot',
        password: "oauth:o8m3ko4t09tvs9jsxr1vi2yyi82vbc"
    },
    channels: [channel]
}

var client = new tmi.client(config)
client.connect();

//____________________________________________

function removeItemOnce(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
}

client.on('message', (channel,tags,message,self)=>{
    if (self) return;
    if (message.startsWith('!add')){
        if (tags.username == 'alexey__murzin'){
            let arr = message.split(" ");
            let name = arr[1].toLowerCase();
            let value = arr.slice(2).join(" ");
            let newcmd = {
                "name": name,
                "value": value
            }
            cmds.push(newcmd)
            fs.writeFile('./json/cmd.json', JSON.stringify(cmds, null, 2), (err)=>{
                    if(err) throw err;
                    client.say(channel, `Команда !${name} добавлена`)
            })
        }
    }
})

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;

    const command = message.toLowerCase().slice(1);
    for (i = 0; i < cmds.length; ++i) {
        if(cmds[i].name == command && command != 'test'){   
            client.say(channel, cmds[i].value)
        }
    }
})

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    if (message.startsWith('!del')){
        if (tags.username == 'alexey__murzin'){
            let arr = message.split(" ");
            let name = arr[1].toLowerCase();
            for (i = 0; i < cmds.length; ++i) {
                if(cmds[i].name == name){   
                    removeItemOnce(cmds, cmds[i])
                    fs.writeFile('./json/cmd.json', JSON.stringify(cmds, null, 2), (err)=>{
                        if(err) throw err;
                        client.say(channel, `Команда !${name} удалена`)
                    })
                }
            }
        }
    }
})

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    if(message === '!команды'){
        let arr = []
        for (i = 0; i < cmds.length; ++i) {
            if(cmds[i].name != 'test'){arr.push(cmds[i].name)}
        }
        client.say(channel, 'Список доступных команд: ' + arr.join(', '))
    }
})

//____________________________________________

//?counters
let cooldown = false;

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    if (!cooldown) {
        for (i = 0; i < counter.length; ++i) {
            if(counter[i].name == command){
                counter[i].value+=1
                fs.writeFile('./json/counter.json', JSON.stringify(counter, null, 2), (err)=>{
                    if(err) throw err;
                })

                switch (command) {
                    case 'телега':
                        client.say(channel, `Димил пропустил ${counter[i].value} ${declOfNum(counter[i].value, ['телегу', 'телеги', 'телег'])}. Список телег пополнился еще одной.`);
                        break;
                    case 'сейчасприду':
                        client.say(channel, `Димил оставил чат в одиночестве: ${counter[i].value} ${declOfNum(counter[i].value, ['раз', 'раза', 'раз'])}. sadCat `);
                        break;
                    case 'банан':
                        client.say(channel, `Димил сьел на стриме ${counter[i].value} ${declOfNum(counter[i].value, ['банан', 'банана', 'бананов'])} :banana: `);
                        break;
                    default:
                        break;
                } 
            } 
        }    
    }
    cooldown = true;
    setTimeout(() => { cooldown = false }, 20 * 1000);  
})

//____________________________________________

//? parsing
let selectorRang = '#mainContent > div.row > div.medium-13.small-24.columns > div.box.box-padding-10.summoner-rankings > div.best-league > div > div.row > div > div > div.txt.mainRankingDescriptionText > div.leagueTier'
let selectorLp = '#mainContent > div.row > div.medium-13.small-24.columns > div.box.box-padding-10.summoner-rankings > div.best-league > div > div.row > div > div > div.txt.mainRankingDescriptionText > div.league-points > span'
let selectorWin = '.winsNumber'
let selectorLose = '.lossesNumber'

let url1 = 'https://www.leagueofgraphs.com/ru/summoner/euw/Dimil%20Q'
let url2 = 'https://www.leagueofgraphs.com/ru/summoner/euw/RESET%20MMR%20DIMIL'

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message === '!ранг' || message === '!лп' || message === '!lp') {
        axios.get(url1).then(data => {
            const $ = cheerio.load(data.data)
            let elo1 = $(selectorRang).text().replace(/\s+/g, ' ').trim();
            let win = $(selectorWin).text().replace(/\s+/g, ' ').trim();
            let lose = $(selectorLose).text().replace(/\s+/g, ' ').trim();
            let eloDimil = ''
            if (elo1.startsWith("Мастер") || elo1.startsWith("Претендент") || elo1.startsWith("Грандмастер")) {
                eloDimil = `Ранг: ${elo1} ${win}W/${lose}L`;
            } else {
                axios.get(url1).then(data => {
                    let a = $(selectorLp).text().replace(/\s+/g, ' ').trim()
                    if(a == '100'){
                        axios.get(url2).then(data => {
                            let promo = $('.miniserie').text().replace(/\s+/g, ' ').trim()
                            eloDimil = `Ранг: ${elo1} ${lp} LP ${win}W/${lose}L Промо: ${promo}`
                        })
                    } else {
                        eloDimil = `Ранг: ${elo1} ${a} LP ${win}W/${lose}L`
                    }
                })
            }
            axios.get(url2).then(data => {
                const $ = cheerio.load(data.data)
                let elo2 = $(selectorRang).text().replace(/\s+/g, ' ').trim();
                let win = $(selectorWin).text().replace(/\s+/g, ' ').trim();
                let lose = $(selectorLose).text().replace(/\s+/g, ' ').trim();
                let eloRes = ''
                if (elo2.startsWith("Мастер") || elo2.startsWith("Претендент") || elo2.startsWith("Грандмастер")) {
                    eloRes =`Ранг: ${elo2} ${win}W/${lose}L`;
                    client.say(channel, `—————————————————————— Dimil Q -> ${eloDimil} —————————————————————— RESET MMR DIMIL-> ${eloRes} ——————————————————————`);
                } else {
                    axios.get(url2).then(data => {
                        let a = $(selectorLp).text().replace(/\s+/g, ' ').trim()
                        if(a == '100'){
                            axios.get(url2).then(data => {
                                let promo = $('.miniserie').text().replace(/\s+/g, ' ').trim()
                                eloRes = `Ранг: ${elo2} ${lp} LP ${win}W/${lose}L Промо: ${promo}`
                            })
                        } else {
                            eloRes = `Ранг: ${elo2} ${a} LP ${win}W/${lose}L`
                            client.say(channel, `—————————————————————— Dimil Q -> ${eloDimil} —————————————————————— RESET MMR DIMIL-> ${eloRes} ——————————————————————`);
                        }
                        
                    })
                }
            })
        })
    }
})

let selectorTftRang = '#profile > div > div:nth-child(2) > div.row.row-normal.mt-3 > div.col-lg-4 > div.profile__tier > div.profile__tier__info > div.profile__tier__summary > span.profile__tier__summary__tier.text-gold'
let selectorTftLp = '#profile > div > div:nth-child(2) > div.row.row-normal.mt-3 > div.col-lg-4 > div.profile__tier > div.profile__tier__info > div.profile__tier__summary > span.profile__tier__summary__lp'
let urlTft = 'https://lolchess.gg/profile/ru/dimill'

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message === '!рангтфт') {
        axios.get(urlTft).then(data => {
            const $ = cheerio.load(data.data)
            let chall = $(selectorTftRang).text().replace(/\s+/g, ' ').trim();
            let gm = $(selectorTftLp).text().replace(/\s+/g, ' ').trim();

            client.say(channel, `Ранг тфт: ${chall} ${gm}`);
        })
    }
})

//____________________________________________

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith("!test")) {
        console.log(tags['user-id'])
    }
}) 
/*
client.on('subscription',(channel, username, methods, message, tags) => {
    let str = `subscription: ${username}, ${methods.plan}, ${message}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('submysterygift', (channel, username, numbOfSubs, methods, tags) =>{
    let str = `submysterygift: ${username}, ${numbOfSubs}, ${methods.plan} , ${JSON.stringify(tags)}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('subgift', (channel, username, streakMonths, recipient, methods, tags) => {
    let str = `subgift: ${username}, ${streakMonths}, ${recipient}, ${methods.plan}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('resub', (channel, username, streakMonths, message, tags, methods)=>{
    let str = `resub: ${username}, ${streakMonths}, ${message}, ${methods.plan}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('anonsubgift',(channel, streakMonths, recipient, methods, tags)=>{
    let str = `anonsubgift: ${streakMonths}, ${recipient}, ${methods.plan}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('anonsubmysterygift',(channel, giftSubCount, methods, tags)=>{
    let str = `anonsubmysterygift: ${giftSubCount}, ${methods.plan}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('primepaidupgrade',(channel, username, methods, tags)=>{
    let str = `primepaidupgrade: ${username}, ${methods.plan}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('giftpaidupgrade',(channel, username, sender, tags)=>{
    let str = `giftpaidupgrade: ${username}, ${sender}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})

client.on('anongiftpaidupgrade',(channel, username, tags)=>{
    let str = `anongiftpaidupgrade: ${username}`
    console.log(str)
    data.push(str)
    fs.writeFile('./sub.json', JSON.stringify(data, null, 4), (err)=>{
        if(err) throw err;
    })
})
*/