// 处理 CSV 文件数据
function processCSVData(csvText) {
    // 初始化数据
    // 交易量
    let volumeData = [];
    // 价格
    let priceData = [];
    
    // 反转数据（从新到旧）
    let lines = csvText.trim().split('\n').reverse();
    // 数据最新截止日期
    let lastDate = new Date();
    // 解析数据
    let [timeHigh0, timeLow0, high0, low0, close0, volume0] = lines[0].split(';');
    let lastCloseData = Number(close0);
    let actualPrice = [];
    for (let i = 1; i < lines.length; i++) {
        let [timeHigh, timeLow, high, low, close, volume] = lines[i].split(';');
        if(Number(volume) === 0){
            continue;
        }

        // 解析数据
        let highData = Number(high);
        let lowData = Number(low);
        let closeData = Number(close);
        if(new Date(timeHigh).getTime() <= new Date(timeLow).getTime()){
            priceData.push(highData - lastCloseData);
            priceData.push(lowData - highData);
            priceData.push(closeData - lowData);
            actualPrice.push(highData);
            actualPrice.push(lowData);
            actualPrice.push(closeData);
        } else {
            priceData.push(lowData - lastCloseData);
            priceData.push(highData - lowData);
            priceData.push(closeData - highData);
            actualPrice.push(lowData);
            actualPrice.push(highData);
            actualPrice.push(closeData);
        }
        volumeData.push(Number(volume));
        lastDate = new Date(timeHigh);
        lastCloseData = closeData;
    }
    return { lastDate, priceData, actualPrice, volumeData };
}

// 标准化函数        
function standardize(data) {
    // 计算均值
    let mean = data.reduce((a, b) => a + b, 0) / data.length;
    // 计算标准差
    let std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
    return { normalized: data.map(x => (x - mean) / std), mean, std };
}

// 构建训练集
function buildTrainDataSet(priceNorm, volumeNorm, windowSize){
    // 构建窗口数据
    let windowfeatures = [];
    let priceNoDrmal = priceNorm.normalized;
    let volumeNoDrmal = volumeNorm.normalized;
    for (let i = 0; i < windowSize; i++) {
        windowfeatures.push([
            priceNoDrmal[i*3+0],
            priceNoDrmal[i*3+1],
            priceNoDrmal[i*3+2],
            volumeNoDrmal[i],
        ]);
    }
    // 训练集特征数据
    let xsData = [];
    let ysData = [];
    for (let i = windowSize; i < volumeNoDrmal.length; i++) {
        // 特征数据
        xsData.push(JSON.parse(JSON.stringify(windowfeatures)));
        ysData.push([
            priceNoDrmal[i*3+0],
            priceNoDrmal[i*3+1],
            priceNoDrmal[i*3+2],
        ]);
        // 更新窗口数据
        windowfeatures.shift();
        windowfeatures.push([
            priceNoDrmal[i*3+0],
            priceNoDrmal[i*3+1],
            priceNoDrmal[i*3+2],
            volumeNoDrmal[i],
        ]);
    }

    return { xsData, ysData, windowfeatures };
}
    
// 转换为张量
function convertTensorData(xsData, ysData, windowSize, features, outPut){
    tf.ENV.set('WEBGL_PACK', true);  // 启用WebGL优化
    let xs = tf.tensor3d(xsData,[xsData.length, windowSize, features]);
    let ys = tf.tensor2d(ysData, [ysData.length, outPut]);

    return { xs, ys }
}