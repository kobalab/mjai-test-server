/*
 *  game
 */
"use strict";

const Majiang = require('@kobalab/majiang-core');

const { convmsg, convrep } = require('@kobalab/mjai-bot/convert');

const readline = require('readline');
const util     = require('util');

module.exports = class Player {

    constructor(sock) {
        this._sock = sock;
        this._line = readline.createInterface(sock);
        this._queue = Promise.resolve();
        this.convrep = convrep();
    };

    send(req) {
        if (this.debug) console.log('<-', util.inspect(req,
                                        { depth: null,
                                          colors: process.stdout.isTTY }));
        this._sock.write(JSON.stringify(req) + '\n');
    }

    recv() {
        return new Promise(resolve =>{
            this._line.once('line', (data)=>{
                let res = JSON.parse(data);
                if (this.debug) console.log('->', util.inspect(res,
                                            { depth: null,
                                              colors: process.stdout.isTTY }));
                resolve(res);
            });
        });
    }

    action(msg, callback) {
        this._queue = this._queue
                        .then(()=> this.convert(msg, callback));
    }

    async convert(msg, callback) {

        if (msg.kaiju) {
            this.convmsg = convmsg();
            this.send({ type:'hello', protocol:'mjsonp', protocol_version: 3 });
            await this.recv();
        }
        if (msg.qipai) {
            this.convrep = convrep();
            this._lizhi = null;
        }

        let req = this.convmsg(msg);

        if (msg.dapai && msg.dapai.p.slice(-1) == '*' && this._lizhi == null) {
            this._lizhi = req.actor;
            this.send({ type: 'reach', actor: req.actor });
            await this.recv();
        }
        else if (this._lizhi != null && (msg.zimo || msg.fulou)) {
            let deltas = [], scores = [];
            for (let id = 0; id < 4; id++) {
                deltas[id] = id == this._lizhi ? -1000 : 0;
                scores[id] = this.convmsg().defen[id];
            }
            this.send({ type: 'reach_accepted', actor: this._lizhi,
                        deltas: deltas, scores: scores });
            await this.recv();
            this._lizhi = null;
        }

        this.send(req);

        if (msg.jieju) {
            if (callback) callback({});
            return;
        }

        let rep = this.convrep(await this.recv());

        if (rep.mjai && rep.mjai.type == 'reach') {
            this._lizhi = rep.mjai.actor;
            this.send(rep.mjai);
            rep = this.convrep(await this.recv());
        }

        if (callback) callback(rep);

        if (msg.hule || msg.pingju) {
            this.send({ type: 'end_kyoku' });
            await this.recv();
        }
    };
}
