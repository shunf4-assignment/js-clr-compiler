var tagKeys = {
  '\n': '[换行符]',
  '\u0009': '[制表符]',
  '': '[epsilon]',
  '\v': '[垂直制表符]',
  '\r': '[回车符]',
  '\u2029': '[Line Separator]'
};

function tagSpecialChars(str) {
  var output = "", ch, replacement;
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

module.exports.tagSpecialChars = tagSpecialChars;