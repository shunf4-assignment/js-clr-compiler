const logger = require("winston");
const { tagSpecialChars } = require("../common/utils");
const { CodeGenerationError } = require("../common/errors");

class CStyleCodeGenerator {
  constructor(auxObj) {
    this.auxObj = auxObj;
  }

  allocTemp(quads) {
    "为临时变量确定地址, 同时也妥善处理函数调用时参数在栈上的分配";
    let temps = {};
    let lastAppearanceQuadNoToTemp = {};
    let tempStack = [];

    let processedQuads = [];

    let quadNo = 0;

    function detectTemp(sth) {
      if (sth !== null && typeof(sth) === 'object' && sth.type === "temp") {
        return sth.value;
      } else {
        return undefined;
      }
    }
    
    var processTemp = (quad) => {
      // 处理 temp 的最后出现 (第一次)
      if (lastAppearanceQuadNoToTemp[quadNo]) {
        for (let tempAddrVal of lastAppearanceQuadNoToTemp[quadNo]) {
          if (tempStack[temps[tempAddrVal].height] === tempAddrVal)
            tempStack[temps[tempAddrVal].height] = undefined;
        }

        while (tempStack.length > 0 && tempStack[tempStack.length - 1] === undefined)
          tempStack.pop();
      }

      // 处理 temp 的出现
      for (let part of ["result", "arg1", "arg2"]) {
        let sth = quad[part];
        let val = detectTemp(sth);
        if (val === undefined)
          continue;   // Not a temp address

        if (temps[val] === undefined) {
          // First appearance of this temp
          let index = 0;
          while (tempStack[index] !== undefined)
            index++;
          temps[val] = {firstAppearance: quadNo, height: index};
          tempStack[index] = val;

          for (let i = quads.length -1; i >= 0; i--) {
            if (detectTemp(quads[i].result) === val || detectTemp(quads[i].arg1) === val || detectTemp(quads[i].arg2) === val) {
              if (lastAppearanceQuadNoToTemp[i] === undefined) {
                lastAppearanceQuadNoToTemp[i] = [val];
              } else {
                lastAppearanceQuadNoToTemp[i].push(val);
              }
              break;
            }
          }
        }

        sth.type = "sp";
        sth.value = (- temps[val].height - 1) * 4;
      }

      // 处理传参
      if (quad.op === "PASSARG") {
        quad.op = "=";
        quad.result = this.auxObj.makeAddr("sp", (- tempStack.length - quad.arg2 + quad.result.value) * 4);
        quad.arg2 = null;
      } else if (quad.op === "ALLOCARGS") {
        quad.op = "-";
        quad.arg2 = (tempStack.length + quad.arg1) * 4;
        quad.result = this.auxObj.makeAddr("register", "sp");
        quad.arg1 = this.auxObj.makeAddr("register", "sp");
      } else if (quad.op === "RELEASEARGS") {
        quad.op = "+";
        quad.arg2 = (tempStack.length + quad.arg1) * 4;
        quad.result = this.auxObj.makeAddr("register", "sp");
        quad.arg1 = this.auxObj.makeAddr("register", "sp");
      }

      processedQuads.push(quad);

      // 处理 temp 的最后出现(第二次)
      if (lastAppearanceQuadNoToTemp[quadNo]) {
        for (let tempAddrVal of lastAppearanceQuadNoToTemp[quadNo]) {
          if (tempStack[temps[tempAddrVal].height] === tempAddrVal)
            tempStack[temps[tempAddrVal].height] = undefined;
        }

        while (tempStack.length > 0 && tempStack[tempStack.length - 1] === undefined)
          tempStack.pop();
      }
    }

    for (; quadNo < quads.length; quadNo++) {
      processTemp(quads[quadNo]);
    }

    return processedQuads;
  }

  

