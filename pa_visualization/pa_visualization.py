#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Jul  7 11:47:41 2018

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


## CHANGE: MAX_SHOW_IN_PROCESS = 6, MAX_PARTICIPANTS = 5, path

DEFAULT_PARTICIPANTS = 3
DEFAULT_SECURITY = 2
DEFAULT_SEND_DIGESTS = 0
DEFAULT_TREE_DEPTH = 4
MAX_SHOW_IN_PROCESS = 10

pathMeasurements = "/Users/alex/Documents/iota/current/flash_proj/measurements/" #1-7
pathMeasurements100Max= "/Users/alex/Documents/iota/current/flash_proj/measurements100Max/" #1-7
pathMeasurementsInNetwork = "/Users/alex/Documents/iota/current/flash_proj/measurementsInNetwork/" #8
pathMeasurements2 = "/Users/alex/Documents/iota/current/flash_proj/measurements2/" #9-11
pathMeasurementsOptimized = "/Users/alex/Documents/iota/current/flash_proj/measurementsOptimized/" #12
pathMeasurementsUnoptimized = "/Users/alex/Documents/iota/current/flash_proj/measurementsUnoptimized/" #12
pathMeasurements2New = "/Users/alex/Documents/iota/current/flash_proj/measurements2New/" #9-11
pathMeasurementsNew6 = "/Users/alex/Documents/iota/current/flash_proj/measurementsNew6/" #7


path = pathMeasurementsUnoptimized

######################################################
###################################################
KEYWORD_TIME = "time"
KEYWORD_UNDERSCORE = "_"
KEYWORD_CONFIG = "CONFIG"
KEYWORD_APPLICATION_DIVIDER = "--Applied"
KEWORD_I_ATTACH_TO_TANGLE_END = "I_ATTACH_TO_TANGLE_END"
KEYWORD_DSSTORE = ".DS_Store"
SPLIT_SIGN_FILENAME = "__"
SPLIT_SIGN_1 = ":"
MAX_SECURITY = 3
MIN_SECURITY = 1
MAX_PARTICIPANTS = 5 #Change to 6 for Chart6_6
MIN_PARTICIPANTS = 2
MAX_TREE_DEPTH =  10
MIN_TREE_DEPTH =  2
MAX_SEND_DIGESTS = 2 #boolean on=1, off=0

functionData = [[defaultdict(list) for x in range(MIN_SECURITY,MAX_SECURITY + 1)] for y in range(MIN_PARTICIPANTS, MAX_PARTICIPANTS + 1)]
processData = [[defaultdict(list) for x in range(MIN_TREE_DEPTH, MAX_TREE_DEPTH + 1)] for y in range(MAX_SEND_DIGESTS)] #all with security = 2 && partcipants = 3

allFiles = [f for f in listdir(path) if isfile(join(path, f))]
processedFiles = []

