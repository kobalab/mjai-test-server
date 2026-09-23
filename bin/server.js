#!/usr/bin/env node

"use strict";

const Majiang = require('@kobalab/majiang-core');

const fs   = require('fs');
const net  = require('net');
const zlib = require('zlib');
const { execFile } = require('child_process');

const Game   = require('../lib/game');
const Player = require('../lib/player');

function get_shan(filename) {
    if (! filename) return;
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString());
}

function get_rule(filename = '{}') {
    if (filename.match(/\{.*\}/)) {
        return Majiang.rule(JSON.parse(filename));
    }
    return Majiang.rule(JSON.parse(fs.readFileSync(filename)));
}

function make_player(bot, callback, noexec) {
    const server = net.createServer((sock)=>{
        server.close();
        callback(sock);
    }).listen(()=>{
        const port = server.address().port;
        if (noexec) {
            console.error(bot,`mjsonp://127.0.0.1:${port}/default`);
            return;
        }
        execFile(bot, [`mjsonp://127.0.0.1:${port}/default`])
            .on('error', (err)=>{ throw err });
    });
}

function player_name(base, name) {
    for (let id = 0; id < 4; id++) {
        if (base[id]) base[id] += ` [${name[id]}]`;
        else          base[id] = name[id];
        base[id] = base[id].replace(/mjai\-/,'');
    }
    return base;
}

const argv = require('yargs')
    .usage('Usage: $0 mjai-bot mjai-bot')
    .option('times',    { alias: 't', description: '試行回数' } )
    .option('input',    { alias: 'i', description: '入力ファイル(牌山)' } )
    .option('output',   { alias: 'o', description: '出力ファイル(牌譜)' } )
    .option('skip',     { alias: 's', description: '指定した数の牌山をスキップ' } )
    .option('rule',     { alias: 'r', description: 'ルール' })
    .option('verbose',  { alias: 'v', boolean: true })
    .option('noexec',   { alias: 'X', boolean: true })
    .demandCommand(2)
    .argv;

const script = get_shan(argv.input) || [];
for (let i = 0; i < (argv.skip || 0); i++) script.shift()

const rule = get_rule(argv.rule);

let times = argv.times || script && script.length || 1;

const bots = [ argv._[1], argv._[0], argv._[0], argv._[0] ];
let players = [];

const logs = [];

console.log(`[${times}]`, new Date().toLocaleTimeString());

function start_game() {
    players = [];
    let s = script.shift();
    for (let id = 0; id < 4; id++) {
        make_player(bots[id], (sock)=>{
            players[id] = new Player(sock);
            if (players.filter(s => s).length == 4) {
                players[0].debug = argv.verbose;
                const game = s ? new Game(players, end_game, rule).script(s)
                               : new Majiang.Game(players, end_game, rule);
                game.model.player = player_name(game.model.player, bots);
                game.model.title += ` #${logs.length + (argv.skip || 0)}`;
                game.speed = 0;
                game.kaiju();
            }
        }, argv.noexec && id == 0);
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