  toMips(quads) {
    let instrs = [];
    let currFunStackSize = 0;
    let labelPos = {};
    let labelReferred = {};

    var loadAddrToRegister = (preferredReg, addr) => {
      if (typeof(addr) === "number") {
        instrs.push(`\taddiu $${preferredReg}, $0, ${addr}`);
      } else if (addr.type === "global") {
        instrs.push(`\tlw $${preferredReg}, ${addr.value}`);
      } else if (addr.type === "bp") {
        instrs.push(`\tlw $${preferredReg}, ${currFunStackSize + addr.value}($sp)`);
      } else if (addr.type === "sp") {
        instrs.push(`\tlw $${preferredReg}, ${addr.value}($sp)`);
      } else if (addr.type === "register") {
        return addr.value;
      } else if (addr.type === "temp") {
        throw new CodeGenerationError();
      } else if (addr.type === "arg") {
        throw new CodeGenerationError();
      }

      return preferredReg;
    }

    var saveRegisterToAddr = (addr, reg) => {
      if (typeof(addr) === "number") {
        throw new CodeGenerationError();
      } else if (addr.type === "global") {
        instrs.push(`\tsw $${reg}, ${addr.value}`);
      } else if (addr.type === "bp") {
        instrs.push(`\tsw $${reg}, ${currFunStackSize + addr.value}($sp)`);
      } else if (addr.type === "sp") {
        instrs.push(`\tsw $${reg}, ${addr.value}($sp)`);
      } else if (addr.type === "register") {
        if (addr.value !== reg) {
          instrs.push(`\taddu $${addr.value}, $0, $${reg}`);
        }
      } else if (addr.type === "temp") {
        throw new CodeGenerationError();
      } else if (addr.type === "arg") {
        throw new CodeGenerationError();
      }
    }

    var quadToMips = (quad) => {
      switch (quad.op) {
        case "IF!=J":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          let reg2 = loadAddrToRegister("s1", quad.arg2);
          if (typeof(quad.result) === "string") {
            instrs.push(`\tbne $${reg1}, $${reg2}, ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tbne $${reg1}, $${reg2}, $quad${quad.result.value}`);
          }
          break;
        }

        case "IF==J":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          let reg2 = loadAddrToRegister("s1", quad.arg2);
          if (typeof(quad.result) === "string") {
            instrs.push(`\tbeq $${reg1}, $${reg2}, ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tbeq $${reg1}, $${reg2}, $quad${quad.result.value}`);
          }
          break;
        }

        case "IF>J":
        {
          let reg2 = loadAddrToRegister("s1", quad.arg2);
          if (typeof(quad.arg1) === "number") {
            instrs.push(`\tslti $1, $${reg2}, ${quad.arg1}`);
          } else {
            let reg1 = loadAddrToRegister("s0", quad.arg1);
            instrs.push(`\tslt $1, $${reg2}, $${reg1}`);
          }

          if (typeof(quad.result) === "string") {
            instrs.push(`\tbne $1, $0, ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tbne $1, $0, $quad${quad.result.value}`);
          }
          break;
        }

        case "IF<J":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          if (typeof(quad.arg2) === "number") {
            instrs.push(`\tslti $1, $${reg1}, ${quad.arg2}`);
          } else {
            let reg2 = loadAddrToRegister("s1", quad.arg2);
            instrs.push(`\tslt $1, $${reg1}, $${reg2}`);
          }

          if (typeof(quad.result) === "string") {
            instrs.push(`\tbne $1, $0, ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tbne $1, $0, $quad${quad.result.value}`);
          }
          break;
        }

        case "IF>=J":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          if (typeof(quad.arg2) === "number") {
            instrs.push(`slti $1, $${reg1}, ${quad.arg2}`);
          } else {
            let reg2 = loadAddrToRegister("s1", quad.arg2);
            instrs.push(`\tslt $1, $${reg1}, $${reg2}`);
          }