for oneFile in allFiles:
    fileName = oneFile.split(SPLIT_SIGN_FILENAME)[0]
    matchingFiles = [s for s in allFiles if fileName in s]

    if (oneFile not in processedFiles) and (oneFile != KEYWORD_DSSTORE):
        configReading = False
        configStr = []
        
        timesNames = []
        times = []
        numObjectsForTimes = []
        
        processDataRaw = []
        fileCounter = 0
        for file in matchingFiles:
            configStr.append("")
            with open(path+file) as f:
                for line in f:
                    
                    #retrieve config
                    if line == '\n':
                        configReading = False
                    line = line.rstrip('\n')
                    if configReading:
                        configStr[fileCounter] += line
                    if line.find(KEYWORD_CONFIG) != -1:
                        configReading = True
                        
                    #retrieve process times
                    if line.find(KEYWORD_TIME) != -1:
                        line = line.rstrip('ms')
                        lineArr = line.split(SPLIT_SIGN_1)
                        if lineArr[0] not in timesNames:
                            timesNames.append(lineArr[0])
                            keyIndex = timesNames.index(lineArr[0])
                            times.append([])
                            numObjectsForTimes.append([])
                        else:
                            keyIndex = timesNames.index(lineArr[0])
                        if len(lineArr) < 3:
                            times[keyIndex].append(lineArr[1])
                            numObjectsForTimes[keyIndex].append(0)
                        if len(lineArr) == 3:
                            times[keyIndex].append(lineArr[2])
                            numObjectsForTimes[keyIndex].append(lineArr[1])
                    #retrieve times
                    #Belo contains some Hacks for better process visualization
                    elif (line.find(KEYWORD_UNDERSCORE) != -1 or line.find(KEYWORD_APPLICATION_DIVIDER) != -1) \
                        and not configReading \
                        and not line.find("APPLY_PAYMENT_MID") != -1 \
                        and not line.find("INIT_END") != -1 \
                        and not line.find("APPLY_PAYMENT_START") != -1:
                        processDataRaw.append(line)

            fileCounter+=1
            processedFiles.append(file)
    
        config = json.loads(configStr[0])
        configSignersCount = config['FLASH_CONFIG']['SIGNERS_COUNT'] - MIN_PARTICIPANTS
        configSecurity = config['FLASH_CONFIG']['SECURITY'] - MIN_SECURITY
        configTreeDepth = config['FLASH_CONFIG']['TREE_DEPTH'] - MIN_TREE_DEPTH
        configDigestsWithBundles = int(config['CHANNEL']['SEND_DIGESTS_WITH_BUNDLE'] == True)
        if configDigestsWithBundles != 0:
            configDigestsPreeTreeSize = config['CHANNEL']['DIGESTS_PRE_TREE_SIZE']
        else:
            configDigestsPreeTreeSize = pow(2, configTreeDepth + MIN_TREE_DEPTH + 1) - 1
        #function times: signers, security, function
        timesCounter = 0
        for function in timesNames:
            if function not in functionData[configSignersCount][configSecurity]:
                functionData[configSignersCount][configSecurity][function] = []
            functionData[configSignersCount][configSecurity][function].extend([(float(b) / max(1, float(m))) for b,m in zip(times[timesCounter], numObjectsForTimes[timesCounter])]) 
            #TODO divide digest / Tree digests
            timesCounter += 1
        #process times: all
        applicationIdCounter =0 
        for p in processDataRaw:
            if applicationIdCounter <= MAX_SHOW_IN_PROCESS or (applicationIdCounter == (MAX_SHOW_IN_PROCESS + 1) and p.find(KEWORD_I_ATTACH_TO_TANGLE_END) != -1): #TODO ONLY TAKES DATA FROM FIRST PROCESS
                if p.find(KEYWORD_APPLICATION_DIVIDER) != -1:
                    applicationIdCounter += 1
                else:
                    [process, timestamp] = p.split(SPLIT_SIGN_1)
                    processData[configDigestsWithBundles][configTreeDepth][process+str(applicationIdCounter)] = timestamp
            

#########VISUALIZATION
functionDict = {
                    "time_generateDigests": "Generation Of Digests", 
                    "time_generatePayment":"Generation of Bundles",
                    "time_generatePayment_txamount": "time_generatePayment_txamount",
                    "time_generateSignature": "Generation of Signature",
                    "time_applyPayment": "Application of Payment"
                 }

contentDict = {
                    "time_generateDigests": "Digest/s", 
                    "time_generatePayment":"Bundle/s",
                    "time_generatePayment_txamount": "Bundle/s",
                    "time_generateSignature": "Signature/s",
                    "time_applyPayment": "Bundle/s" #TODO * ...
                 }



#CHART 1 - 4
SECURITY = DEFAULT_SECURITY - MIN_SECURITY
PARTICIPANTS = DEFAULT_PARTICIPANTS - MIN_PARTICIPANTS
SEND_DIGESTS = DEFAULT_SEND_DIGESTS
TREE_DEPTH = DEFAULT_TREE_DEPTH - MIN_TREE_DEPTH

