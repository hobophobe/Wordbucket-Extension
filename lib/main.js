const finder = require("find");
const widgets = require("widget");
const contextMenu = require("context-menu");
const tabs = require("tabs");
const pageMod = require("page-mod");
const panels = require("panel");
const data = require("self").data;

var indexIsOn = false;
var indexers = [];
var viewPanel = null;
var allWordsets = [];
var wordWidget = null;
var indexerLocations = [];

function getWordsets () {
  return allWordsets.filter(function (aWordset, aIndex) {
    console.log(indexers[aIndex].url + " vs. " + tabs.activeTab.url);
    return (indexers[aIndex].tab.url === tabs.activeTab.url);
  });
}

function toggleIndex () {
  indexIsOn = !indexIsOn;
  if (indexIsOn) {
    if (viewPanel) {
      viewPanel.show();
    }
    else {
      activateIndexers();
    }
  }
  return indexIsOn;
}

function detachWorker (aWorker) {
  console.log("attempting detach");
  var index = indexers.indexOf(aWorker);
  if (index > -1) {
    console.log("dropping...");
    indexers.splice(index, 1);
    allWordsets.splice(index, 1);
    indexerLocations.splice(index, 1);
  }
  console.log("dropped, " + indexers.length + " left (" + allWordsets.length + " sets and " + indexerLocations.length + " locations)...");
}

function activateIndexers () {
  indexers.forEach(function (aIndexer) {
    aIndexer.postMessage({type: "getIndex"});
  });
}

// Due to the unreliability of detaching... we are totalitarian.  Papers, please.
function checkIndexers () {
  console.log("check...");
  indexers.forEach(function (aIndexer, aIndex) {
    try {
      aIndexer.postMessage({type: "checkLocation", index: aIndex});
    } catch (ex) { console.exception(ex); }
  });
}

function cleanWord (aWord) {
  return aWord.replace(/[\W]*(\w\S*\w)[\W]*/g,'$1').toLowerCase();
}

function processIndexData (aData) {
  var words = [],
      delimiterRe = /\s/;
  aData.forEach(function (aTextNode) {
    var parts = aTextNode.split(delimiterRe);
    parts.forEach(function (aWord) {
      aWord = cleanWord(aWord);
      if (aWord.length > 3 && words.indexOf(aWord) < 0) {
        words.push(aWord);
      }
    });
  });
  words.sort();
  return words;
}

function makePanel (aWillShow) {
  var panel = panels.Panel({
    width: 750,
    height: 500,
    contentURL: data.url("wordlist/wordlist.html"),
    contentScriptFile: [
      data.url("jquery-1.6.2.js"), data.url("wordlist/wordlist.js")],
    contentScriptWhen: 'ready',
    onHide: function () {
      wordWidget.contentURL = toggleIndex() ? data.url('widget/bucket-on.png') :
                                              data.url('widget/bucket-off.png');
    }
  });
  panel.port.on("find", function (aData) {
    finder.Find({
      query: aData,
      highlight: true
    });
    panel.hide();
  });
  if (aWillShow) {
    panel.show();
  }
  return panel;
};

exports.main = function (options, callbacks) {
  console.log(options.loadReason);
  var widget = widgets.Widget({
    id: "toggle-switch",
    label: "WordBucket",
    contentURL: data.url('widget/bucket-off.png'),
    contentScriptWhen: "ready",
    contentScriptFile: data.url('widget/widget.js')
  });
  wordWidget = widget;

  widget.port.on('left-click', function () {
    console.log("activate/deactivate");
    widget.contentURL = toggleIndex() ? data.url('widget/bucket-on.png') :
                                        data.url('widget/bucket-off.png');
  });

  tabs.on("activate", function () {
    if (!viewPanel) {
      console.log("build the panel");
      viewPanel = makePanel(indexIsOn);
    }
    viewPanel.port.emit("build", getWordsets());
  });

  var indexer = pageMod.PageMod({
    include: ['*'],
    contentScriptWhen: 'ready',
    contentScriptFile: data.url('buildIndex.js'),
    onAttach: function (aWorker) {
      console.log("attempted attachment");
      var workerIndex = indexers.indexOf(aWorker);
      if (workerIndex < 0) {
        if (indexers.length > 0) {
          checkIndexers();
        }
        aWorker.postMessage({type: "getIndex"});
        aWorker.port.on("ready", function () {
          if (!viewPanel.isShowing && indexIsOn) {
            console.log("reshows");
            viewPanel.show();
          }
        });
        aWorker.port.on("hasData", function (aData) {
          var wordList = processIndexData(aData.nodeSet),
              workerIndex = indexers.push(aWorker) - 1;
          console.log("attached worker, now a total of " + indexers.length + "...");
          if (!viewPanel) {
            console.log("build the panel");
            viewPanel = makePanel(indexIsOn);
          }
          console.log("initial location? " + aData.location);
          if (workerIndex < 0) {
            console.log("worker not listed?");
            workerIndex = allWordsets.push(wordList) - 1;
            indexers[workerIndex] = aWorker;
            indexerLocations[workerIndex] = aData.location;
          }
          else {
            allWordsets[workerIndex] = wordList;
            indexerLocations[workerIndex] = aData.location;
          }
          viewPanel.port.emit("build", getWordsets());
        });
        aWorker.port.on("locationData", function (aData) {
          var workerIndex = aData.index,
              oldTmp = -1,
              tmp = -1,
              copies = [];
          console.log("checks: (n) " + aData.location + " vs. (o) " + indexerLocations[workerIndex]);
          if (!aData.location || !indexerLocations[workerIndex] ||
                    aData.location !== indexerLocations[workerIndex]) {
            console.log("found a stowaway");
            detachWorker(aWorker);
          }
        });
        aWorker.on("detach", function () {
          console.log("Got a detach request");
          detachWorker(aWorker);
          if (viewPanel) {
            if (indexers.length === 0) {
              console.log("killing a panel");
              viewPanel.destroy();
              viewPanel = null;
            }
            else {
              viewPanel.port.emit("build", getWordsets());
            }
          }
        });
      }
      else {
        console.log("Reattach?!");
        aWorker.postMessage({type: "rebuildIndex"});
        viewPanel.port.emit("build", getWordsets());
      }
    }
  });
};

exports.onUnload = function (reason) {
  console.log(reason);
};
