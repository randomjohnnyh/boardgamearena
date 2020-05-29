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

var seenUids = {};

var playerHeaders = {}
var playerBoards = {};
var playerNames = {};
var playerStats = {};
var playerCards = {};

var statsDict = {
  "agriculture": 0,
  "tool": 0,
  "people": 5,
  "buildings": 0,
  "cards": 0,
  "points": 0,
  "pips": 0,
  "usedTool": 0,
  "totalPoints": 0,
  "estimatedPoints": 0,

  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
}

var cardTypes = [
  '', 'c1', 'c1', 'h3', 'h1', 'h2', 'h2', 'h1', 'c2', 'c2', 'c3', 'c3',
  'm1', 'm2', 'm1', 'm2', 'c4', 'c4', 'f1', 'f1', 'f1', 'f2', 'f2',
  'c5', 'c5', 'c6', 'c6', 'c7', 'c7', 'c8', 'p1', 'p1', 'p2', 'p2', 'p1'
];

function onEvent(debuggeeId, message, params)
{
  if (tabId != debuggeeId.tabId) {
    return;
  }

  if (message == "Network.webSocketFrameReceived") {
    appendResponse(params.requestId, params.response);
  }
}

function appendResponse(requestId, response)
{
  var payload = response.payloadData
  if (!payload) {
    return;
  }

  if (!payload.startsWith('42')) {
    return;
  }
  payload = payload.substring(2)

  var json = JSON.parse(payload)
  if (json[0] != 'bgamsg') {
    return;
  }

  var params = json[1]
  if (typeof params === 'string') {
    params = JSON.parse(params)
  }
  if (!params) {
    return;
  }

  var data = params['data']
  if (!data || !data.length) {
    return;
  }

  var i;
  for (i = 0; i < data.length; ++i) {
    var entry = data[i];
    var uid = entry['uid']
    var type = entry['type']
    var args = entry['args']
    if (uid && type && args) {
      if (!seenUids[uid]) {
        seenUids[uid] = true;
        console.log(entry)
        handleMessage(args, type)
      }
    }
  }
}

function handleMessage(args, type)
{
  if (type == "playerstatus") {
    return;
  }

  var playerId = args['player_id']
  if (!playerId) {
    return;
  }

  var playerName = args['player_name']
  if (playerName) {
    playerNames[playerId] = playerName;
  }

  createPlayer(playerId)

  if (type == "buyCard") {
    handleBuyCard(playerId, args['card'])
  } else if (type == "buyBuilding") {
    handleBuyBuilding(playerId, args['new_score'])
  } else if (type == "scorePoint") {
    handleScorePoint(playerId, args['new_score'])
  } else if (type == "foodPenalty") {
    handleScorePoint(playerId, args['new_score'])
  } else if (type == "resourceStockUpdate") {
    handleResourceStockUpdate(playerId, args['stock'])
  } else if (type == "increaseAgriculture") {
    handleIncreaseAgriculture(playerId, args['new_level'])
  } else if (type == "additionalWorker") {
    handleAdditionalWorker(playerId, args['new_worker_nb'])
  } else if (type == "toolUpdate") {
    handleToolUpdate(playerId, args['tools'])
  }

  updateTotalPoints(playerId)
  updateHeader(playerId)
}

function updateTotalPoints(playerId)
{
  var totalPoints = 0;

  var cultureSet1 = 0;
  var cultureSet2 = 0;
  var seenCulture = {};
  var buildingMult = 0;
  var agricultureMult = 0;
  var toolMult = 0;
  var peopleMult = 0;

  var i;
  for (i = 0; i < playerCards[playerId].length; ++i) {
    var type = playerCards[playerId][i].charAt(0)
    var id = parseInt(playerCards[playerId][i].charAt(1))
    if (type == 'c') {
      if (seenCulture[id]) {
        cultureSet2++;
      } else {
        cultureSet1++;
        seenCulture[id] = true;
      }
    } else if (type == 'h') {
      buildingMult += id;
    } else if (type == 'f') {
      agricultureMult += id;
    } else if (type == 'm') {
      toolMult += id;
    } else if (type == 'p') {
      peopleMult += id;
    }
  }

  totalPoints += playerStats[playerId]['points']
  totalPoints += cultureSet1 * cultureSet1 + cultureSet2 * cultureSet2;
  totalPoints += playerStats[playerId]['buildings'] * buildingMult;
  totalPoints += playerStats[playerId]['agriculture'] * agricultureMult;
  totalPoints += playerStats[playerId]['tool'] * toolMult;
  totalPoints += playerStats[playerId]['people'] * peopleMult;

  var i;
  for (i = 1; i < 5; ++i)
  {
    totalPoints += playerStats[playerId][i];
  }

  playerStats[playerId]['totalPoints'] = totalPoints
}

