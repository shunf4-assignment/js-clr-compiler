"use strict";
const fs = require("fs");

const yaml = require("js-yaml");
const iconv = require('iconv-lite');
const sleep = require('sleep');


const logger = require("./log");

const { Token } = require("./common/Token");
const { LexerGenerator } = require("./lex/LexerGenerator");
const { LexError, NoMoreTokenError } = require("./common/errors");

const { SyncStreamEmitter } = require("./common/SyncStreamEmitter");

global.logger = logger;
global.Token = Token;
global.LexError = LexError;

// 源文件的载入
var sourceDecodedStream = fs.createReadStream("testdata.txt").pipe(iconv.decodeStream("GBK"));
var syncSourceStreamEmitter = new SyncStreamEmitter(sourceDecodedStream, ["data", "end"]);
syncSourceStreamEmitter.ended = false;

// 词法分析器的生成
var lexerGenConfig = yaml.load(fs.readFileSync("lex/lex-c-style.yaml", "utf8"));
var lexerGen = new LexerGenerator();
lexerGen.config = lexerGenConfig;

var lexer = lexerGen.generate();
lexer.getMoreChar = () => syncSourceStreamEmitter.readPartSync();

for (;;) {
  let token;
  try {
    token = lexer.getNextToken();
  } catch (e) {
    if (e instanceof NoMoreTokenError) {
      break;
    } else throw e;
  }

  logger.log('notice', token.toLongString());
}


return;

// 翻译器的生成
var translatorGenConfig = yaml.load(fs.readFileSync("parse/parse-c-style.yaml", "utf8"));
var translatorGen = new CLRTranslatorGenerator();
translatorGen.config = translatorGenConfig;

var translator = translatorGen.generate();
translator.lexer = lexer;

