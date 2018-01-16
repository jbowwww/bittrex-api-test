const inspect = require('util').inspect;
const bittrex = require('node-bittrex-api');
bittrex.options({
  'apikey' : '2bc66c9699a54560b7bd8764aef797b6',
  'apisecret' : 'a72c759b2a9e4bbf8d4ea01e203b028f',
  'inverse_callback_arguments' : true,
});

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const fs = require('fs');

var parse = require('csv-parse');
var async = require('async');

var inputFile='myfile.csv';
const express = require('express');
const app = express();

// const OrderHistory = require('./components/orderHistory.js');

rl.write('Node P/L script\n\n');

function orderIs(orderType, isType) {
    return (orderType.toLowerCase().indexOf(isType.toLowerCase()) >= 0);
}

function makeOrderPlInspect(currency) {
    return function orderPlInspect() {
        var proceeds = (orderIs(this.ordertype, 'BUY') ? '-' : '+') + (this.price * this.quantity).toFixed(8);
        return `${this.timestamp}: ${this.ordertype} ${currency}: ${this.quantity} @ ${this.price} = ${proceeds} BTC ${this.profit||'buyin='+this.buyin.toFixed(8)}`;
    };
}

// console.log(`Math = ${inspect(Math.abs)}`);
app.get('/:currency', function (req, res) {
    // bittrex.getbalances(function (err, data) {
    //     if (err) { return console.error(err); }
    //     var balances = data.result.filter(balance => balance.Balance > 0 && balance.Currency !== 'BTC').sort((balance1, balance2) => balance1.Balance < balance2.Balance);
    //     console.log(balances);
        var result = {};
    //     for (var balance of balances) {
    var prevOrder;
    var balance= { Currency: req.params['currency'] };
        console.log(`market: ${'BTC-' + balance.Currency} req.params=${inspect(req.params)}`);
        fs.createReadStream('/mnt/wheel/Trapdoor/mystuff/incoming/biz/crypto/bittrex/history/fullMarketOrders-xlm-formst.csv')
        .pipe(parse({delimiter: ','}, function (err, data) {
            console.log(`data=${(data)}`);
            if (err) {
                console.warn(err);
                return;
            }
            async.eachSeries(data, function (order, callback) {
            // do something with the line
            // for (var i = 0; i < history.length; i++) {
            //     var order = history[history.length - 1 - i];
            if (!order) {
                console.warn(`!order`);
                return callback();
            }
                if (!prevOrder) {   //i === 0) {
                    if (orderIs(order.Type, 'SELL')) {
                        console.error(`Error: First order in history is a sell: ${inspect(order)}`)
                    } else if (!orderIs(order.Type, 'BUY')) {
                        console.error(`Error: Order ${i} unknown type: ${inspect(order)}`)
                    } else {
                        order.PL = {
                            //currency: order.Exchange,
                            timestamp: new Date(order.Closed),
                            ordertype: order.Order,
                            price: order.PricePerUnit,
                            quantity: order.Quantity,
                            buyin: order.PricePerUnit,
                            amount: order.Quantity,
                            inspect: makeOrderPlInspect(order.Exchange)
                        };
                    }
                } else {
                    if (orderIs(order.Order, 'BUY')) {
                        order.PL = {
                            //currency: order.Exchange,
                            timestamp: new Date(order.Closed),
                            ordertype: order.Order,
                            price: order.PricePerUnit,
                            quantity: order.Quantity,
                            buyin: ((prevOrder.buyin * prevOrder.amount) - 0 + (order.PricePerUnit * order.Quantity)) / (prevOrder.amount - 0 + order.Quantity),
                            amount: (prevOrder.amount - 0 + order.Quantity),
                            inspect: makeOrderPlInspect(order.Exchange)
                        };
                    } else if (!orderIs(order.Order, 'SELL')) {
                        console.error(`Error: Order ${i} unknown type: ${inspect(order)}`)
                    } else {
                        if (!prevOrder) {
                            console.error(`Error: Sell order ${i} while prevOrder === null`);
                        } else {
                            order.PL = {
                                //currency: order.Exchange,
                                timestamp: new Date(order.Closed),
                                ordertype: order.Order,
                                price: order.PricePerUnit,
                                quantity: order.Quantity,
                                buyin: prevOrder.buyin,
                                profit: (order.PricePerUnit >= prevOrder.buyin ? '+' : '-') + Math.abs((order.PricePerUnit/prevOrder.buyin - 1) * 100).toFixed(3) + '%',
                                amount: (prevOrder.amount - 0 - order.Quantity),
                                inspect: makeOrderPlInspect(order.Exchange)
                            };
                            if (order.PL.amount <= 0) {
                                console.warn(`order.PL.amount=${order.PL.amount}<=0! order.PL=${inspect(order.PL)} prevOrder=${inspect(prevOrder)}: setting amount=0`);
                                order.PL.amount = 0;
                            }
                        }
                    }
                }
                prevOrder = order.PL;
                result[balance.Currency].push(order.PL)
                console.log(`order: ${inspect(order.PL)}`);
                callback();

            });
        })).on('end', () => {
            if (prevOrder) {
                bittrex.getticker({ market: orders[0].Exchange }, function (err, ticker) {
                    if (err) { return console.error(err); }
                    result[balance.Currency].push({ profit: (ticker.result.Close >= prevOrder.buyin ? '+' : '-') + Math.abs((ticker.result.Close / prevOrder.buyin - 1) * 100).toFixed(3) + '%' });
                    res.json(result[balance.Currency]);
                });
            } else {
                res.json(result[balance.Currency]);
            }
        });
});


app.use(express.static(__dirname + '/public'));
app.listen(3003);

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
