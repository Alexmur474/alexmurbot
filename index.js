const axios = require('axios');
const cheerio = require('cheerio');
const tmi = require("tmi.js");

const { declOfNum } = require('./my_modules/declOfNum');

require('./src/db/mongoose')
const Counter = require('./src/models/counters')
const Command = require('./src/models/command')

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

//?add command
client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith("!add")) {
        if (tags.username == 'alexey__murzin') {
            let arr = message.split(" ");
            let name = arr[1];
            let value = arr.slice(2).join(" ");

            Command.findOne({command: name},(err, data) => {
                if(err){console.log(err)}
                if(data){
                    Command.updateOne({command: name}, {value: value}, (err,data)=> {
                        if(err) console.log(err);
                        client.say(channel, `Команда !${name} успешно обновлена`)
                    })
                }else{
                    Command.create({command: name, value: value},function(err, doc){
                        if(err) return console.log(err);
                        client.say(channel, `Команда !${name} успешно добавлена`)
                    })
                }
            }) 
        }
    }
})

//? del command
client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith("!del")) {
        if (tags.username == 'alexey__murzin') {
            let arr = message.split(" ");
            let name = arr.splice(1).join(" ");

            Command.findOne({command: name},(err, data) => {
                if(err){console.log(err)}

                if(data){
                    Command.deleteOne({command:name}, function(err, result){
                        if(err) return console.log(err);
                        if(result){client.say(channel, `Команда !${name} успешно удалена`)}
                    })
                }else client.say(channel, `Команда !${name} не найдена`) 
            })
        }
    }
})

//? read command
client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;

    const command = message.toLowerCase().slice(1);
    Command.findOne({command: command},(err, data) => {
        if(err){console.log(err)}

        if(data){
            client.say(channel, data.value) 
        }
    }) 
});

//? command list
const arr = []
client.on('message', (channel, tags, message, self) => {
    if (self) return;

    if (message == "!команды") {
        Counter.find({}).exec(function(err, data) {
            for (i = 0; i< data.length; i++){
                arr.push(data[i].counter)
            }
            Command.find({}).exec(function(err, data) {
                for (i = 0; i< data.length; i++){
                    arr.push(data[i].command)
                }
                client.say(channel, "command list: " + arr.join(", "))
            })
        })
    }
})

//____________________________________________

//?counters
var anyVal = 0
let cooldown = false;

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    if (!cooldown) {
        Counter.findOne({counter: command},(err, data) => {
          
        if(data){
            anyVal = data.value + 1

            switch (command) {
                case 'телега':
                client.say(channel, `Димил пропустил ${anyVal} ${declOfNum(anyVal, ['телегу', 'телеги', 'телег'])}. Список телег пополнился еще одной.`);
                    break;
                case 'сейчасприду':
                    client.say(channel, `Димил оставил чат в одиночестве: ${anyVal} ${declOfNum(anyVal, ['раз', 'раза', 'раз'])}. sadCat `);
                    break;
                case 'банан':
                    client.say(channel, `Димил сьел на стриме ${anyVal} ${declOfNum(anyVal, ['банан', 'банана', 'бананов'])} :banana: `);
                    break;
                default:
                    break;
            }
        }
        if(err){console.log(err)}
            Counter.updateOne({counter: command}, {value: anyVal}, (err,data)=> {
                if(err) console.log(err);
            })
        });

        cooldown = true;
        setTimeout(() => { cooldown = false }, 20 * 1000);  
    }
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
    if (message === '!ранг') {
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
                    eloDimil = `Ранг: ${elo1} ${a} LP ${win}W/${lose}L`
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
                        eloRes = `Ранг: ${elo2} ${a} LP ${win}W/${lose}L`
                        client.say(channel, `—————————————————————— Dimil Q -> ${eloDimil} —————————————————————— RESET MMR DIMIL-> ${eloRes} ——————————————————————`);
                    })
                }
            })
        });
    }
});

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
        });
    }
});

//____________________________________________

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith("!test")) {
        
    }
}) 
