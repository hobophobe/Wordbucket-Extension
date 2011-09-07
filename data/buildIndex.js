var built = false,
    excludedNodes = [
      "noscript",
      "script",
      "style",
      "option"
    ];


function checkLocation (aData) {
  console.log("checking one...");
  aData.location = window.document.location.toString();
  self.port.emit("locationData", aData);
}

self.on("message", function (aData) {
  console.log("executes: " + aData.type);
  if (aData.type === "getIndex") {
    getIndex();
  }
  else if (aData.type === "rebuildIndex") {
    getIndex(true);
  }
  else if (aData.type === "checkLocation") {
    checkLocation(aData);
  }
});

function getTextNodesIn(node, includeWhitespaceNodes) {
  var textNodes = [], whitespace = /^\s*$/;

  function getTextNodes(node) {
    var i;
    if (!node || (node.style && node.style.display === "none")) {
      return;
    }
    else if (node.nodeType === node.TEXT_NODE) {
      if (includeWhitespaceNodes || !whitespace.test(node.nodeValue)) {
        textNodes.push(node.data);
      }
    }
    else {
      for (i = 0; i < node.childNodes.length; i += 1) {
        if (excludedNodes.indexOf(node.nodeName.toLowerCase()) === -1) {
          getTextNodes(node.childNodes[i]);
        }
      }
    }
  }

  getTextNodes(node);
  return textNodes;
}


function getIndex (aForceBuild) {
  console.log("getIndex");
  var framed = (window.location !== window.parent.location),
      payload;
  if (!built || aForceBuild) {
    console.log("getIndex: building");
    payload = { 
      nodeSet: getTextNodesIn(document.body, false),
      location: window.document.location.toString()
    };
    built = true;
    if (framed) {
      self.port.emit("hasData", payload);
    }
    else {
      self.port.emit("hasData", payload);
    }
  console.log("getIndex: done");
  }
  else {
    self.port.emit("ready");
  }
}

