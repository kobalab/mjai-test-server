#!/usr/bin/env node

"use strict";

const fs  = require('fs');
const net = require('net');
const { execFile } = require('child_process');

const Game   = require('../lib/game');
const Player = require('../lib/player');

function make_player(bot, callback) {
    const server = net.createServer((sock)=>{
        server.close();
        callback(sock);
    }).listen(()=>{
        const port = server.address().port;
        execFile(bot, [`mjsonp://127.0.0.1:${port}/default`])
            .on('error', (err)=>{ throw err });
    });
}

const argv = require('yargs')
    .usage('Usage: $0 mjai-bot mjai-bot')
    .option('times',    { alias: 't', description: '試行回数' } )
    .option('input',    { alias: 'i', description: '入力ファイル(牌山)' } )
    .option('output',   { alias: 'o', description: '出力ファイル(牌譜)' } )
    .option('skip',     { alias: 's', description: '指定した数の牌山をスキップ' } )
    .option('rule',     { alias: 'r', description: 'ルール' })
    .demandCommand(2)
    .argv;

let times = argv.times || 1;

const bots = [ argv._[1], argv._[0], argv._[0], argv._[0] ];
let players = [];

const logs = [];

console.log(`[${times}]`, new Date().toLocaleTimeString());

function start_game() {
    players = [];
    for (let id = 0; id < 4; id++) {
        make_player(bots[id], (sock)=>{
            players[id] = new Player(sock);
            if (players.filter(s => s).length == 4) {
                const game = new Game(players, end_game);
                game.model.player = bots.concat();
                game.speed = 0;
                game.kaiju();
            }
        });
    }
}

function end_game(paipu) {
    for (let player of players) {
        player._sock.destroy();
    }
    console.log(`[${--times}]`, new Date().toLocaleTimeString(),
                paipu.rank[0], paipu.point[0]);
    if (argv.output) {
        logs.push(paipu);
        fs.writeFileSync(argv.output, JSON.stringify(logs), 'utf-8');
    }
    if (times > 0) start_game();
}

start_game();