function handleBuyCard(playerId, card)
{
  var cardId = parseInt(card['type'])
  if (!cardId) {
    return;
  }

  var cardType = cardTypes[cardId];
  playerCards[playerId].push(cardType)
  playerCards[playerId].sort()
  var index = playerCards[playerId].lastIndexOf(cardType)

  var div = playerBoards[playerId]
  var cardDiv = formatCard(cardId, cardType);
  if (index == playerCards[playerId].length - 1) {
    div.appendChild(cardDiv)
  }
  else {
    div.insertBefore(cardDiv, div.children[index])
  }

  playerStats[playerId]['cards'] = playerCards[playerId].length;
}

function handleBuyBuilding(playerId, new_score)
{
  if (playerStats[playerId]['points'] == parseInt(new_score)) {
    return;
  }
  playerStats[playerId]['points'] = parseInt(new_score);
  playerStats[playerId]['buildings']++;
}

function handleScorePoint(playerId, new_score)
{
  playerStats[playerId]['points'] = parseInt(new_score);
}

function handleResourceStockUpdate(playerId, stock)
{
  var i;
  for (i = 0; i < 5; ++i) {
    if (stock[i]) {
      playerStats[playerId][i] = parseInt(stock[i])
    }
  }
}

function handleIncreaseAgriculture(playerId, new_level)
{
  playerStats[playerId]['agriculture'] = parseInt(new_level)
}

function handleAdditionalWorker(playerId, new_worker_nb)
{
  playerStats[playerId]['people'] = parseInt(new_worker_nb)
}

function handleToolUpdate(playerId, tools)
{
  var toolCount = 0
  var i;
  for (i = 0; i < tools.length; ++i) {
    if (tools[i].uniq == '0') {
      toolCount += parseInt(tools[i].level);
    }
  }
  playerStats[playerId]['tool'] = toolCount
}


function createPlayer(playerId)
{
  if (playerHeaders[playerId]) {
    return;
  }

  playerCards[playerId] = []
  playerStats[playerId] = {...statsDict}

  // create header with name, then actual area
  var div = document.createElement("div");
  div.className = "player";
  playerHeaders[playerId] = div;
  updateHeader(playerId)
  document.getElementById("container").appendChild(div);

  var div = document.createElement("div");
  div.className = "player";
  playerBoards[playerId] = div;
  document.getElementById("container").appendChild(div);
}

function updateHeader(playerId)
{
  var tokens = []
  var playerName = playerNames[playerId] || playerId
  tokens.push(playerName)
  tokens.push(playerStats[playerId]['totalPoints'])
  tokens.push(playerStats[playerId]['points'])
  tokens.push(playerStats[playerId]['buildings'])
  tokens.push(playerStats[playerId]['agriculture'])
  tokens.push(playerStats[playerId]['tool'])
  tokens.push(playerStats[playerId]['people'])
  tokens.push(playerStats[playerId]['cards'])
  tokens.push(playerStats[playerId][1])
  tokens.push(playerStats[playerId][2])
  tokens.push(playerStats[playerId][3])
  tokens.push(playerStats[playerId][4])
  playerHeaders[playerId].textContent = tokens.join(' ')
}

function formatText(text)
{
  var div = document.createElement("div");
  div.textContent = text;
  return div;
}

function formatHeaders(headers)
{
  var text = "";
  for (name in headers)
    text += name + ": " + headers[name] + "\n";
   var div = document.createElement("div");
   div.textContent = text;
   return div;
 }

 function formatCard(cardId, cardType)
 {
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
