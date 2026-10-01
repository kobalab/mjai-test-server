#!/usr/bin/env node

"use strict";

const Majiang = require('@kobalab/majiang-core');

const fs   = require('fs');
const net  = require('net');
const zlib = require('zlib');
const { execFile } = require('child_process');

const Game   = require('@kobalab/majiang-ai/preset-game');
const Player = require('../lib/player');

function get_rule(filename = '{}') {
    if (filename.match(/\{.*\}/)) {
        return Majiang.rule(JSON.parse(filename));
    }
    return Majiang.rule(JSON.parse(fs.readFileSync(filename)));
}

function select_bots(bots) {
    let rv = [],
        all_bots = bots.concat();
    while (all_bots.length) {
        rv.push(all_bots.splice(Math.random()*all_bots.length, 1)[0]);
        if (rv.length == 4) break;
    }
    return rv;
}

const argv = require('yargs')
    .usage('Usage: $0 mjai-bot mjai-bot')
    .option('server', { alias: 's', default: '127.0.0.1' } )
    .option('port',   { alias: 'p', default: 11600       } )
    .option('times',  { alias: 't'                       } )
    .option('output', { alias: 'o'                       } )
    .option('rule',   { alias: 'r'                       } )
    .argv;

const rule = get_rule(argv.rule);

let times = argv._.length < 4 ? argv.times : (argv.times || 1);

const logs = [];

function listen() {

    const players = [];

    const server = net.createServer((sock)=>{
        players.push(new Player(sock));
        if (players.length == 4) {
            server.close();
            if (argv._.length < 4) console.log('Start game...');
            start_game(players);
            return;
        }
        if (argv._.length < 4)
            console.log(`Waiting for ${4 - players.length} more players...`);
    }).listen(argv.port, argv.server, ()=>{
        if (argv._.length < 4)
            console.log(`Waiting for ${4 - players.length} more players...`);
        for (let bot of select_bots(argv._)) {
            execFile(bot, [`mjsonp://${argv.server}:${argv.port}/default`])
                .on('error', (e)=>{ console.error(e.toString()) });
        }
    }).on('error', (e)=>{
        console.error(e.toString());
        process.exit(-1);
    });
}

function start_game(players) {
    if (times != null) process.stdout.write(`[${--times}] `);
    const game = new Game(players, paipu=> end_game(players, paipu), rule);
    game.model.title += ` #${logs.length}`;
    game.speed = 0;
    game.kaiju();
}

function end_game(players, paipu) {
    paipu.player = players.map(p => p.name || '(NOP)');
    let result = [];
    for (let id = 0; id < 4; id++) {
        result[paipu.rank[id]- 1]
            = paipu.player[id]
            + (paipu.point[id] > 0 ? ` (+${paipu.point[id]})`
                                   : ` (${paipu.point[id]})`);
    }
    process.stdout.write(result.join(' / ') + '\n');
    if (argv.output) {
        logs.push(paipu);
        fs.writeFileSync(argv.output, JSON.stringify(logs), 'utf-8');
    }
    if (times == null || times > 0) listen();
}

listen();
