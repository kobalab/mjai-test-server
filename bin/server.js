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

const bots = [ argv._[1], argv._[0], argv._[0], argv._[0] ];
const players = [];

function end_game(paipu) {
    if (argv.output) fs.writeFileSync(argv.output, JSON.stringify(paipu),
                                            'utf-8');
}

for (let id = 0; id < 4; id++) {
    make_player(bots[id], (sock)=>{
        players[id] = new Player(sock);
        if (players.filter(s => s).length == 4) {
            const game = new Game(players, (paipu)=>{
                end_game(paipu);
                process.exit();
            });
            game.model.player = bots.concat();
            game.speed = 0;
            game.kaiju();
        }
    });
}
