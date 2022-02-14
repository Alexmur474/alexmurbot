require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const tmi = require('tmi.js');
const fs = require('fs');
var cron = require('node-cron');

const { declOfNum } = require('./my_modules/declOfNum');

const cmds = require('./json/commands.json');
const counter = require('./json/counters.json');
const rs = require('./rs.json');
//____________________________________________

var config = {
    options: {
        debug: true,
    },
    connection: {
        cluster: 'aws',
        reconnect: true,
    },
    identity: {
        username: process.env.BOT_NAME,
        password: process.env.OAUTH,
    },
    channels: [process.env.CHANNEL],
};

var client = new tmi.client(config);
client.connect();

//____________________________________________

//?bot restart
cron.schedule('0 * * * *', () => {
    rs[0].restart = 1;
    fs.writeFile('./rs.json', JSON.stringify(rs, null, 2), (err) => {
        if (err) throw err;
        console.log('BOT RESTARTIND');
    });
});

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    if (message === '!rs') {
        if (tags.username == 'alexey__murzin') {
            client.say(channel, 'bot restarting');
            fs.writeFile('./rs.json', JSON.stringify(rs, null, 2), (err) => {
                if (err) throw err;
                console.log('BOT RESTARTING');
            });
        }
    }
});

//____________________________________________

//?commands
function removeItemOnce(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) arr.splice(index, 1);
    return arr;
}

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith('!add')) {
        if (tags.username == 'alexey__murzin') {
            let arr = message.split(' ');
            let name = arr[1].toLowerCase();
            let value = arr.slice(2).join(' ');
            let newCmd = {
                name: name,
                value: value,
            };
            cmds.push(newCmd);
            fs.writeFile(
                './json/commands.json',
                JSON.stringify(cmds, null, 2),
                (err) => {
                    if (err) throw err;
                    client.say(channel, `Команда !${name} добавлена`);
                }
            );
        }
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    const command = message.toLowerCase().slice(1);
    try {
        client.say(
            channel,
            cmds.filter((elem) => elem.name == command)[0].value
        );
    } catch (error) {
        console.log(error);
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    if (message.startsWith('!del')) {
        if (tags.username == 'alexey__murzin') {
            let arr = message.split(' ');
            let name = arr[1].toLowerCase();
            for (i = 0; i < cmds.length; ++i) {
                if (cmds[i].name == name) {
                    removeItemOnce(cmds, cmds[i]);
                    fs.writeFile(
                        './json/commands.json',
                        JSON.stringify(cmds, null, 2),
                        (err) => {
                            if (err) throw err;
                            client.say(channel, `Команда !${name} удалена`);
                        }
                    );
                }
            }
        }
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    if (message === '!команды') {
        client.say(
            channel,
            'Список доступных команд: ' + cmds.map((x) => x.name).join(', ')
        );
    }
});

//____________________________________________

//?counters
let cooldown = false;

client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    if (!cooldown) {
        for (i = 0; i < counter.length; ++i) {
            if (counter[i].name == command) {
                counter[i].value += 1;
                fs.writeFile(
                    './json/counters.json',
                    JSON.stringify(counter, null, 2),
                    (err) => {
                        if (err) throw err;
                    }
                );
                switch (command) {
                    case 'телега':
                        client.say(
                            channel,
                            `Димил пропустил ${counter[i].value} ${declOfNum(
                                counter[i].value,
                                ['телегу', 'телеги', 'телег']
                            )}. Список телег пополнился еще одной.`
                        );
                        break;
                    case 'сейчасприду':
                        client.say(
                            channel,
                            `Димил оставил чат в одиночестве: ${
                                counter[i].value
                            } ${declOfNum(counter[i].value, [
                                'раз',
                                'раза',
                                'раз',
                            ])}. sadCat `
                        );
                        break;
                    case 'банан':
                        client.say(
                            channel,
                            `Димил сьел на стриме ${
                                counter[i].value
                            } ${declOfNum(counter[i].value, [
                                'банан',
                                'банана',
                                'бананов',
                            ])} :banana: `
                        );
                        break;
                    default:
                        break;
                }
            }
        }
    }
    cooldown = true;
    setTimeout(() => {
        cooldown = false;
    }, 20 * 1000);
});

