var tagKeys = {
  '\n': '[换行符]',
  '\u0009': '[制表符]',
  '': 'ε',
  '\v': '[垂直制表符]',
  '\r': '[回车符]',
  '\u2029': '[Line Separator]',
  '\x01': '[EOF]'
};

var tagKeys2 = {
  '\u0009': '[制表符]',
  '': 'ε',
  '\v': '[垂直制表符]',
  '\r': '[回车符]',
  '\u2029': '[Line Separator]',
  '\x01': '[EOF]'
};

function tagSpecialChars(str) {
  var output = "", ch, replacement;
  if (str === "" || str === null || str === undefined) {
    return 'ε';
  }
  for (var i = 0; i < str.length; i++) {
      ch = str.charAt(i);
      if (ch < ' ' || ch > '~') {
          replacement = tagKeys[ch];
          if (replacement) {
              ch = replacement;
          }
      }
      output += ch;
  }
  return output;
}

function tagSpecialChars2(str) {
  var output = "", ch, replacement;
  if (str === "" || str === null || str === undefined) {
    return 'ε';
  }
  for (var i = 0; i < str.length; i++) {
      ch = str.charAt(i);
      if (ch < ' ' || ch > '~') {
          replacement = tagKeys2[ch];
          if (replacement) {
              ch = replacement;
          }
      }
      output += ch;
  }
  return output;
}

module.exports.tagSpecialChars = tagSpecialChars;
module.exports.tagSpecialChars2 = tagSpecialChars2;