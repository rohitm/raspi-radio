#!/bin/bash

# Start snd_bcm2835 module
echo "Starting snd_bcm2835..."
`sudo modprobe snd_bcm2835`

# Set the volume a little low
echo "Lowering the volume..."
amixer -c 0 set PCM 90%

# Start the node process
echo "Starting iceberry..."
$(nohup node /home/pi/apps/raspi-radio/app.js &)

exit

