// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var tabId = parseInt(window.location.search.substring(1));

window.addEventListener("load", function() {
  // chrome.debugger.sendCommand({tabId:tabId}, "Console.enable");
  chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
  chrome.debugger.onEvent.addListener(onEvent);

  var requestDiv = document.createElement("div");
  requestDiv.textContent = tabId.toString()
  document.getElementById("container").appendChild(requestDiv);
});

window.addEventListener("unload", function() {
  chrome.debugger.detach({tabId:tabId});
});

var requests = {};
var players = {};

var playerCards = {};

var cardTypes = [
  '', 'c1', 'c1', 'h3', 'h1', 'h2', 'h2', 'h1', 'c2', 'c2', 'c3', 'c3',
  'm1', 'm2', 'm1', 'm2', 'c4', 'c4', 'f1', 'f1', 'f1', 'f2', 'f2',
  'c5', 'c5', 'c6', 'c6', 'c7', 'c7', 'c8', 'p1', 'p1', 'p2', 'p2', 'p2', 'p1'
];

function onEvent(debuggeeId, message, params) {
  if (tabId != debuggeeId.tabId) {
    return;
  }

  if (message == "Network.webSocketFrameReceived") {
    // var requestDiv = requests[params.requestId];
    // if (!requestDiv) {
    //   var requestDiv = document.createElement("div");
    //   requestDiv.className = "request";
    //   requests[params.requestId] = requestDiv;
    //   document.getElementById("container").appendChild(requestDiv);
    // }

    appendResponse(params.requestId, params.response);
  }
}

function appendResponse(requestId, response) {
  var requestDiv = requests[requestId];
  if (response.payloadData)
  {
    var cleaned = response.payloadData.replace(/\\"/g, '"');

    var extractPlayer = cleaned.match(/"player_name":"([^"]*)"/);
    if (extractPlayer) {
      var playerId = extractPlayer[1]
      // console.log(extractPlayer)
      var playerDiv = players[playerId]
      if (!playerDiv) {
        var playerDiv = document.createElement("div");
        playerDiv.className = "player";
        playerDiv.textContent = playerId;
        players[playerId] = playerDiv;
        document.getElementById("container").appendChild(playerDiv);

        var playerDiv = document.createElement("div");
        playerDiv.className = "player";
        players[playerId] = playerDiv;
        document.getElementById("container").appendChild(playerDiv);

        playerCards[playerId] = []
      }
    }

    var extractCard = cleaned.match(/"card":{"id":"[^"]*","type":"([^"]*)"/);
    if (extractCard) {
      var cardId = parseInt(extractCard[1]);
      if (cardId) {
        var cardType = cardTypes[cardId];
        playerCards[playerId].push(cardType)
        playerCards[playerId].sort()
        var index = playerCards[playerId].lastIndexOf(cardType)
        console.log(playerCards)
        console.log(cardType)
        console.log(index)

        var cardDiv = formatCard(cardId, cardType);
        if (index == playerCards[playerId].length - 1) {
          playerDiv.appendChild(cardDiv)
        }
        else {
          playerDiv.insertBefore(cardDiv, playerDiv.children[index])
        }
      }
    }
  }
}

function formatText(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div;
}

function formatHeaders(headers) {
  var text = "";
  for (name in headers)
    text += name + ": " + headers[name] + "\n";
   var div = document.createElement("div");
   div.textContent = text;
   return div;
 }

 function formatCard(cardId, cardType) {
  var div = document.createElement("div");
  var bgx = -(cardId - 1) * 85
  var str = "-" + bgx.toString() + "px 0px"
  div.className = "card";
  div.textContent = cardType;
  div.style.backgroundPosition = bgx.toString() + "px 0px"
  return div
}

function parseURL(url) {
  var result = {};
  var match = url.match(
      /^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
  if (!match)
    return result;
  result.scheme = match[1].toLowerCase();
  result.host = match[2];
  result.port = match[3];
  result.path = match[4] || "/";
  result.fragment = match[5];
  return result;
}
