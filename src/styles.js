const { Processor } = require("windicss/lib");
const { HTMLParser } = require("windicss/utils/parser");

const APPEND = false;
const MINIFY = true;
const fs = require("fs/promises");
const CACHE = {};

module.exports = {
  async generateStyles(html) {
    // TODO: Cache styles
    /*if (CACHE.hasOwnProperty(path)) {
      return CACHE[path];
    } else {*/
      const processor = new Processor();
      const htmlClasses = new HTMLParser(html)
        .parseClasses()
        .map(i => i.result)
        .join(' ');

      const preflightSheet = processor.preflight(html);
      const interpretedSheet = processor.interpret(htmlClasses).styleSheet;
      const styles = interpretedSheet.extend(preflightSheet, APPEND).build(MINIFY);

      // Add the result into the cache
      // CACHE[path] = styles;

      return styles;
    // }
  },
};