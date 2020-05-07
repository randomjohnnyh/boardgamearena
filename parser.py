from collections import defaultdict
import re
import sys
import pandas

resources = [
    (2, "food", "hunting grounds"),
    (3, "wood", "forest"),
    (4, "brick", "clay pit"),
    (5, "stone", "quarry"),
    (6, "Gold", "river")
]

def parseDice(lines, output):
    pattern = r"(.*)'s ([0-9]+) dice sum is ([0-9]+)"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            roll = int(m.group(2))
            value = int(m.group(3))
            output[name]['diceRolls'] += roll
            output[name]['diceSum'] += value
            output[name]['diceAverage'] = round(1.0 * output[name]['diceSum'] / output[name]['diceRolls'], 3)

def parseMarket(lines, output):
    pattern = r"(.*) takes (.*)"
    numericMap = {"wood": 1, "brick": 2, "stone": 3, "Gold": 4, "tool": 5, "agriculture level": 6}

    def pop(history):
        firstName = next(iter(history))
        output[firstName]['market'].append(list(history.values()))
        history.clear()

    history = {}
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            value = m.group(2)
            numericValue = numericMap[value]
            if name not in history:
                history[name] = numericValue
            else:
                pop(history)
    if history:
        pop(history)

def parseResources(lines, output):
    for line in lines:
        for _, resource, area in resources:
            pattern = r"(.*) places ([0-9]+) people on " + area
            m = re.match(pattern, line)
            if m:
                name = m.group(1)
                value = int(m.group(2))
                output[name][resource.lower() + "Dice"] += value

            pattern2 = r"(.*) produces ([0-9]+) " + resource
            m = re.match(pattern2, line)
            if m:
                name = m.group(1)
                value = int(m.group(2))
                output[name][resource.lower()] += value

def parseFood(lines, output):
    pattern = r"(.*) feeds his people with ([0-9]+) food"
    pattern2 = r"(.*) gains an agriculture level"
    pattern3 = r"(.*) is now first player"
    pattern4 = r"(.*) gains ([0-9]+) food with a high agriculture level"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            value = int(m.group(2))
            output[name]['usedFood'] += value

        m = re.match(pattern2, line)
        if m:
            name = m.group(1)
            output[name]['agriculture'] += 1

        m = re.match(pattern3, line)
        if m:
            for i in output:
                output[i]['usedAgriculture'] += output[i]['agriculture']

        m = re.match(pattern4, line)
        if m:
            name = m.group(1)
            value = int(m.group(2))
            output[name]['usedAgriculture'] -= value

def parseTurns(lines, output):
    pattern = r"(.*) is now first player"
    pattern2 = r"(.*)nd of the game.*"
    lastName = None
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            output[name]['turns'] += 1
            lastName = name
        else:
            m = re.match(pattern2, line)
            if m and lastName is not None:
                output[lastName]['turns'] -= 1
            lastName = None

def parseTool(lines, output):
    pattern = r"(.*) (uses people on tool maker|takes tool)"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            output[name]['tool'] += 1

def parsePeople(lines, output):
    pattern = r"(.*) gains an additional person"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            output[name]['people'] += 1

def parseUsedTool(lines, output):
    pattern = r"(.*) uses a \+([0-9]+) tool"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            value = int(m.group(2))
            output[name]['usedTool'] += value

def parseCards(lines, output):
    pattern = r"(.*) buys a card with ([0-9]+) resources"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            value = int(m.group(2))
            output[name]['card'] += 1
            output[name]['cardResources'] += value

def parseBuildings(lines, output):
    pattern = r"(.*) buys a building for ([0-9]+)"
    for line in lines:
        m = re.match(pattern, line)
        if m:
            name = m.group(1)
            value = int(m.group(2))
            output[name]['building'] += 1
            output[name]['buildingPoints'] += value


def main():
    lines = []
    for line in sys.stdin:
        lines.append(line.strip())
    output = defaultdict(lambda:
        {
            'diceAverage': 0,
            'diceSum': 0,
            'diceRolls': 0,
            'totalPips': 0,
            'wastedPips': 0,

            'market': [],
            'turns': 0,
            'agriculture': 0,
            'usedAgriculture': 0,
            'usedFood': 0,
            'tool': 0,
            'usedTool': 0,
            'people': 0,
            'building': 0,
            'buildingPoints': 0,
            'card': 0,
            'cardResources': 0,

            'food': 0,
            'wood': 0,
            'brick': 0,
            'stone': 0,
            'gold': 0,
            'foodDice': 0,
            'woodDice': 0,
            'brickDice': 0,
            'stoneDice': 0,
            'goldDice': 0,
        })
    for fn in [parseDice, parseMarket, parseTurns, parseResources, parseFood,
               parseTool, parseUsedTool, parsePeople, parseBuildings, parseCards]:
        fn(lines, output)
    for i in output:
        output[i]['totalPips'] = output[i]['usedTool'] + output[i]['diceSum']
        output[i]['wastedPips'] = output[i]['totalPips']
        for value, resource, _ in resources:
            output[i]['wastedPips'] -= output[i][resource.lower()] * value
    pandas.options.display.width = 0
    pandas.options.display.max_colwidth = 100
    df = pandas.DataFrame.from_dict(output).loc[list(next(iter(output.values())).keys())]
    print(df)
    print()


if __name__ == "__main__":
    main()

