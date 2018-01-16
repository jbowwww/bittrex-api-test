
const inspect = require('util').inspect;
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const bittrex = require('node-bittrex-api');
const bittrexOptions = require('./bittrex-options.js');
console.log(`bittrex options: ${inspect(bittrexOptions)}`);
bittrex.options(bittrexOptions);

var targets = [];
var stops = [];

// rl.write(`bittrex = ${inspect(bittrex)}\nsellmarket = ${bittrex.sellmarket}\nbuymarket=${bittrex.buymarket}`);

function ask(prompt, balance, results, cb) {
    rl.question(`${prompt} ${results.length+1}: `, answer => {
        if (answer === '') {
            process.nextTick(() => cb(null, balance, results));
        } else if (answer === NaN) {
            process.nextTick(() => cb(new Error(`${prompt} is NaN`), balance, results));
        } else {
            rl.question(`${prompt} ${results.length+1} amount [${balance}]: `, amount => {
                if (amount === NaN) {
                    process.nextTick(() => cb(new Error('${prompt} amount is NaN'), balance, results));
                } else {
                    if (amount === '') {
                        amount = balance;
                    }
                    balance -= amount;
                    results.push([answer, amount]);
                    process.nextTick(() => balance > 0 ? ask(prompt, balance, results, cb) : cb(null, balance, results));
                }
            });
        }
    });
}

rl.write('Node babysitter script\n\n')
rl.question('Coin? ', (coin) => {
    coin = coin.toUpperCase();
    var pair = 'BTC-' + coin;
    bittrex.getticker({market: pair }, function (err, ticker) {
        if (err) {
            return console.error(err);
        }
        bittrex.getbalance({ currency: coin }, function(err, balance) {
            if (err) {
                return console.error(err);
            }
            rl.write(`Coin: ${coin}: Balance: ${balance.result.Balance} Available: ${balance.result.Available} Last Price: ${ticker.result.Last}\n`);
            var balance = balance.result.Available;
            ask('Target', balance, targets, () => {
                ask('Stop Loss', balance, stops, () => {
                    rl.write(`\nTargets = ${inspect(targets)}\nStops = ${inspect(stops)}\n\n`);
                    (function check() {
                        bittrex.getticker({market: pair}, function (err, ticker) {
                            if (err) {
                                console.error(err);
                                process.nextTick(check);
                            } else if (ticker.success) {
                                var last = ticker.result.Last;
                                readline.clearLine(process.stdout, 0);
                                readline.cursorTo(process.stdout, 0);
                                rl.write(`${pair} last: ${last}`);
                                for (var i = 0; i < stops.length; i++) {
                                    var stop = stops[i];
                                    if (last <= stop[0]) {
                                        stops.splice(i, 1);
                                        bittrex.sellmarket({ market: pair, quantity: stop[1] }, function (err, result) {
                                            if (err) {
                                                console.error(err);
                                            }
                                            rl.write(`\nSTOPLOSS SELL: stop=${inspect(stop)} result=${inspect(result)} (stops = ${inspect(stops)})\n`)
                                        });

                                    }
                                }
                                for (var i = 0; i < targets.length; i++) {
                                    var target = targets[i];
                                    if (last >= target[0]) {
                                        targets.splice(i, 1);
                                        bittrex.selllimit({ market: pair, rate: target[0], quantity: target[1] }, function (err, result) {
                                            if (err) {
                                                console.error(err);
                                            }
                                            rl.write(`\nTARGET SELL: target=${inspect(target)} result=${inspect(result)} (targets = ${inspect(targets)})\n`)
                                        });
                                    }
                                }
                                setTimeout(check, 2000);
                            } else {
                                process.nextTick(check);
                            }
                        });
                    })();
                })
            });
        });
    });

});
//
//
// bittrex.getmarketsummaries( function( err, data ) {
//   if (err) {
//     return console.error(err);
//   }
//   for( var i in data.result ) {
//     bittrex.getticker( { market : data.result[i].MarketName }, function( ticker ) {
//       console.log( ticker );
//     });
//   }
// });