'''
functionPlotCounter = 0
for function in functionData[PARTICIPANTS][SECURITY]: #TODO CHANGE 0,0
    print(function)
    plotData = [[functionData[x][y][function] for x in range(len(functionData))] for y in range(len(functionData[0]))]
    
    def set_box_color(bp, color):
        plt.setp(bp['boxes'], color=color)
        plt.setp(bp['whiskers'], color=color)
        plt.setp(bp['caps'], color=color)
        plt.setp(bp['medians'], color=color)
        plt.setp(bp['means'], color=color)
    
    plt.figure()
    
    bp1 = plt.boxplot(plotData[0], positions=np.array(range(len(plotData[0])))*4.0-0.8, sym='', widths=0.6, showmeans=True, meanline=True)
    bp2 = plt.boxplot(plotData[1], positions=np.array(range(len(plotData[1])))*4.0, sym='', widths=0.6, showmeans=True, meanline=True)
    bp3 = plt.boxplot(plotData[2], positions=np.array(range(len(plotData[2])))*4.0+0.8, sym='', widths=0.6, showmeans=True, meanline=True)
    set_box_color(bp1, '#D7191C') # colors are from http://colorbrewer2.org/
    set_box_color(bp2, '#2C7BB6')
    set_box_color(bp3, '#a1d99b')
    
    
    # draw temporary red and blue lines and use them to create a legend
    plt.plot([], c='#D7191C', label='Security level = 1')
    plt.plot([], c='#2C7BB6', label='Security level = 2')
    plt.plot([], c='#a1d99b', label='Security level = 3')
             
    ticks = ['2', '3', '4', '5']
    plt.xlabel('Number of channel participants')
    plt.ylabel('Performance in ms')
    functionLabel = functionDict[function]
    contentLabel = contentDict[function]
    plt.title('Performance of \"'+functionLabel+'\" for 1 \"'+contentLabel+'\"')
    plt.grid(False)
    
    plt.legend()
    
    plt.xticks(range(0, len(ticks) * 4, 4), ticks)
    plt.xlim(-4, len(ticks)*4) #TODO CHANGE
    #plt.ylim(0, 8)
    plt.tight_layout()
    functionPlotCounter +=1
    plt.legend()
    plt.savefig('pre/Chart_'+str(functionPlotCounter)+'.eps', format='eps', dpi=900, bbox_inches='tight')

#CHART 5
plotData = []
for x in range(len(functionData)):
    tempData = []
    for function in functionData[x][SECURITY]:  # change to 0,0
        if (function != 'time_generatePayment_txamount'):
            tempData.append(functionData[x][1][function])
    plotData.append(tempData)
    

def set_box_color(bp, color):
    plt.setp(bp['boxes'], color=color)
    plt.setp(bp['whiskers'], color=color)
    plt.setp(bp['caps'], color=color)
    plt.setp(bp['medians'], color=color)
    plt.setp(bp['means'], color=color)

plt.figure()

bp1 = plt.boxplot(plotData[0], positions=np.array(range(len(plotData[0])))*5.0-1.2, sym='', widths=0.6, showmeans=True, meanline=True)
bp2 = plt.boxplot(plotData[1], positions=np.array(range(len(plotData[1])))*5.0-0.4, sym='', widths=0.6, showmeans=True, meanline=True)
bp3 = plt.boxplot(plotData[2], positions=np.array(range(len(plotData[2])))*5.0+0.4, sym='', widths=0.6, showmeans=True, meanline=True)
bp4 = plt.boxplot(plotData[3], positions=np.array(range(len(plotData[3])))*5.0+1.2, sym='', widths=0.6, showmeans=True, meanline=True)

set_box_color(bp1, '#D7191C') # colors are from http://colorbrewer2.org/
set_box_color(bp2, '#2C7BB6')
set_box_color(bp3, '#a1d99b')
set_box_color(bp4, '#ffdf9b')

# draw temporary red and blue lines and use them to create a legend
plt.plot([], c='#D7191C', label='Participants = 2')
plt.plot([], c='#2C7BB6', label='Participants = 3')
plt.plot([], c='#a1d99b', label='Participants = 4')
plt.plot([], c='#ffdf9b', label='Participants = 5')
         
ticks = ["Generate Digest", "... Bundle", "Sign", "Apply"]
plt.xlabel('Name of function')
plt.ylabel('Performance in ms (per one object)')
functionLabel = functionDict[function]
contentLabel = contentDict[function]
plt.title('Performance of function per one object (security level = 2)')
plt.grid(True)


plt.xticks(range(0, len(ticks) * 5, 5), ticks)
plt.xlim(-5, len(ticks)*5) #TODO CHANGE
#plt.ylim(0, 8)
plt.tight_layout()
functionPlotCounter +=1

plt.legend()
plt.savefig('pre/Chart_5.eps', format='eps', dpi=900, bbox_inches='tight')
plt.show()

#CHART 6
plotData = [np.mean(functionData[x][SECURITY]["time_applyPayment"]) for x in range(len(functionData))]
plotDataLinear = [np.mean(functionData[0][SECURITY]["time_applyPayment"])]
plotDataLinear.append((plotDataLinear[0]/2)*5)
plt.figure()
plt.plot([2,5], plotDataLinear, color='r') #linear comparison
plt.plot([2,3,4,5], plotData)
plt.xticks([2,3,4,5])

# draw temporary red and blue lines and use them to create a legend
plt.plot([], c='r', label='linear')
plt.plot([], c='b', label='real')
plt.legend()

plt.xlabel('Number of participants')
plt.ylabel('Performance in ms (per one object)')
plt.title('Performance of ' + functionDict["time_applyPayment"] + ' (avg) per one bundle (security level = 2)')
plt.grid(True)

plt.legend()
plt.savefig('pre/Chart_6.eps', format='eps', dpi=900, bbox_inches='tight')

plt.show()


#CHART 6_BundleCreation
plotDataMean = [np.mean(functionData[x][SECURITY]["time_generatePayment"]) for x in range(len(functionData))]
plotDataMedian = [np.median(functionData[x][SECURITY]["time_generatePayment"]) for x in range(len(functionData))]
plotDataLinear = [np.median(functionData[0][SECURITY]["time_generatePayment"])]
plotDataLinear.append((plotDataLinear[0]/2)*5)
plt.figure()
plt.plot([2,3,4,5, 6], plotDataMean, color='blue')
plt.plot([2,6], plotDataLinear, color='r') #linear comparison
plt.plot([2,3,4,5,6], plotDataMedian, color='lightblue')
plt.xticks([2,3,4,5,6])

# draw temporary red and blue lines and use them to create a legend
plt.plot([], c='b', label='mean')
plt.plot([], c='r', label='linear')
plt.plot([], c='lightblue', label='median')

plt.legend()

plt.xlabel('Number of participants')
plt.ylabel('Performance in ms (per one object)')
plt.title('Performance of ' + functionDict["time_generatePayment"] + ' (avg) per one bundle (security level = 2)')
plt.grid(True)

plt.legend()
plt.savefig('pre/Chart_6_BundleCreation.eps', format='eps', dpi=900, bbox_inches='tight')

plt.show()


#CHART 6_6players
plotData = [np.mean(functionData[x][SECURITY]["time_applyPayment"]) for x in range(len(functionData))]
plotDataLinear = [np.mean(functionData[0][SECURITY]["time_applyPayment"])]
plotDataLinear.append((plotDataLinear[0]/2)*6)
plt.figure()
plt.plot([2,6], plotDataLinear, color='r') #linear comparison
plt.plot([2,3,4,5,6], plotData)
plt.xticks([2,3,4,5,6])

# draw temporary red and blue lines and use them to create a legend
plt.plot([], c='r', label='linear')
plt.plot([], c='b', label='real')
plt.legend()

plt.xlabel('Number of participants')
plt.ylabel('Performance in ms (per one object)')
plt.title('Performance of ' + functionDict["time_applyPayment"] + ' (avg) per one bundle (security level = 2)')
plt.grid(True)

plt.legend()
plt.savefig('pre/Chart_6_6.eps', format='eps', dpi=900, bbox_inches='tight')

plt.show()


#CHART 7
plotDataLinear = []
plotDataLinear2 = []
plotData = [ (np.mean(functionData[x][SECURITY]["time_generateDigests"]) + np.mean(functionData[x][SECURITY]["time_generatePayment"])*2+ np.mean(functionData[x][SECURITY]["time_generateSignature"])*2 + np.mean(functionData[x][SECURITY]["time_applyPayment"])*2 ) for x in range(len(functionData)) ]
plotDataPayment1 = [ (np.mean(functionData[x][SECURITY]["time_generateDigests"]) + np.mean(functionData[x][SECURITY]["time_generatePayment"])+ np.mean(functionData[x][SECURITY]["time_generateSignature"])*2 + np.mean(functionData[x][SECURITY]["time_applyPayment"])*2 ) for x in range(len(functionData)) ]
plotDataLinear.append(plotData[0])
plotDataLinear.append(plotData[-1])
plotDataLinear2.append(plotDataPayment1[0])
plotDataLinear2.append(plotDataPayment1[-1])
plt.figure()
plt.plot([2,3,4,5], plotData, c='red')
#plt.plot([2,3,4,5], plotDataPayment1, c='green')
plt.plot([2,5], plotDataLinear, c='black')
#plt.plot([2,5], plotDataLinear2, c='grey')
plt.xticks([2,3,4,5])

plt.plot([], c='black', label='Arbitrary Linear Line 1')
plt.plot([], c='red', label='Adaptive (Avg) [2 bundles, 1 digest]')
#plt.plot([], c='grey', label='Arbitrary Linear Line 2')
#plt.plot([], c='green', label='Adaptive (Generate Payment=1) [...]')

plt.legend()

plt.xlabel('Number of participants')
plt.ylabel('Confirmation time in ms') 
plt.title('Confirmation time (treeDepth = 4, security level = 2, excluding network delays)')#ADD only one digest, 4 bundles, 4 signatures
plt.grid(True)
plt.savefig('pre/Chart_7.eps', format='eps', dpi=900, bbox_inches='tight')

plt.show()


pre_SECURITY = SECURITY
SECURITY = 0
for sec in range(0,3):
    SECURITY = sec
    #CHART 7_2
    plotDataPoC = [ (np.mean(functionData[x][SECURITY]["time_generateDigests"])*3 + np.mean(functionData[x][SECURITY]["time_generatePayment"])*4+ np.mean(functionData[x][SECURITY]["time_generateSignature"])*4 + np.mean(functionData[x][SECURITY]["time_applyPayment"])*4 ) for x in range(len(functionData)) ]
    plotDataMax = [ (np.max(functionData[x][SECURITY]["time_generateDigests"]) + np.max(functionData[x][SECURITY]["time_generatePayment"])*2+ np.max(functionData[x][SECURITY]["time_generateSignature"])*2 + np.max(functionData[x][SECURITY]["time_applyPayment"])*2 ) for x in range(len(functionData)) ]
    plotData = [ (np.mean(functionData[x][SECURITY]["time_generateDigests"]) + np.mean(functionData[x][SECURITY]["time_generatePayment"])*2+ np.mean(functionData[x][SECURITY]["time_generateSignature"])*2 + np.mean(functionData[x][SECURITY]["time_applyPayment"])*2 ) for x in range(len(functionData)) ]
    plotDataNoDigests = [ (np.mean(functionData[x][SECURITY]["time_generatePayment"])*2+ np.mean(functionData[x][SECURITY]["time_generateSignature"])*2 + np.mean(functionData[x][SECURITY]["time_applyPayment"])*2 ) for x in range(len(functionData)) ]
    
    plt.plot([2,3,4,5], plotDataPoC, c='black')
    plt.plot([2,3,4,5], plotDataMax, c='blue')
    plt.plot([2,3,4,5], plotData, c='red',)
    plt.plot([2,3,4,5], plotDataNoDigests, c='orange')
    
    plt.xticks([2,3,4,5])
    
    plt.plot([], c='black', label='Static (Avg) [4 bundles, 3 digests]')
    plt.plot([], c='blue', label='Adaptive (Max) [2 bundles, 1 digest]')
    plt.plot([], c='red', label='Adaptive (Avg) [...]')
    plt.plot([], c='orange', label='Adaptive (No Digests) [..., 0 digest]')
    
    plt.legend()
      
    plt.xlabel('Number of participants')
    plt.ylabel('Confirmation time in ms') 
    plt.title('Confirmation time (treeDepth = 4, security level = 2, excluding network delays)')#ADD only one digest, 4 bundles, 4 signatures
    plt.grid(True)
    plt.savefig('pre/Chart_7_2_secur'+str(SECURITY)+'.eps', format='eps', dpi=900, bbox_inches='tight')
    plt.show()

SECURITY = pre_SECURITY

#############################
#CHART 8 #process InNetwork
plotData = processData[SEND_DIGESTS][TREE_DEPTH]
sortedPlotData = np.array( [(y,x) for x,y in plotData.items()])

beginSortedArray = sortedPlotData[:,0]
begin = np.array(beginSortedArray, dtype=int)
begin = np.append(begin, (begin[-1] + 1))
begin = (begin - begin[0]) / 1000.0

endSortedPlotData = deque(list(sortedPlotData[:,0]))
endSortedPlotData.append(int(endSortedPlotData[0])) # deque == [1, 2, 3]  + 1
endSortedPlotData.rotate(1) # The deque is now: [3, 1, 2]
end = np.array(endSortedPlotData, dtype=int)
end = (end - end[0]) / 1000.0

event = [process for process in list(sortedPlotData[:,1])]

colors = ['#999999', '#999999', '#999999', '#999999', 'w', '#999999', '#999999', '#999999', 'w', \
          'r', 'r', 'r', 'r', 'r', 'r', 'w', \
          'y', 'y', 'y', 'y', 'y', 'w', \
          'r', 'r', 'r', 'r', 'r', 'w', \
          'y', 'y', 'y', 'y', 'y', 'w', \
          'r', 'r', 'r', 'r', 'r', 'w', \
          'y', 'y', 'y', 'y', 'y', 'w',\
          'w', 'r', 'r', 'r', 'r' , 'w', '#999999', '#999999', \
          ]
plt.figure(figsize=(20,20))
plt.barh(range(len(begin)),  begin-end, left=end, color = colors)
plt.yticks(range(len(begin)), event)
plt.xticks(range(0, int(end[-1]), 15))
plt.grid(True)
plt.tight_layout()

plt.ylabel('Action')
plt.xlabel('Time (s)')
plt.title('Flash Channel process (MBP In Network, participants=3, security=2, treeDepth=4, sendDigestsWithBundles=False, paymentsShown=6)')
plt.savefig('pre/Chart8_1_InNetwork.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()


#############################
#CHART 9 #process TreeBeginning0
plotData = processData[SEND_DIGESTS][TREE_DEPTH]
sortedPlotData = np.array( [(y,x) for x,y in plotData.items()])

beginSortedArray = sortedPlotData[:,0]
begin = np.array(beginSortedArray, dtype=int)
begin = np.append(begin, (begin[-1] + 1))
begin = (begin - begin[0]) / 1000.0
print(begin)
print()


endSortedPlotData = deque(list(sortedPlotData[:,0]))
endSortedPlotData.append(int(endSortedPlotData[0])) # deque == [1, 2, 3]  + 1
endSortedPlotData.rotate(1) # The deque is now: [3, 1, 2]
end = np.array(endSortedPlotData, dtype=int)
end = (end - end[0]) / 1000.0
print(end)
print(begin-end)

event = [process for process in list(sortedPlotData[:,1])]

colors = ['#999999', 'g', '#999999', '#999999', 'w', '#999999', '#999999', '#999999', '#999999', \
          'r', 'r', 'r', 'r', 'r', 'r', \
          'w', 'y', 'y', 'y', 'y', 'y', \
          'w', 'r', 'r', 'r', 'r', 'r', \
          'w', 'y', 'y', 'y', 'y', 'y', \
          'w', 'r', 'r', 'r', 'r', 'r', \
          'w', 'y', 'y', 'y', 'y', 'y', \
          'w', 'r', 'r', 'r', 'w', 'r', \
          '#999999', '#999999', '#999999',
          ]

plt.figure(figsize=(20,20))
plt.barh(range(len(begin)),  begin-end, left=end, color = colors)
plt.yticks(range(len(begin)), event)
plt.xticks(range(0, int(end[-1]), 50))
plt.grid(True)
plt.tight_layout()

plt.ylabel('Action')
plt.xlabel('Time (s)')
plt.title('Flash Channel process (AWS8Core, participants=3, security=2, treeDepth=10, sendDigestsWithBundles=False, paymentsShown=6)')
plt.savefig('pre/Chart9_TreeBeginning10_0_ExplainGapAtBeginning.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()


#############################
#CHART 10 #process TreeBeginning1
plotData = processData[SEND_DIGESTS][TREE_DEPTH]
sortedPlotData = np.array( [(y,x) for x,y in plotData.items()])

beginSortedArray = sortedPlotData[:,0]
begin = np.array(beginSortedArray, dtype=int)
begin = np.append(begin, (begin[-1] + 1))
begin = (begin - begin[0]) / 1000.0
print(begin)
print()


endSortedPlotData = deque(list(sortedPlotData[:,0]))
endSortedPlotData.append(int(endSortedPlotData[0])) # deque == [1, 2, 3]  + 1
endSortedPlotData.rotate(1) # The deque is now: [3, 1, 2]
end = np.array(endSortedPlotData, dtype=int)
end = (end - end[0]) / 1000.0
print(end)
print(begin-end)

event = [process for process in list(sortedPlotData[:,1])]

colors = ['#999999', 'g', '#999999', '#999999', 'w', '#999999', 'w', '#999999', 'w', \
          'r', 'r', 'r', 'g', 'r', 'r', \
          'w', 'y', 'y', 'g', 'y', 'y', \
          'w', 'r', 'r', 'g', 'r', 'r', \
          'w', 'y', 'y', 'g', 'y', 'y', \
          'w', 'r', 'r', 'g', 'r', 'r', \
          'w', 'y', 'y', 'g', 'y', 'y', \
          'w', 'r', 'r', 'r', 'w', 'r', \
          '#999999', '#999999', '#999999',
          ]

plt.figure(figsize=(20,20))
plt.barh(range(len(begin)),  (begin-end), left=end, color=colors)
plt.yticks(range(len(begin)), event)
plt.xticks(range(0, int(end[-1]), 50))
plt.grid(True)
plt.tight_layout()

plt.ylabel('Action')
plt.xlabel('Time (s)')
plt.title('Flash Channel process (AWS8Core, participants=3, security=2, treeDepth=10, sendDigestsWithBundles=True, paymentsShown=6)')
plt.grid(True)
plt.savefig('pre/Chart10_TreeBeginning10_1.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()


#############
#CHART 11
plotData = []
plotData.append((int(processData[0][2]["INIT_DIGESTS_GENERATED_END0"]) - int(processData[0][2]["DISCOVERY_END0"])) / 60000)
plotData.append((int(processData[0][4]["INIT_DIGESTS_GENERATED_END0"]) - int(processData[0][4]["DISCOVERY_END0"])) / 60000)
plotData.append((int(processData[0][8]["INIT_DIGESTS_GENERATED_END0"]) - int(processData[0][8]["DISCOVERY_END0"])) / 60000)


ticks = ["4 (15)", "6 (63)", "10 (1024)"]
plt.figure(figsize=(7,7))
plt.plot([4,6,10], plotData)
plt.xticks([4,6, 10], ticks)

plt.xlabel('Tree depth (max. possible payments 2^x - 1)')
plt.ylabel('Speed of digest/address tree generation in minutes')
plt.title('Performance of digest/address tree generation (security level = 2) per user')
plt.grid(True)
plt.savefig('pre/Chart11_AddressTreeGeneration.eps', format='eps', dpi=900) # This does, too

'''
#############################
#CHART 12 #process AWS Optimized
plotData = processData[SEND_DIGESTS][TREE_DEPTH]
sortedPlotData = np.array( [(y,x) for x,y in plotData.items()])

