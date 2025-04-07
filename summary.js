// 显示预测总结。所有盈利策略要提升预测精度考虑添加市场波动率对每笔交易成交的影响。
function summary(lastDate, priceData, predictionsList, windowSize){
    priceData = priceData.map(item => Math.round(item));
    predictionsList = predictionsList.map(item => Math.round(item));
    // 统计平均误差，用于设置止损点
    // 预测价格平均误差
    let priceMiss = 0;
    for(let i=windowSize*3; i<priceData.length; i++){
        priceMiss += Math.abs(priceData[i] - predictionsList[i-windowSize * 3]);
    }
    let length = priceData.length - windowSize * 3;
    priceMiss /= length;
    priceMiss = Math.round(priceMiss);
    console.log("价格平均误差：", priceMiss);
    // 所有策略都设置止损，止损为对应的买入参考价的预测平均误差
    // 到达结算时间点时，还没有达到预测价格
    // 场景1：新预测与原方向一致, 则继续持有，止损点移动到新的预测平均误差
    // 场景2：新预测与原方向不一致, 则结束当前交易，做反向操作。
    // 场景3：新预测震荡（无明确方向）, 则结束交易。

    // 策略1：预测涨，买涨；预测跌，买跌，不考虑预测的最高和最低价。固定时间结算，结算点现价买入操作。无止损
    plan1(lastDate, priceData, predictionsList, windowSize, priceMiss);
    
    // // 策略2：预测涨，买入价为预测最低价；预测跌，卖出价为预测最高价。
    // plan2(closeData, highData, lowData, isHighFirstData, predClose, predHigh, predLow, predIsHighFirstData, windowSize, averageMiss);
    
    
    // // 策略3：同策略2，但需要分梯度交易，所有交易根据预测误差分为两次。
    // // 例如买入价为预测最低价加上平均误差，只买一半仓位。在达到预测最低价时补仓。
    // // 策略3风险高于策略2，需要优先保护利润。需要通过计算分配对应止盈点位和仓位比例。
    // plan3(
    //     closeData, highData, lowData, isHighFirstData, predClose, predHigh, predLow, predIsHighFirstData, windowSize, averageMiss
    // );
    
    // // 策略4：同策略3。针对未成交场景做出对应处理
    // plan4(actualClose, predClose, actualHigh, actualLow);
}

function plan1(lastDate, actualClose, predClose, windowSize, priceMiss){
    let profit = 0;
    let tradeTimes = 0;
    // 持有价格
    let holdPrice = 0;
    // 持有方向
    let holdDirection = 0;
    for(let i=windowSize*3; i<actualClose.length; i++){
        let pred = predClose[i - windowSize*3]; // 预测当天收盘价
        let openPrice = actualClose[i - 1]; // 前一天收盘价作为开盘价
        let closePrice = actualClose[i]; // 当天收盘价

        // 已经持有
        if(holdPrice){
            // 做多
            if(holdDirection){
                // 有足够利润才继续持有
                if(pred > holdPrice + priceMiss){
                    if(closePrice>=pred){
                        profit += pred - holdPrice;
                    } else if (closePrice <= holdPrice-priceMiss){
                        profit += -priceMiss;
                    } else if(closePrice > holdPrice-priceMiss && closePrice< pred){
                        continue;
                    }
                } else{
                    // 没有利润直接清仓
                    profit += openPrice - holdPrice;
                }
            }
            else {
                // 做空
                // 有足够利润才继续持有
                if(pred < holdPrice - priceMiss){
                    if(closePrice<=pred){
                        profit -= pred - holdPrice;
                    } else if (closePrice >= holdPrice+priceMiss){
                        profit += -priceMiss;
                    } else if(closePrice < holdPrice+priceMiss && closePrice> pred){
                        continue;
                    }
                } else{
                    // 没有利润直接清仓
                    profit -= openPrice - holdPrice;
                }
            }

            holdPrice = 0;
            holdDirection = 0;
            continue;
        }

        if (pred > openPrice + priceMiss) { // 预测涨，买涨
            // 有足够利润才进场
            tradeTimes ++;
            if(closePrice>=pred){
                profit += pred - openPrice;
            } else if (closePrice <= openPrice-priceMiss){
                profit += -priceMiss;
            } else if(closePrice < pred && closePrice > openPrice - priceMiss){
                // 没有结算时
                holdPrice = openPrice;
                holdDirection = 1;
                continue;
            }
        } else if (pred < openPrice - priceMiss) { // 预测跌，买跌
            // 有足够利润才进场
            tradeTimes ++;
            if(closePrice<=pred){
                profit -= pred - openPrice;
            } else if (closePrice >= openPrice+priceMiss){
                profit += -priceMiss;
            } else if(closePrice > pred && closePrice < openPrice + priceMiss){
                // 没有结算时
                holdPrice = openPrice;
                holdDirection = 0;
                continue;
            }
        }
    }
    
    // 建议
    let pred = predClose[predClose.length - 3]; // 预测当天收盘价
    let openPrice = actualClose[actualClose.length - 1]; // 前一天收盘价作为开盘价
    let adviceStr = "无利润空间，不建议操作";
    if(pred > openPrice + priceMiss){
        adviceStr = `在当前价${openPrice}买入，止盈点为${pred}，止损点为${openPrice - priceMiss}`
    } else if(pred < openPrice - priceMiss){
        adviceStr = `在当前价${openPrice}买跌，止盈点为${pred}，止损点为${openPrice + priceMiss}`
    }
    let nowTime = new Date();
    console.log(`当前数据截止至${lastDate.getFullYear()}年${lastDate.getMonth() + 1}月${lastDate.getDate()}日`);
    console.log(`今日(${nowTime.getFullYear()}年${nowTime.getMonth() + 1}月${nowTime.getDate()}日)建议: ${adviceStr}`);
    console.log(`若已持仓做多，仓位价须低于${pred - priceMiss}，否则请在现价(${openPrice})清仓！当前预测价${pred}`);
    console.log(`若已持仓做空，仓位价须高于${pred + priceMiss}，否则请在现价(${openPrice})清仓！当前预测价${pred}`);
    // 手续费
    profit -= tradeTimes * 200;
    let averageDistance = profit/(predClose.length-1);
    console.log("策略1平均每日收益：", averageDistance, "累计：", profit, "成交次数", tradeTimes);
}