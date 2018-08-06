#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Jul 16 17:02:27 2018

@author: alex
"""

import json
from collections import defaultdict
from collections import deque
from os import listdir
from os.path import isfile, join
import matplotlib.pyplot as plt
import numpy as np
from pylab import plot, show, savefig, xlim, figure, \
                hold, ylim, legend, boxplot, setp, axes

KEYWORD_DSSTORE = ".DS_Store"
THE_FILE = "evaluationJson"
SPLIT_SIGN_CONTENT_END = "---"

path = "/Users/alex/Documents/iota/current/flash_proj/measurementsIOTA/"
allFiles = [f for f in listdir(path) if isfile(join(path, f))]
processedFiles = []

fileCounter = 0
contentEnd = False
configStr = []

for file in allFiles:
    with open(path+file) as f:
        if file != KEYWORD_DSSTORE and file == THE_FILE:
            configStr.append("")
            for line in f:
                if line.find(SPLIT_SIGN_CONTENT_END) > -1 or contentEnd:
                    contentEnd = True
                else: 
                    line = line.rstrip('\n')
                    configStr[fileCounter] += line
                    
            #process file
            config = json.loads(configStr[0])
            config = config["evaluation"]
            fileCounter += 1
        


print(config)
#############################
#CHART 01 Boxplot
#secur2 1tx, secur2 3tx, secur3 3tx, online secur2 3tx
plotData = [config[9]["attachToTangle"], config[1]["attachToTangle"], config[0]["attachToTangle"], config[2]["attachToTangle"],  np.array(config[-1]["attachToTangle"]) * 6,]

def set_box_color(bp, color):
    plt.setp(bp['boxes'], color=color)
    plt.setp(bp['whiskers'], color=color)
    plt.setp(bp['caps'], color=color)
    plt.setp(bp['medians'], color=color)
    plt.setp(bp['means'], color=color)

plt.figure()

bp1 = plt.boxplot(plotData, positions=range(0, len(plotData)), sym='', widths=0.6, showmeans=True, meanline=True)

set_box_color(bp1, '#D7191C') # colors are from http://colorbrewer2.org/
#set_box_color(bp1, '#2C7BB6') # colors are from http://colorbrewer2.org/
#set_box_color(bp1, '#a1d99b') # colors are from http://colorbrewer2.org/
#set_box_color(bp1, '#D7191C') # colors are from http://colorbrewer2.org/

# draw temporary red and blue lines and use them to create a legend
plt.plot([], c='#D7191C', label='1. nodes.testnet (8 vCPU) MWM=14 SEC=2 TX=3')
plt.plot([], c='#D7191C', label='2. MBP (4 vCPU) MWM=14 SEC=2 TX=1')
plt.plot([], c='#D7191C', label='3. MBP (4 vCPU)  MWM=14 SEC=2 TX=3')
plt.plot([], c='#D7191C', label='4. MBP (4 vCPU) MWM=14 SEC=3 TX=3')
plt.plot([], c='#D7191C', label='5. AWS8core (2 vCPU) MWM=14 SEC=2 TX=3')


         
ticks = ["nodes.testnet", "MBP TX=1", "MBP TX=3", "MBP SEC=3", "AWS (2c)"]
plt.xlabel('Name of function')
plt.ylabel('Performance in s (per respective amount of tx)')
#functionLabel = functionDict[function]
#contentLabel = contentDict[function]
plt.title('Performance of attachToTangle in different setups')

plt.legend()
plt.xticks(range(0, len(ticks), 1), ticks)
plt.yticks(range(0, 100, 10))
plt.xlim(-1, len(plotData)) #TODO CHANGE
plt.ylim(0,100)
plt.tight_layout()
plt.grid(True)
plt.savefig('pre/Chart01_iota.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()

############################
#CHART 02 Boxplot
#tx5 = 23
#tx=3 = 12 - 16
#tx=1 = 10
plotData = [config[7]["attachToTangle"], config[5]["attachToTangle"], config[4]["attachToTangle"], config[2]["attachToTangle"]]

def set_box_color(bp, color):
    plt.setp(bp['boxes'], color=color)
    plt.setp(bp['whiskers'], color=color)
    plt.setp(bp['caps'], color=color)
    plt.setp(bp['medians'], color=color)
    plt.setp(bp['means'], color=color)

plt.figure()

bp1 = plt.boxplot(plotData, positions=range(0, len(plotData)), sym='', widths=0.6, showmeans=True, meanline=True)

set_box_color(bp1, '#D7191C') # colors are from http://colorbrewer2.org/

# draw temporary red and blue lines and use them to create a legend
plt.plot([], c='#D7191C', label='1. MBP MWM=11')
plt.plot([], c='#D7191C', label='1. MBP MWM=12')
plt.plot([], c='#D7191C', label='1. MBP MWM=13')
plt.plot([], c='#D7191C', label='1. MBP MWM=14')

         
ticks = [" MWM=11", " MWM=12", " MWM=13", " MWM=14"]
plt.xlabel('Name of function')
plt.ylabel('Performance in s (per 3 tx)')
plt.title('Performance of attachToTangle with different MWM')
plt.legend()

plt.xticks(range(0, len(ticks), 1), ticks)
plt.xlim(-1, len(plotData)) #TODO CHANGE
plt.ylim(0,60)
plt.tight_layout()

plt.grid(True)
plt.savefig('pre/Chart02_iota.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()
############################
#CHART 03 Process
plotData = config[0]

plotDataArrangedOffline = []
plotDataArrangedOfflineText = []
for i in range(0,9):
    if i == 0:
        plotDataArrangedOffline.append(0 + 0.1)
        plotDataArrangedOfflineText.append("API:getBalances()")
    elif i == 1:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + np.mean(plotData["t_addressGeneration"]))
        plotDataArrangedOfflineText.append("generateRemainderAddress()")
    elif i == 2:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + np.mean(plotData["t_findTx"]))
        plotDataArrangedOfflineText.append("API:wereAddressesSpendFrom()")
    elif i == 3:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + np.mean(plotData["t_findTx"]))
        plotDataArrangedOfflineText.append("API:findTransactions()")
    elif i == 4:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + 0.6)
        plotDataArrangedOfflineText.append("prepareTransfer() + sign()")
    elif i == 5:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + 0.2)
        plotDataArrangedOfflineText.append("API:getTransactionsToApprove()")
    elif i == 6:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + np.mean(plotData["attachToTangle"]))
        plotDataArrangedOfflineText.append("API:attachToTangle()")
    elif i == 7:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + np.mean(plotData["t_storeTx"]))
        plotDataArrangedOfflineText.append("API:storeTransactions()")
    elif i == 8:
        plotDataArrangedOffline.append(plotDataArrangedOffline[-1] + np.mean(plotData["t_storeTx"]))
        plotDataArrangedOfflineText.append("API:broadcastTransactions()") #is correct
    
print(plotDataArrangedOffline)
sortedPlotData = np.array([(plotDataArrangedOffline[count], plotDataArrangedOfflineText[count]) for count in range(len(plotDataArrangedOffline))])

beginSortedArray = sortedPlotData[:,0]
begin = np.array(beginSortedArray, dtype=float)
begin = np.append(begin, (begin[-1] + 0.1))
begin = begin - begin[0]

endSortedPlotData = deque(list(sortedPlotData[:,0]))
endSortedPlotData.append(float(endSortedPlotData[0]) - 0.1) # deque == [1, 2, 3]
endSortedPlotData.rotate(1) # The deque is now: [3, 1, 2]
end = np.array(endSortedPlotData, dtype=float)
end = end - end[0]

event = [process for process in list(sortedPlotData[:,1])]

colors = ['b', '#333333', 'b', 'b', '#333333', 'b', 'g', 'b', 'b']
plt.figure(figsize=(7,7))
plt.barh(range(len(begin)),  end-begin, left=begin, color = colors)
plt.xticks(range(0, 30, 1))
plt.yticks(range(len(begin)), event)
plt.grid(True)
plt.tight_layout()

plt.ylabel('Action')
plt.xlabel('Performance in s')
plt.title('Process of attaching one bundle (tx=3, secur=2) to private IOTA net (exluding latency or TCP sync)')

plt.grid(True)
plt.savefig('pre/Chart03_iota.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()

##oneBundleAttachment complete;;
##localServer (not In network) process run--
#CHART 02 Boxplot (tx 1)--
##edits because of latencies
##selected graphics edits