          if (typeof(quad.result) === "string") {
            instrs.push(`\tbeq $1, $0, ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tbeq $1, $0, $quad${quad.result.value}`);
          }
          break;
        }

        case "IF<=J":
        {
          let reg2 = loadAddrToRegister("s1", quad.arg2);
          if (typeof(quad.arg1) === "number") {
            instrs.push(`\tslti $1, $${reg2}, ${quad.arg1}`);
          } else {
            let reg1 = loadAddrToRegister("s0", quad.arg1);
            instrs.push(`\tslt $1, $${reg2}, $${reg1}`);
          }

          if (typeof(quad.result) === "string") {
            instrs.push(`\tbeq $1, $0, ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tbeq $1, $0, $quad${quad.result.value}`);
          }
          break;
        }

        case "JUMP":
        {
          if (typeof(quad.result) === "string") {
            instrs.push(`\tj ${quad.result}`);
          } else if (quad.result.type === "quad") {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tj $quad${quad.result.value}`);
          } else if (quad.result.type === "register") {
            instrs.push(`\tjr $${quad.result.value}`);
          }
          break;
        }

        case "JUMP_AND_LINK":
        {
          if (typeof(quad.result) === "string") {
            instrs.push(`\tjal ${quad.result}`);
          } else {
            labelReferred[quad.result.value] = true;
            instrs.push(`\tjal $quad${quad.result.value}`);
          }
          break;
        }

        case "=":
        {
          let reg3 = quad.result.type === "register" ? quad.result.value : "s2";
          if (typeof(quad.arg1) === "number") {
            instrs.push(`\taddiu $${reg3}, $0, ${quad.arg1}`);
          } else {
            reg3 = loadAddrToRegister(reg3, quad.arg1);
          }
          
          saveRegisterToAddr(quad.result, reg3);
          break;
        }

        case "+":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          let reg3 = quad.result.type === "register" ? quad.result.value : "s2";
          if (typeof(quad.arg2) === "number") {
            instrs.push(`\taddiu $${reg3}, $${reg1}, ${quad.arg2}`);
          } else {
            let reg2 = loadAddrToRegister("s1", quad.arg2);
            
            instrs.push(`\taddu $${reg3}, $${reg1}, $${reg2}`);
          }
          
          saveRegisterToAddr(quad.result, reg3);
          break;
        }

        case "-":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          let reg3 = quad.result.type === "register" ? quad.result.value : "s2";
          if (typeof(quad.arg2) === "number") {
            instrs.push(`\tsubiu $${reg3}, $${reg1}, ${quad.arg2}`);
          } else {
            let reg2 = loadAddrToRegister("s1", quad.arg2);
            
            instrs.push(`\tsubu $${reg3}, $${reg1}, $${reg2}`);
          }
          
          saveRegisterToAddr(quad.result, reg3);
          break;
        }

        case "*":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          let reg2 = loadAddrToRegister("s1", quad.arg2);
          let reg3 = quad.result.type === "register" ? quad.result.value : "s2";
          
          instrs.push(`\tmult $${reg1}, $${reg2}`);
          instrs.push(`\tmflo $${reg3}`);
          
          saveRegisterToAddr(quad.result, reg3);
          break;
        }

        case "/":
        {
          let reg1 = loadAddrToRegister("s0", quad.arg1);
          let reg2 = loadAddrToRegister("s1", quad.arg2);
          let reg3 = quad.result.type === "register" ? quad.result.value : "s2";
          
          instrs.push(`\tdiv $${reg1}, $${reg2}`);
          instrs.push(`\tmflo $${reg3}`);
          
          saveRegisterToAddr(quad.result, reg3);
          break;
        }

        case "FUN_BEGIN":
        {
          currFunStackSize = quad.arg1;
          break;
        }

        case "LABEL":
        {
          instrs.push("");
          instrs.push(`${quad.result}:`);
          break;
        }

        case "BREAK":
        {
          instrs.push(`\taddi $a0, $v0, 0`);
          instrs.push(`\taddi $v0, $0, 1`);
          instrs.push(`\tsyscall`);
          instrs.push(`\tbreak`);
          
          break;
        }

        default:
          throw new CodeGenerationError(`无法将 ${quad} 翻译为目标 MIPS 指令`);
      }
    }

    instrs.push(".data");

    for (let symbol of Object.values(this.auxObj.globalSymTable.symbols)) {
      instrs.push(`\t${symbol.name}: .word 0`);
    }

    instrs.push("");
    instrs.push(".text");
    instrs.push("\taddi $sp, $0, 0x10018000	#初始化栈顶");

    for (let i = 0; i < quads.length; i++) {
      let quad = quads[i];
      labelPos[instrs.length] = i;
      instrs.push(`$quad${i}:`);
      quadToMips(quad);
    }

    let instrsFilteredLabels = [];
    for (let j = 0; j < instrs.length; j++) {
      if (labelPos[j] !== undefined) {
        if (labelReferred[labelPos[j]]) {
          instrsFilteredLabels.push(instrs[j]);
        }
      } else {
        instrsFilteredLabels.push(instrs[j]);
      }
    }

    return instrsFilteredLabels;
  }

  generate(quads) {
    let newQuads = this.allocTemp(quads);
    if (newQuads.length !== quads.length) {
      throw new CodeGenerationError("四元式长度暂不能变动");
    }

    logger.notice("置换 temp 后四元式序列如下: ");
    for (let i = 0; i < newQuads.length; i++) {
      let quad = newQuads[i];
      logger.notice(i + ".\t" + quad.toString());
    }

    return this.toMips(newQuads);
  }
}

module.exports.CStyleCodeGenerator = CStyleCodeGenerator;