//____________________________________________

//? parsing
let selectorRang =
    '#mainContent > div.row > div.medium-13.small-24.columns > div.box.box-padding-10.summoner-rankings > div.best-league > div > div.row > div > div > div.txt.mainRankingDescriptionText > div.leagueTier';
let selectorLp =
    '#mainContent > div.row > div.medium-13.small-24.columns > div.box.box-padding-10.summoner-rankings > div.best-league > div > div.row > div > div > div.txt.mainRankingDescriptionText > div.league-points > span';
let selectorWin = '.winsNumber';
let selectorLose = '.lossesNumber';

let url1 = 'https://www.leagueofgraphs.com/ru/summoner/euw/Dimil%20Q';
let url2 = 'https://www.leagueofgraphs.com/ru/summoner/euw/RESET%20MMR%20DIMIL';

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message === '!ранг' || message === '!лп' || message === '!lp') {
        axios.get(url1).then((data) => {
            const $ = cheerio.load(data.data);
            let elo1 = $(selectorRang).text().replace(/\s+/g, ' ').trim();
            let win = $(selectorWin).text().replace(/\s+/g, ' ').trim();
            let lose = $(selectorLose).text().replace(/\s+/g, ' ').trim();
            let eloDimil = '';
            if (
                elo1.startsWith('Мастер') ||
                elo1.startsWith('Претендент') ||
                elo1.startsWith('Грандмастер')
            ) {
                eloDimil = `Ранг: ${elo1} ${win}W/${lose}L`;
            } else {
                axios.get(url1).then((data) => {
                    let lp = $(selectorLp).text().replace(/\s+/g, ' ').trim();
                    if (lp == '100') {
                        axios.get(url2).then((data) => {
                            let promo = $('.miniserie')
                                .text()
                                .replace(/\s+/g, ' ')
                                .trim();
                            eloDimil = `Ранг: ${elo1} ${lp} LP ${win}W/${lose}L Промо: ${promo}`;
                        });
                    } else {
                        eloDimil = `Ранг: ${elo1} ${lp} LP ${win}W/${lose}L`;
                    }
                });
            }
            axios.get(url2).then((data) => {
                const $ = cheerio.load(data.data);
                let elo2 = $(selectorRang).text().replace(/\s+/g, ' ').trim();
                let win = $(selectorWin).text().replace(/\s+/g, ' ').trim();
                let lose = $(selectorLose).text().replace(/\s+/g, ' ').trim();
                let eloRes = '';
                if (
                    elo2.startsWith('Мастер') ||
                    elo2.startsWith('Претендент') ||
                    elo2.startsWith('Грандмастер')
                ) {
                    eloRes = `Ранг: ${elo2} ${win}W/${lose}L`;
                    client.say(
                        channel,
                        `—————————————————————— Dimil Q -> ${eloDimil} —————————————————————— RESET MMR DIMIL-> ${eloRes} ——————————————————————`
                    );
                } else {
                    axios.get(url2).then((data) => {
                        let lp = $(selectorLp)
                            .text()
                            .replace(/\s+/g, ' ')
                            .trim();
                        if (lp == '100') {
                            axios.get(url2).then((data) => {
                                let promo = $('.miniserie')
                                    .text()
                                    .replace(/\s+/g, ' ')
                                    .trim();
                                eloRes = `Ранг: ${elo2} ${lp} LP ${win}W/${lose}L Промо: ${promo}`;
                            });
                        } else {
                            eloRes = `Ранг: ${elo2} ${lp} LP ${win}W/${lose}L`;
                            client.say(
                                channel,
                                `—————————————————————— Dimil Q -> ${eloDimil} —————————————————————— RESET MMR DIMIL-> ${eloRes} ——————————————————————`
                            );
                        }
                    });
                }
            });
        });
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith('!ранг ')) {
        let arr = message.split(' ');
        let url = `https://www.leagueofgraphs.com/ru/summoner/${
            arr[1]
        }/${encodeURIComponent(arr.slice(2).join(' '))}`;
        axios
            .get(url)
            .then((data) => {
                const $ = cheerio.load(data.data);
                let elo = $(selectorRang).text().replace(/\s+/g, ' ').trim();
                let win = $(selectorWin).text().replace(/\s+/g, ' ').trim();
                let lose = $(selectorLose).text().replace(/\s+/g, ' ').trim();
                let fullElo = '';
                if (
                    elo.startsWith('Мастер') ||
                    elo.startsWith('Претендент') ||
                    elo.startsWith('Грандмастер')
                ) {
                    fullElo = `Ранг ${arr[2]}: ${elo} ${win}W/${lose}L`;
                } else {
                    axios
                        .get(url)
                        .then((data) => {
                            let lp = $(selectorLp)
                                .text()
                                .replace(/\s+/g, ' ')
                                .trim();
                            if (lp == '100') {
                                axios.get(url).then((data) => {
                                    let promo = $('.miniserie')
                                        .text()
                                        .replace(/\s+/g, ' ')
                                        .trim();
                                    fullElo = `Ранг ${arr[2]}: ${elo} ${lp} LP ${win}W/${lose}L Промо: ${promo}`;
                                });
                            } else {
                                fullElo = `Ранг ${arr[2]}: ${elo} ${lp} LP ${win}W/${lose}L`;
                                client.say(channel, `${fullElo}`);
                                console.log(`${fullElo}`);
                            }
                        })
                        .catch(function (error) {
                            //client.say(channel, `Пользователь с ником ${arr[2]} не найден`)
                        });
                }
            })
            .catch(function (error) {
                //client.say(channel, `Пользователь с ником ${arr[2]} не найден`)
            });
    }
});

