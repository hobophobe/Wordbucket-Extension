const {Cc, Ci, Cu} = require('chrome');
Cu.import("resource://gre/modules/Services.jsm", this);
Cu.import("resource://gre/modules/XPCOMUtils.jsm", this);

var winutils = require('window-utils');

var findbar;

function getFindbar () {
  var win = winutils.activeBrowserWindow,
      {gFindBar} = win;
  if (gFindBar) {
    findbar = gFindBar;
  }
  if (findbar) {
    return findbar;
  }
  return null;
}

function finder (options) {
  if (findbar || getFindbar()) {
    if (options.query) {
      if (findbar.hidden || findbar.findMode !== findbar.FIND_NORMAL) {
        findbar.open(findbar.FIND_NORMAL);
      }
      findbar._findField.value = options.query;
      if (options.highlight) {
        var highlight = findbar.ownerDocument.getAnonymousElementByAttribute(
          findbar, "anonid", "highlight");
        highlight.checked = true;
      }
      findbar._find(options.query);
      findbar._findField.select();
      findbar._findField.focus();
    }
  }
}

// exports the finder
exports.Find = finder;
exports.addWords;

