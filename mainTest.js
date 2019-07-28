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
const { CStyleCodeGenerator } = require("./codegen/CStyleCodeGenerator");

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

// 启动翻译器
var auxObj = translator.analyze();
var quads = auxObj.quads;
var globalSymTable = auxObj.globalSymTable;

logger.notice("四元式序列如下: ");
for (let i = 0; i < quads.length; i++) {
  let quad = quads[i];
  logger.notice(i + ".\t" + quad.toString());
}

logger.notice("全局符号表如下: ");
for (let symbol of Object.values(globalSymTable.symbols)) {
  logger.notice(symbol.name + ":\t" + symbol.type + "\t" + symbol.offset);
}

// 启动临时变量地址分配器
var instrs = new CStyleCodeGenerator(auxObj).generate(quads);

logger.notice("MIPS 指令如下: ");

let asm = "";
for (let i = 0; i < instrs.length; i++) {
  let instr = instrs[i];
  logger.notice(instr.toString());
  asm += instr.toString() + "\n";
}

fs.writeFile(myConfig.asmPath, Buffer.from(asm, "utf8"), function(err) {
  if (err) {
    throw err;
  }
  logger.notice("MIPS 汇编码已经写入 " + myConfig.asmPath + ", 请用 MARS 打开和编译.");
});

logger.notice(`请到 ${myConfig.debugFilePath} 查看调试信息, 到 ${myConfig.exceptionFilePath} 查看异常信息, 到 ${myConfig.outputFilePath} 查看输出.`);