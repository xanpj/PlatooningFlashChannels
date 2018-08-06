# Platooning payment system - Flash Channels

This is a Proof-Of-Concept for a payment system based on IOTA Flash Channels for 2+ participants. The use case resembles a platooning scenario.

In Flash Channel a deposit is payed to a multi-signature address on the tangle. The deposit will be split according to the negotiated amounts in the Flash Channel when closing the channel. The image "ApplicationProcessOverview.png" shows a very abstract overview of the process, excluding the sending of proposal and digests, and the resend logic. 
The application can be run with up to 6 participants.

## INSTALL:
```
$ npm install
```
## RUN:
Start two separate terminals
Terminal 1:
```
$ cd channel
$ node main 0 2 2
```
Terminal 2:
```
$ cd channel
$ node main 1 2 2
```

Start with more participants (in separate terminals):
```
$ node main {id: 0-5} {participant count {2-6} {security level: 1-3}
```
## CONFIG:
### OFFLINE-ONLINE:
The application is by default set to OFFLINE mode.
ONLINE mode can be configured in order to communicate with the IOTA DEVNET:
```
$ nano channel/communicationLogic.js
const DEBUG_OFFLINE = false
``` 
The starting process up to "Channel Is Open" will take several minutes.
You can check the transactions in https://devnet.thetangle.org/address/<insert address after "deposit to:">

### NETWORK:
It is by default set to loopback mode to be used on a single computer, but it can also be used with separate devices in the same LAN.
```
$ nano channel/communicationLogic.js
const DEBUG_TWO_PORTS = false
``` 
Also, the BROADCAST_HOST in presets{0-6}.js needs to be modified.

### CONSOLE
For more verbosity in the console set 
```
$ nano channel/communicationLogic.js
const CONSOLE_VERBOSITY = 3
```

Advanced configurations are not presented here.

By Alexander Jagaciak