"use strict";
const fs = require("fs");

const yaml = require("js-yaml");
const iconv = require('iconv-lite');
const sleep = require('sleep');

require("./common/const");

const myConfig = require("./common/myConfig");
const logger = require("./log");

const { Token } = require("./common/Token");
const { LexerGenerator } = require("./lex/LexerGenerator");
const { LexError, NoMoreTokenError, TranslateError } = require("./common/errors");
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
var lexerGenConfig = yaml.load(fs.readFileSync("lex/lex-c-style.yaml", "utf8"));

var lexerGen = new LexerGenerator();
lexerGen.config = lexerGenConfig;

var lexer = lexerGen.generate();
lexer.getMoreChar = () => syncSourceStreamEmitter.readPartSync();

// logger.notice("词法分析结果:");

// for (;;) {
//   let token;
//   try {
//     token = lexer.getNextToken();
//   } catch (e) {
//     if (e instanceof NoMoreTokenError) {
//       break;
//     } else throw e;
//   }

//   logger.notice(token.toLongString());
// }

// return;



// 翻译器的生成
var translatorGenConfig = yaml.load(fs.readFileSync("translate/grammar-c-style.yaml", "utf8"));

var translatorGen = new CLRTranslatorGenerator();
translatorGen.config = translatorGenConfig;

//logger.notice(translatorGen.grammar.toString());
//logger.notice([...translatorGen.grammar.FIRSTOf(["跳转main动作","内部变量声明串","语句串"])].join(", "));
var translator = translatorGen.generate();
translator.lexer = lexer;

// var t;
// do {
//   t = translator._takeToken();
//   logger.notice(t.toLongString());
// } while (t.toString() !== EOF);

translator.analyze();

logger.notice(`请到 ${myConfig.debugFileName} 查看调试信息, 到 ${myConfig.exceptionFileName} 查看异常信息.`);