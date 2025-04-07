// 定义模型
function defineModel(windowSize, features, outputSize) {
    const input = tf.input({shape: [windowSize, features]});

    // 共享层
    const lstm = tf.layers.lstm({units: 200, activation: 'relu'}).apply(input);
    const dense1 = tf.layers.dense({units: 1024, activation: 'relu'}).apply(lstm);
    const dense2 = tf.layers.dense({units: 512, activation: 'relu'}).apply(dense1);
    const dense3 = tf.layers.dense({units: 256, activation: 'relu'}).apply(dense2);
    // const dense4 = tf.layers.dense({units: 128, activation: 'relu'}).apply(dense3);
    const dense5 = tf.layers.dense({units: 64, activation: 'relu'}).apply(dense3);
    // const dense6 = tf.layers.dense({units: 32, activation: 'relu'}).apply(dense5);
    const dense7 = tf.layers.dense({units: 16, activation: 'relu'}).apply(dense5);
    
    const outReg = tf.layers.dense({units: outputSize}).apply(dense7);
    
    const model = tf.model({
        inputs: input,
        outputs: outReg
    });
    
    // 需要为每个输出指定loss
    // Adam 优化器 学习率
    let adam = 0.0001;
    model.compile({
        optimizer: tf.train.adam(adam),
        loss: customLoss,
    });
    
    return model;
}

// 自定义回归损失函数
function customLoss(yTrue, yPred) {
    const mseLoss = tf.mean(tf.square(yTrue.sub(yPred)));
    // console.log("mseLoss",mseLoss.dataSync());
    return mseLoss;
}

// 训练模型
async function modelTrain(model, xs, ys) {
    // 训练参数
    let epochs = 1000; // 20000
    // 批量大小
    let batchSize = 16384;
    // 验证集data大小
    let validationSplit = 0.2;

    // 损失数据
    let lossData = [];
    // 验证损失数据
    let valLossData = [];
    // 训练模型
    console.time("training");
    await model.fit(xs, ys, {
        epochs: epochs,
        shuffle: true,
        validationSplit: validationSplit,
        batchSize: batchSize,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(epoch);
                lossData.push(logs.loss);
                valLossData.push(logs.val_loss);
            }
        },
    });
    console.timeEnd("training");

    // 保存并触发下载
    await model.save(`downloads://${new Date().getTime()}`);
    console.log("模型已保存，检查浏览器下载文件夹");

    return { lossData, valLossData };
}

// 模型预测
async function modelPredict(
    model, xsData, windowSize, features, windowfeatures, priceNorm, actualPrice
) {
    // 预测所有数据点
    let predictionsNorm = [];
    for (let i = 0; i < xsData.length; i++) {
        let regPred = model.predict(tf.tensor3d([xsData[i]], [1, windowSize, features]));
        predictionsNorm.push(regPred.dataSync()[0]);
        predictionsNorm.push(regPred.dataSync()[1]);
        predictionsNorm.push(regPred.dataSync()[2]);
        regPred.dispose();
    }

    let regPred = model.predict(tf.tensor3d([JSON.parse(JSON.stringify(windowfeatures))], [1, windowSize, features]));
    predictionsNorm.push(regPred.dataSync()[0]);
    predictionsNorm.push(regPred.dataSync()[1]);
    predictionsNorm.push(regPred.dataSync()[2]);
    
    // 反标准化
    let predictionsList = predictionsNorm.map(p => 
       p * priceNorm.std + priceNorm.mean
    );
    let res = [];
    // 还原差分
    for(let i=windowSize*3;i<actualPrice.length;i++){
        res.push(actualPrice[i-1] + predictionsList[i-windowSize*3]);
    }
    res.push(res[res.length-1] + predictionsList[predictionsList.length-3]);
    res.push(res[res.length-1] + predictionsList[predictionsList.length-2]);
    res.push(res[res.length-1] + predictionsList[predictionsList.length-1]);

    return res;
}

// 加载模型
async function loadModel(jsonFileName, weightsFileName) {
    let jsonFile = document.getElementById(jsonFileName).files[0];
    let weightsFile = document.getElementById(weightsFileName).files[0];
    if (!jsonFile || !weightsFile) {
        alert('文件缺失，请同时上传 .json 和 .bin 文件');
        return;
    }
    // 使用 tf.io.browserFiles 加载模型
    let trainedModel = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, weightsFile]));
    trainedModel.summary();
    return trainedModel;
}
 


