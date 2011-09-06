function shorten (aWord) {
  if (aWord.length > 20) {
    return [aWord.substr(0, 20), '...'].join('');
  }
  return aWord;
}

self.port.on("build", function (aWordListSet) {
  var wordListElement = document.getElementById("wordlist"),
      groupLength,
      ul,
      allWords = [];
  aWordListSet.forEach(function (aWordSet) {
    aWordSet.forEach(function (aWord) {
      if (allWords.indexOf(aWord) < 0) {
        allWords.push(aWord);
      }
    });
  });
  allWords.sort();
  groupLength = allWords.length / 3;
  while (wordListElement.firstChild) {
    wordListElement.removeChild(wordListElement.firstChild);
  }
  console.log("adding words: " + allWords.length + "...");
  ul = document.createElement("ul");
  allWords.forEach(function (aWord, aIndex) {
    if (aIndex > groupLength) {
      groupLength *= 2;
      wordListElement.appendChild(ul);
      ul = document.createElement("ul");
    }
    var word = document.createElement("li");
    word.setAttribute("value", aWord);
    word.textContent = aWord;
    ul.appendChild(word);
  });
  wordListElement.appendChild(ul);
  wordListElement.addEventListener(
    "click",
    function (event) {
      self.port.emit("find", event.target.getAttribute("value"));
      event.stopPropagation();
      event.preventDefault();
    },
    false);
});