let selectorTftRang =
    '#profile > div > div:nth-child(2) > div.row.row-normal.mt-3 > div.col-lg-4 > div.profile__tier > div.profile__tier__info > div.profile__tier__summary > span.profile__tier__summary__tier.text-gold';
let selectorTftLp =
    '#profile > div > div:nth-child(2) > div.row.row-normal.mt-3 > div.col-lg-4 > div.profile__tier > div.profile__tier__info > div.profile__tier__summary > span.profile__tier__summary__lp';
let urlTft = 'https://lolchess.gg/profile/ru/dimill';

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message === '!рангтфт') {
        axios.get(urlTft).then((data) => {
            const $ = cheerio.load(data.data);
            let chall = $(selectorTftRang).text().replace(/\s+/g, ' ').trim();
            let gm = $(selectorTftLp).text().replace(/\s+/g, ' ').trim();
            client.say(channel, `Ранг тфт: ${chall} ${gm}`);
        });
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith('!сетка')) {
        axios
            .get('https://escorenews.com/ru/lol/lcl-2022-spring/group-stage')
            .then((data) => {
                const $ = cheerio.load(data.data);

                let com = [];
                $('sup').each((i, elem) => {
                    com.push(`${i + 1}.${$(elem).text().replace(/\s+/g, '')}`);
                });

                let wins = [];
                $('td:nth-child(4)').each((i, elem) => {
                    wins.push(`[${$(elem).text()}-`);
                });

                let loses = [];
                $('td:nth-child(6)').each((i, elem) => {
                    loses.push(`${$(elem).text()}]`);
                });

                const w = (a = [], ...b) =>
                    b.length
                        ? a.length
                            ? [a[0], ...w(...b, a.slice(1))]
                            : w(...b)
                        : a;
                var arr = [];

                for (let i = 0; i < 24; i += 3) {
                    var text = w(com, wins, loses)
                        .slice(0 + i, 3 + i)
                        .join('');
                    arr.push(text);
                }

                client.say(channel, arr.join(' '));
            });
    }
});

//____________________________________________

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    if (message.startsWith('!test')) {
    }
});
