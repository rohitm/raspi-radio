#!/bin/bash
# /etc/init.d/iceberry

# Start snd_bcm2835 module
echo "Starting snd_bcm2835..."
sudo modprobe snd_bcm2835

sleep 5

# Set the volume a little low
echo "Lowering the volume..."
amixer -c 0 set PCM 90%

# Start the node process
echo "Starting Iceberry..."
sudo -u pi /opt/node/bin/node /home/pi/apps/raspi-radio/app.js > /home/pi/apps/raspi-radio/output.out 2> /home/pi/apps/raspi-radio/output.out &

#forever start /home/pi/apps/raspi-radio/app.js > /home/pi/apps/raspi-radio/output.out

exit 0

