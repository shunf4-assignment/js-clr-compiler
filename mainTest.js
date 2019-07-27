"use strict";
const fs = require("fs");

const yaml = require("js-yaml");
const iconv = require('iconv-lite');

require("./common/const");

const myConfig = require("./common/myConfig");
const logger = require("./log");

const { Token } = require("./common/Token");
const { LexerGenerator } = require("./lex/LexerGenerator");
const { LexError, TranslateError } = require("./common/errors");
const { CLRTranslatorGenerator } = require("./translate/CLRTranslatorGenerator");

const { SyncStreamEmitter } = require("./common/SyncStreamEmitter");

logger.myInit(myConfig);

global.logger = logger;
global.Token = Token;
global.LexError = LexError;
global.TranslateError = TranslateError;

// 参数指定要分析的源代码文件
if (process.argv[2] !== undefined) {
  myConfig.sourceFileName = process.argv[2];
}

// 源文件的载入
var sourceDecodedStream = fs.createReadStream(myConfig.sourceFileName);
if (myConfig.asGBKInsteadOfUtf8) {
  sourceDecodedStream = sourceDecodedStream.pipe(iconv.decodeStream("GBK"))
}

var syncSourceStreamEmitter = new SyncStreamEmitter(sourceDecodedStream, ["data", "end"]);
syncSourceStreamEmitter.ended = false;

// 词法分析器的生成
var lexerGenConfig = yaml.load(fs.readFileSync(myConfig.lexerConfig, "utf8"));

var lexerGen = new LexerGenerator();
lexerGen.config = lexerGenConfig;

var lexer = lexerGen.generate();
lexer.getMoreChar = () => syncSourceStreamEmitter.readPartSync();


// 翻译器的生成
var translatorGenConfig = yaml.load(fs.readFileSync(myConfig.translatorConfig, "utf8"));

var translatorGen = new CLRTranslatorGenerator();
translatorGenConfig.clrTableOutputFilePath = "output/CLRTable.csv";
translatorGenConfig.grammarOutputFilePath = "output/CLRTable.csv";
translatorGen.config = translatorGenConfig;

var translator = translatorGen.generate();
translator.lexer = lexer;
translator.analysisStepsOutputFilePath = "output/Analysis.csv";

// 启用翻译器

var { quads, globalSymTable } = translator.analyze();

logger.notice(`请到 ${myConfig.debugFilePath} 查看调试信息, 到 ${myConfig.exceptionFilePath} 查看异常信息.`);