beginSortedArray = sortedPlotData[:,0]
begin = np.array(beginSortedArray, dtype=int)
begin = np.append(begin, (begin[-1] + 1))
begin = (begin - begin[0]) / 1000.0

endSortedPlotData = deque(list(sortedPlotData[:,0]))
endSortedPlotData.append(int(endSortedPlotData[0])) # deque == [1, 2, 3]  + 1
endSortedPlotData.rotate(1) # The deque is now: [3, 1, 2]
end = np.array(endSortedPlotData, dtype=int)
end = (end - end[0]) / 1000.0

event = [process for process in list(sortedPlotData[:,1])]

colors = ['#999999', '#999999', '#999999', '#999999', 'w', '#999999', '#999999', '#999999', 'w', \
          'r', 'r', 'r', 'r', 'r', 'r', 'w', \
          'y', 'y', 'y', 'y', 'y', 'w', \
          'r', 'r', 'r', 'r', 'r', 'w', \
          'y', 'y', 'y', 'y', 'y', 'w', \
          'r', 'r', 'r', 'r', 'r', 'w', \
          'y', 'y', 'y', 'y', 'y', 'w',\
          'w', 'r', 'r', 'r', 'r' , '#999999', '#999999', '#999999', \
          ]
plt.figure(figsize=(20,20))
plt.barh(range(len(begin)),  begin-end, left=end, color = colors)
plt.yticks(range(len(begin)), event)
plt.xticks(range(0, 320, 15)) #int(end[-1])
plt.grid(True)
plt.tight_layout()

plt.ylabel('Action')
plt.xlabel('Time (s)')
plt.title('Flash Channel process (AWS8Core, participants=3, security=2, treeDepth=4, sendDigestsWithBundles=False, paymentsShown=10, iotaOptimized=False)')
plt.savefig('pre/Chart12_Unoptimized.eps', format='eps', dpi=900, bbox_inches='tight') # This does, too
plt.show()
