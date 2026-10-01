# mjai-test-server

Mjaiボット対戦サーバー

評価のために [Mjai](https://gimite.net/pukiwiki/index.php?Mjai%20麻雀AI対戦サーバ) ボットを対戦させるサーバー。
対戦方法には [デュプリケート対局](https://blog.kobalab.net/entry/2020/12/19/075529) を選択できる。
対戦結果は [牌譜](https://github.com/kobalab/majiang-core/wiki/牌譜) に保存される。

## インストール
```bash
$ npm i -g @kobalab/mjai-test-server
```

## 使用方法

### mjai-test-server [ *options...* ] *mjai-bot1* *mjai-bot2*

**bjai-bot1** で指定した3体のボットと **mjai-bot2** で指定したボットと対戦させます。

#### --input, -i
[デュプリケート対局用の牌山](https://github.com/kobalab/majiang-ai/tree/master/dev#デュプリケート対局用牌山生成) を指定します。省略した場合はランダムな牌山で自動対局します。

#### --output, -o
指定されたファイルに牌譜を出力します。

#### --times, -t
対局数を指定します。省略時は指定された牌山内の対局数にしたがいます。牌山も指定がない場合は1戦だけ対局します。

#### --skip, -s
指定された数分牌山をスキップします。特定の牌山でだけ対局させたいときに便利です。

#### --rule, -r
JSONファイルもしくはJSON形式の文字列で [ルール](https://github.com/kobalab/majiang-core/wiki/ルール) を変更します。
**--input** で牌山を指定した場合、赤牌の枚数は牌山にしたがいます。

#### --verbose, -v
Mjaiプロトコルの通信を表示します。

### mjai-server [ *options...* ] [ *mjai-bots....* ]

**mjai-bots** で指定したMjai同士で対戦します。
**mjai-bots** が4体を超える場合はランダムに4体を選択し、4体に満たない場合は他の対局者の接続を待ちます。

#### --server, -s
対局者を待つサーバーアドレスを指定します。
省略した場合は `127.0.0.1` を使用します。

#### --port, -p
対局者を待つポート番号を指定します。
省略した場合は `11600` を使用します。

#### --output, -o
指定されたファイルに牌譜を出力します。

#### --times, -t
対局数を指定します。
省略した場合 **mjai-bots** が4体に満たないときは永遠に対局を繰り返し、そうでない場合は1回だけ対局します。

#### --rule, -r
JSONファイルもしくはJSON形式の文字列で [ルール](https://github.com/kobalab/majiang-core/wiki/ルール) を変更します。
**--input** で牌山を指定した場合、赤牌の枚数は牌山にしたがいます。

## ライセンス
[MIT](https://github.com/kobalab/mjai-test-server/blob/master/LICENSE)

## 作者
[Satoshi Kobayashi](https://github.com/kobalab)
