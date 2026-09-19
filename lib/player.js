/*
 *  game
 */
"use strict";

const Majiang = require('@kobalab/majiang-core');

const readline = require('readline');

const debug = 1;

function hai(s, n) {
    return s == 'z'? ['','E','S','W','N','P','F','C'][+n]
                   : (+n||5) + s + (+n ? '' : 'r');
}

function tehai(paistr) {
    paistr = paistr.replace(/,.*$/,'');
    let bingpai = [];
    for (let suitstr of paistr.match(/[mpsz]\d+/g)) {
        let s = suitstr[0];
        for (let n of suitstr.match(/\d/g)) {
            bingpai.push(hai(s, n));
        }
    }
    return bingpai;
}

function pai(p) {
    if (p == '?') return '';
    if (p.length == 1) return 'z' + { E:1, S:2, W:3, N:4, P:5, F:6, C:7 }[p];
    let n = + p[0], s = p[1];
    return s + (p[2] == 'r' ? 0 : n);
}

function mianzi(l, t, ...p) {
    let d = ['','+','=','-'][(4 + t - l) % 4];
    return Majiang.Shoupai.valid_mianzi(
                p.map(p => pai(p)).join('').replace(/(?<=\d)[mpsz]/g,'') + d);
}


module.exports = class Player {

    constructor(sock) {
        this._sock = sock;
        this._line = readline.createInterface(sock);
        this._board = new Majiang.Board();
    };

    send(req) {
        if (debug && this._id == 0) console.log('<-', req);
        this._sock.write(JSON.stringify(req) + '\n');
    }

    recv() {
        return new Promise(resolve =>{
            this._line.once('line', (data)=>{
                let res = JSON.parse(data);
                if (debug && this._id == 0) console.log('->', res);
                resolve(res);
            });
        });
    }

    async action(msg, callback) {

        const board = this._board;

        if (msg.kaiju) {
            this._id = msg.kaiju.id;
        }
        if (debug && this._id == 0) console.log('**', msg);

        if (msg.dapai && msg.dapai.p.slice(-1) == '*' && this._lizhi == null) {
            this._lizhi = board.player_id[msg.dapai.l];
            this.send({ type: 'reach', actor: this._lizhi });
            await this.recv();
        }
        else if (this._lizhi != null && (msg.zimo || msg.fulou)) {
            let deltas = [], scores = [];
            for (let id = 0; id < 4; id++) {
                deltas[id] = id == this._lizhi ? -1000 : 0;
                scores[id] = board.defen[id];
            }
            this.send({ type: 'reach_accepted', actor: this._lizhi,
                        deltas: deltas, scores: scores });
            await this.recv();
            this._lizhi = null;
        }

        let req;
        if (msg.kaiju) {
            board.kaiju(msg.kaiju);
            req = { type:'hello', protocol:'mjsonp', protocol_version: 3 };
            this.send(req);
            await this.recv();
            req = {
                type:  'start_game',
                id:    msg.kaiju.id,
                names: msg.kaiju.player
            };
        }
        else if (msg.qipai) {
            board.qipai(msg.qipai);
            let { zhuangfeng, jushu, changbang, lizhibang,
                                            baopai, shoupai } = msg.qipai;
            req = {
                type:        'start_kyoku',
                bakaze:      ['E','S','W','N'][zhuangfeng],
                kyoku:       jushu + 1,
                honba:       changbang,
                kyotaku:     lizhibang,
                oya:         (board.qijia + jushu) % 4,
                dora_marker: hai(...baopai),
                tehais:      []
            };
            for (let l = 0; l < 4; l++) {
                let id = board.player_id[l];
                req.tehais[id] = shoupai[l] ? tehai(shoupai[l])
                                            : Array(13).fill('?')
            }
            this._lizhi = null;
            this._peng  = [];
        }
        else if (msg.zimo) {
            board.zimo(msg.zimo);
            let { l, p } = msg.zimo;
            req = {
                type:  'tsumo',
                actor: board.player_id[l],
                pai:   p ? hai(...p) : '?'
            };
        }
        else if (msg.dapai) {
            board.dapai(msg.dapai);
            let { l, p } = msg.dapai;
            req = {
                type:      'dahai',
                actor:     board.player_id[l],
                pai:       p ? hai(...p) : '?',
                tsumogiri: p[2] == '_'
            };
        }
        else if (msg.fulou) {
            board.fulou(msg.fulou);
            let { l, m } = msg.fulou;
            let s = m[0];
            let d = { '+': 1, '=': 2, '-': 3 }[m.match(/[\+\=\-]/)];
            req = {
                type:     (  m.match(/\d{4}/)                   ? 'daiminkan'
                           : m.replace(/0/,'5').match(/(\d)\1/) ? 'pon'
                           :                                      'chi' ),
                actor:    board.player_id[l],
                target:   board.player_id[(l + d) % 4],
                pai:      hai(s, m.match(/\d(?=[\+\=\-])/)),
                consumed: m.match(/\d(?![\+\=\-])/g).map(n => hai(s, n))
            };
        }
        else if (msg.gang) {
            board.gang(msg.gang);
            let { l, m } = msg.gang;
            let s = m[0];
            if (m.match(/\d{4}/)) {
                req = {
                    type:   'ankan',
                    actor:  board.player_id[l],
                    consumed: m.match(/\d(?![\+\=\-])/g).map(n => hai(s, n))
                };
            }
            else {
                let d = { '+': 1, '=': 2, '-': 3 }[m.match(/[\+\=\-]/)];
                req = {
                    type:   'kakan',
                    actor:  board.player_id[l],
                    pai:      hai(s, m.match(/(?<=[\+\=\-])\d/)),
                    consumed: m.match(/(?<![\+\=\-])\d/g).map(n => hai(s, n))
                };
            }
        }
        else if (msg.gangzimo) {
            board.zimo(msg.gangzimo);
            let { l, p } = msg.gangzimo;
            req = {
                type:  'tsumo',
                actor: board.player_id[l],
                pai:   p ? hai(...p) : '?'
            };
        }
        else if (msg.kaigang) {
            board.kaigang(msg.kaigang);
            let { baopai } = msg.kaigang;
            req = {
                type:  'dora',
                dora_marker: hai(...baopai)
            };
        }
        else if (msg.hule) {
            board.hule(msg.hule);
            let { l, shoupai, baojia, fubaopai, fu, fanshu,
                    damanguan, defen, hupai, fenpei } = msg.hule;
            let hora_tehais = tehai(shoupai);
            let hulepai = hora_tehais.pop();
            if (baojia == null) hora_tehais.push(hulepai);
            req = {
                type:   'hora',
                actor:  board.player_id[l],
                target: board.player_id[baojia == null ? l : baojia],
                pai:    hulepai,
                uradora_markers: (fubaopai || []).map(p => hai(...p)),
                hora_tehais: hora_tehais,
                yakus:  hupai.map(h => [ h.name,
                                         `${h.fanshu}`[0] == '*'
                                            ? 13 : h.fanshu ]),
                fu:     damanguan ? 20 : fu,
                fan:    damanguan ? 13 : fanshu,
                hora_points: defen,
                deltas: [],
                scores: []
            };
            for (let l = 0; l < 4; l++) {
                let id = board.player_id[l];
                req.deltas[id] = fenpei[l];
                req.scores[id] = board.defen[id] + fenpei[l];
            }
        }
        else if (msg.pingju) {
            board.pingju(msg.pingju);
            let { name, shoupai, fenpei } = msg.pingju;
            req = {
                type:   'ryukyoku',
                reason: name,
                tehais: [],
                tenpais: [],
                deltas: [],
                scores: []
            };
            for (let l = 0; l < 4; l++) {
                let id = board.player_id[l];
                let n_fulou = board.shoupai[l]._fulou.length;
                req.tehais[id] = shoupai[l] ? tehai(shoupai[l])
                                            : Array(13 - n_fulou * 3).fill('?');
                req.tenpais[id] = name == '荒牌平局' && shoupai[l] != '';
                req.deltas[id] = fenpei[l];
                req.scores[id] = board.defen[id] + fenpei[l];
            }
        }
        else if (msg.jieju) {
            let { defen } = msg.jieju;
            req = {
                type:   'end_game',
                scores: defen
            };
            this.send(req);
            if (callback) callback({});
            return;
        }

        this.send(req);

        let res = await this.recv();

        let reply;
        if (res.type == 'reach') {
            this._lizhi = this._id;
            this.send(res);
            res = await this.recv();
        }
        if (res.type == 'dahai') {
            reply = { dapai: pai(res.pai) + (res.tsumogiri       ? '_' : '')
                                          + (this._lizhi != null ? '*' : '')};
        }
        else if (res.type == 'chi' || res.type == 'pon' ||
                 res.type ==  'daiminkan')
        {
            let m = mianzi(res.actor, res.target, ...res.consumed, res.pai);
            if (res.type == 'pon') this._peng.push(m);
            reply = { fulou: m };
        }
        else if (res.type == 'ankan') {
            reply = { gang: mianzi(res.actor, res.actor, ...res.consumed) }
        }
        else if (res.type == 'kakan') {
            let i = this._peng.map(m => m.slice(0,2).replace(/0/,'5'))
                                    .indexOf(pai(res.pai).replace(/0/,'5'));
            reply = { gang: this._peng[i] + pai(res.pai)[1] };
        }
        else if (res.type == 'hora') {
            reply = { hule: '-' };
        }
        else if (res.type == 'ryukyoku') {
            reply = { daopai: '-' };
        }
        else if (res.type == 'none') {
            reply = {};
        }
        if (debug && this._id == 0 && callback) console.log('**', reply);

        if (callback) callback(reply);
    };
}
